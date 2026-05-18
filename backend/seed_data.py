"""
Seed script to populate the database with test data.
Run: python seed_data.py
"""

import sys
sys.path.insert(0, '.')

from app.database import SessionLocal, engine, Base
from app.models.user import User, HRMasterData, UserRole, UserStatus
from app.models.session import TrainingSession, SessionStatus
from datetime import datetime, timedelta

def seed():
    db = SessionLocal()
    
    try:
        # Clear existing data (for development)
        db.query(User).delete()
        db.query(HRMasterData).delete()
        db.commit()
        
        # Create HR Master Data (this simulates HR system records)
        hr_records = [
            HRMasterData(
                employee_id="EMP001",
                full_name="Rahul Sharma",
                mobile_number="+919876543210",
                email="rahul@company.com",
                department="Operations",
                designation="Safety Officer",
                is_active=True
            ),
            HRMasterData(
                employee_id="EMP002", 
                full_name="Priya Patel",
                mobile_number="+919876543211",
                email="priya@company.com",
                department="Training",
                designation="Senior Trainer",
                is_active=True
            ),
            HRMasterData(
                employee_id="EMP003",
                full_name="Amit Kumar",
                mobile_number="+919876543212",
                email="amit@company.com",
                department="Management",
                designation="Supervisor",
                is_active=True
            ),
            HRMasterData(
                employee_id="TRAINEE01",
                full_name="Test Trainee",
                mobile_number="+911234567890",
                email="trainee@test.com",
                department="Operations",
                designation="Junior Staff",
                is_active=True
            ),
        ]
        
        for hr in hr_records:
            db.add(hr)
        db.commit()
        print(f"✅ Created {len(hr_records)} HR records")
        
        # Create pre-registered users (already completed onboarding)
        users = [
            User(
                employee_id="EMP001",
                full_name="Rahul Sharma",
                mobile_number="+919876543210",
                email="rahul@company.com",
                role=UserRole.TRAINEE,
                status=UserStatus.ACTIVE,
                department="Operations",
                designation="Safety Officer",
                device_id="test-device-001",
                language="en"
            ),
            User(
                employee_id="EMP002",
                full_name="Priya Patel", 
                mobile_number="+919876543211",
                email="priya@company.com",
                role=UserRole.TRAINER,
                status=UserStatus.ACTIVE,
                department="Training",
                designation="Senior Trainer",
                device_id="test-device-002",
                language="en"
            ),
            User(
                employee_id="EMP003",
                full_name="Amit Kumar",
                mobile_number="+919876543212",
                email="amit@company.com",
                role=UserRole.SUPERVISOR,
                status=UserStatus.ACTIVE,
                department="Management",
                designation="Supervisor",
                device_id="test-device-003",
                language="en"
            ),
        ]
        
        for user in users:
            db.add(user)
        db.commit()
        print(f"✅ Created {len(users)} users")
        
        # Create a sample training session
        trainer = db.query(User).filter(User.role == UserRole.TRAINER).first()
        if trainer:
            session = TrainingSession(
                title="Fire Safety Basics",
                description="Introduction to fire safety protocols and equipment handling",
                topic="Fire Safety",
                module_code="FS101",
                scheduled_date=datetime.now() + timedelta(days=7),
                start_time=datetime.now().replace(hour=10, minute=0) + timedelta(days=7),
                end_time=datetime.now().replace(hour=12, minute=0) + timedelta(days=7),
                duration_minutes=120,
                venue_name="Training Hall A",
                trainer_id=trainer.id,
                status=SessionStatus.PUBLISHED,
                max_capacity=30,
            )
            db.add(session)
            db.commit()
            print("✅ Created sample training session")
        
        print("\n🎉 Database seeded successfully!")
        print("\n📋 Test Credentials:")
        print("─" * 40)
        print("TRAINEE:    EMP001 / +919876543210")
        print("TRAINER:    EMP002 / +919876543211")
        print("SUPERVISOR: EMP003 / +919876543212")
        print("NEW USER:   TRAINEE01 / +911234567890")
        print("─" * 40)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
