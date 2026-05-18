import psycopg2
import uuid

conn = psycopg2.connect(
    host='aws-1-ap-south-1.pooler.supabase.com',
    port=5432, database='postgres',
    user='postgres.qnndqowtocscumrijjts',
    password='Sansy_7626**', sslmode='require'
)
conn.autocommit = True
cur = conn.cursor()

# Get IDs
cur.execute("SELECT id FROM users WHERE role = 'TRAINEE'")
trainee_ids = [r[0] for r in cur.fetchall()]
cur.execute("SELECT id FROM training_sessions")
session_ids = [r[0] for r in cur.fetchall()]

print(f'Trainees: {trainee_ids}')
print(f'Sessions: {session_ids}')

# Add enrollments
print('\nAdding enrollments...')
for sess_id in session_ids[:4]:
    for trainee_id in trainee_ids[:4]:
        try:
            cur.execute(
                "INSERT INTO session_enrollments (session_id, user_id, status, qr_code_token, created_at) VALUES (%s, %s, %s, %s, NOW())", 
                (sess_id, trainee_id, 'ENROLLED', str(uuid.uuid4()))
            )
        except Exception as e:
            pass
print('  Done')

# Check campus schema
cur.execute("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'campus_geofence'")
print('\nCampus columns:')
for r in cur.fetchall():
    print(f'  {r[0]}: nullable={r[1]}')

# Try adding campus with all required fields
print('\nAdding campuses...')
campuses = [
    ('Mumbai HQ', 'Andheri East, Mumbai', 19.0760, 72.8777, 500),
    ('Pune Office', 'Hinjewadi, Pune', 18.5204, 73.8567, 300),
]
for camp in campuses:
    try:
        cur.execute(
            "INSERT INTO campus_geofence (name, address, center_lat, center_lng, radius_meters, is_active, created_at) VALUES (%s, %s, %s, %s, %s, true, NOW())", 
            camp
        )
        print(f'  Added {camp[0]}')
    except Exception as e:
        print(f'  Error: {e}')

# Final counts
print('\n' + '='*50)
print('FINAL DATABASE SUMMARY')
print('='*50)
tables = ['users', 'hr_master_data', 'training_sessions', 'session_enrollments', 'materials', 'question_bank', 'attendance', 'notifications', 'certificates', 'flashcards', 'campus_geofence']
for t in tables:
    cur.execute(f'SELECT COUNT(*) FROM {t}')
    print(f'  {t}: {cur.fetchone()[0]} rows')

conn.close()
