from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        try:
            # Add column
            conn.execute(text("ALTER TABLE materials ADD COLUMN session_id INTEGER NULL;"))
            # Add foreign key
            conn.execute(text("ALTER TABLE materials ADD CONSTRAINT fk_materials_session_id FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE SET NULL;"))
            conn.commit()
            print("Migration successful: session_id added to materials.")
        except Exception as e:
            if "already exists" in str(e) or "Duplicate column name" in str(e):
                print("Column already exists. Skipping.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    run_migration()
