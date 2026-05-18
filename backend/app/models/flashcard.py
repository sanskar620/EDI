"""
Flashcard model.
Blueprint Phase 4: Micro-learning cards, offline-ready.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, JSON,
)
from app.database import Base


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic = Column(String(200), nullable=False, index=True)
    front_text = Column(Text, nullable=False)
    back_text = Column(Text, nullable=False)
    image_s3_key = Column(String(500), nullable=True)
    # i18n: {"hi": {"front": "...", "back": "..."}, "ta": {...}}
    translations = Column(JSON, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
