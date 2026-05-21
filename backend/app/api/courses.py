"""
Courses API endpoints.
Handles CRUD for digital curriculum (Courses, Course Materials, Course Enrollments).
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.course import Course, CourseMaterial, CourseEnrollment
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.api.auth import get_current_user
from app.api.ws import broadcast_change

router = APIRouter(prefix="/courses", tags=["Courses"])

# ═══════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    trainer_id: Optional[int] = None
    status: Optional[str] = "DRAFT"
    thumbnail_url: Optional[str] = None

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topic: Optional[str] = None
    status: Optional[str] = None
    thumbnail_url: Optional[str] = None

class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    topic: str
    trainer_id: Optional[int] = None
    status: str
    thumbnail_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    trainer_name: Optional[str] = None
    material_count: int = 0
    enrolled_count: int = 0

    class Config:
        from_attributes = True

class CourseMaterialCreate(BaseModel):
    course_id: int
    title: str
    material_type: str
    content_url: Optional[str] = None
    quiz_data: Optional[dict] = None
    description: Optional[str] = None
    duration_seconds: Optional[int] = None
    order_index: Optional[int] = None

class CourseMaterialResponse(BaseModel):
    id: int
    course_id: int
    title: str
    material_type: str
    content_url: Optional[str]
    quiz_data: Optional[dict]
    description: Optional[str]
    duration_seconds: Optional[int]
    order_index: int
    created_at: datetime

    class Config:
        from_attributes = True

class EnrollmentCreate(BaseModel):
    user_ids: List[int]

class EnrollmentUpdate(BaseModel):
    progress: float

class EnrollmentResponse(BaseModel):
    id: int
    course_id: int
    user_id: int
    progress: float
    status: str
    enrolled_at: datetime
    completed_at: Optional[datetime]
    course: Optional[CourseResponse] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class QuizAttemptCreate(BaseModel):
    course_id: int
    score: float
    total_questions: int
    correct_answers: int
    passed: bool
    answers_json: Optional[dict] = None

class QuizAttemptResponse(BaseModel):
    id: int
    course_id: int
    material_id: int
    user_id: int
    score: float
    total_questions: int
    correct_answers: int
    passed: bool
    attempt_number: int
    answers_json: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True

# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("", response_model=List[CourseResponse])
def get_courses(
    status: Optional[str] = None,
    trainer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Course)
    if status:
        query = query.filter(Course.status == status)
    if trainer_id:
        query = query.filter(Course.trainer_id == trainer_id)
        
    courses = query.order_by(Course.created_at.desc()).all()
    
    result = []
    for c in courses:
        cdict = CourseResponse.from_orm(c).dict()
        trainer = db.query(User).filter(User.id == c.trainer_id).first()
        cdict["trainer_name"] = trainer.full_name if trainer else None
        cdict["material_count"] = db.query(CourseMaterial).filter(CourseMaterial.course_id == c.id).count()
        cdict["enrolled_count"] = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == c.id).count()
        result.append(CourseResponse(**cdict))
    return result

@router.post("", response_model=CourseResponse)
async def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new course.
    Only supervisors/admins can create courses.
    """
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only supervisors can create courses")

    course_data = data.dict()
    # Auto-assign trainer_id to current user if not specified
    if not course_data.get('trainer_id'):
        course_data['trainer_id'] = current_user.id
    new_course = Course(**course_data)
    db.add(new_course)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("course", "create", {
        "id": new_course.id,
        "title": new_course.title
    })
    
    db.refresh(new_course)
    return get_course(new_course.id, db, current_user)

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
        
    cdict = CourseResponse.from_orm(c).dict()
    trainer = db.query(User).filter(User.id == c.trainer_id).first()
    cdict["trainer_name"] = trainer.full_name if trainer else None
    cdict["material_count"] = db.query(CourseMaterial).filter(CourseMaterial.course_id == c.id).count()
    cdict["enrolled_count"] = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == c.id).count()
    return CourseResponse(**cdict)

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
        
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(c, field, value)
        
    c.updated_at = datetime.utcnow()
    db.commit()
    return get_course(course_id, db, current_user)

