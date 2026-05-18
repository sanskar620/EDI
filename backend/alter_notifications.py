from app.database import engine
from sqlalchemy import text
import sys

def run():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;"))
        try:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN target_role VARCHAR(50);"))
        except Exception as e:
            print("target_role exists?", str(e))
            
        try:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN message TEXT;"))
        except Exception as e:
            print("message exists?", str(e))
            
        conn.commit()
        print("Schema altered successfully")

if __name__ == '__main__':
    run()
