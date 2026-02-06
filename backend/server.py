from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import pymysql
from pymysql.cursors import DictCursor
from jose import JWTError, jwt
from passlib.context import CryptContext
import base64
import random
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "suvidha-secret-key-2024-government-app")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MySQL Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DB = os.getenv("MYSQL_DB", "suvidha_db")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
def get_db_connection():
    return pymysql.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=DictCursor,
        autocommit=True
    )

# Initialize database tables
def init_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Citizens table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS citizens (
            id VARCHAR(36) PRIMARY KEY,
            mobile VARCHAR(15) UNIQUE NOT NULL,
            name VARCHAR(100),
            aadhaar_number VARCHAR(12),
            email VARCHAR(100),
            address TEXT,
            city VARCHAR(50),
            state VARCHAR(50),
            pincode VARCHAR(10),
            language VARCHAR(10) DEFAULT 'en',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    """)
    
    # Admin users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id VARCHAR(36) PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(100),
            role VARCHAR(50) DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # OTP store table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otp_store (
            id VARCHAR(36) PRIMARY KEY,
            mobile VARCHAR(15) NOT NULL,
            otp VARCHAR(6) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Bills table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bills (
            id VARCHAR(36) PRIMARY KEY,
            citizen_id VARCHAR(36) NOT NULL,
            service_type ENUM('electricity', 'gas', 'water', 'sanitation') NOT NULL,
            bill_number VARCHAR(50) UNIQUE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            due_date DATE NOT NULL,
            billing_period VARCHAR(50),
            status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
            consumer_number VARCHAR(50),
            meter_reading DECIMAL(10, 2),
            units_consumed DECIMAL(10, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        )
    """)
    
    # Payments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(36) PRIMARY KEY,
            citizen_id VARCHAR(36) NOT NULL,
            bill_id VARCHAR(36),
            amount DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(50),
            transaction_id VARCHAR(100),
            status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
            receipt_number VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (citizen_id) REFERENCES citizens(id),
            FOREIGN KEY (bill_id) REFERENCES bills(id)
        )
    """)
    
    # Service Requests table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS service_requests (
            id VARCHAR(36) PRIMARY KEY,
            citizen_id VARCHAR(36) NOT NULL,
            request_type ENUM('new_connection', 'meter_reading', 'address_change', 'disconnection', 'reconnection') NOT NULL,
            service_type ENUM('electricity', 'gas', 'water', 'sanitation') NOT NULL,
            description TEXT,
            status ENUM('submitted', 'under_review', 'approved', 'rejected', 'completed') DEFAULT 'submitted',
            acknowledgment_number VARCHAR(50) UNIQUE,
            documents TEXT,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        )
    """)
    
    # Complaints table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            id VARCHAR(36) PRIMARY KEY,
            citizen_id VARCHAR(36) NOT NULL,
            category ENUM('electricity', 'gas', 'water', 'sanitation', 'municipal', 'other') NOT NULL,
            subcategory VARCHAR(100),
            description TEXT NOT NULL,
            location TEXT,
            photo TEXT,
            status ENUM('submitted', 'in_progress', 'resolved', 'closed', 'rejected') DEFAULT 'submitted',
            complaint_number VARCHAR(50) UNIQUE,
            priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
            resolution_remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP NULL,
            FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        )
    """)
    
    # Notifications table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(36) PRIMARY KEY,
            citizen_id VARCHAR(36),
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('alert', 'notice', 'emergency', 'bill_reminder', 'service_update') NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            target_all BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        )
    """)
    
    # Announcements table (admin)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('maintenance', 'outage', 'emergency', 'general') NOT NULL,
            service_type VARCHAR(50),
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Insert default admin
    cursor.execute("SELECT * FROM admins WHERE username = 'admin'")
    if not cursor.fetchone():
        admin_id = str(uuid.uuid4())
        hashed_password = pwd_context.hash("admin123")
        cursor.execute("""
            INSERT INTO admins (id, username, password_hash, name, role)
            VALUES (%s, %s, %s, %s, %s)
        """, (admin_id, 'admin', hashed_password, 'Administrator', 'super_admin'))
    
    conn.close()
    logger.info("Database initialized successfully")

