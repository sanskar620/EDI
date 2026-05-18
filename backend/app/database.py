"""
SQLAlchemy database engine and session management.
Works identically with MySQL and PostgreSQL — only the URL changes.
"""
import sys
import os

# Add the 'backend' directory to Python path so this script can be run directly from anywhere
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


# ── Engine ───────────────────────────────────────
# pool_pre_ping=True handles stale MySQL connections gracefully
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=str(settings.DEBUG).lower() in ("true", "1", "yes"),
    **({} if is_sqlite else {"pool_pre_ping": True, "pool_size": 20, "max_overflow": 10})
)

# ── Session factory ─────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Base class for all models ───────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency for FastAPI routes ───────────────
def get_db():
    """Yield a database session per request, auto-close on completion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
