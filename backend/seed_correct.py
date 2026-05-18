"""
Seed data with correct column names
"""
import psycopg2
from datetime import datetime, timedelta
import random
import json

conn = psycopg2.connect(
    host='aws-1-ap-south-1.pooler.supabase.com',
    port=5432,
    database='postgres',
    user='postgres.qnndqowtocscumrijjts',
    password='Sansy_7626**',
    sslmode='require'
)
conn.autocommit = True
cur = conn.cursor()

print("🌱 Seeding data with correct schema...\n")

# Get existing IDs
cur.execute("SELECT id FROM users WHERE role = 'TRAINEE'")
trainee_ids = [r[0] for r in cur.fetchall()]
print(f"Found {len(trainee_ids)} trainees")

cur.execute("SELECT id FROM training_sessions")
session_ids = [r[0] for r in cur.fetchall()]
print(f"Found {len(session_ids)} sessions")

# 1. MATERIALS
print("\n📄 Adding materials...")
materials = [
    ('Fire Safety Handbook', 'Complete guide to fire safety', 'PDF', 'Safety', 'materials/fire-safety.pdf', 2500000),
    ('First Aid Manual', 'Emergency first aid procedures', 'PDF', 'Medical', 'materials/first-aid.pdf', 1800000),
    ('Equipment Training Video', 'Video tutorial on equipment', 'VIDEO', 'Operations', 'materials/equipment.mp4', 50000000),
    ('Safety Checklist', 'Daily safety inspection checklist', 'PDF', 'Safety', 'materials/checklist.pdf', 500000),
]
for mat in materials:
    cur.execute("""
        INSERT INTO materials (title, description, material_type, topic, s3_key, file_size_bytes, version, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, 1, true, NOW(), NOW())
    """, mat)
print("  ✅ 4 materials added")

# 2. QUESTION BANK
print("\n❓ Adding questions...")
questions = [
    ('Safety', 'SAF101', 'What is the first step in case of fire?', 'MCQ', json.dumps(['Run', 'Alert others', 'Hide', 'Call police']), 'Alert others', 1),
    ('Safety', 'SAF101', 'Fire extinguisher should be checked every?', 'MCQ', json.dumps(['Week', 'Month', 'Year', 'Never']), 'Month', 2),
    ('Medical', 'MED101', 'How long should you perform CPR?', 'MCQ', json.dumps(['30 seconds', '1 minute', '2 minutes', 'Until help arrives']), 'Until help arrives', 2),
    ('Operations', 'OPS101', 'What PPE is required in workshop?', 'MCQ', json.dumps(['Helmet only', 'Gloves only', 'Helmet, gloves, shoes', 'None']), 'Helmet, gloves, shoes', 1),
]
for q in questions:
    cur.execute("""
        INSERT INTO question_bank (topic, module_code, question_text, question_type, options, correct_answer, difficulty, points, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 10, true, NOW())
    """, q)
print("  ✅ 4 questions added")

# 3. SESSION ENROLLMENTS
print("\n📝 Adding enrollments...")
for i, sess_id in enumerate(session_ids[:4]):
    for trainee_id in trainee_ids[:3]:
        try:
            cur.execute("""
                INSERT INTO session_enrollments (session_id, user_id, status, created_at)
                VALUES (%s, %s, 'ENROLLED', NOW())
            """, (sess_id, trainee_id))
        except:
            pass
print("  ✅ Enrollments added")

# 4. ATTENDANCE
print("\n✅ Adding attendance...")
# Get a trainer id for marked_by
cur.execute("SELECT id FROM users WHERE role = 'TRAINER' LIMIT 1")
trainer_row = cur.fetchone()
trainer_id = trainer_row[0] if trainer_row else 1

for sess_id in session_ids[:2]:
    for trainee_id in trainee_ids[:4]:
        cur.execute("""
            INSERT INTO attendance (session_id, user_id, check_in_time, is_present, qr_verified, geo_verified, biometric_verified, marked_by, force_marked, created_at, updated_at)
            VALUES (%s, %s, NOW(), true, true, true, false, %s, false, NOW(), NOW())
        """, (sess_id, trainee_id, trainer_id))
print("  ✅ Attendance records added")

# 5. NOTIFICATIONS
print("\n🔔 Adding notifications...")
notifs = [
    ('TRAINING_INVITE', 'New Training Available', 'Fire Safety Fundamentals is now open for enrollment'),
    ('REMINDER_24H', 'Training Tomorrow', 'Your training session starts tomorrow at 10 AM'),
    ('MATERIAL_RELEASED', 'Materials Ready', 'Training materials have been released'),
    ('CERTIFICATE_ISSUED', 'Certificate Ready', 'Your training certificate is ready for download'),
]
for trainee_id in trainee_ids[:4]:
    for n in notifs:
        cur.execute("""
            INSERT INTO notifications (user_id, notification_type, title, body, is_read, is_sent, created_at)
            VALUES (%s, %s, %s, %s, false, true, NOW())
        """, (trainee_id, n[0], n[1], n[2]))
print("  ✅ Notifications added")

# 6. CERTIFICATES
print("\n🏆 Adding certificates...")
for i, trainee_id in enumerate(trainee_ids[:4]):
    if session_ids:
        expiry = datetime.now() + timedelta(days=365)
        cur.execute("""
            INSERT INTO certificates (certificate_uid, user_id, session_id, module_name, score_percentage, passed, issued_date, expiry_date, is_expired, created_at)
            VALUES (%s, %s, %s, %s, %s, true, NOW(), %s, false, NOW())
        """, (f'CERT-2026-{1000+i}', trainee_id, session_ids[0], 'Fire Safety', random.randint(75, 98), expiry))
print("  ✅ Certificates added")

# 7. FLASHCARDS
print("\n🃏 Adding flashcards...")
flashcards = [
    ('Safety', 'What does PPE stand for?', 'Personal Protective Equipment', 1),
    ('Safety', 'What is the fire triangle?', 'Heat, Fuel, and Oxygen', 2),
    ('Medical', 'CPR ratio for adults?', '30 compressions to 2 breaths', 3),
    ('Safety', 'Emergency number in India?', '112 (Unified) or 100 (Police)', 4),
]
for fc in flashcards:
    cur.execute("""
        INSERT INTO flashcards (topic, front_text, back_text, sort_order, is_active, created_at)
        VALUES (%s, %s, %s, %s, true, NOW())
    """, fc)
print("  ✅ Flashcards added")

# 8. CAMPUS GEOFENCE
print("\n📍 Adding campuses...")
campuses = [
    ('Mumbai HQ', 'Andheri East, Mumbai', 19.0760, 72.8777, 500),
    ('Pune Office', 'Hinjewadi, Pune', 18.5204, 73.8567, 300),
    ('Delhi Branch', 'Connaught Place, Delhi', 28.6139, 77.2090, 400),
    ('Bangalore Center', 'Whitefield, Bangalore', 12.9716, 77.5946, 350),
]
for camp in campuses:
    cur.execute("""
        INSERT INTO campus_geofence (name, address, center_lat, center_lng, radius_meters, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, true, NOW())
    """, camp)
print("  ✅ Campuses added")

# SUMMARY
print("\n" + "="*50)
print("📊 FINAL DATABASE SUMMARY")
print("="*50)

tables = [
    'users', 'hr_master_data', 'training_sessions', 'session_enrollments',
    'materials', 'question_bank', 'attendance', 'notifications',
    'certificates', 'flashcards', 'campus_geofence'
]

for table in tables:
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    count = cur.fetchone()[0]
    print(f"  {table}: {count} rows")

conn.close()
print("\n🎉 All data seeded successfully!")
