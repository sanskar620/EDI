import os
import sys
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.models.course import Course, CourseEnrollment
from app.models.session import TrainingSession, SessionEnrollment, SessionStatus, EnrollmentStatus, Module, SessionMaterial
from app.models.material import Material, MaterialType

def seed_emp001_data():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.employee_id == 'EMP001').first()
        if not user:
            print("User EMP001 not found.")
            return

        trainer = db.query(User).filter(User.role == 'TRAINER').first()
        if not trainer:
            print("No trainer found.")
            return
            
        now = datetime.utcnow()
        
        # 1. Add 5 Mock Courses with modules and materials
        for i in range(1, 6):
            title = f"Mock Training Course {i}"
            course = db.query(Course).filter(Course.title == title).first()
            if not course:
                course = Course(
                    title=title,
                    description=f"A comprehensive mock course #{i} for EMP001.",
                    topic="Technical Skills",
                    status="PUBLISHED",
                    trainer_id=trainer.id,
                    created_at=now
                )
                db.add(course)
                db.commit()
                db.refresh(course)
                print(f"Created course: {course.title}")
                
                # Add materials to the course
                from app.models.course import CourseMaterial
                # 1. PDF
                pdf = CourseMaterial(
                    course_id=course.id,
                    title="Course Introduction PDF",
                    material_type="PDF",
                    content_url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    order_index=1
                )
                # 2. Video
                vid = CourseMaterial(
                    course_id=course.id,
                    title="Training Video",
                    material_type="VIDEO",
                    content_url="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    duration_seconds=596,
                    order_index=2
                )
                # 3. Quiz
                quiz = CourseMaterial(
                    course_id=course.id,
                    title="Final Quiz",
                    material_type="QUIZ",
                    quiz_data={
                        "questions": [
                            {"question": "What is 2+2?", "options": ["3", "4", "5"], "correctIndex": 1}
                        ]
                    },
                    order_index=3
                )
                db.add_all([pdf, vid, quiz])
                db.commit()
            
            # Enroll EMP001 in the course
            enrollment = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course.id,
                CourseEnrollment.user_id == user.id
            ).first()
            if not enrollment:
                enrollment = CourseEnrollment(
                    course_id=course.id,
                    user_id=user.id,
                    progress=0,
                    enrolled_at=now
                )
                db.add(enrollment)
            
        db.commit()
        
        # 2. Add 5 active Sessions in "Attending" tab (start_time <= now <= end_time)
        for i in range(1, 6):
            session_title = f"Active Attending Session {i}"
            session = db.query(TrainingSession).filter(TrainingSession.title == session_title).first()
            
            # Start time 1 hour ago, end time 1 hour from now
            start_t = now - timedelta(hours=1)
            end_t = now + timedelta(hours=1)
            
            if not session:
                session = TrainingSession(
                    title=session_title,
                    description=f"Active session {i} ready for attendance marking.",
                    topic="Technical Skills",
                    scheduled_date=now,
                    start_time=start_t,
                    end_time=end_t,
                    trainer_id=trainer.id,
                    status=SessionStatus.PUBLISHED,
                    max_capacity=50,
                    created_at=now
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                print(f"Created session: {session.title}")
            
            # Enroll EMP001 in session
            sess_enroll = db.query(SessionEnrollment).filter(
                SessionEnrollment.session_id == session.id,
                SessionEnrollment.user_id == user.id
            ).first()
            if not sess_enroll:
                sess_enroll = SessionEnrollment(
                    session_id=session.id,
                    user_id=user.id,
                    status=EnrollmentStatus.ACCEPTED
                )
                db.add(sess_enroll)
                
        db.commit()
        print("Successfully seeded 5 mock courses and 5 active sessions for EMP001.")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_emp001_data()
