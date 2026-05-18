"""
Certificates API endpoints.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.certificate import Certificate
from app.models.user import User
from app.models.session import TrainingSession
from app.models.course import Course
from app.api.auth import get_current_user
import os
import uuid
from PIL import Image, ImageDraw, ImageFont
from fastapi import File, UploadFile, Form

router = APIRouter(prefix="/certificates", tags=["Certificates"])

# ═══════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════

class SessionInfo(BaseModel):
    title: str
    topic: str

class CertificateResponse(BaseModel):
    id: int
    certificate_uid: str
    user_id: int
    session_id: Optional[int] = None
    course_id: Optional[int] = None
    module_name: str
    score_percentage: float
    passed: bool
    issued_date: datetime
    expiry_date: datetime
    is_expired: bool
    certificate_s3_key: Optional[str] = None
    created_at: datetime
    session: Optional[SessionInfo] = None

    class Config:
        from_attributes = True

# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("/user/{user_id}", response_model=List[CertificateResponse])
def get_user_certificates(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all certificates for a specific user."""
    if current_user.id != user_id and current_user.role not in ["TRAINER", "SUPERVISOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to view these certificates")
        
    certs = db.query(Certificate).filter(Certificate.user_id == user_id).order_by(Certificate.created_at.desc()).all()
    
    result = []
    for cert in certs:
        cert_dict = CertificateResponse.from_orm(cert).dict()
        
        # Include session/course info
        title = cert.module_name
        topic = ""
        
        if cert.session_id:
            session = db.query(TrainingSession).filter(TrainingSession.id == cert.session_id).first()
            if session:
                title = session.title
                topic = session.topic
        elif cert.course_id:
            course = db.query(Course).filter(Course.id == cert.course_id).first()
            if course:
                title = course.title
                topic = course.topic
                
        cert_dict["session"] = {
            "title": title,
            "topic": topic
        }
        
        result.append(CertificateResponse(**cert_dict))
        
    return result

# ═══════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════

def upload_to_local(file: UploadFile, folder: str = "certificates") -> str:
    try:
        os.makedirs(f"uploads/{folder}", exist_ok=True)
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = f"uploads/{folder}/{unique_filename}"
        
        file_content = file.file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        return f"/uploads/{folder}/{unique_filename}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload", response_model=CertificateResponse)