# Create the main app
app = FastAPI(title="SUVIDHA API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ====================
# Pydantic Models
# ====================

class CitizenBase(BaseModel):
    mobile: str
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

class Citizen(CitizenBase):
    id: str
    created_at: datetime

class OTPRequest(BaseModel):
    mobile: str

class OTPVerify(BaseModel):
    mobile: str
    otp: str
    name: Optional[str] = None
    aadhaar_number: Optional[str] = None
    language: Optional[str] = "en"

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_id: str
    user_name: Optional[str] = None

class BillCreate(BaseModel):
    citizen_id: str
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
# Authentication Helpers
# ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "user_type": user_type}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = verify_token(credentials)
    if token_data["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return token_data

def verify_citizen(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = verify_token(credentials)
    if token_data["user_type"] != "citizen":
        raise HTTPException(status_code=403, detail="Citizen access required")
    return token_data

# ====================
# Auth Endpoints
# ====================

@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    """Send OTP to mobile number (Mock)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Generate 6-digit OTP (mock - always 123456 for testing)
    otp = "123456"  # In production, generate random OTP
    otp_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store OTP
    cursor.execute("""
        INSERT INTO otp_store (id, mobile, otp, expires_at)
        VALUES (%s, %s, %s, %s)
    """, (otp_id, request.mobile, otp, expires_at))
    
    conn.close()
    
    return {
        "success": True,
        "message": "OTP sent successfully",
        "hint": "For testing, use OTP: 123456"
    }

@api_router.post("/auth/verify-otp", response_model=Token)
async def verify_otp(request: OTPVerify):
    """Verify OTP and login/register citizen"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify OTP
    cursor.execute("""
        SELECT * FROM otp_store 
        WHERE mobile = %s AND otp = %s AND used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
    """, (request.mobile, request.otp))
    
    otp_record = cursor.fetchone()
    if not otp_record:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Mark OTP as used
    cursor.execute("UPDATE otp_store SET used = TRUE WHERE id = %s", (otp_record['id'],))
    
    # Check if citizen exists
    cursor.execute("SELECT * FROM citizens WHERE mobile = %s", (request.mobile,))
    citizen = cursor.fetchone()
    
    if not citizen:
        # Create new citizen
        citizen_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO citizens (id, mobile, name, aadhaar_number, language)
            VALUES (%s, %s, %s, %s, %s)
        """, (citizen_id, request.mobile, request.name, request.aadhaar_number, request.language or 'en'))
        citizen_name = request.name
    else:
        citizen_id = citizen['id']
        citizen_name = citizen['name']
        # Update name if provided
        if request.name:
            cursor.execute("UPDATE citizens SET name = %s WHERE id = %s", (request.name, citizen_id))
            citizen_name = request.name
    
    conn.close()
    
    # Generate token
    access_token = create_access_token(
        data={"sub": citizen_id, "type": "citizen", "mobile": request.mobile}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_type="citizen",
        user_id=citizen_id,
        user_name=citizen_name
    )

@api_router.post("/auth/admin/login", response_model=Token)
async def admin_login(request: AdminLogin):
    """Admin login"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM admins WHERE username = %s", (request.username,))
    admin = cursor.fetchone()
    conn.close()
    
    if not admin or not pwd_context.verify(request.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": admin['id'], "type": "admin", "username": admin['username']}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_type="admin",
        user_id=admin['id'],
        user_name=admin['name']
    )

# ====================
# Citizen Endpoints
# ====================

@api_router.get("/citizen/profile")
async def get_citizen_profile(token_data: dict = Depends(verify_citizen)):
    """Get citizen profile"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM citizens WHERE id = %s", (token_data['user_id'],))
    citizen = cursor.fetchone()
    conn.close()
    
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found")
    
    return citizen

@api_router.put("/citizen/profile")
async def update_citizen_profile(data: CitizenCreate, token_data: dict = Depends(verify_citizen)):
    """Update citizen profile"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE citizens SET 
        name = %s, aadhaar_number = %s, email = %s, address = %s,
        city = %s, state = %s, pincode = %s, language = %s
        WHERE id = %s
    """, (data.name, data.aadhaar_number, data.email, data.address,
          data.city, data.state, data.pincode, data.language, token_data['user_id']))
    
    conn.close()
    return {"success": True, "message": "Profile updated successfully"}

# ====================
# Bills Endpoints
# ====================

@api_router.get("/bills")
async def get_citizen_bills(token_data: dict = Depends(verify_citizen)):
    """Get all bills for a citizen"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM bills WHERE citizen_id = %s ORDER BY due_date ASC
    """, (token_data['user_id'],))
    
    bills = cursor.fetchall()
    conn.close()
    
    # Convert decimal to float for JSON serialization
    for bill in bills:
        bill['amount'] = float(bill['amount']) if bill['amount'] else 0
        bill['meter_reading'] = float(bill['meter_reading']) if bill['meter_reading'] else None
        bill['units_consumed'] = float(bill['units_consumed']) if bill['units_consumed'] else None
    
    return bills

@api_router.get("/bills/pending")
async def get_pending_bills(token_data: dict = Depends(verify_citizen)):
    """Get pending/due bills for a citizen"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM bills 
        WHERE citizen_id = %s AND status IN ('pending', 'overdue')
        ORDER BY due_date ASC
    """, (token_data['user_id'],))
    
    bills = cursor.fetchall()
    conn.close()
    
    for bill in bills:
        bill['amount'] = float(bill['amount']) if bill['amount'] else 0
        bill['meter_reading'] = float(bill['meter_reading']) if bill['meter_reading'] else None
        bill['units_consumed'] = float(bill['units_consumed']) if bill['units_consumed'] else None
    
    return bills

@api_router.get("/bills/{bill_id}")
async def get_bill_details(bill_id: str, token_data: dict = Depends(verify_citizen)):
    """Get bill details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM bills WHERE id = %s AND citizen_id = %s", 
                   (bill_id, token_data['user_id']))
    bill = cursor.fetchone()
    conn.close()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    bill['amount'] = float(bill['amount']) if bill['amount'] else 0
    bill['meter_reading'] = float(bill['meter_reading']) if bill['meter_reading'] else None
    bill['units_consumed'] = float(bill['units_consumed']) if bill['units_consumed'] else None
    
    return bill

# ====================
# Payment Endpoints
# ====================

@api_router.post("/payments")
async def create_payment(data: PaymentCreate, token_data: dict = Depends(verify_citizen)):
    """Process payment for a bill (Mock)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get bill details
    cursor.execute("SELECT * FROM bills WHERE id = %s AND citizen_id = %s", 
                   (data.bill_id, token_data['user_id']))
    bill = cursor.fetchone()
    
    if not bill:
        conn.close()
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill['status'] == 'paid':
        conn.close()
        raise HTTPException(status_code=400, detail="Bill already paid")
    
    # Create payment (mock success)
    payment_id = str(uuid.uuid4())
    transaction_id = f"TXN{random.randint(100000000, 999999999)}"
    receipt_number = f"RCP{random.randint(100000, 999999)}"
    
    cursor.execute("""
        INSERT INTO payments (id, citizen_id, bill_id, amount, payment_method, transaction_id, status, receipt_number)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (payment_id, token_data['user_id'], data.bill_id, bill['amount'], 
          data.payment_method, transaction_id, 'success', receipt_number))
    
    # Update bill status
    cursor.execute("UPDATE bills SET status = 'paid' WHERE id = %s", (data.bill_id,))
    
    conn.close()
    
    return {
        "success": True,
        "payment_id": payment_id,
        "transaction_id": transaction_id,
        "receipt_number": receipt_number,
        "amount": float(bill['amount']),
        "message": "Payment successful"
    }

