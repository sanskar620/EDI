"""
Feedback model.
Blueprint Phase 6: Mandatory trainer + trainee feedback after sessions.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Text, ForeignKey,
)
from sqlalchemy.orm import relationship
from app.database import Base


class SessionFeedback(Base):
    __tablename__ = "session_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)  # TRAINEE / TRAINER

    # Ratings (1-5)
    trainer_clarity = Column(Float, nullable=True)
    content_relevance = Column(Float, nullable=True)
    venue_quality = Column(Float, nullable=True)
    overall_rating = Column(Float, nullable=True)

    # Free text
    comment = Column(Text, nullable=True)
    trainer_observation = Column(Text, nullable=True)  # trainer's notes on the trainee

    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    session = relationship("TrainingSession")
    user = relationship("User", back_populates="feedback")
