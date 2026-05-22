"""
Reporting API endpoints.
Provides aggregated data and analytics for dashboards.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
import enum

from app.database import get_db
from app.models.user import User, UserRole
from app.models.session import TrainingSession, SessionEnrollment, SessionStatus, EnrollmentStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.assessment import AssessmentResult, AssessmentType
from app.api.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get high-level organization-wide statistics for the admin/supervisor dashboard.
    """
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to view dashboard stats")

    # Overall sessions count
    total_sessions = db.query(func.count(TrainingSession.id)).scalar()
    completed_sessions = db.query(func.count(TrainingSession.id)).filter(
        TrainingSession.status == SessionStatus.COMPLETED
    ).scalar()

    # Overall trainees count
    total_trainees = db.query(func.count(User.id)).filter(
        User.role == UserRole.TRAINEE
    ).scalar()

    # Total enrollments
    total_enrollments = db.query(func.count(SessionEnrollment.id)).filter(
        SessionEnrollment.status != EnrollmentStatus.DECLINED
    ).scalar()

    # Average attendance rate
    total_attendance_records = db.query(func.count(Attendance.id)).scalar()
    present_count = db.query(func.count(Attendance.id)).filter(
        Attendance.is_present == True
    ).scalar()
    attendance_rate = (present_count / total_attendance_records * 100) if total_attendance_records > 0 else 0.0

    # Overall pass rate
    total_assessments = db.query(func.count(AssessmentResult.id)).filter(
        AssessmentResult.assessment_type == AssessmentType.POST_TEST
    ).scalar()
    passed_assessments = db.query(func.count(AssessmentResult.id)).filter(
        AssessmentResult.assessment_type == AssessmentType.POST_TEST,
        AssessmentResult.passed == True
    ).scalar()
    pass_rate = (passed_assessments / total_assessments * 100) if total_assessments > 0 else 0.0

    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_trainees": total_trainees,
        "total_enrollments": total_enrollments,
        "attendance_rate": round(attendance_rate, 2),
        "pass_rate": round(pass_rate, 2),
        "generated_at": datetime.utcnow()
    }


