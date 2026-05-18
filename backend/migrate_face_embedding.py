from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    print("Adding face_embedding column to users table...")
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN face_embedding TEXT;"))
        conn.commit()
        print("Column added successfully.")
    except Exception as e:
        print("Error or already exists:", e)
