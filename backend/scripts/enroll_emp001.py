import os
import sys

# Add parent directory to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.course import Course, CourseEnrollment
from app.models.user import User

def enroll_emp001():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.employee_id == 'EMP001').first()
        if not user:
            print("EMP001 not found in database.")
            return

        print(f"Found user: {user.full_name} (ID: {user.id})")

        # Get all published courses
        courses = db.query(Course).filter(Course.status == "PUBLISHED").all()
        print(f"Found {len(courses)} PUBLISHED courses.")

        enrolled_count = 0
        for course in courses:
            # Check if already enrolled
            existing = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course.id,
                CourseEnrollment.user_id == user.id
            ).first()

            if not existing:
                enrollment = CourseEnrollment(
                    course_id=course.id,
                    user_id=user.id,
                    progress=0.0,
                    status="ENROLLED"
                )
                db.add(enrollment)
                enrolled_count += 1
                print(f"Enrolled in: {course.title}")
            else:
                print(f"Already enrolled in: {course.title}")

        db.commit()
        print(f"Successfully enrolled EMP001 in {enrolled_count} new courses.")
    finally:
        db.close()

if __name__ == "__main__":
    enroll_emp001()
