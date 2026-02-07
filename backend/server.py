from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import uuid
from datetime import datetime, timedelta
import base64
import random
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Firebase Admin (Auth + Firestore)
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    firestore = None

# Firebase config from env
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_CLIENT_EMAIL = os.getenv("FIREBASE_CLIENT_EMAIL")
FIREBASE_PRIVATE_KEY = os.getenv("FIREBASE_PRIVATE_KEY")
FIREBASE_PRIVATE_KEY_PATH = os.getenv("FIREBASE_PRIVATE_KEY_PATH")

if FIREBASE_AVAILABLE and FIREBASE_PROJECT_ID:
    try:
        if FIREBASE_PRIVATE_KEY_PATH and os.path.isfile(FIREBASE_PRIVATE_KEY_PATH):
            firebase_admin.initialize_app(credentials.Certificate(FIREBASE_PRIVATE_KEY_PATH))
        elif FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY:
            key = FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
            firebase_admin.initialize_app(credentials.Certificate({
                "project_id": FIREBASE_PROJECT_ID,
                "client_email": FIREBASE_CLIENT_EMAIL,
                "private_key": key,
            }))
        else:
            firebase_admin.initialize_app(credentials.ApplicationDefault())
    except Exception as e:
        logging.warning("Firebase Admin init failed: %s", e)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Firestore client
def get_firestore():
    if not FIREBASE_AVAILABLE or not firebase_admin._apps:
        return None
    return firestore.client()

# Helpers: doc snapshot -> dict with id
def _doc_to_dict(doc) -> dict:
    if not doc or not doc.exists:
        return None
    d = doc.to_dict()
    d["id"] = doc.id
    return d

def _snap_to_dict_list(snapshot) -> list:
    return [_doc_to_dict(d) for d in snapshot]

# ====================
# Firestore collections (all data in Firebase)
# citizens: doc id = firebase uid
# admins: doc id = firebase uid
# bills, payments, service_requests, complaints, notifications, announcements: doc id = uuid
# ====================