def upload_certificate(
    user_id: int = Form(...),
    session_id: int = Form(...),
    module_name: str = Form("Course Completion"),
    score_percentage: float = Form(100.0),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a certificate for a trainee (Trainer/Supervisor only)."""
    if current_user.role not in ["TRAINER", "SUPERVISOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to upload certificates")
        
    # Verify session exists
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Check if a certificate already exists for this user and session
    existing_cert = db.query(Certificate).filter(
        Certificate.user_id == user_id, 
        Certificate.session_id == session_id
    ).first()
    
    file_url = upload_to_local(file)
    
    if existing_cert:
        existing_cert.certificate_s3_key = file_url
        existing_cert.score_percentage = score_percentage
        existing_cert.module_name = module_name
        db.commit()
        db.refresh(existing_cert)
        cert = existing_cert
    else:
        # Create new certificate
        cert = Certificate(
            certificate_uid=f"CERT-{uuid.uuid4().hex[:8].upper()}",
            user_id=user_id,
            session_id=session_id,
            module_name=module_name,
            score_percentage=score_percentage,
            passed=True,
            issued_date=datetime.utcnow(),
            expiry_date=datetime.utcnow(), # Need to set appropriate expiry
            is_expired=False,
            certificate_s3_key=file_url
        )
        db.add(cert)
        db.commit()
        db.refresh(cert)
        
    cert_dict = CertificateResponse.from_orm(cert).dict()
    cert_dict["session"] = {
        "title": session.title,
        "topic": session.topic
    }
    return CertificateResponse(**cert_dict)


@router.post("/generate", response_model=CertificateResponse)
def generate_certificate(
    user_id: int,
    session_id: Optional[int] = None,
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-generate a certificate when a user completes a course or session."""
    if current_user.id != user_id and current_user.role not in ["TRAINER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not session_id and not course_id:
        raise HTTPException(status_code=400, detail="Either session_id or course_id must be provided")

    # Verify session/course and user
    title = "Training"
    trainer_name = "Supervisor"
    
    if session_id:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        title = session.title or "Training"
        if session.trainer_id:
            trainer = db.query(User).filter(User.id == session.trainer_id).first()
            if trainer and trainer.full_name:
                trainer_name = trainer.full_name
    else:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        title = course.title or "Course"
        if course.trainer_id:
            trainer = db.query(User).filter(User.id == course.trainer_id).first()
            if trainer and trainer.full_name:
                trainer_name = trainer.full_name
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if a certificate already exists
    query = db.query(Certificate).filter(Certificate.user_id == user_id)
    if session_id:
        query = query.filter(Certificate.session_id == session_id)
    else:
        query = query.filter(Certificate.course_id == course_id)
        
    existing_cert = query.first()
    
    if existing_cert and existing_cert.certificate_s3_key:
        # Return existing certificate if it was already generated
        cert_dict = CertificateResponse.from_orm(existing_cert).dict()
        cert_dict["session"] = {"title": title, "topic": ""}
        return CertificateResponse(**cert_dict)
        
    # Load fonts
    try:
        font_large = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 110)
        font_medium = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 50)
        font_bold = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 38)
    except:
        font_large = ImageFont.load_default()
        font_medium = font_large
        font_bold = font_large

    # Generate Image
    template_path = 'uploads/certificates/Certificate.png'
    if not os.path.exists(template_path):
        raise HTTPException(status_code=500, detail="Certificate template missing on server")
        
    img = Image.open(template_path)
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # Erase old text using white rectangles
    draw.rectangle([(w*0.15, h*0.48), (w*0.85, h*0.56)], fill=(255, 255, 255))
    draw.rectangle([(w*0.15, h*0.62), (w*0.85, h*0.67)], fill=(255, 255, 255))
    draw.rectangle([(w*0.05, h*0.85), (w*0.45, h*0.92)], fill=(255, 255, 255))

    DARK = (45, 45, 45)
    GRAY = (80, 80, 80)

    # 1. Trainee Name
    t_name = f'"{user.full_name.upper()}"'
    bbox = draw.textbbox((0, 0), t_name, font=font_large)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, int(h * 0.48)), t_name, font=font_large, fill=DARK)

    # Draw a line under trainee name
    line_y = int(h * 0.58)
    draw.line([(w * 0.35, line_y), (w * 0.65, line_y)], fill=DARK, width=3)

    # 2. Course Name
    c_name = title
    c_text = f'Have completed the "{c_name}" Successfully'
    bbox2 = draw.textbbox((0, 0), c_text, font=font_medium)
    cw = bbox2[2] - bbox2[0]
    draw.text(((w - cw) // 2, int(h * 0.63)), c_text, font=font_medium, fill=GRAY)

    # 3. Supervisor Name
    s_name = trainer_name
    bbox3 = draw.textbbox((0, 0), s_name, font=font_bold)
    sw = bbox3[2] - bbox3[0]
    draw.text((int(w * 0.31) - sw//2, int(h * 0.865)), s_name, font=font_bold, fill=DARK)

    # Save
    os.makedirs("uploads/certificates/generated", exist_ok=True)
    filename = f"{uuid.uuid4()}.png"
    file_path = f"uploads/certificates/generated/{filename}"
    img.save(file_path)
    file_url = f"/{file_path}"
    
    if existing_cert:
        existing_cert.certificate_s3_key = file_url
        db.commit()
        db.refresh(existing_cert)
        cert = existing_cert
    else:
        cert = Certificate(
            certificate_uid=f"CERT-{uuid.uuid4().hex[:8].upper()}",
            user_id=user_id,
            session_id=session_id,
            course_id=course_id,
            module_name=title,
            score_percentage=100.0,
            passed=True,
            issued_date=datetime.utcnow(),
            expiry_date=datetime.utcnow(),
            is_expired=False,
            certificate_s3_key=file_url
        )
        db.add(cert)
        db.commit()
        db.refresh(cert)
        
    cert_dict = CertificateResponse.from_orm(cert).dict()
    cert_dict["session"] = {"title": title, "topic": ""}
    return CertificateResponse(**cert_dict)
