from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    print("Restoring Priya Sharma...")
    conn.execute(text("UPDATE users SET full_name = 'Priya Sharma', role = 'TRAINER' WHERE id = 2"))
    conn.commit()
    print("Restored successfully.")
    
    res = conn.execute(text("SELECT id, employee_id, full_name, status, role FROM users WHERE id = 2")).fetchone()
    print("Updated User:", res)
