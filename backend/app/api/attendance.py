"""
Attendance API endpoints.
Handles QR-based check-in, face verification, and trainer marking.
Complete implementation with AWS S3 and Rekognition integration.
"""
import json
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.attendance import Attendance, AttendanceStatus, AttendanceMethod
from app.models.session import TrainingSession, SessionEnrollment
from app.models.user import User
from app.api.auth import get_current_user
from app.services.aws import (
    upload_to_s3,
    upload_base64_image_to_s3,
    get_s3_object_bytes,
    generate_presigned_url,
    get_s3_url,
)
from app.services.face_auth import extract_face_embedding, verify_face as verify_face_ml
from app.api.ws import broadcast_change

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════

class QRCodeResponse(BaseModel):
    qr_code_data: str  # Base64 encoded PNG
    qr_text: str       # The text encoded in QR
    expires_in: int    # Seconds until expiry


class CheckInRequest(BaseModel):
    session_id: int
    qr_code: str
    latitude: float
    longitude: float


class FaceUploadResponse(BaseModel):
    success: bool
    message: str
    face_image_url: Optional[str] = None
    presigned_url: Optional[str] = None


class FaceVerifyRequest(BaseModel):
    session_id: int
    selfie_base64: str  # Base64 encoded selfie image
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class FaceVerifyResponse(BaseModel):
    success: bool
    is_match: bool
    similarity: float
    message: str
    attendance_id: Optional[int] = None
    selfie_url: Optional[str] = None


class TrainerMarkRequest(BaseModel):
    session_id: int
    trainee_ids: List[int]
    status: str = "PRESENT"  # PRESENT or ABSENT
    notes: Optional[str] = None


class TrainerMarkResponse(BaseModel):
    success: bool
    marked_count: int
    failed_count: int
    details: List[dict]


class AttendanceResponse(BaseModel):
    id: int
    session_id: int
    user_id: int
    status: str
    method: str
    check_in_time: Optional[datetime] = None
    geo_verified: bool
    face_match_score: Optional[float] = None
    selfie_url: Optional[str] = None
    marked_by: Optional[int] = None
    
    class Config:
        from_attributes = True


class AttendanceReportItem(BaseModel):
    attendance_id: int
    user_id: int
    employee_id: str
    full_name: str
    status: str
    method: str
    check_in_time: Optional[datetime] = None
    face_match_score: Optional[float] = None
    selfie_url: Optional[str] = None
    geo_verified: bool


# ═══════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════

def generate_qr_code(data: str) -> str:
    """Generate QR code as base64 encoded PNG."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


def validate_geofence(latitude: float, longitude: float, campus_id: int, db: Session) -> bool:
    """Check if coordinates are within campus geofence."""
    # TODO: Implement geofence validation when campus model is available
    return True


def check_duplicate_attendance(db: Session, session_id: int, user_id: int) -> Optional[Attendance]:
    """Check if user already has attendance for this session."""
    return db.query(Attendance).filter(
        Attendance.session_id == session_id,
        Attendance.user_id == user_id
    ).first()


def validate_session_timing(session: TrainingSession) -> bool:
    """Check if current time is within session timing window."""
    now = datetime.utcnow()
    # Allow check-in 30 minutes before session and anytime during session
    if session.start_time:
        start_window = session.start_time - timedelta(minutes=30)
        end_window = session.end_time if session.end_time else session.start_time + timedelta(hours=8)
        return start_window <= now <= end_window
    return True  # No timing restriction if start_time not set


def validate_user_enrolled(db: Session, session_id: int, user_id: int) -> bool:
    """Check if user is enrolled in the session."""
    enrollment = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == session_id,
        SessionEnrollment.user_id == user_id
    ).first()
    return enrollment is not None


# ═══════════════════════════════════════════
# FACE UPLOAD (ONBOARDING)
# ═══════════════════════════════════════════

@router.post("/upload-face", response_model=FaceUploadResponse)
async def upload_face_image(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload face image for onboarding (used as reference for attendance verification).
    Stores in S3 and validates that image contains exactly one face.
    """
    # Read image bytes
    image_bytes = await image.read()
    
    # Validate and extract face embedding locally using DeepFace
    embedding = extract_face_embedding(image_bytes)
    if not embedding:
        raise HTTPException(status_code=400, detail="No valid face detected in the image.")
    
    # Upload to S3 for UI display
    filename = f"face_{current_user.employee_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"
    s3_key = upload_to_s3(image_bytes, filename, image.content_type or "image/jpeg", folder="face-images")
    
    # Save the embedding to the database for future instantaneous local verification
    current_user.face_embedding = embedding
    if s3_key:
        current_user.profile_photo_url = s3_key
    
    db.commit()
    
    return FaceUploadResponse(
        success=True,
        message="Face image uploaded successfully",
        face_image_url=s3_key,
        presigned_url=generate_presigned_url(s3_key)
    )