@router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hard delete a course and its related enrollments and materials.
    Supervisors only.
    """
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Cascade delete course materials, enrollments, and quiz attempts
    from app.models.course import CourseQuizAttempt
    db.query(CourseQuizAttempt).filter(CourseQuizAttempt.course_id == course_id).delete()
    db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).delete()
    db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).delete()
    
    db.delete(c)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("course", "delete", {
        "id": course_id
    })
    
    return {"success": True, "message": "Course permanently deleted"}

# ── Materials ──

@router.get("/{course_id}/materials", response_model=List[CourseMaterialResponse])
def get_materials(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    materials = db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).order_by(CourseMaterial.order_index).all()
    return materials

@router.post("/{course_id}/materials", response_model=CourseMaterialResponse)
async def add_material(
    course_id: int,
    data: CourseMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.course_id != course_id:
        data.course_id = course_id
        
    if data.order_index is None:
        max_order = db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).order_by(CourseMaterial.order_index.desc()).first()
        data.order_index = (max_order.order_index + 1) if max_order else 1

    new_mat = CourseMaterial(**data.dict())
    db.add(new_mat)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("course_material", "create", {
        "course_id": course_id,
        "id": new_mat.id
    })
    
    db.refresh(new_mat)
    return new_mat

@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mat = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
    if mat:
        db.delete(mat)
        db.commit()
        
        # Broadcast real-time update
        await broadcast_change("course_material", "delete", {
            "id": material_id
        })
    return {"success": True}

# ── Enrollments ──

@router.post("/{course_id}/enroll")
async def enroll_trainees(
    course_id: int,
    data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    title = course.title if course else f"Course {course_id}"
    
    for uid in data.user_ids:
        exists = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id, CourseEnrollment.user_id == uid).first()
        if not exists:
            db.add(CourseEnrollment(course_id=course_id, user_id=uid))
            # Create notification
            db.add(Notification(
                user_id=uid,
                notification_type=NotificationType.TRAINING_INVITE,
                title="New Course Assigned",
                body=f"You have been assigned to complete: {title}",
                created_at=datetime.utcnow()
            ))
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("course", "enroll", {
        "course_id": course_id,
        "user_ids": data.user_ids
    })
    # Broadcast notification to clients to trigger fetch
    await broadcast_change("notification", "create", {
        "title": "New Course Assigned",
        "user_ids": data.user_ids,
        "sent_count": len(data.user_ids),
    })
    return {"success": True}

@router.get("/user/{user_id}/enrollments", response_model=List[EnrollmentResponse])
def get_user_enrollments(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.user_id == user_id).all()
    result = []
    for e in enrollments:
        edict = EnrollmentResponse.from_orm(e).dict()
        course = db.query(Course).filter(Course.id == e.course_id).first()
        if course:
            cdict = CourseResponse.from_orm(course).dict()
            cdict["material_count"] = db.query(CourseMaterial).filter(CourseMaterial.course_id == course.id).count()
            edict["course"] = CourseResponse(**cdict)
        result.append(EnrollmentResponse(**edict))
    return result

@router.put("/{course_id}/progress/{user_id}", response_model=EnrollmentResponse)
def update_progress(
    course_id: int,
    user_id: int,
    data: EnrollmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id, CourseEnrollment.user_id == user_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
        
    enrollment.progress = data.progress
    if data.progress >= 100:
        enrollment.status = "COMPLETED"
        enrollment.completed_at = datetime.utcnow()
    else:
        enrollment.status = "IN_PROGRESS"
        
    db.commit()
    db.refresh(enrollment)
    return EnrollmentResponse.from_orm(enrollment)

# ── Quiz Attempts ──

@router.get("/materials/{material_id}/quiz-attempts", response_model=List[QuizAttemptResponse])
def get_quiz_attempts(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.course import CourseQuizAttempt
    attempts = db.query(CourseQuizAttempt).filter(
        CourseQuizAttempt.material_id == material_id,
        CourseQuizAttempt.user_id == current_user.id
    ).order_by(CourseQuizAttempt.created_at.desc()).all()
    return attempts

@router.post("/materials/{material_id}/quiz-attempts", response_model=QuizAttemptResponse)
def submit_quiz_attempt(
    material_id: int,
    data: QuizAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.course import CourseQuizAttempt
    
    # Calculate attempt number
    prev_attempts = db.query(CourseQuizAttempt).filter(
        CourseQuizAttempt.material_id == material_id,
        CourseQuizAttempt.user_id == current_user.id
    ).count()
    attempt_number = prev_attempts + 1
    
    new_attempt = CourseQuizAttempt(
        course_id=data.course_id,
        material_id=material_id,
        user_id=current_user.id,
        score=data.score,
        total_questions=data.total_questions,
        correct_answers=data.correct_answers,
        passed=data.passed,
        attempt_number=attempt_number,
        answers_json=data.answers_json
    )
    
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)
    return new_attempt
