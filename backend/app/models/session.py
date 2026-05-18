"""
Training Session & Enrollment models.
Blueprint Phase 2–4: Session management, invites, material assignment.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, Float,
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class SessionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class EnrollmentStatus(str, enum.Enum):
    INVITED = "INVITED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    ATTENDED = "ATTENDED"
    ABSENT = "ABSENT"


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    topic = Column(String(200), nullable=False)
    module_code = Column(String(50), nullable=True)

    # Schedule
    scheduled_date = Column(DateTime, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=True)

    # Location
    campus_id = Column(Integer, ForeignKey("campus_geofence.id"), nullable=True)
    venue_name = Column(String(200), nullable=True)

    # Trainer
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Status
    status = Column(Enum(SessionStatus), nullable=False, default=SessionStatus.DRAFT)
    max_capacity = Column(Integer, nullable=True)
    is_materials_released = Column(Boolean, nullable=False, default=False)

    # Assessment config
    pre_test_enabled = Column(Boolean, nullable=False, default=True)
    post_test_enabled = Column(Boolean, nullable=False, default=True)
    passing_threshold = Column(Float, nullable=False, default=70.0)
    max_retakes = Column(Integer, nullable=False, default=2)

    # Group photo
    group_photo_s3_key = Column(String(500), nullable=True)
    group_photo_headcount = Column(Integer, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer = relationship("User", foreign_keys=[trainer_id])
    enrollments = relationship("SessionEnrollment", back_populates="session")
    materials = relationship("SessionMaterial", back_populates="session")
    modules = relationship("Module", back_populates="session", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="session")

    def __repr__(self):
        return f"<TrainingSession '{self.title}' ({self.status.value})>"


class SessionEnrollment(Base):
    __tablename__ = "session_enrollments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(EnrollmentStatus), nullable=False, default=EnrollmentStatus.INVITED)
    qr_code_token = Column(String(255), unique=True, nullable=True)
    rsvp_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    session = relationship("TrainingSession", back_populates="enrollments")
    user = relationship("User", back_populates="enrollments")


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    title = Column(String(300), nullable=False)
    order_number = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    session = relationship("TrainingSession", back_populates="modules")
    materials = relationship("Material", back_populates="module", cascade="all, delete-orphan")



class SessionMaterial(Base):
    """Links materials to sessions with timed-release control."""
    __tablename__ = "session_materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_released = Column(Boolean, nullable=False, default=False)
    released_at = Column(DateTime, nullable=True)
    unlock_before_hours = Column(Integer, nullable=False, default=48)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    session = relationship("TrainingSession", back_populates="materials")
    material = relationship("Material")
