import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

# Setup DB connection
engine = create_engine('sqlite:///lms_training.db')
Session = sessionmaker(bind=engine)
db = Session()

# 1. Clear profile photos for active users so they must register face
print("Updating users to clear profile_photo_url...")
db.execute(text("UPDATE users SET profile_photo_url = NULL, face_embedding = NULL"))
db.commit()

# 2. Check upcoming sessions
now = datetime.utcnow()
print(f"\\nUpcoming sessions after {now.isoformat()}:")
sessions = db.execute(text(f"SELECT id, title, start_time FROM training_sessions WHERE start_time > '{now.isoformat()}'")).fetchall()
for row in sessions:
    print(dict(row._mapping))
    # Clear attendance for this session
    db.execute(text(f"DELETE FROM attendance WHERE session_id = {row[0]}"))
    
db.commit()
print("\\nCleared attendance for upcoming sessions.")

# 3. Add 3 mock sessions for EMP001
# Get user EMP001
user = db.execute(text("SELECT id FROM users WHERE employee_id = 'EMP001'")).fetchone()
if user:
    user_id = user[0]
    print(f"\\nFound EMP001 with ID: {user_id}")
    
    # Create 3 future sessions
    for i in range(1, 4):
        start = now + timedelta(days=i)
        end = start + timedelta(hours=2)
        
        # Insert session
        res = db.execute(
            text(f"INSERT INTO training_sessions (title, description, topic, start_time, end_time, status, max_capacity, trainer_id, scheduled_date, campus_id, is_materials_released, pre_test_enabled, post_test_enabled, passing_threshold, max_retakes, created_at, updated_at) "
            f"VALUES ('Mock Session {i}', 'Description for Mock Session {i}', 'Mock Topic', '{start.isoformat()}', '{end.isoformat()}', 'SCHEDULED', 50, 1, '{start.date().isoformat()}', 1, 0, 0, 0, 50.0, 3, '{now.isoformat()}', '{now.isoformat()}')")
        )
        session_id = res.lastrowid
        
        # Enroll EMP001
        db.execute(text(f"INSERT INTO session_enrollments (session_id, user_id, status, created_at) VALUES ({session_id}, {user_id}, 'ENROLLED', '{now.isoformat()}')"))
        
    db.commit()
    print("Added 3 mock sessions and enrolled EMP001.")
else:
    print("User EMP001 not found.")