@api_router.get("/payments")
async def get_payment_history(token_data: dict = Depends(verify_citizen)):
    """Get payment history for a citizen"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, b.service_type, b.bill_number, b.billing_period
        FROM payments p
        LEFT JOIN bills b ON p.bill_id = b.id
        WHERE p.citizen_id = %s
        ORDER BY p.created_at DESC
    """, (token_data['user_id'],))
    
    payments = cursor.fetchall()
    conn.close()
    
    for payment in payments:
        payment['amount'] = float(payment['amount']) if payment['amount'] else 0
    
    return payments

@api_router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt(payment_id: str, token_data: dict = Depends(verify_citizen)):
    """Get payment receipt"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, b.service_type, b.bill_number, b.billing_period, b.consumer_number,
               c.name, c.mobile, c.address
        FROM payments p
        LEFT JOIN bills b ON p.bill_id = b.id
        LEFT JOIN citizens c ON p.citizen_id = c.id
        WHERE p.id = %s AND p.citizen_id = %s
    """, (payment_id, token_data['user_id']))
    
    receipt = cursor.fetchone()
    conn.close()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    receipt['amount'] = float(receipt['amount']) if receipt['amount'] else 0
    
    return receipt

# ====================
# Service Request Endpoints
# ====================

@api_router.post("/service-requests")
async def create_service_request(data: ServiceRequestCreate, token_data: dict = Depends(verify_citizen)):
    """Create a new service request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    request_id = str(uuid.uuid4())
    acknowledgment_number = f"SR{random.randint(1000000, 9999999)}"
    
    cursor.execute("""
        INSERT INTO service_requests (id, citizen_id, request_type, service_type, description, acknowledgment_number, documents)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (request_id, token_data['user_id'], data.request_type, data.service_type, 
          data.description, acknowledgment_number, data.documents))
    
    conn.close()
    
    return {
        "success": True,
        "request_id": request_id,
        "acknowledgment_number": acknowledgment_number,
        "message": "Service request submitted successfully"
    }

