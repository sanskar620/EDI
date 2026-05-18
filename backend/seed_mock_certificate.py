import os
import sys
from datetime import datetime, timedelta

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.models.course import Course, CourseEnrollment
from app.models.session import TrainingSession, SessionEnrollment, EnrollmentStatus, SessionStatus
from app.models.attendance import Attendance
from app.models.certificate import Certificate

def seed_certificate():
    db = SessionLocal()
    try:
        # Find user EMP001
        user = db.query(User).filter(User.employee_id == 'EMP001').first()
        if not user:
            print("User EMP001 not found.")
            return

        print(f"Found user: {user.full_name} ({user.id})")

        # Create a mock past session
        past_date = datetime.utcnow() - timedelta(days=10)
        
        session = TrainingSession(
            title="Fire Safety & Compliance 101",
            description="Mock past session for testing certificates.",
            topic="Compliance",
            scheduled_date=past_date,
            start_time=past_date,
            end_time=past_date + timedelta(hours=2),
            duration_minutes=120,
            venue_name="Main Hall A",
            trainer_id=user.id, # Assign random trainer
            status=SessionStatus.COMPLETED,
            max_capacity=30,
            is_materials_released=True,
            created_at=past_date - timedelta(days=5)
        )
        db.add(session)
        db.flush() # get ID

        print(f"Created Session ID: {session.id}")

        # Enroll user
        enrollment = SessionEnrollment(
            session_id=session.id,
            user_id=user.id,
            status=EnrollmentStatus.ATTENDED,
            created_at=past_date - timedelta(days=2)
        )
        db.add(enrollment)

        # Create Attendance
        attendance = Attendance(
            session_id=session.id,
            user_id=user.id,
            status="PRESENT",
            check_in_time=past_date,
            method="FACE",
            is_present=True
        )
        db.add(attendance)
        
        db.flush()

        # Check if certificated template exists
        cert_path = "upload/certificates/template.pdf"
        
        # Create Certificate
        import uuid
        cert = Certificate(
            certificate_uid=str(uuid.uuid4()),
            user_id=user.id,
            session_id=session.id,
            module_name="Fire Safety & Compliance 101",
            score_percentage=95.0,
            passed=True,
            certificate_s3_key=cert_path,
            issued_date=past_date + timedelta(hours=2),
            expiry_date=past_date + timedelta(days=365)
        )
        db.add(cert)
        
        # Create Assessment Result for Performance metrics
        from app.models.assessment import AssessmentResult, AssessmentType
        result = AssessmentResult(
            assessment_session_id=999, # mock assessment session id
            session_id=session.id,
            user_id=user.id,
            assessment_type=AssessmentType.POST_TEST,
            total_questions=10,
            correct_answers=9,
            score_percentage=95.0,
            passed=True
        )
        db.add(result)
        
        db.commit()
        print("Successfully seeded mock session, attendance, and certificate for EMP001.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_certificate()
