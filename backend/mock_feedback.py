import sys
import os
import random
from datetime import datetime, timedelta

# Add backend dir to pythonpath
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.session import TrainingSession, SessionEnrollment, EnrollmentStatus
from app.models.feedback import SessionFeedback
from app.models.user import UserRole

def generate_mock_feedback():
    db = SessionLocal()
    try:
        # Get all completed or published sessions
        sessions = db.query(TrainingSession).all()
        
        comments = [
            "Great session, very informative!",
            "Trainer was very clear and the material was relevant.",
            "Good session but the venue could be better.",
            "I learned a lot, thanks!",
            "Pacing was a bit fast, but overall good.",
            "Excellent presentation.",
            "Very engaging session.",
            "The content was exactly what we needed.",
            "Could have used more practical examples.",
            "Highly recommended."
        ]
        
        feedbacks_added = 0
        for session in sessions:
            # Check if there's already feedback for this session
            existing = db.query(SessionFeedback).filter(SessionFeedback.session_id == session.id).count()
            if existing > 0:
                continue
                
            # Get enrolled trainees for this session
            enrollments = db.query(SessionEnrollment).filter(
                SessionEnrollment.session_id == session.id,
                SessionEnrollment.status.in_([EnrollmentStatus.ATTENDED, EnrollmentStatus.ACCEPTED])
            ).all()
            
            for enrollment in enrollments:
                # Randomly decide if this trainee left feedback (e.g. 70% chance)
                if random.random() < 0.7:
                    fb = SessionFeedback(
                        session_id=session.id,
                        user_id=enrollment.user_id,
                        role=UserRole.TRAINEE.value,
                        trainer_clarity=round(random.uniform(3.5, 5.0), 1),
                        content_relevance=round(random.uniform(3.5, 5.0), 1),
                        venue_quality=round(random.uniform(3.0, 5.0), 1),
                        overall_rating=round(random.uniform(3.5, 5.0), 1),
                        comment=random.choice(comments),
                        submitted_at=datetime.utcnow() - timedelta(days=random.randint(0, 10))
                    )
                    db.add(fb)
                    feedbacks_added += 1
        
        db.commit()
        print(f"✅ Successfully added {feedbacks_added} mock feedback entries.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_mock_feedback()
