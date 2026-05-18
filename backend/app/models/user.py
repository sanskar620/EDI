"""
User & HR Master Data models.
Blueprint Phase 1: Auth, device binding, role-based access.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey,
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    TRAINEE = "TRAINEE"
    TRAINER = "TRAINER"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"


class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DEACTIVATED = "DEACTIVATED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    mobile_number = Column(String(15), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)

    # Role & status
    role = Column(Enum(UserRole), nullable=False, default=UserRole.TRAINEE)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.PENDING)

    # Profile
    full_name = Column(String(200), nullable=False)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    campus_id = Column(Integer, ForeignKey("campus_geofence.id"), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    # Face verification (AWS S3 key for Rekognition / Local Face Embedding)
    face_image_url = Column(String(500), nullable=True)  # S3 key for stored face image
    face_embedding = Column(Text, nullable=True) # JSON string of the 128D embedding array

    # Device binding (Phase 1.4)
    device_id = Column(String(255), nullable=True, unique=True)
    device_model = Column(String(100), nullable=True)
    device_bound_at = Column(DateTime, nullable=True)

    # Language preference (Phase 1.7)
    language = Column(String(5), nullable=False, default="en")

    # FCM push token
    fcm_token = Column(String(500), nullable=True)

    # Auth timestamps
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    hr_data = relationship("HRMasterData", back_populates="user", uselist=False)
    enrollments = relationship("SessionEnrollment", back_populates="user")
    attendance_records = relationship("Attendance", back_populates="user", primaryjoin="User.id == Attendance.user_id")
    certificates = relationship("Certificate", back_populates="user")
    feedback = relationship("SessionFeedback", back_populates="user")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="user")

    def __repr__(self):
        return f"<User {self.employee_id} ({self.role.value})>"


class HRMasterData(Base):
    """
    HR system of record. The login verification cross-references
    employee_id + mobile_number against this table.
    """
    __tablename__ = "hr_master_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    mobile_number = Column(String(15), nullable=False)
    email = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    date_of_joining = Column(DateTime, nullable=True)
    campus_name = Column(String(200), nullable=True)
    profile_photo_s3_key = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="hr_data")
