import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'lms_training.db')
print(f"DB Path: {db_path}")
print(f"DB Exists: {os.path.exists(db_path)}")
print(f"DB Size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = cursor.fetchall()
print(f"\nTables ({len(tables)}):")
for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM [{t[0]}]")
    count = cursor.fetchone()[0]
    print(f"  {t[0]}: {count} rows")
conn.close()