# Create the main app
app = FastAPI(title="SUVIDHA API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ====================
# Pydantic Models
# ====================

class CitizenBase(BaseModel):
    mobile: Optional[str] = None
    name: Optional[str] = None
    aadhaar_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    language: Optional[str] = "en"

class CitizenCreate(CitizenBase):
    pass

class BillCreate(BaseModel):
    citizen_id: str  # Firebase UID
    service_type: str
    amount: float
    due_date: str
    billing_period: Optional[str] = None
    consumer_number: Optional[str] = None
    meter_reading: Optional[float] = None
    units_consumed: Optional[float] = None

class PaymentCreate(BaseModel):
    bill_id: str
    payment_method: str

class ServiceRequestCreate(BaseModel):
    request_type: str
    service_type: str
    description: Optional[str] = None
    documents: Optional[str] = None

class ComplaintCreate(BaseModel):
    category: str
    subcategory: Optional[str] = None
    description: str
    location: Optional[str] = None
    photo: Optional[str] = None
    priority: Optional[str] = "medium"

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    type: str
    service_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ComplaintUpdate(BaseModel):
    status: str
    resolution_remarks: Optional[str] = None

class ServiceRequestUpdate(BaseModel):
    status: str
    remarks: Optional[str] = None

# ====================
# Authentication (Firebase ID token + Firestore citizens/admins)
# ====================

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Firebase ID token and return user_id (Firebase UID), user_type from Firestore."""
    id_token = credentials.credentials
    db = get_firestore()
    if not FIREBASE_AVAILABLE or not firebase_admin._apps or not db:
        raise HTTPException(status_code=503, detail="Firebase not configured")
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception as e:
        logger.warning("Firebase token verify failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    phone = decoded.get("phone_number")
    email = decoded.get("email")

    # Check admins collection (doc id = firebase uid)
    admin_ref = db.collection("admins").document(uid)
    admin_doc = admin_ref.get()
    if admin_doc and admin_doc.exists:
        return {"user_id": uid, "user_type": "admin"}

    # Check citizens collection (doc id = firebase uid)
    citizen_ref = db.collection("citizens").document(uid)
    citizen_doc = citizen_ref.get()
    if citizen_doc and citizen_doc.exists:
        return {"user_id": uid, "user_type": "citizen"}

    # First-time citizen: create in Firestore
    mobile = phone.replace("+91", "").strip() if phone else (email or f"firebase_{uid[:10]}")
    citizen_ref.set({
        "mobile": mobile,
        "name": email or "",
        "email": email or None,
        "language": "en",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return {"user_id": uid, "user_type": "citizen"}

def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = verify_firebase_token(credentials)
    if token_data["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return token_data

def verify_citizen(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = verify_firebase_token(credentials)
    if token_data["user_type"] != "citizen":
        raise HTTPException(status_code=403, detail="Citizen access required")
    return token_data

# ====================
# Citizen Endpoints
# ====================

@api_router.get("/citizen/profile")
async def get_citizen_profile(token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    doc = db.collection("citizens").document(token_data["user_id"]).get()
    citizen = _doc_to_dict(doc)
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found")
    _serialize_dates(citizen)
    return citizen

@api_router.put("/citizen/profile")
async def update_citizen_profile(data: CitizenCreate, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    ref = db.collection("citizens").document(token_data["user_id"])
    update = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    ref.update(update)
    return {"success": True, "message": "Profile updated successfully"}

# ====================
# Bills
# ====================

@api_router.get("/bills")
async def get_citizen_bills(token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    snapshot = db.collection("bills").where("citizen_id", "==", token_data["user_id"]).order_by("due_date").stream()
    bills = _snap_to_dict_list(snapshot)
    for b in bills:
        _serialize_dates(b)
        _float_fields(b, ["amount", "meter_reading", "units_consumed"])
    return bills

@api_router.get("/bills/pending")
async def get_pending_bills(token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    snapshot = db.collection("bills").where("citizen_id", "==", token_data["user_id"]).stream()
    bills = [b for b in _snap_to_dict_list(snapshot) if b.get("status") in ("pending", "overdue")]
    for b in bills:
        _serialize_dates(b)
        _float_fields(b, ["amount", "meter_reading", "units_consumed"])
    bills.sort(key=lambda x: x.get("due_date") or "")
    return bills

@api_router.get("/bills/{bill_id}")
async def get_bill_details(bill_id: str, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    doc = db.collection("bills").document(bill_id).get()
    bill = _doc_to_dict(doc)
    if not bill or bill.get("citizen_id") != token_data["user_id"]:
        raise HTTPException(status_code=404, detail="Bill not found")
    _serialize_dates(bill)
    _float_fields(bill, ["amount", "meter_reading", "units_consumed"])
    return bill

# ====================
# Payments
# ====================

@api_router.post("/payments")
async def create_payment(data: PaymentCreate, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    bill_ref = db.collection("bills").document(data.bill_id)
    bill_doc = bill_ref.get()
    bill = _doc_to_dict(bill_doc)
    if not bill or bill.get("citizen_id") != token_data["user_id"]:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Bill already paid")
    amount = float(bill.get("amount", 0))
    payment_id = str(uuid.uuid4())
    transaction_id = f"TXN{random.randint(100000000, 999999999)}"
    receipt_number = f"RCP{random.randint(100000, 999999)}"
    db.collection("payments").document(payment_id).set({
        "citizen_id": token_data["user_id"],
        "bill_id": data.bill_id,
        "amount": amount,
        "payment_method": data.payment_method,
        "transaction_id": transaction_id,
        "status": "success",
        "receipt_number": receipt_number,
        "created_at": datetime.utcnow(),
    })
    bill_ref.update({"status": "paid"})
    return {
        "success": True,
        "payment_id": payment_id,
        "transaction_id": transaction_id,
        "receipt_number": receipt_number,
        "amount": amount,
        "message": "Payment successful"
    }

@api_router.get("/payments")
async def get_payment_history(token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    snapshot = db.collection("payments").where("citizen_id", "==", token_data["user_id"]).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    payments = _snap_to_dict_list(snapshot)
    for p in payments:
        _serialize_dates(p)
        _float_fields(p, ["amount"])
    for p in payments:
        bid = p.get("bill_id")
        if bid:
            b = db.collection("bills").document(bid).get()
            if b.exists:
                bd = b.to_dict()
                p["service_type"] = bd.get("service_type")
                p["bill_number"] = bd.get("bill_number")
                p["billing_period"] = bd.get("billing_period")
    return payments

@api_router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt(payment_id: str, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    doc = db.collection("payments").document(payment_id).get()
    receipt = _doc_to_dict(doc)
    if not receipt or receipt.get("citizen_id") != token_data["user_id"]:
        raise HTTPException(status_code=404, detail="Receipt not found")
    _serialize_dates(receipt)
    _float_fields(receipt, ["amount"])
    bid = receipt.get("bill_id")
    if bid:
        b = db.collection("bills").document(bid).get()
        if b.exists:
            bd = b.to_dict()
            receipt["service_type"] = bd.get("service_type")
            receipt["bill_number"] = bd.get("bill_number")
            receipt["billing_period"] = bd.get("billing_period")
            receipt["consumer_number"] = bd.get("consumer_number")
    citizen = db.collection("citizens").document(token_data["user_id"]).get()
    if citizen.exists:
        cd = citizen.to_dict()
        receipt["name"] = cd.get("name")
        receipt["mobile"] = cd.get("mobile")
        receipt["address"] = cd.get("address")
    return receipt

# ====================
# Service Requests
# ====================

@api_router.post("/service-requests")
async def create_service_request(data: ServiceRequestCreate, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    request_id = str(uuid.uuid4())
    acknowledgment_number = f"SR{random.randint(1000000, 9999999)}"
    db.collection("service_requests").document(request_id).set({
        "citizen_id": token_data["user_id"],
        "request_type": data.request_type,
        "service_type": data.service_type,
        "description": data.description or None,
        "documents": data.documents or None,
        "acknowledgment_number": acknowledgment_number,
        "status": "submitted",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return {
        "success": True,
        "request_id": request_id,
        "acknowledgment_number": acknowledgment_number,
        "message": "Service request submitted successfully"
    }

@api_router.get("/service-requests")
async def get_service_requests(token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    snapshot = db.collection("service_requests").where("citizen_id", "==", token_data["user_id"]).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    requests = _snap_to_dict_list(snapshot)
    for r in requests:
        _serialize_dates(r)
    return requests

@api_router.get("/service-requests/{request_id}")
async def get_service_request_details(request_id: str, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    doc = db.collection("service_requests").document(request_id).get()
    request = _doc_to_dict(doc)
    if not request or request.get("citizen_id") != token_data["user_id"]:
        raise HTTPException(status_code=404, detail="Service request not found")
    _serialize_dates(request)
    return request

# ====================
# Complaints
# ====================

@api_router.post("/complaints")
async def create_complaint(data: ComplaintCreate, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    complaint_id = str(uuid.uuid4())
    complaint_number = f"CMP{random.randint(1000000, 9999999)}"
    db.collection("complaints").document(complaint_id).set({
        "citizen_id": token_data["user_id"],
        "category": data.category,
        "subcategory": data.subcategory or None,
        "description": data.description,
        "location": data.location or None,
        "photo": data.photo or None,
        "priority": data.priority or "medium",
        "complaint_number": complaint_number,
        "status": "submitted",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return {
        "success": True,
        "complaint_id": complaint_id,
        "complaint_number": complaint_number,
        "message": "Complaint filed successfully"
    }

@api_router.get("/complaints")
async def get_complaints(token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    snapshot = db.collection("complaints").where("citizen_id", "==", token_data["user_id"]).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    complaints = _snap_to_dict_list(snapshot)
    for c in complaints:
        _serialize_dates(c)
    return complaints

@api_router.get("/complaints/{complaint_id}")
async def get_complaint_details(complaint_id: str, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    doc = db.collection("complaints").document(complaint_id).get()
    complaint = _doc_to_dict(doc)
    if not complaint or complaint.get("citizen_id") != token_data["user_id"]:
        raise HTTPException(status_code=404, detail="Complaint not found")
    _serialize_dates(complaint)
    return complaint

# ====================
# Notifications
# ====================

@api_router.get("/notifications")
async def get_notifications(token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    # Notifications for this citizen OR target_all
    snap_citizen = db.collection("notifications").where("citizen_id", "==", token_data["user_id"]).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    snap_all = db.collection("notifications").where("target_all", "==", True).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    seen = set()
    out = []
    for doc in list(snap_citizen) + list(snap_all):
        d = _doc_to_dict(doc)
        if d and d["id"] not in seen:
            seen.add(d["id"])
            _serialize_dates(d)
            out.append(d)
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out[:100]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, token_data: dict = Depends(verify_citizen)):
    db = get_firestore()
    ref = db.collection("notifications").document(notification_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Notification not found")
    d = doc.to_dict() or {}
    citizen_id = d.get("citizen_id")
    target_all = d.get("target_all")
    if citizen_id and citizen_id != token_data["user_id"] and not target_all:
        raise HTTPException(status_code=404, detail="Notification not found")
    ref.update({"is_read": True})
    return {"success": True, "message": "Notification marked as read"}

# ====================
# Announcements (public)
# ====================

@api_router.get("/announcements")
async def get_announcements():
    db = get_firestore()
    now = datetime.utcnow()
    snapshot = db.collection("announcements").where("is_active", "==", True).stream()
    announcements = []
    for doc in snapshot:
        d = _doc_to_dict(doc)
        if not d:
            continue
        start = d.get("start_date")
        end = d.get("end_date")
        if start and hasattr(start, "replace"):
            try:
                start = datetime.fromisoformat(start.replace("Z", "+00:00"))
            except Exception:
                start = None
        if end and hasattr(end, "replace"):
            try:
                end = datetime.fromisoformat(end.replace("Z", "+00:00"))
            except Exception:
                end = None
        if start and start > now:
            continue
        if end and end < now:
            continue
        _serialize_dates(d)
        announcements.append(d)
    announcements.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return announcements

# ====================
# Admin Endpoints
# ====================

def _admin_dashboard_counts(db):
    citizens = len(list(db.collection("citizens").stream()))
    bills_snap = db.collection("bills").stream()
    bills_list = list(bills_snap)
    total_bills = len(bills_list)
    pending_bills = sum(1 for b in bills_list if (b.to_dict() or {}).get("status") in ("pending", "overdue"))
    payments_snap = db.collection("payments").where("status", "==", "success").stream()
    payments_list = list(payments_snap)
    total_payments = len(payments_list)
    total_revenue = sum((p.to_dict() or {}).get("amount") or 0 for p in payments_list)
    complaints_snap = list(db.collection("complaints").stream())
    complaints_list = [c.to_dict() or {} for c in complaints_snap]
    total_complaints = len(complaints_list)
    pending_complaints = sum(1 for c in complaints_list if c.get("status") == "submitted")
    in_progress_complaints = sum(1 for c in complaints_list if c.get("status") == "in_progress")
    resolved_complaints = sum(1 for c in complaints_list if c.get("status") == "resolved")
    requests_snap = list(db.collection("service_requests").stream())
    requests_list = [r.to_dict() or {} for r in requests_snap]
    total_requests = len(requests_list)
    pending_requests = sum(1 for r in requests_list if r.get("status") == "submitted")
    return {
        "citizens": {"total": citizens},
        "bills": {"total": total_bills, "pending": pending_bills},
        "payments": {"total": total_payments, "revenue": float(total_revenue)},
        "complaints": {"total": total_complaints, "pending": pending_complaints, "in_progress": in_progress_complaints, "resolved": resolved_complaints},
        "service_requests": {"total": total_requests, "pending": pending_requests},
    }

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    return _admin_dashboard_counts(db)

@api_router.get("/admin/citizens")
async def get_all_citizens(token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    snapshot = db.collection("citizens").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    citizens = _snap_to_dict_list(snapshot)
    for c in citizens:
        _serialize_dates(c)
    return citizens

@api_router.get("/admin/bills")
async def get_all_bills(token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    snapshot = db.collection("bills").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    bills = _snap_to_dict_list(snapshot)
    for b in bills:
        _serialize_dates(b)
        _float_fields(b, ["amount", "meter_reading", "units_consumed"])
        cid = b.get("citizen_id")
        if cid:
            c = db.collection("citizens").document(cid).get()
            if c.exists:
                cd = c.to_dict()
                b["citizen_name"] = cd.get("name")
                b["citizen_mobile"] = cd.get("mobile")
    return bills

@api_router.post("/admin/bills")
async def create_bill(data: BillCreate, token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    bill_id = str(uuid.uuid4())
    bill_number = f"BILL{random.randint(1000000, 9999999)}"
    db.collection("bills").document(bill_id).set({
        "citizen_id": data.citizen_id,
        "service_type": data.service_type,
        "bill_number": bill_number,
        "amount": float(data.amount),
        "due_date": data.due_date,
        "billing_period": data.billing_period or None,
        "consumer_number": data.consumer_number or None,
        "meter_reading": data.meter_reading,
        "units_consumed": data.units_consumed,
        "status": "pending",
        "created_at": datetime.utcnow(),
    })
    return {"success": True, "bill_id": bill_id, "bill_number": bill_number, "message": "Bill created successfully"}

@api_router.get("/admin/complaints")
async def get_all_complaints(token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    snapshot = db.collection("complaints").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    complaints = _snap_to_dict_list(snapshot)
    for c in complaints:
        _serialize_dates(c)
        cid = c.get("citizen_id")
        if cid:
            cit = db.collection("citizens").document(cid).get()
            if cit.exists:
                cd = cit.to_dict()
                c["citizen_name"] = cd.get("name")
                c["citizen_mobile"] = cd.get("mobile")
    return complaints

@api_router.put("/admin/complaints/{complaint_id}")
async def update_complaint_status(complaint_id: str, data: ComplaintUpdate, token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    ref = db.collection("complaints").document(complaint_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Complaint not found")
    update = {"status": data.status, "resolution_remarks": data.resolution_remarks or None, "updated_at": datetime.utcnow()}
    if data.status == "resolved":
        update["resolved_at"] = datetime.utcnow()
    ref.update(update)
    return {"success": True, "message": "Complaint updated successfully"}

@api_router.get("/admin/service-requests")
async def get_all_service_requests(token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    snapshot = db.collection("service_requests").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    requests = _snap_to_dict_list(snapshot)
    for r in requests:
        _serialize_dates(r)
        cid = r.get("citizen_id")
        if cid:
            c = db.collection("citizens").document(cid).get()
            if c.exists:
                cd = c.to_dict()
                r["citizen_name"] = cd.get("name")
                r["citizen_mobile"] = cd.get("mobile")
    return requests

@api_router.put("/admin/service-requests/{request_id}")
async def update_service_request_status(request_id: str, data: ServiceRequestUpdate, token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    ref = db.collection("service_requests").document(request_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Service request not found")
    ref.update({"status": data.status, "remarks": data.remarks or None, "updated_at": datetime.utcnow()})
    return {"success": True, "message": "Service request updated successfully"}

@api_router.post("/admin/announcements")
async def create_announcement(data: AnnouncementCreate, token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    announcement_id = str(uuid.uuid4())
    db.collection("announcements").document(announcement_id).set({
        "title": data.title,
        "message": data.message,
        "type": data.type,
        "service_type": data.service_type or None,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "is_active": True,
        "created_by": token_data["user_id"],
        "created_at": datetime.utcnow(),
    })
    return {"success": True, "announcement_id": announcement_id, "message": "Announcement created successfully"}

@api_router.get("/admin/announcements")
async def get_admin_announcements(token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    snapshot = db.collection("announcements").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    announcements = _snap_to_dict_list(snapshot)
    for a in announcements:
        _serialize_dates(a)
    return announcements

@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, token_data: dict = Depends(verify_admin)):
    db = get_firestore()
    ref = db.collection("announcements").document(announcement_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Announcement not found")
    ref.update({"is_active": False})
    return {"success": True, "message": "Announcement deleted successfully"}

# ====================
# Helpers
# ====================

def _serialize_dates(d: dict):
    for key in ["created_at", "updated_at", "due_date", "resolved_at", "start_date", "end_date"]:
        if key not in d or d[key] is None:
            continue
        v = d[key]
        if hasattr(v, "isoformat"):
            d[key] = v.isoformat()
        elif isinstance(v, str):
            pass

def _float_fields(d: dict, keys: list):
    for k in keys:
        if k in d and d[k] is not None:
            try:
                d[k] = float(d[k])
            except (TypeError, ValueError):
                pass

# Health & root
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@api_router.get("/")
async def root():
    return {"message": "SUVIDHA API v1.0 - Smart Urban Virtual Interactive Digital Helpdesk Assistant"}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Application started (Firebase Firestore only)")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")
