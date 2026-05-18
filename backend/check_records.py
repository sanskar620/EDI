from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    print("Checking sessions...")
    res2 = conn.execute(text("SELECT id, title FROM training_sessions WHERE trainer_id = 2")).fetchall()
    print("Sessions for 2:", res2)
