from sqlalchemy import text
from app.database import engine
import logging

logging.disable(logging.INFO)

with engine.connect() as conn:
    res = conn.execute(text("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users'")).fetchall()
    for row in res:
        print(row[0], ":", row[1])