@api_router.get("/service-requests")
async def get_service_requests(token_data: dict = Depends(verify_citizen)):
    """Get all service requests for a citizen"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM service_requests WHERE citizen_id = %s ORDER BY created_at DESC
    """, (token_data['user_id'],))
    
    requests = cursor.fetchall()
    conn.close()
    
    return requests

@api_router.get("/service-requests/{request_id}")
async def get_service_request_details(request_id: str, token_data: dict = Depends(verify_citizen)):
    """Get service request details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM service_requests WHERE id = %s AND citizen_id = %s", 
                   (request_id, token_data['user_id']))
    request = cursor.fetchone()
    conn.close()
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    return request

# ====================
# Complaint Endpoints
# ====================

@api_router.post("/complaints")
async def create_complaint(data: ComplaintCreate, token_data: dict = Depends(verify_citizen)):
    """File a new complaint"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    complaint_id = str(uuid.uuid4())
    complaint_number = f"CMP{random.randint(1000000, 9999999)}"
    
    cursor.execute("""
        INSERT INTO complaints (id, citizen_id, category, subcategory, description, location, photo, priority, complaint_number)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (complaint_id, token_data['user_id'], data.category, data.subcategory, 
          data.description, data.location, data.photo, data.priority, complaint_number))
    
    conn.close()
    
    return {
        "success": True,
        "complaint_id": complaint_id,
        "complaint_number": complaint_number,
        "message": "Complaint filed successfully"
    }

@api_router.get("/complaints")
async def get_complaints(token_data: dict = Depends(verify_citizen)):
    """Get all complaints for a citizen"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM complaints WHERE citizen_id = %s ORDER BY created_at DESC
    """, (token_data['user_id'],))
    
    complaints = cursor.fetchall()
    conn.close()
    
    return complaints

@api_router.get("/complaints/{complaint_id}")
async def get_complaint_details(complaint_id: str, token_data: dict = Depends(verify_citizen)):
    """Get complaint details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM complaints WHERE id = %s AND citizen_id = %s", 
                   (complaint_id, token_data['user_id']))
    complaint = cursor.fetchone()
    conn.close()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    return complaint