@router.get("/attendance")
async def get_attendance_report(
    session_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get session attendance statistics.
    """
    query = db.query(
        Attendance.status,
        func.count(Attendance.id).label("count")
    )

    if session_id:
        query = query.filter(Attendance.session_id == session_id)
        # Check permissions
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if session and current_user.role == UserRole.TRAINER and session.trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this session's report")
    
    # Global filters based on role
    if current_user.role == UserRole.TRAINER and not session_id:
        # Trainers only see attendance for their own sessions
        trainer_sessions = db.query(TrainingSession.id).filter(TrainingSession.trainer_id == current_user.id).subquery()
        query = query.filter(Attendance.session_id.in_(trainer_sessions))

    # Apply date filters
    if start_date:
        query = query.filter(Attendance.created_at >= start_date)
    if end_date:
        query = query.filter(Attendance.created_at <= end_date)

    stats = query.group_by(Attendance.status).all()
    
    result = {
        "PRESENT": 0,
        "ABSENT": 0,
        "LATE": 0,
        "EXCUSED": 0,
        "total": 0
    }
    
    for status, count in stats:
        if isinstance(status, enum.Enum):
            result[status.value] = count
        else:
            result[status] = count
        result["total"] += count
        
    return {
        "stats": result,
        "attendance_rate": round((result["PRESENT"] + result["LATE"]) / result["total"] * 100, 2) if result["total"] > 0 else 0.0,
        "session_id": session_id
    }


@router.get("/sessions")
async def get_session_report(
    trainer_id: Optional[int] = None,
    status: Optional[SessionStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get session completion metrics.
    """
    query = db.query(
        TrainingSession.id,
        TrainingSession.title,
        TrainingSession.status,
        func.count(SessionEnrollment.id).label("enrollments")
    ).outerjoin(
        SessionEnrollment, 
        and_(SessionEnrollment.session_id == TrainingSession.id, SessionEnrollment.status != EnrollmentStatus.DECLINED)
    )

    if current_user.role == UserRole.TRAINER:
        query = query.filter(TrainingSession.trainer_id == current_user.id)
    elif trainer_id:
        query = query.filter(TrainingSession.trainer_id == trainer_id)
        
    if status:
        query = query.filter(TrainingSession.status == status)
        
    sessions = query.group_by(TrainingSession.id).all()
    
    result = []
    for s_id, title, s_status, enrollments in sessions:
        # Get pass rate for this session
        total_assessments = db.query(func.count(AssessmentResult.id)).filter(
            AssessmentResult.session_id == s_id,
            AssessmentResult.assessment_type == AssessmentType.POST_TEST
        ).scalar()
        
        passed_assessments = db.query(func.count(AssessmentResult.id)).filter(
            AssessmentResult.session_id == s_id,
            AssessmentResult.assessment_type == AssessmentType.POST_TEST,
            AssessmentResult.passed == True
        ).scalar()
        
        pass_rate = (passed_assessments / total_assessments * 100) if total_assessments > 0 else 0.0
        
        result.append({
            "session_id": s_id,
            "title": title,
            "status": s_status.value if isinstance(s_status, enum.Enum) else s_status,
            "enrollments": enrollments,
            "pass_rate": round(pass_rate, 2),
            "assessments_taken": total_assessments
        })
        
    return {"data": result}


@router.get("/performance/{user_id}")
async def get_user_performance_report(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get individual trainee progress.
    """
    # Permission check: Users can see their own, Trainers/Supervisors can see anyone
    if current_user.role == UserRole.TRAINEE and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's performance")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Enrollments for Sessions
    session_enrollments = db.query(SessionEnrollment).filter(
        SessionEnrollment.user_id == user_id,
        SessionEnrollment.status != EnrollmentStatus.DECLINED
    ).all()
    total_enrolled_sessions = len(session_enrollments)
    
    # Enrollments for Courses
    from app.models.course import CourseEnrollment
    course_enrollments = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == user_id
    ).all()
    
    courses_data = []
    for ce in course_enrollments:
        courses_data.append({
            "course_id": ce.course.id,
            "title": ce.course.title,
            "progress": ce.progress,
            "status": ce.status
        })

    # Attendance
    attendance_records = db.query(Attendance).filter(
        Attendance.user_id == user_id
    ).order_by(Attendance.created_at.desc()).all()
    
    total_attendance = len(attendance_records)
    present_count = sum(1 for a in attendance_records if a.is_present)
    attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0.0
    
    history_data = []
    for a in attendance_records[:10]:
        history_data.append({
            "session": {"title": a.session.title if a.session else "Unknown"},
            "check_in_time": a.check_in_time,
            "status": a.status.value if isinstance(a.status, enum.Enum) else a.status
        })
    
    # Assessments
    results = db.query(AssessmentResult).filter(
        AssessmentResult.user_id == user_id,
        AssessmentResult.assessment_type == AssessmentType.POST_TEST
    ).all()
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r.passed)
    avg_score = sum(r.score_percentage for r in results) / total_tests if total_tests > 0 else 0.0
    
    return {
        "data": {
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "employee_id": user.employee_id,
                "department": user.department
            },
            "summary": {
                "total_sessions_enrolled": total_enrolled_sessions,
                "total_sessions_attended": present_count,
                "attendance_rate": round(attendance_rate, 2),
                "total_assessments": total_tests,
                "assessments_passed": passed_tests,
                "certificates_earned": passed_tests, # Mocked as passed
                "average_score": round(avg_score, 2)
            },
            "attendance_history": history_data,
            "enrolled_courses": courses_data
        }
    }


@router.get("/trainer")
async def get_trainer_report(
    trainer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get trainer activity summary.
    """
    target_id = trainer_id if trainer_id else current_user.id
    
    if current_user.role == UserRole.TRAINEE:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if current_user.role == UserRole.TRAINER and target_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other trainers' reports")
        
    trainer = db.query(User).filter(User.id == target_id, User.role == UserRole.TRAINER).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
        
    # Sessions count
    total_sessions = db.query(func.count(TrainingSession.id)).filter(
        TrainingSession.trainer_id == target_id
    ).scalar()
    
    completed_sessions = db.query(func.count(TrainingSession.id)).filter(
        TrainingSession.trainer_id == target_id,
        TrainingSession.status == SessionStatus.COMPLETED
    ).scalar()
    
    # Total trainees taught
    # Get all sessions for this trainer
    trainer_session_ids = db.query(TrainingSession.id).filter(
        TrainingSession.trainer_id == target_id
    ).subquery()
    
    # Count unique users enrolled in those sessions
    total_trainees_taught = db.query(func.count(func.distinct(SessionEnrollment.user_id))).filter(
        SessionEnrollment.session_id.in_(trainer_session_ids),
        SessionEnrollment.status == EnrollmentStatus.ATTENDED
    ).scalar()
    
    # Average session rating (assuming feedback table exists, skipping if not)
    # This is a placeholder since feedback model wasn't provided in detail
    
    return {
        "trainer_id": trainer.id,
        "full_name": trainer.full_name,
        "total_sessions_created": total_sessions,
        "sessions_completed": completed_sessions,
        "total_trainees_taught": total_trainees_taught
    }


@router.get("/monthly")
async def get_monthly_report(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get monthly training metrics for the specified year.
    """
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    target_year = year if year else datetime.utcnow().year
    
    # Count sessions per month
    sessions_by_month = db.query(
        extract('month', TrainingSession.scheduled_date).label('month'),
        func.count(TrainingSession.id).label('count')
    ).filter(
        extract('year', TrainingSession.scheduled_date) == target_year
    ).group_by(
        extract('month', TrainingSession.scheduled_date)
    ).all()
    
    # Format the data
    monthly_data = {month: 0 for month in range(1, 13)}
    for month, count in sessions_by_month:
        if month:
            monthly_data[int(month)] = count
            
    months_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    result = [
        {
            "month": months_labels[i-1],
            "month_num": i,
            "sessions_count": monthly_data[i]
        }
        for i in range(1, 13)
    ]
    
    return {
        "year": target_year,
        "monthly_data": result
    }
