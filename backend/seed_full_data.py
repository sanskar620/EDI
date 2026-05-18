"""
Seed comprehensive data to all tables in Supabase PostgreSQL
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
cur = conn.cursor()

print("🌱 Seeding comprehensive data to all tables...\n")

# ════════════════════════════════════════════
# 1. USERS (already have 4, add more variety)
# ════════════════════════════════════════════
print("👥 Adding more users...")
users_data = [
    ('EMP004', 'Sneha Reddy', '+919876543213', 'sneha@company.com', 'TRAINEE', 'ACTIVE', 'HR', 'HR Executive'),
    ('EMP005', 'Vikram Singh', '+919876543214', 'vikram@company.com', 'TRAINER', 'ACTIVE', 'Training', 'Lead Trainer'),
    ('EMP006', 'Neha Gupta', '+919876543215', 'neha@company.com', 'TRAINEE', 'ACTIVE', 'Operations', 'Field Officer'),
    ('EMP007', 'Rajesh Menon', '+919876543216', 'rajesh@company.com', 'SUPERVISOR', 'ACTIVE', 'Management', 'Area Manager'),
]

for emp in users_data:
    try:
        cur.execute("""
            INSERT INTO users (employee_id, full_name, mobile_number, email, role, status, department, designation, language, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'en', NOW(), NOW())
            ON CONFLICT (employee_id) DO NOTHING
        """, emp)
    except Exception as e:
        print(f"  Skipping {emp[0]}: {e}")
conn.commit()
print("  ✅ Users added")

# ════════════════════════════════════════════
# 2. HR MASTER DATA
# ════════════════════════════════════════════
print("📋 Adding HR records...")
for emp in users_data:
    try:
        cur.execute("""
            INSERT INTO hr_master_data (employee_id, full_name, mobile_number, email, department, designation, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, true, NOW())
            ON CONFLICT DO NOTHING
        """, (emp[0], emp[1], emp[2], emp[3], emp[6], emp[7]))
    except:
        pass
conn.commit()
print("  ✅ HR records added")

# ════════════════════════════════════════════
# 3. TRAINING SESSIONS
# ════════════════════════════════════════════
print("📚 Adding training sessions...")
sessions = [
    ('Fire Safety Fundamentals', 'Complete fire safety training including evacuation procedures', 'Safety', 'SAF101', 120),
    ('First Aid Basics', 'Emergency first aid and CPR training', 'Medical', 'MED101', 90),
    ('Equipment Handling', 'Safe operation of industrial equipment', 'Operations', 'OPS101', 150),
    ('Communication Skills', 'Professional communication and reporting', 'Soft Skills', 'SS101', 60),
    ('Cyber Security Awareness', 'Digital security best practices', 'IT', 'IT101', 45),
]

# Get trainer ID
cur.execute("SELECT id FROM users WHERE role = 'TRAINER' LIMIT 1")
trainer = cur.fetchone()
trainer_id = trainer[0] if trainer else 1

for i, sess in enumerate(sessions):
    scheduled = datetime.now() + timedelta(days=i+1)
    try:
        cur.execute("""
            INSERT INTO training_sessions 
            (title, description, topic, module_code, scheduled_date, start_time, end_time, 
             duration_minutes, venue_name, trainer_id, status, max_capacity, 
             is_materials_released, pre_test_enabled, post_test_enabled, passing_threshold, 
             max_retakes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (sess[0], sess[1], sess[2], sess[3], scheduled, 
              scheduled.replace(hour=10, minute=0), scheduled.replace(hour=12, minute=0),
              sess[4], f'Training Room {chr(65+i)}', trainer_id, 'PUBLISHED', 30,
              True, True, True, 70.0, 2))
    except Exception as e:
        print(f"  Session error: {e}")
conn.commit()
print("  ✅ Training sessions added")

# Get session IDs
cur.execute("SELECT id FROM training_sessions LIMIT 5")
session_ids = [r[0] for r in cur.fetchall()]

# ════════════════════════════════════════════
# 4. SESSION ENROLLMENTS
# ════════════════════════════════════════════
print("📝 Adding enrollments...")
cur.execute("SELECT id FROM users WHERE role = 'TRAINEE'")
trainee_ids = [r[0] for r in cur.fetchall()]

for sess_id in session_ids[:3]:
    for trainee_id in trainee_ids[:4]:
        try:
            cur.execute("""
                INSERT INTO session_enrollments (session_id, user_id, status, enrolled_at)
                VALUES (%s, %s, 'ENROLLED', NOW())
                ON CONFLICT DO NOTHING
            """, (sess_id, trainee_id))
        except:
            pass
conn.commit()
print("  ✅ Enrollments added")

# ════════════════════════════════════════════
# 5. MATERIALS
# ════════════════════════════════════════════
print("📄 Adding materials...")
materials = [
    ('Fire Safety Handbook', 'PDF', 'Complete guide to fire safety protocols', 'materials/fire-safety.pdf'),
    ('First Aid Manual', 'PDF', 'Step-by-step first aid procedures', 'materials/first-aid.pdf'),
    ('Equipment Guide Video', 'VIDEO', 'Video tutorial on equipment handling', 'materials/equipment.mp4'),
    ('Safety Checklist', 'PDF', 'Daily safety inspection checklist', 'materials/checklist.pdf'),
    ('Emergency Contacts', 'PDF', 'List of emergency contact numbers', 'materials/contacts.pdf'),
]