# ====================
# Notifications Endpoints
# ====================

@api_router.get("/notifications")
async def get_notifications(token_data: dict = Depends(verify_citizen)):
    """Get notifications for a citizen"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM notifications 
        WHERE citizen_id = %s OR target_all = TRUE
        ORDER BY created_at DESC
    """, (token_data['user_id'],))
    
    notifications = cursor.fetchall()
    conn.close()
    
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, token_data: dict = Depends(verify_citizen)):
    """Mark notification as read"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE notifications SET is_read = TRUE WHERE id = %s", (notification_id,))
    conn.close()
    
    return {"success": True, "message": "Notification marked as read"}

# ====================
# Announcements Endpoints (Public)
# ====================

@api_router.get("/announcements")
async def get_announcements():
    """Get active announcements"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM announcements 
        WHERE is_active = TRUE 
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY created_at DESC
    """)
    
    announcements = cursor.fetchall()
    conn.close()
    
    return announcements

# ====================
# Admin Endpoints
# ====================

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(token_data: dict = Depends(verify_admin)):
    """Get admin dashboard statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total citizens
    cursor.execute("SELECT COUNT(*) as count FROM citizens")
    total_citizens = cursor.fetchone()['count']
    
    # Total bills
    cursor.execute("SELECT COUNT(*) as count FROM bills")
    total_bills = cursor.fetchone()['count']
    
    # Pending bills
    cursor.execute("SELECT COUNT(*) as count FROM bills WHERE status = 'pending'")
    pending_bills = cursor.fetchone()['count']
    
    # Total payments
    cursor.execute("SELECT COUNT(*) as count FROM payments WHERE status = 'success'")
    total_payments = cursor.fetchone()['count']
    
    # Total revenue
    cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'success'")
    total_revenue = float(cursor.fetchone()['total'])
    
    # Complaints
    cursor.execute("SELECT COUNT(*) as count FROM complaints")
    total_complaints = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM complaints WHERE status = 'submitted'")
    pending_complaints = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM complaints WHERE status = 'in_progress'")
    in_progress_complaints = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM complaints WHERE status = 'resolved'")
    resolved_complaints = cursor.fetchone()['count']
    
    # Service requests
    cursor.execute("SELECT COUNT(*) as count FROM service_requests")
    total_requests = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM service_requests WHERE status = 'submitted'")
    pending_requests = cursor.fetchone()['count']
    
    conn.close()
    
    return {
        "citizens": {
            "total": total_citizens
        },
        "bills": {
            "total": total_bills,
            "pending": pending_bills
        },
        "payments": {
            "total": total_payments,
            "revenue": total_revenue
        },
        "complaints": {
            "total": total_complaints,
            "pending": pending_complaints,
            "in_progress": in_progress_complaints,
            "resolved": resolved_complaints
        },
        "service_requests": {
            "total": total_requests,
            "pending": pending_requests
        }
    }

