"""Seed sessions and enrollments into SQLite."""
import sqlite3, os
from datetime import datetime, timedelta, timezone

SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'lms_training.db')
conn = sqlite3.connect(SQLITE_PATH)
cursor = conn.cursor()

now = datetime.now(timezone.utc).isoformat()
future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

cursor.execute("SELECT COUNT(*) FROM training_sessions")
count = cursor.fetchone()[0]

if count < 6:
    print("Seeding training sessions...")
    sessions = [
        ('Safety Orientation - Day 1', 'Safety Orientation basics', 'Safety', 'SAF-001', now, now, future, 120, None, 'Safety Hall', 'PUBLISHED', 30, 0, 1, 1, 70.0, 2, 2, None, None, now, now),
        ('Fire Drill Training', 'Fire drill and evacuation', 'Fire Safety', 'FIR-001', now, now, future, 90, None, 'Training Ground', 'PUBLISHED', 25, 0, 1, 1, 70.0, 2, 2, None, None, now, now),
        ('Leadership Workshop', 'Leadership skills workshop', 'Leadership', 'LDR-001', future, future, future, 180, None, 'Conference Room A', 'DRAFT', 20, 0, 1, 1, 70.0, 2, 2, None, None, now, now),
        ('Advanced Technical Training', 'Advanced tech skills', 'Technical', 'TEC-001', now, now, future, 240, None, 'Lab Room 3', 'PUBLISHED', 15, 0, 1, 1, 80.0, 2, 2, None, None, now, now),
        ('Cybersecurity Fundamentals', 'Intro to cybersecurity', 'IT Security', 'CYB-001', future, future, future, 120, None, 'Virtual', 'PUBLISHED', 50, 0, 1, 1, 75.0, 2, 2, None, None, now, now),
    ]
    for s in sessions:
        cursor.execute("""
            INSERT INTO training_sessions 
            (title, description, topic, module_code, scheduled_date, start_time, end_time, 
             duration_minutes, campus_id, venue_name, status, max_capacity, is_materials_released,
             pre_test_enabled, post_test_enabled, passing_threshold, max_retakes, trainer_id,
             group_photo_s3_key, group_photo_headcount, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, s)
    conn.commit()

cursor.execute("SELECT id, title, status FROM training_sessions ORDER BY id")
for row in cursor.fetchall():
    print(f"  ID={row[0]}, Title={row[1]}, Status={row[2]}")

conn.close()
print("Done!")
