"""
Seed the local SQLite database with essential data so the app works standalone.
Since Supabase is unreachable, we populate from scratch.
"""
import sqlite3
import os
import json
from datetime import datetime, timedelta

SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'lms_training.db')

conn = sqlite3.connect(SQLITE_PATH)
cursor = conn.cursor()

# Show current state
print("=== CURRENT STATE ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'alembic_version' ORDER BY name")
for (tbl,) in cursor.fetchall():
    cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
    count = cursor.fetchone()[0]
    if count > 0:
        print(f"  {tbl}: {count} rows")

# Check if face_embedding column exists on users table
cursor.execute("PRAGMA table_info(users)")
cols = [row[1] for row in cursor.fetchall()]
print(f"\nUsers columns: {cols}")

if 'face_embedding' not in cols:
    print("\nAdding face_embedding column to users...")
    cursor.execute("ALTER TABLE users ADD COLUMN face_embedding TEXT")
    conn.commit()
    print("Done.")

# Show existing users
cursor.execute("SELECT id, employee_id, full_name, role, status FROM users")
users = cursor.fetchall()
print(f"\nExisting users ({len(users)}):")
for u in users:
    print(f"  ID={u[0]}, EmpID={u[1]}, Name={u[2]}, Role={u[3]}, Status={u[4]}")

# Show existing HR data
cursor.execute("SELECT id, employee_id, full_name, mobile_number FROM hr_master_data")
hr = cursor.fetchall()
print(f"\nExisting HR records ({len(hr)}):")
for h in hr:
    print(f"  ID={h[0]}, EmpID={h[1]}, Name={h[2]}, Mobile={h[3]}")

# Show existing sessions
cursor.execute("SELECT id, title, trainer_id, status FROM training_sessions")
sessions = cursor.fetchall()
print(f"\nExisting sessions ({len(sessions)}):")
for s in sessions:
    print(f"  ID={s[0]}, Title={s[1]}, TrainerID={s[2]}, Status={s[3]}")

conn.close()
print("\n=== DONE ===")
