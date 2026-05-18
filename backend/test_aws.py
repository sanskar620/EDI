"""Check sessions and attendance for EMP001."""
import logging
logging.disable(logging.INFO)  # Silence SQL logs

from app.database import SessionLocal
from app.models.session import TrainingSession, SessionEnrollment
from app.models.attendance import Attendance
from app.models.user import User

db = SessionLocal()

user = db.query(User).filter(User.employee_id == "EMP001").first()
if user:
    print(f"User: {user.full_name} (id={user.id}, role={user.role.value})")
    print(f"Profile photo URL: {user.profile_photo_url or 'NONE'}")
    print(f"Device ID: {user.device_id or 'NONE'}")
    print()

enrollments = db.query(SessionEnrollment).filter(SessionEnrollment.user_id == 1).all()
print(f"Total enrollments: {len(enrollments)}")
print("-" * 70)

unmarked = 0
for e in enrollments:
    session = db.query(TrainingSession).filter(TrainingSession.id == e.session_id).first()
    att = db.query(Attendance).filter(Attendance.session_id == e.session_id, Attendance.user_id == 1).first()
    title = session.title if session else "Unknown"
    att_status = att.status.value if att else "NOT MARKED"
    if att_status == "NOT MARKED":
        unmarked += 1
    marker = f" [#{e.session_id}]"
    print(f"  {title:<30} | {att_status:<12}{marker}")

print(f"\nSessions with attendance NOT MARKED: {unmarked}")
db.close()