class FaceUploadBase64Request(BaseModel):
    image_base64: str


@router.post("/upload-face-base64", response_model=FaceUploadResponse)
async def upload_face_image_base64(
    request: FaceUploadBase64Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload face image as base64 JSON body (for mobile apps).
    """
    try:
        # Decode base64
        image_base64 = request.image_base64
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {str(e)}")
    
    # Validate and extract face embedding locally using DeepFace
    embedding = extract_face_embedding(image_bytes)
    if not embedding:
        raise HTTPException(status_code=400, detail="No valid face detected in the image. Please retake the selfie.")
    
    # Upload to S3 for UI display
    filename = f"face_{current_user.employee_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"
    s3_key = upload_to_s3(image_bytes, filename, "image/jpeg", folder="face-images")
    
    # Save the local embedding to the database
    current_user.face_embedding = embedding
    if s3_key:
        current_user.profile_photo_url = s3_key
    
    db.commit()
    
    return FaceUploadResponse(
        success=True,
        message="Face image uploaded successfully",
        face_image_url=s3_key,
        presigned_url=generate_presigned_url(s3_key)
    )


# ═══════════════════════════════════════════
# FACE VERIFICATION (TRAINEE SELF CHECK-IN)
# ═══════════════════════════════════════════

@router.post("/verify-face", response_model=FaceVerifyResponse)
async def verify_face_attendance(
    request: FaceVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verify face for attendance (compare selfie with stored profile image).
    Returns similarity percentage.
    """
    # Check if user has a stored local face embedding
    if not current_user.face_embedding:
        raise HTTPException(
            status_code=400,
            detail="No face embedding on file. Please register your face first."
        )
    
    # Decode selfie
    try:
        selfie_base64 = request.selfie_base64
        if ',' in selfie_base64:
            selfie_base64 = selfie_base64.split(',')[1]
        selfie_bytes = base64.b64decode(selfie_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid selfie image: {str(e)}")
    
    # Compare faces using local DeepFace ML
    is_match = verify_face_ml(selfie_bytes, current_user.face_embedding)
    
    return FaceVerifyResponse(
        success=True,
        is_match=is_match,
        similarity=100.0 if is_match else 0.0,
        message=f"Face {'matched' if is_match else 'did not match'}"
    )


@router.post("/self", response_model=FaceVerifyResponse)
async def self_attendance_with_face(
    request: FaceVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trainee self check-in with face verification.
    Captures selfie, compares with stored face, and marks attendance if match.
    """
    session_id = request.session_id
    
    # Validate session exists
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if user is enrolled
    if not validate_user_enrolled(db, session_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not enrolled in this session")
    
    # Check for duplicate attendance
    existing = check_duplicate_attendance(db, session_id, current_user.id)
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this session")
    
    # Validate session timing (optional)
    # if not validate_session_timing(session):
    #     raise HTTPException(status_code=400, detail="Session check-in not available at this time")
    
    # Check if user has stored local face embedding
    if not current_user.face_embedding:
        raise HTTPException(
            status_code=400,
            detail="No face embedding on file. Please register your face first."
        )
    
    # Decode selfie
    try:
        selfie_base64 = request.selfie_base64
        if ',' in selfie_base64:
            selfie_base64 = selfie_base64.split(',')[1]
        selfie_bytes = base64.b64decode(selfie_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid selfie image: {str(e)}")
    
    # Verify using local ML model
    is_match = verify_face_ml(selfie_bytes, current_user.face_embedding)
    
    # If match fails, return without marking attendance
    if not is_match:
        return FaceVerifyResponse(
            success=False,
            is_match=False,
            similarity=0.0,
            message="Face verification failed. Please try again.",
        )
    
    # Geo verification
    geo_verified = True
    if request.latitude and request.longitude and session.campus_id:
        geo_verified = validate_geofence(request.latitude, request.longitude, session.campus_id, db)
    
    # Create attendance record
    attendance = Attendance(
        session_id=session_id,
        user_id=current_user.id,
        status=AttendanceStatus.PRESENT,
        method=AttendanceMethod.FACE,
        check_in_time=datetime.utcnow(),
        check_in_lat=request.latitude,
        check_in_lng=request.longitude,
        geo_verified=geo_verified,
        biometric_verified=True,
        is_present=True,
        marked_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    db.add(attendance)
    
    # Update enrollment status
    enrollment = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == session_id,
        SessionEnrollment.user_id == current_user.id
    ).first()
    if enrollment:
        from app.models.session import EnrollmentStatus
        enrollment.status = EnrollmentStatus.ATTENDED
    
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("attendance", "update", {
        "session_id": session_id,
        "user_id": current_user.id
    })
    db.refresh(attendance)
    
    return FaceVerifyResponse(
        success=True,
        is_match=True,
        similarity=100.0,
        message="Attendance marked successfully!",
        attendance_id=attendance.id,
    )


# ═══════════════════════════════════════════
# TRAINER ATTENDANCE MARKING
# ═══════════════════════════════════════════

@router.post("/mark-by-trainer", response_model=TrainerMarkResponse)
async def trainer_mark_attendance(
    request: TrainerMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trainer marks attendance for multiple trainees (Present/Absent).
    """
    # Verify trainer role
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role not in ["TRAINER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only trainers can mark attendance")
    
    # Validate session
    session = db.query(TrainingSession).filter(TrainingSession.id == request.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check trainer owns this session (unless supervisor/admin)
    if user_role == "TRAINER" and session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    
    # Parse status
    try:
        status = AttendanceStatus(request.status.upper())
    except ValueError:
        status = AttendanceStatus.PRESENT if request.status.upper() == "PRESENT" else AttendanceStatus.ABSENT
    
    results = {"success": [], "failed": []}
    
    for trainee_id in request.trainee_ids:
        # Verify trainee exists and is enrolled
        trainee = db.query(User).filter(User.id == trainee_id).first()
        if not trainee:
            results["failed"].append({
                "user_id": trainee_id,
                "error": "User not found"
            })
            continue
        
        if not validate_user_enrolled(db, request.session_id, trainee_id):
            results["failed"].append({
                "user_id": trainee_id,
                "error": "Not enrolled in session"
            })
            continue
        
        # Check for existing attendance
        existing = check_duplicate_attendance(db, request.session_id, trainee_id)
        if existing:
            # Update existing record
            existing.status = status
            existing.is_present = (status == AttendanceStatus.PRESENT)
            existing.notes = request.notes
            existing.updated_at = datetime.utcnow()
            results["success"].append({
                "user_id": trainee_id,
                "attendance_id": existing.id,
                "action": "updated"
            })
        else:
            # Create new attendance record
            attendance = Attendance(
                session_id=request.session_id,
                user_id=trainee_id,
                status=status,
                method=AttendanceMethod.TRAINER,
                check_in_time=datetime.utcnow() if status == AttendanceStatus.PRESENT else None,
                is_present=(status == AttendanceStatus.PRESENT),
                marked_by=current_user.id,
                notes=request.notes,
                created_at=datetime.utcnow()
            )
            db.add(attendance)
            db.flush()  # Get the ID
            
            results["success"].append({
                "user_id": trainee_id,
                "attendance_id": attendance.id,
                "action": "created"
            })
        
        # Update enrollment status if present
        if status == AttendanceStatus.PRESENT:
            enrollment = db.query(SessionEnrollment).filter(
                SessionEnrollment.session_id == request.session_id,
                SessionEnrollment.user_id == trainee_id
            ).first()
            if enrollment:
                from app.models.session import EnrollmentStatus
                enrollment.status = EnrollmentStatus.ATTENDED
    
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("attendance", "update", {
        "session_id": request.session_id,
        "trainer_id": current_user.id
    })
    
    return TrainerMarkResponse(
        success=len(results["failed"]) == 0,
        marked_count=len(results["success"]),
        failed_count=len(results["failed"]),
        details=results["success"] + results["failed"]
    )


# ═══════════════════════════════════════════
# QR CODE ATTENDANCE
# ═══════════════════════════════════════════

@router.post("/generate-qr", response_model=QRCodeResponse)
async def generate_session_qr(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate QR code for session attendance (trainers only).
    """
    qr_user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if qr_user_role not in ["TRAINER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only trainers can generate QR codes")
    
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if qr_user_role == "TRAINER" and session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    
    # Generate QR code data (session_id + timestamp + token)
    expires_at = datetime.utcnow() + timedelta(hours=2)
    qr_data = f"EDI_ATTENDANCE:{session_id}:{int(expires_at.timestamp())}"
    
    qr_base64 = generate_qr_code(qr_data)
    
    return QRCodeResponse(
        qr_code_data=qr_base64,
        qr_text=qr_data,
        expires_in=7200
    )


@router.post("/check-in", response_model=AttendanceResponse, status_code=201)
async def check_in_with_qr(
    check_in_data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check in to a session using QR code and geolocation.
    """
    session = db.query(TrainingSession).filter(
        TrainingSession.id == check_in_data.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user is enrolled
    if not validate_user_enrolled(db, check_in_data.session_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not enrolled in this session")
    
    # Check for duplicate
    existing = check_duplicate_attendance(db, check_in_data.session_id, current_user.id)
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in")
    
    # Validate QR code
    try:
        parts = check_in_data.qr_code.split(":")
        if len(parts) != 3 or parts[0] != "EDI_ATTENDANCE":
            raise ValueError("Invalid QR code format")
        
        qr_session_id = int(parts[1])
        expires_timestamp = int(parts[2])
        
        if qr_session_id != check_in_data.session_id:
            raise HTTPException(status_code=400, detail="QR code does not match session")
        
        if datetime.utcnow().timestamp() > expires_timestamp:
            raise HTTPException(status_code=400, detail="QR code has expired")
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    # Validate geofence
    geo_verified = True
    if session.campus_id:
        geo_verified = validate_geofence(
            check_in_data.latitude,
            check_in_data.longitude,
            session.campus_id,
            db
        )
    
    # Create attendance record
    attendance = Attendance(
        session_id=check_in_data.session_id,
        user_id=current_user.id,
        status=AttendanceStatus.PRESENT,
        method=AttendanceMethod.QR,
        check_in_time=datetime.utcnow(),
        check_in_lat=check_in_data.latitude,
        check_in_lng=check_in_data.longitude,
        geo_verified=geo_verified,
        qr_verified=True,
        is_present=True,
        marked_by=current_user.id,
        force_marked=not geo_verified,
        created_at=datetime.utcnow()
    )
    
    db.add(attendance)
    
    # Update enrollment status
    enrollment = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == check_in_data.session_id,
        SessionEnrollment.user_id == current_user.id
    ).first()
    if enrollment:
        from app.models.session import EnrollmentStatus
        enrollment.status = EnrollmentStatus.ATTENDED
    
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("attendance", "update", {
        "session_id": check_in_data.session_id,
        "user_id": current_user.id
    })
    db.refresh(attendance)
    
    return AttendanceResponse(
        id=attendance.id,
        session_id=attendance.session_id,
        user_id=attendance.user_id,
        status=attendance.status.value,
        method=attendance.method.value,
        check_in_time=attendance.check_in_time,
        geo_verified=attendance.geo_verified,
        marked_by=attendance.marked_by
    )


# ═══════════════════════════════════════════
# ATTENDANCE REPORTS
# ═══════════════════════════════════════════

@router.get("/session/{session_id}", response_model=List[AttendanceReportItem])
async def get_session_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get attendance report for a session.
    Trainers see their sessions, Supervisors/Admins see all.
    """
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Authorization check
    att_user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if att_user_role == "TRAINER" and session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attendances = db.query(Attendance).filter(
        Attendance.session_id == session_id
    ).all()
    
    result = []
    for att in attendances:
        user = db.query(User).filter(User.id == att.user_id).first()
        if user:
            result.append(AttendanceReportItem(
                attendance_id=att.id,
                user_id=user.id,
                employee_id=user.employee_id,
                full_name=user.full_name,
                status=att.status.value if att.status else "PRESENT",
                method=att.method.value if att.method else "TRAINER",
                check_in_time=att.check_in_time,
                face_match_score=att.face_match_score,
                selfie_url=generate_presigned_url(att.selfie_image_url) if att.selfie_image_url else None,
                geo_verified=att.geo_verified
            ))
    
    return result


@router.get("/user/{user_id}")
async def get_user_attendance_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get attendance history for a user.
    Users can see their own, Supervisors/Admins can see all.
    """
    # Authorization
    hist_user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if current_user.id != user_id and hist_user_role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attendances = db.query(Attendance).filter(
        Attendance.user_id == user_id
    ).order_by(Attendance.created_at.desc()).all()
    
    result = []
    for att in attendances:
        session = db.query(TrainingSession).filter(TrainingSession.id == att.session_id).first()
        result.append({
            "attendance_id": att.id,
            "session_id": att.session_id,
            "session_title": session.title if session else "Unknown",
            "session_date": session.scheduled_date if session else None,
            "status": att.status.value if att.status else "PRESENT",
            "method": att.method.value if att.method else "TRAINER",
            "check_in_time": att.check_in_time,
            "face_match_score": att.face_match_score,
            "geo_verified": att.geo_verified
        })
    
    return result


@router.get("/my-attendance")
async def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's attendance history.
    """
    return await get_user_attendance_history(current_user.id, db, current_user)
