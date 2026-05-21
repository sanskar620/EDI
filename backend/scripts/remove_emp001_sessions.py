import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.models.session import TrainingSession, SessionEnrollment

def delete_emp001_sessions():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.employee_id == 'EMP001').first()
        if not user:
            print("EMP001 not found")
            return
            
        sessions_to_remove = ["Leadership Workshop", "Advanced Technical Training", "AL&M Course"]
        
        for title in sessions_to_remove:
            session = db.query(TrainingSession).filter(TrainingSession.title == title).first()
            if session:
                enrollment = db.query(SessionEnrollment).filter(
                    SessionEnrollment.user_id == user.id,
                    SessionEnrollment.session_id == session.id
                ).first()
                
                if enrollment:
                    db.delete(enrollment)
                    print(f"Removed enrollment for {title}")
                else:
                    print(f"EMP001 not enrolled in {title}")
            else:
                print(f"Session {title} not found")
                
        db.commit()
        print("Done.")
    finally:
        db.close()

if __name__ == "__main__":
    delete_emp001_sessions()
