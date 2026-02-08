from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import credentials, auth, firestore, initialize_app
import firebase_admin
from datetime import datetime
import logging

# --------------------
# APP
# --------------------
app = FastAPI()
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

# --------------------
# FIREBASE
# --------------------
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    initialize_app(cred)

db = firestore.client()

# --------------------
# AUTH HELPERS
# --------------------
def verify_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        decoded = auth.verify_id_token(creds.credentials)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

# --------------------
# HEALTH
# --------------------
@app.get("/api/health")
def health():
    return {"status": "ok"}

# --------------------
# PROFILE
# --------------------
@app.get("/api/citizen/profile")
def profile(user=Depends(verify_user)):
    return {
        "uid": user["uid"],
        "email": user.get("email"),
        "name": user.get("name", "Citizen"),
    }

# --------------------
# BILLS
# --------------------
@app.get("/api/bills")
def get_bills(user=Depends(verify_user)):
    return [
        {"id": "b1", "type": "Water", "amount": 250, "status": "pending"},
        {"id": "b2", "type": "Electricity", "amount": 420, "status": "paid"},
    ]

@app.get("/api/bills/pending")
def get_pending_bills(user=Depends(verify_user)):
    return [
        {"id": "b1", "type": "Water", "amount": 250, "status": "pending"},
    ]

# --------------------
# COMPLAINTS
# --------------------
@app.get("/api/complaints")
def get_complaints(user=Depends(verify_user)):
    docs = db.collection("complaints").where(
        "citizen_id", "==", user["uid"]
    ).stream()

    out = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        if "created_at" in data:
            data["created_at"] = data["created_at"].isoformat()
        out.append(data)

    return out

@app.post("/api/complaints")
def create_complaint(payload: dict, user=Depends(verify_user)):
    payload["citizen_id"] = user["uid"]
    payload["created_at"] = datetime.utcnow()
    ref = db.collection("complaints").add(payload)
    return {"id": ref[1].id}

# --------------------
# PAYMENTS
# --------------------
@app.get("/api/payments")
def get_payments(user=Depends(verify_user)):
    docs = db.collection("payments").where(
        "citizen_id", "==", user["uid"]
    ).stream()

    out = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        if "created_at" in data:
            data["created_at"] = data["created_at"].isoformat()
        out.append(data)

    return out

@app.post("/api/payments")
def create_payment(payload: dict, user=Depends(verify_user)):
    payload["citizen_id"] = user["uid"]
    payload["created_at"] = datetime.utcnow()
    ref = db.collection("payments").add(payload)
    return {"id": ref[1].id}
