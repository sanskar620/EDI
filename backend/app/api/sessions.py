"""
Training Sessions API endpoints.
Handles CRUD operations for training sessions.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.session import TrainingSession, SessionStatus, Module
from app.models.material import Material
from app.models.user import User
from app.api.auth import get_current_user
from app.api.ws import broadcast_change

router = APIRouter(prefix="/sessions", tags=["Sessions"])


# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════

class SessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    module_code: Optional[str] = None
    trainer_id: Optional[int] = None
    scheduled_date: datetime
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    venue_name: str
    campus_id: Optional[int] = None
    max_capacity: int = 30
    pre_test_enabled: bool = False
    post_test_enabled: bool = False
    passing_threshold: float = 70.0


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    venue_name: Optional[str] = None
    status: Optional[SessionStatus] = None
    max_capacity: Optional[int] = None


class SessionResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    topic: str
    module_code: Optional[str] = None
    scheduled_date: datetime
    start_time: datetime
    end_time: datetime
    duration_minutes: Optional[int] = None
    venue_name: Optional[str] = None
    trainer_id: int
    trainer_name: Optional[str] = None
    status: str
    max_capacity: Optional[int] = None
    enrolled_count: int = 0
    is_materials_released: bool
    pre_test_enabled: bool
    post_test_enabled: bool
    passing_threshold: float
    created_at: datetime

    class Config:
        from_attributes = True


class MaterialBriefResponse(BaseModel):
    id: int
    title: str
    material_type: str
    s3_key: str
    order_number: int
    duration_seconds: Optional[int] = None
    
    class Config:
        from_attributes = True

class ModuleResponse(BaseModel):
    id: int
    session_id: int
    title: str
    order_number: int
    materials: List[MaterialBriefResponse] = []
    
    class Config:
        from_attributes = True


class ModuleCreate(BaseModel):
    title: str
    order_number: Optional[int] = None

class FeedbackCreate(BaseModel):
    content_quality: float
    trainer_effectiveness: float
    materials_quality: float
    venue_facilities: float
    overall_rating: float
    comments: Optional[str] = None

# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("", response_model=List[SessionResponse])
async def list_sessions(
    status: Optional[SessionStatus] = None,
    trainer_id: Optional[int] = None,
    topic: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List training sessions with optional filters.
    - Trainers see only their sessions
    - Trainees see published sessions they can enroll in
    - Supervisors see all sessions
    """
    query = db.query(TrainingSession)
    
    # Role-based filtering
    if current_user.role == "TRAINER":
        query = query.filter(TrainingSession.trainer_id == current_user.id)
    elif current_user.role == "TRAINEE":
        query = query.filter(TrainingSession.status == SessionStatus.PUBLISHED)
    
    # Apply filters
    if status:
        query = query.filter(TrainingSession.status == status)
    if trainer_id:
        query = query.filter(TrainingSession.trainer_id == trainer_id)
    if topic:
        query = query.filter(TrainingSession.topic.ilike(f"%{topic}%"))
    
    sessions = query.offset(skip).limit(limit).all()
    
    # Add trainer name and enrollment count
    result = []
    for session in sessions:
        session_dict = SessionResponse.from_orm(session).dict()
        
        # Get trainer name
        trainer = db.query(User).filter(User.id == session.trainer_id).first()
        session_dict["trainer_name"] = trainer.full_name if trainer else None
        
        # Get enrollment count
        from app.models.session import SessionEnrollment
        enrolled_count = db.query(SessionEnrollment).filter(
            SessionEnrollment.session_id == session.id
        ).count()
        session_dict["enrolled_count"] = enrolled_count
        
        result.append(SessionResponse(**session_dict))
    
    return result


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific session."""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "TRAINER" and session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
    
    # Build response
    session_dict = SessionResponse.from_orm(session).dict()
    
    trainer = db.query(User).filter(User.id == session.trainer_id).first()
    session_dict["trainer_name"] = trainer.full_name if trainer else None
    
    from app.models.session import SessionEnrollment
    enrolled_count = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == session.id
    ).count()
    session_dict["enrolled_count"] = enrolled_count
    
    return SessionResponse(**session_dict)


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new training session.
    Only supervisors/admins can create sessions.
    """
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only supervisors can create sessions")
    
    session_dict = session_data.dict(exclude_unset=True)
    trainer_id = session_dict.pop("trainer_id", current_user.id)
    
    # Create session
    new_session = TrainingSession(
        **session_dict,
        trainer_id=trainer_id,
        status=SessionStatus.DRAFT,
        is_materials_released=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_session)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("session", "create", {
        "id": new_session.id,
        "title": new_session.title
    })
    db.refresh(new_session)
    
    # Build response
    session_dict = SessionResponse.from_orm(new_session).dict()
    session_dict["trainer_name"] = current_user.full_name
    session_dict["enrolled_count"] = 0
    
    return SessionResponse(**session_dict)


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing session.
    Only the session's trainer can update it.
    """
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if current_user.role == "TRAINER" and session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this session")
    
    # Update fields
    update_data = session_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    session.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("session", "update", {
        "id": session.id,
        "title": session.title,
        "status": session.status.value if hasattr(session.status, 'value') else str(session.status)
    })
    db.refresh(session)
    
    # Build response
    session_dict = SessionResponse.from_orm(session).dict()
    trainer = db.query(User).filter(User.id == session.trainer_id).first()
    session_dict["trainer_name"] = trainer.full_name if trainer else None
    
    from app.models.session import SessionEnrollment
    enrolled_count = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == session.id
    ).count()
    session_dict["enrolled_count"] = enrolled_count
    
    return SessionResponse(**session_dict)


@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel/delete a session.
    Only the session's trainer or supervisor can delete it.
    """
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Permission check
    if current_user.role == "TRAINER" and session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
    
    if current_user.role == "TRAINEE":
        raise HTTPException(status_code=403, detail="Trainees cannot delete sessions")
    
    # Hard Delete - cascade remove related records
    from app.models.session import SessionEnrollment
    from app.models.attendance import Attendance
    from app.models.material import Material
    from app.models.assessment import AssessmentSession, AssessmentResult
    
    # 1. Delete enrollments
    db.query(SessionEnrollment).filter(SessionEnrollment.session_id == session_id).delete()
    
    # 2. Delete attendance
    db.query(Attendance).filter(Attendance.session_id == session_id).delete()
    
    # 3. Delete materials
    db.query(Material).filter(Material.session_id == session_id).delete()
    
    # 4. Delete assessments
    db.query(AssessmentResult).filter(AssessmentResult.session_id == session_id).delete()
    db.query(AssessmentSession).filter(AssessmentSession.session_id == session_id).delete()
    
    # Finally delete the session itself
    db.delete(session)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("session", "delete", {
        "id": session.id,
        "action": "deleted"
    })
    
    return {"success": True, "message": "Session and all related data permanently deleted"}


