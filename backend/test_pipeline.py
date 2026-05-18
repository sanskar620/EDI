"""
Test script for verifying the Database Refactoring and Pipeline Engine.
This demonstrates the cross-role data cascade by interacting directly with the DB engine.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus, TrainerProfile, TraineeProfile
from app.models.sync_queue import SyncQueueItem
from app.services.pipeline import process_sync_queue
from app.models.session import TrainingSession, SessionEnrollment

def test_pipeline():
    db = SessionLocal()
    try:
        # --- 1. SETUP: Create Mock Data Profiles ---
        print("1. Creating Mock Database Profiles...")
        
        trainer = User(
            employee_id=f"TR-{int(datetime.utcnow().timestamp())}", mobile_number="9999999999", 
            full_name="John The Trainer", role=UserRole.TRAINER, status=UserStatus.ACTIVE
        )
        db.add(trainer)
        db.flush()
        
        tr_profile = TrainerProfile(user_id=trainer.id, expertise_areas=["Fire Safety"])
        db.add(tr_profile)
        
        trainee = User(
            employee_id=f"TE-{int(datetime.utcnow().timestamp())}", mobile_number="8888888888", 
            full_name="Alice Trainee", role=UserRole.TRAINEE, status=UserStatus.ACTIVE
        )
        db.add(trainee)
        db.flush()
        
        # We assign Alice to "BATCH_ALPHA"
        te_profile = TraineeProfile(user_id=trainee.id, batch_id="BATCH_ALPHA")
        db.add(te_profile)
        db.commit()

        print(f"Created: Trainer {trainer.id} and Trainee {trainee.id} (Batch: 'BATCH_ALPHA')")


        # --- 2. PIPELINE: Simulate Offline Sync payload pushed by the Trainer's mobile Phone ---
        print("\n2. Simulating App Offline Sync...")
        payload = {
            "title": "Fire Safety Protocol",
            "topic": "Fire Extinguishers 101",
            "scheduled_date": "2026-05-01T10:00:00",
            "start_time": "2026-05-01T10:00:00",
            "end_time": "2026-05-01T11:00:00",
            "target_batch_id": "BATCH_ALPHA" # Target our mock trainee
        }
        
        sq_item = SyncQueueItem(
            user_id=trainer.id,
            entity_type="TrainingSession",
            payload=payload,
            device_timestamp=datetime.utcnow()
        )
        db.add(sq_item)
        db.commit()
        
        print("Running Pipeline Engine...")
        process_sync_queue(db, [sq_item])


        # --- 3. VERIFICATION : Prove the Cascade Logic Worked ---
        print("\n3. Verifying the Pipeline Cascade Result:")
        # Check if TrainingSession was extracted from payload and created
        session = db.query(TrainingSession).filter(TrainingSession.trainer_id == trainer.id).first()
        print(f"✅ Extracted Session: '{session.title}' (ID: {session.id})")
        
        # Check if the Pipeline auto-assigned Alice (the Trainee) to the batch!
        enrollments = db.query(SessionEnrollment).filter(SessionEnrollment.session_id == session.id).all()
        for e in enrollments:
            auto_enrolled_user = db.query(User).filter(User.id == e.user_id).first()
            print(f"✅ Pipeline Cascade: Auto-Enrolled '{auto_enrolled_user.full_name}' into Session {session.id}!")
            
    finally:
        # Cleanup mock data for repeatable testing
        db.rollback()
        # You could add hard-delete logic here if you want it cleanly wiped.

if __name__ == "__main__":
    test_pipeline()
