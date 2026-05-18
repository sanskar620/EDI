"""
Proctoring snapshot model.
Blueprint Phase 5: AI random snapshots during exams.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey,
)
from app.database import Base


class ProctoringSnapshot(Base):
    __tablename__ = "proctoring_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assessment_session_id = Column(Integer, ForeignKey("assessment_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Photo
    photo_s3_key = Column(String(500), nullable=False)
    captured_at = Column(DateTime, nullable=False)

    # GPS
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    # AI analysis
    face_match_confidence = Column(Float, nullable=True)
    face_matched = Column(Boolean, nullable=True)
    faces_detected_count = Column(Integer, nullable=True)
    is_flagged = Column(Boolean, nullable=False, default=False)
    flag_reason = Column(String(200), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
