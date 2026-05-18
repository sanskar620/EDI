from app.database import engine
from sqlalchemy import text
import sys

def run():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications';"))
        for row in result:
            print(row[0])

if __name__ == '__main__':
    run()
