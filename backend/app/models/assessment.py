"""
Assessment models — Question bank, attempts, results, practical scoring.
Blueprint Phase 2 (pre-test), Phase 5 (post-test + proctoring).
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, JSON, Enum,
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class QuestionType(str, enum.Enum):
    MCQ = "MCQ"
    TRUE_FALSE = "TRUE_FALSE"
    SHORT_ANSWER = "SHORT_ANSWER"


class AssessmentType(str, enum.Enum):
    PRE_TEST = "PRE_TEST"
    POST_TEST = "POST_TEST"
    RETAKE = "RETAKE"


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic = Column(String(200), nullable=False, index=True)
    module_code = Column(String(50), nullable=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False, default=QuestionType.MCQ)
    # Options stored as JSON array: ["option1", "option2", "option3", "option4"]
    options = Column(JSON, nullable=True)
    correct_answer = Column(String(500), nullable=False)
    # For i18n: translations stored as JSON: {"hi": "...", "ta": "...", ...}
    translations = Column(JSON, nullable=True)
    difficulty = Column(Integer, nullable=False, default=1)  # 1-5
    points = Column(Float, nullable=False, default=1.0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AssessmentSession(Base):
    """A single assessment sitting — ties a user to a session and test type."""
    __tablename__ = "assessment_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assessment_type = Column(Enum(AssessmentType), nullable=False)
    # Questions served (ordered IDs as JSON)
    question_ids = Column(JSON, nullable=True)
    total_questions = Column(Integer, nullable=False, default=0)
    time_limit_seconds = Column(Integer, nullable=False, default=1800)

    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    is_submitted = Column(Boolean, nullable=False, default=False)
    is_auto_submitted = Column(Boolean, nullable=False, default=False)

    # Integrity
    integrity_flags = Column(Integer, nullable=False, default=0)
    app_switch_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AssessmentAttempt(Base):
    """Individual question-level answer within an assessment."""
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assessment_session_id = Column(Integer, ForeignKey("assessment_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question_bank.id"), nullable=False)
    selected_answer = Column(String(500), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    answered_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="assessment_attempts")
    question = relationship("QuestionBank")


class AssessmentResult(Base):
    """Aggregated result for an assessment session."""
    __tablename__ = "assessment_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assessment_session_id = Column(Integer, ForeignKey("assessment_sessions.id"), nullable=False, unique=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assessment_type = Column(Enum(AssessmentType), nullable=False)

    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    score_percentage = Column(Float, nullable=False)
    passed = Column(Boolean, nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1)

    # Integrity summary
    integrity_flags = Column(Integer, nullable=False, default=0)
    proctoring_alerts = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class PracticalScore(Base):
    """Trainer scores trainee on physical drills (Phase 4.5)."""
    __tablename__ = "practical_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Criteria + scores as JSON: {"evacuation_speed": 4, "equipment_handling": 5, ...}
    criteria_scores = Column(JSON, nullable=False)
    total_score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    is_offline_synced = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
