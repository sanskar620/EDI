"""
Seed the local SQLite database with comprehensive data matching the Supabase setup.
"""
import sqlite3
import os
import json
from datetime import datetime, timedelta

SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'lms_training.db')
conn = sqlite3.connect(SQLITE_PATH)
cursor = conn.cursor()

# Add face_image_url column if missing
cursor.execute("PRAGMA table_info(users)")
cols = [row[1] for row in cursor.fetchall()]
if 'face_image_url' not in cols:
    print("Adding face_image_url column...")
    cursor.execute("ALTER TABLE users ADD COLUMN face_image_url TEXT")

now = datetime.utcnow().isoformat()
future = (datetime.utcnow() + timedelta(days=7)).isoformat()
past = (datetime.utcnow() - timedelta(days=3)).isoformat()

# ── Seed more training sessions ──
existing_sessions = cursor.execute("SELECT COUNT(*) FROM training_sessions").fetchone()[0]
if existing_sessions < 5:
    print("Seeding training sessions...")
    sessions = [
        (2, 'Safety Orientation - Day 1', 'Safety Orientation basics and protocols', 'Safety', 'SAF-001', now, now, future, 120, None, 'Safety Hall', 'PUBLISHED', 30, 0, 1, 1, 70.0, 2, None, None, now, now),
        (3, 'Fire Drill Training', 'Hands-on fire drill and evacuation training', 'Fire Safety', 'FIR-001', now, now, future, 90, None, 'Training Ground', 'PUBLISHED', 25, 0, 1, 1, 70.0, 2, None, None, now, now),
        (4, 'Leadership Workshop', 'Leadership skills development workshop', 'Leadership', 'LDR-001', future, future, future, 180, None, 'Conference Room A', 'DRAFT', 20, 0, 1, 1, 70.0, 2, None, None, now, now),
        (5, 'Advanced Technical Training', 'Advanced technical skills and best practices', 'Technical', 'TEC-001', now, now, future, 240, None, 'Lab Room 3', 'PUBLISHED', 15, 0, 1, 1, 80.0, 2, None, None, now, now),
        (6, 'Cybersecurity Fundamentals', 'Introduction to cybersecurity concepts', 'IT Security', 'CYB-001', future, future, future, 120, None, 'Virtual', 'PUBLISHED', 50, 0, 1, 1, 75.0, 2, None, None, now, now),
    ]
    for s in sessions:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO training_sessions 
                (id, title, description, topic, module_code, scheduled_date, start_time, end_time, 
                 duration_minutes, campus_id, venue_name, status, max_capacity, is_materials_released,
                 pre_test_enabled, post_test_enabled, passing_threshold, max_retakes, 
                 group_photo_s3_key, group_photo_headcount, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, s)
        except Exception as e:
            print(f"  Session {s[0]}: {e}")

# ── Seed session enrollments ──
existing_enrollments = cursor.execute("SELECT COUNT(*) FROM session_enrollments").fetchone()[0]
if existing_enrollments < 3:
    print("Seeding enrollments...")
    enrollments = [
        (1, 1, 1, 'ACCEPTED', None, now, now),  # Rahul -> Fire Safety
        (2, 1, 4, 'ACCEPTED', None, now, now),  # RealTest -> Fire Safety 
        (3, 2, 1, 'ACCEPTED', None, now, now),  # Rahul -> Safety Orientation
        (4, 2, 4, 'ACCEPTED', None, now, now),  # RealTest -> Safety Orientation
        (5, 3, 1, 'INVITED', None, None, now),   # Rahul -> Fire Drill
        (6, 5, 1, 'ACCEPTED', None, now, now),  # Rahul -> Advanced Technical
        (7, 6, 1, 'INVITED', None, None, now),   # Rahul -> Cybersecurity
        (8, 6, 4, 'INVITED', None, None, now),   # RealTest -> Cybersecurity
    ]
    for e in enrollments:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO session_enrollments 
                (id, session_id, user_id, status, qr_code_token, rsvp_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, e)
        except Exception as ex:
            print(f"  Enrollment {e[0]}: {ex}")

# ── Seed a campus geofence ──
existing_campus = cursor.execute("SELECT COUNT(*) FROM campus_geofence").fetchone()[0]
if existing_campus == 0:
    print("Seeding campus geofence...")
    cursor.execute("""
        INSERT INTO campus_geofence (id, name, address, polygon_coords, center_lat, center_lng, radius_meters, is_active, created_at)
        VALUES (1, 'Main Campus', 'Pune, Maharashtra', '[]', 18.5204, 73.8567, 200.0, 1, ?)
    """, (now,))

# ── Seed question bank ──
existing_questions = cursor.execute("SELECT COUNT(*) FROM question_bank").fetchone()[0]
if existing_questions == 0:
    print("Seeding question bank...")
    questions = [
        ('Safety', 'SAF-001', 'What is the first step in an emergency evacuation?', 'MCQ', 
         json.dumps(['Call 911', 'Sound the alarm', 'Assess the situation', 'Run immediately']),
         'Assess the situation', None, 2, 1.0, 1, now),
        ('Safety', 'SAF-001', 'Fire extinguishers should be inspected how often?', 'MCQ',
         json.dumps(['Monthly', 'Quarterly', 'Annually', 'Weekly']),
         'Monthly', None, 1, 1.0, 1, now),
        ('Safety', 'SAF-001', 'PPE stands for Personal Protective Equipment', 'TRUE_FALSE',
         json.dumps(['True', 'False']),
         'True', None, 1, 1.0, 1, now),
        ('Fire Safety', 'FIR-001', 'Which class of fire involves electrical equipment?', 'MCQ',
         json.dumps(['Class A', 'Class B', 'Class C', 'Class D']),
         'Class C', None, 2, 1.0, 1, now),
        ('Fire Safety', 'FIR-001', 'PASS stands for Pull, Aim, Squeeze, Sweep', 'TRUE_FALSE',
         json.dumps(['True', 'False']),
         'True', None, 1, 1.0, 1, now),
    ]
    for q in questions:
        cursor.execute("""
            INSERT INTO question_bank 
            (topic, module_code, question_text, question_type, options, correct_answer, translations, difficulty, points, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, q)

conn.commit()

# ── Verify ──
print("\n=== FINAL STATE ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'alembic_version' ORDER BY name")
for (tbl,) in cursor.fetchall():
    cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
    count = cursor.fetchone()[0]
    if count > 0:
        print(f"  {tbl}: {count} rows")

conn.close()
print("\nSQLite seeding complete!")