@router.get("/{session_id}/enrollments")
async def get_session_enrollments(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of users enrolled in a session."""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "TRAINER" and session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view enrollments")
    
    from app.models.session import SessionEnrollment
    enrollments = db.query(SessionEnrollment).filter(
        SessionEnrollment.session_id == session_id
    ).all()
    
    result = []
    for enrollment in enrollments:
        user = db.query(User).filter(User.id == enrollment.user_id).first()
        if user:
            result.append({
                "enrollment_id": enrollment.id,
                "user_id": user.id,
                "employee_id": user.employee_id,
                "full_name": user.full_name,
                "status": enrollment.status,
                "created_at": enrollment.created_at
            })
    
    return result


@router.post("/{session_id}/modules", response_model=ModuleResponse, status_code=201)
async def create_module(
    session_id: int,
    module_data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new module for a session."""
    _role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if _role not in ["TRAINER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Auto-assign order_number if not provided
    if module_data.order_number is None:
        max_order = db.query(Module).filter(Module.session_id == session_id).order_by(Module.order_number.desc()).first()
        order_number = max_order.order_number + 1 if max_order else 1
    else:
        order_number = module_data.order_number
        
    new_module = Module(
        session_id=session_id,
        title=module_data.title,
        order_number=order_number,
        created_at=datetime.utcnow()
    )
    
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    
    # Return with empty materials list
    result = ModuleResponse.from_orm(new_module).dict()
    result["materials"] = []
    return result


@router.get("/{session_id}/modules", response_model=List[ModuleResponse])
async def get_session_modules(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all modules for a session with their materials."""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    modules = db.query(Module).filter(Module.session_id == session_id).order_by(Module.order_number).all()
    
    result = []
    for module in modules:
        materials = db.query(Material).filter(
            Material.module_id == module.id,
            Material.is_active == True
        ).order_by(Material.order_number).all()
        
        module_dict = ModuleResponse.from_orm(module).dict()
        module_dict["materials"] = [MaterialBriefResponse.from_orm(m) for m in materials]
        result.append(module_dict)
        
    return result


@router.delete("/modules/{module_id}")
async def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a module and its materials link (cascade handled in DB or ORM)."""
    _role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if _role not in ["TRAINER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
        
    db.delete(module)
    db.commit()
    return {"success": True, "message": "Module deleted successfully"}

@router.post("/{session_id}/feedback", status_code=201)
async def submit_feedback(
    session_id: int,
    feedback_data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit feedback for a session."""
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    from app.models.feedback import SessionFeedback
    
    # Check if already submitted
    existing = db.query(SessionFeedback).filter(
        SessionFeedback.session_id == session_id,
        SessionFeedback.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this session")
        
    new_feedback = SessionFeedback(
        session_id=session_id,
        user_id=current_user.id,
        role=current_user.role,
        trainer_clarity=feedback_data.trainer_effectiveness,
        content_relevance=feedback_data.content_quality,
        venue_quality=feedback_data.venue_facilities,
        overall_rating=feedback_data.overall_rating,
        comment=feedback_data.comments
    )
    
    db.add(new_feedback)
    db.commit()
    
    return {"success": True, "message": "Feedback submitted successfully"}

