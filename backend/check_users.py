from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    res = conn.execute(text("SELECT id, employee_id, full_name, status, role FROM users WHERE full_name ILIKE '%priya%' OR full_name ILIKE '%jabe%' OR employee_id = 'EMP002';")).fetchall()
    for row in res:
        print(f"ID: {row[0]}, EmpID: {row[1]}, Name: {row[2]}, Status: {row[3]}, Role: {row[4]}")
