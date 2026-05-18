from app.database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        conn.execute(text("NOTIFY pgrst, 'reload schema';"))
        conn.commit()
        print("Schema cache reloaded successfully")

if __name__ == '__main__':
    run()
