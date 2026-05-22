"""
Enrollment API endpoints.
Handles session enrollment, RSVP, and cancellation.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.session import TrainingSession, SessionEnrollment, EnrollmentStatus, SessionStatus
from app.models.course import CourseEnrollment
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.api.auth import get_current_user
from app.api.ws import broadcast_change

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════

class EnrollmentCreate(BaseModel):
    session_id: int
    user_id: Optional[int] = None

class BulkEnrollmentCreate(BaseModel):
    session_id: int
    user_ids: List[int]


class EnrollmentResponse(BaseModel):
    id: int
    session_id: int
    session_title: str
    session_topic: str = "GENERAL"
    session_scheduled_date: datetime
    session_start_time: Optional[datetime] = None
    session_end_time: Optional[datetime] = None
    session_venue: Optional[str] = None
    session_status: Optional[str] = None
    trainer_name: Optional[str] = None
    description: Optional[str] = None
    user_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("/my-enrollments")
async def get_my_enrollments(
    status: Optional[EnrollmentStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all enrollments for the current user.
    """
    try:
        query = db.query(SessionEnrollment).filter(
            SessionEnrollment.user_id == current_user.id
        )
        
        if status:
            query = query.filter(SessionEnrollment.status == status)
        
        enrollments = query.all()
        
        result = []
        for enrollment in enrollments:
            session = db.query(TrainingSession).filter(
                TrainingSession.id == enrollment.session_id
            ).first()
            
            if session:
                # Get trainer name
                trainer = db.query(User).filter(User.id == session.trainer_id).first()
                result.append(EnrollmentResponse(
                    id=enrollment.id,
                    session_id=enrollment.session_id,
                    session_title=session.title,
                    session_topic=session.topic or "GENERAL",
                    session_scheduled_date=session.scheduled_date,
                    session_start_time=session.start_time,
                    session_end_time=session.end_time,
                    session_venue=session.venue_name,
                    session_status=session.status.value if session.status else None,
                    trainer_name=trainer.full_name if trainer else None,
                    description=session.description,
                    user_id=enrollment.user_id,
                    status=enrollment.status.value,
                    created_at=enrollment.created_at
                ))
        
        return result
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.post("", response_model=EnrollmentResponse, status_code=201)
async def enroll_in_session(
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enroll the current user in a training session.
    """
    # Check if session exists and is published
    session = db.query(TrainingSession).filter(
        TrainingSession.id == enrollment_data.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != SessionStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Session is not available for enrollment")
    
    # Determine which user to enroll
    target_user_id = current_user.id
    if enrollment_data.user_id and current_user.role in ["SUPERVISOR", "ADMIN"]:
        target_user_id = enrollment_data.user_id
    
    # Check if user is already enrolled
    existing = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == enrollment_data.session_id,
        SessionEnrollment.user_id == target_user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already enrolled in this session")
    
    # Check capacity
    enrolled_count = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == enrollment_data.session_id,
        SessionEnrollment.status.in_([EnrollmentStatus.ACCEPTED, EnrollmentStatus.INVITED])
    ).count()
    
    if enrolled_count >= session.max_capacity:
        raise HTTPException(status_code=400, detail="Session is full")
    
    # Create enrollment
    new_enrollment = SessionEnrollment(
        session_id=enrollment_data.session_id,
        user_id=target_user_id,
        status=EnrollmentStatus.ACCEPTED,
        created_at=datetime.utcnow()
    )
    
    db.add(new_enrollment)
            
    # Auto-enroll in matching Course based on topic
    try:
        from app.models.course import Course, CourseEnrollment
        matching_course = db.query(Course).filter(Course.topic == session.topic).first()
        
        # If no exact match, fallback to substring match
        if not matching_course:
            matching_course = db.query(Course).filter(Course.topic.ilike(f"%{session.topic}%")).first()
            
        # If still no match, fallback to first available course to guarantee they see something
        if not matching_course:
            matching_course = db.query(Course).first()
            
        if matching_course:
            existing_c_enroll = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == matching_course.id,
                CourseEnrollment.user_id == target_user_id
            ).first()
            if not existing_c_enroll:
                db.add(CourseEnrollment(
                    course_id=matching_course.id,
                    user_id=target_user_id,
                    progress=0,
                    status="ENROLLED",
                    enrolled_at=datetime.utcnow()
                ))
    except Exception as e:
        print(f"Auto course enrollment failed: {e}")
            
    # Send notification
    db.add(Notification(
        user_id=target_user_id,
        notification_type=NotificationType.TRAINING_INVITE,
        title="Session Enrollment Confirmed",
        body=f"You are now enrolled in: {session.title}",
        created_at=datetime.utcnow()
    ))
    
    db.commit()
    db.refresh(new_enrollment)
    
    response = EnrollmentResponse(
        id=new_enrollment.id,
        session_id=session.id,
        session_title=session.title,
        session_scheduled_date=session.scheduled_date,
        session_venue=session.venue_name,
        user_id=target_user_id,
        status=new_enrollment.status.value,
        created_at=new_enrollment.created_at
    )
    
    # Broadcast real-time update
    await broadcast_change("enrollment", "create", {
        "session_id": session.id,
        "user_id": target_user_id,
        "session_title": session.title,
    })
    
    # Broadcast notification
    await broadcast_change("notification", "create", {
        "title": "Session Enrollment Confirmed",
        "user_ids": [target_user_id],
        "sent_count": 1,
    })
    
    return response


@router.post("/bulk", status_code=201)
async def bulk_enroll(
    bulk_data: BulkEnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk enroll multiple trainees in a session (Supervisor/Admin only).
    """
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only supervisors can bulk enroll")
        
    session = db.query(TrainingSession).filter(TrainingSession.id == bulk_data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    success_ids = []
    skipped_ids = []
    
    for u_id in bulk_data.user_ids:
        # Check if already enrolled
        existing = db.query(SessionEnrollment).filter(
            SessionEnrollment.session_id == bulk_data.session_id,
            SessionEnrollment.user_id == u_id
        ).first()
        
        if existing:
            skipped_ids.append(u_id)
            continue
            
        # Create enrollment
        enrollment = SessionEnrollment(
            session_id=bulk_data.session_id,
            user_id=u_id,
            status=EnrollmentStatus.ACCEPTED,
            created_at=datetime.utcnow()
        )
        db.add(enrollment)
        
        # Auto-enroll in matching Course based on course_id or topic
        try:
            from app.models.course import Course, CourseEnrollment
            matching_course = None
            if session.course_id:
                matching_course = db.query(Course).filter(Course.id == session.course_id).first()
            if not matching_course:
                matching_course = db.query(Course).filter(Course.topic == session.topic).first()
            if matching_course:
                existing_c_enroll = db.query(CourseEnrollment).filter(
                    CourseEnrollment.course_id == matching_course.id,
                    CourseEnrollment.user_id == u_id
                ).first()
                if not existing_c_enroll:
                    db.add(CourseEnrollment(
                        course_id=matching_course.id,
                        user_id=u_id,
                        progress=0,
                        status="ENROLLED",
                        enrolled_at=datetime.utcnow()
                    ))
        except Exception as e:
            print(f"Auto course enrollment failed in bulk: {e}")
        
        # Notify
        db.add(Notification(
            user_id=u_id,
            notification_type=NotificationType.TRAINING_INVITE,
            title="Session Enrollment",
            body=f"You have been enrolled in: {session.title}",
            created_at=datetime.utcnow()
        ))
        success_ids.append(u_id)
        
    db.commit()
    
    return {
        "success": True, 
        "enrolled_count": len(success_ids),
        "skipped_count": len(skipped_ids),
        "details": {"successful": success_ids, "skipped": skipped_ids}
    }


@router.put("/{enrollment_id}/accept")
async def accept_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a session invitation (RSVP Yes)."""
    enrollment = db.query(SessionEnrollment).filter(
        SessionEnrollment.id == enrollment_id,
        SessionEnrollment.user_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    enrollment.status = EnrollmentStatus.ACCEPTED
    enrollment.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"success": True, "message": "Enrollment accepted"}


@router.put("/{enrollment_id}/decline")
async def decline_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Decline a session invitation (RSVP No)."""
    enrollment = db.query(SessionEnrollment).filter(
        SessionEnrollment.id == enrollment_id,
        SessionEnrollment.user_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    enrollment.status = EnrollmentStatus.DECLINED
    enrollment.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"success": True, "message": "Enrollment declined"}


@router.delete("/{enrollment_id}")
async def cancel_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel enrollment in a session."""
    enrollment = db.query(SessionEnrollment).filter(
        SessionEnrollment.id == enrollment_id,
        SessionEnrollment.user_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Don't allow cancellation if already attended
    if enrollment.status == EnrollmentStatus.ATTENDED:
        raise HTTPException(status_code=400, detail="Cannot cancel after attending")
    
    db.delete(enrollment)
    db.commit()
    
    return {"success": True, "message": "Enrollment cancelled"}