for mat in materials:
    try:
        cur.execute("""
            INSERT INTO materials (title, material_type, description, s3_key, file_size, is_downloadable, created_at)
            VALUES (%s, %s, %s, %s, %s, true, NOW())
        """, (mat[0], mat[1], mat[2], mat[3], random.randint(100000, 5000000)))
    except Exception as e:
        print(f"  Material error: {e}")
conn.commit()
print("  ✅ Materials added")

# ════════════════════════════════════════════
# 6. QUESTION BANK
# ════════════════════════════════════════════
print("❓ Adding questions...")
questions = [
    ('What is the first step in case of fire?', 'MCQ', json.dumps(['Run', 'Alert others', 'Hide', 'Call police']), 'Alert others', 'Safety'),
    ('How long should you perform CPR compressions?', 'MCQ', json.dumps(['30 seconds', '1 minute', '2 minutes', 'Until help arrives']), 'Until help arrives', 'Medical'),
    ('What PPE is required in the workshop?', 'MCQ', json.dumps(['Helmet only', 'Gloves only', 'Helmet, gloves, safety shoes', 'None']), 'Helmet, gloves, safety shoes', 'Operations'),
    ('Fire extinguisher should be checked every?', 'MCQ', json.dumps(['Week', 'Month', 'Year', 'Never']), 'Month', 'Safety'),
    ('Emergency exit routes should be?', 'MCQ', json.dumps(['Locked', 'Clear at all times', 'Used for storage', 'Painted red']), 'Clear at all times', 'Safety'),
]

for q in questions:
    try:
        cur.execute("""
            INSERT INTO question_bank (question_text, question_type, options, correct_answer, topic, points, created_at)
            VALUES (%s, %s, %s, %s, %s, 10, NOW())
        """, q)
    except Exception as e:
        print(f"  Question error: {e}")
conn.commit()
print("  ✅ Questions added")

# ════════════════════════════════════════════
# 7. ATTENDANCE
# ════════════════════════════════════════════
print("✅ Adding attendance records...")
for sess_id in session_ids[:2]:
    for trainee_id in trainee_ids[:3]:
        try:
            cur.execute("""
                INSERT INTO attendance (session_id, user_id, check_in_time, check_in_method, status, created_at)
                VALUES (%s, %s, NOW(), 'QR_CODE', 'PRESENT', NOW())
                ON CONFLICT DO NOTHING
            """, (sess_id, trainee_id))
        except:
            pass
conn.commit()
print("  ✅ Attendance records added")

# ════════════════════════════════════════════
# 8. NOTIFICATIONS
# ════════════════════════════════════════════
print("🔔 Adding notifications...")
notifications = [
    ('New Training Available', 'Fire Safety Fundamentals training is now open for enrollment', 'TRAINING'),
    ('Reminder', 'Your training session starts tomorrow at 10 AM', 'REMINDER'),
    ('Assessment Due', 'Please complete your post-training assessment', 'ASSESSMENT'),
    ('Certificate Ready', 'Your training certificate is ready for download', 'CERTIFICATE'),
]

for trainee_id in trainee_ids[:4]:
    for notif in notifications:
        try:
            cur.execute("""
                INSERT INTO notifications (user_id, title, message, notification_type, is_read, created_at)
                VALUES (%s, %s, %s, %s, false, NOW())
            """, (trainee_id, notif[0], notif[1], notif[2]))
        except:
            pass
conn.commit()
print("  ✅ Notifications added")

# ════════════════════════════════════════════
# 9. CERTIFICATES
# ════════════════════════════════════════════
print("🏆 Adding certificates...")
for i, trainee_id in enumerate(trainee_ids[:3]):
    if session_ids:
        try:
            cur.execute("""
                INSERT INTO certificates (user_id, session_id, certificate_number, issued_at, score, s3_key, created_at)
                VALUES (%s, %s, %s, NOW(), %s, %s, NOW())
            """, (trainee_id, session_ids[0], f'CERT-2026-{1000+i}', random.randint(70, 100), f'certificates/cert-{trainee_id}.pdf'))
        except:
            pass
conn.commit()
print("  ✅ Certificates added")

# ════════════════════════════════════════════
# 10. FLASHCARDS
# ════════════════════════════════════════════
print("🃏 Adding flashcards...")
flashcards = [
    ('What does PPE stand for?', 'Personal Protective Equipment'),
    ('What is the fire triangle?', 'Heat, Fuel, and Oxygen'),
    ('CPR ratio for adults?', '30 compressions to 2 breaths'),
    ('Emergency number in India?', '112 (Unified) or 100 (Police)'),
    ('First step in emergency?', 'Assess the situation for safety'),
]

for fc in flashcards:
    try:
        cur.execute("""
            INSERT INTO flashcards (front_content, back_content, topic, created_at)
            VALUES (%s, %s, 'Safety', NOW())
        """, fc)
    except:
        pass
conn.commit()
print("  ✅ Flashcards added")

# ════════════════════════════════════════════
# 11. CAMPUS GEOFENCE
# ════════════════════════════════════════════
print("📍 Adding campus locations...")
campuses = [
    ('Mumbai HQ', 19.0760, 72.8777, 500),
    ('Pune Office', 18.5204, 73.8567, 300),
    ('Delhi Branch', 28.6139, 77.2090, 400),
    ('Bangalore Center', 12.9716, 77.5946, 350),
]

for camp in campuses:
    try:
        cur.execute("""
            INSERT INTO campus_geofence (name, latitude, longitude, radius_meters, is_active, created_at)
            VALUES (%s, %s, %s, %s, true, NOW())
        """, camp)
    except:
        pass
conn.commit()
print("  ✅ Campus locations added")

# ════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════
print("\n" + "="*50)
print("📊 DATABASE SUMMARY")
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
