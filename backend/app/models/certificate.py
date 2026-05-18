"""
Certificate model.
Blueprint Phase 6: Auto-generated certificates with QR verification and expiry.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey,
)
from sqlalchemy.orm import relationship
from app.database import Base


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    certificate_uid = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    module_name = Column(String(200), nullable=False)

    # Score
    score_percentage = Column(Float, nullable=False)
    passed = Column(Boolean, nullable=False, default=True)

    # Validity
    issued_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=False)
    is_expired = Column(Boolean, nullable=False, default=False)

    # Storage
    certificate_s3_key = Column(String(500), nullable=True)
    qr_code_s3_key = Column(String(500), nullable=True)

    # Signatures
    trainee_signature_s3_key = Column(String(500), nullable=True)
    trainer_signature_s3_key = Column(String(500), nullable=True)
    trainee_signed_at = Column(DateTime, nullable=True)
    trainer_signed_at = Column(DateTime, nullable=True)

    # GPS where signatures were captured
    sign_lat = Column(Float, nullable=True)
    sign_lng = Column(Float, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="certificates")
    session = relationship("TrainingSession")
    course = relationship("Course")