@api_router.get("/admin/citizens")
async def get_all_citizens(token_data: dict = Depends(verify_admin)):
    """Get all citizens (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM citizens ORDER BY created_at DESC")
    citizens = cursor.fetchall()
    conn.close()
    
    return citizens

@api_router.get("/admin/bills")
async def get_all_bills(token_data: dict = Depends(verify_admin)):
    """Get all bills (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT b.*, c.name as citizen_name, c.mobile as citizen_mobile
        FROM bills b
        LEFT JOIN citizens c ON b.citizen_id = c.id
        ORDER BY b.created_at DESC
    """)
    bills = cursor.fetchall()
    conn.close()
    
    for bill in bills:
        bill['amount'] = float(bill['amount']) if bill['amount'] else 0
        bill['meter_reading'] = float(bill['meter_reading']) if bill['meter_reading'] else None
        bill['units_consumed'] = float(bill['units_consumed']) if bill['units_consumed'] else None
    
    return bills

@api_router.post("/admin/bills")
async def create_bill(data: BillCreate, token_data: dict = Depends(verify_admin)):
    """Create a new bill (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    bill_id = str(uuid.uuid4())
    bill_number = f"BILL{random.randint(1000000, 9999999)}"
    
    cursor.execute("""
        INSERT INTO bills (id, citizen_id, service_type, bill_number, amount, due_date, billing_period, consumer_number, meter_reading, units_consumed)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (bill_id, data.citizen_id, data.service_type, bill_number, data.amount, 
          data.due_date, data.billing_period, data.consumer_number, data.meter_reading, data.units_consumed))
    
    conn.close()
    
    return {
        "success": True,
        "bill_id": bill_id,
        "bill_number": bill_number,
        "message": "Bill created successfully"
    }

@api_router.get("/admin/complaints")
async def get_all_complaints(token_data: dict = Depends(verify_admin)):
    """Get all complaints (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cm.*, c.name as citizen_name, c.mobile as citizen_mobile
        FROM complaints cm
        LEFT JOIN citizens c ON cm.citizen_id = c.id
        ORDER BY cm.created_at DESC
    """)
    complaints = cursor.fetchall()
    conn.close()
    
    return complaints

@api_router.put("/admin/complaints/{complaint_id}")
async def update_complaint_status(complaint_id: str, data: ComplaintUpdate, token_data: dict = Depends(verify_admin)):
    """Update complaint status (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    resolved_at = datetime.utcnow() if data.status == 'resolved' else None
    
    cursor.execute("""
        UPDATE complaints SET status = %s, resolution_remarks = %s, resolved_at = %s
        WHERE id = %s
    """, (data.status, data.resolution_remarks, resolved_at, complaint_id))
    
    conn.close()
    
    return {"success": True, "message": "Complaint updated successfully"}

@api_router.get("/admin/service-requests")
async def get_all_service_requests(token_data: dict = Depends(verify_admin)):
    """Get all service requests (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT sr.*, c.name as citizen_name, c.mobile as citizen_mobile
        FROM service_requests sr
        LEFT JOIN citizens c ON sr.citizen_id = c.id
        ORDER BY sr.created_at DESC
    """)
    requests = cursor.fetchall()
    conn.close()
    
    return requests

@api_router.put("/admin/service-requests/{request_id}")
async def update_service_request_status(request_id: str, data: ServiceRequestUpdate, token_data: dict = Depends(verify_admin)):
    """Update service request status (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE service_requests SET status = %s, remarks = %s
        WHERE id = %s
    """, (data.status, data.remarks, request_id))
    
    conn.close()
    
    return {"success": True, "message": "Service request updated successfully"}

@api_router.post("/admin/announcements")
async def create_announcement(data: AnnouncementCreate, token_data: dict = Depends(verify_admin)):
    """Create a new announcement (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    announcement_id = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO announcements (id, title, message, type, service_type, start_date, end_date, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (announcement_id, data.title, data.message, data.type, 
          data.service_type, data.start_date, data.end_date, token_data['user_id']))
    
    conn.close()
    
    return {
        "success": True,
        "announcement_id": announcement_id,
        "message": "Announcement created successfully"
    }

@api_router.get("/admin/announcements")
async def get_admin_announcements(token_data: dict = Depends(verify_admin)):
    """Get all announcements (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM announcements ORDER BY created_at DESC")
    announcements = cursor.fetchall()
    conn.close()
    
    return announcements

@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, token_data: dict = Depends(verify_admin)):
    """Delete announcement (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE announcements SET is_active = FALSE WHERE id = %s", (announcement_id,))
    conn.close()
    
    return {"success": True, "message": "Announcement deleted successfully"}

# Health check
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "SUVIDHA API v1.0 - Smart Urban Virtual Interactive Digital Helpdesk Assistant"}

# Include the router in the main app
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
    """Initialize database on startup"""
    try:
        init_database()
        logger.info("Application started successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Application shutting down")
