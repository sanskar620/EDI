"""
Attendance & Campus Geofence models.
Blueprint Phase 3: GPS check-in, biometric verification, geo-fencing.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, JSON, Enum,
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class AttendanceMethod(str, enum.Enum):
    TRAINER = "TRAINER"        # Marked by trainer
    FACE = "FACE"              # Face verification self check-in
    QR = "QR"                  # QR code scan
    MANUAL = "MANUAL"          # Manual entry by admin


class CampusGeofence(Base):
    """
    Campus geo-fence polygon for attendance validation.
    Stores polygon as JSON array of [lat, lng] pairs.
    Compatible with MySQL JSON and PostgreSQL JSONB.
    """
    __tablename__ = "campus_geofence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    address = Column(Text, nullable=True)
    # Polygon coordinates as JSON: [[lat1,lng1], [lat2,lng2], ...]
    polygon_coords = Column(JSON, nullable=False)
    # Bounding circle for quick pre-check
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    radius_meters = Column(Float, nullable=False, default=500.0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Attendance status and method
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT)
    method = Column(Enum(AttendanceMethod), nullable=False, default=AttendanceMethod.TRAINER)
    
    # Check-in details
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)

    # Geo verification
    check_in_lat = Column(Float, nullable=True)
    check_in_lng = Column(Float, nullable=True)
    geo_verified = Column(Boolean, nullable=False, default=False)
    geo_accuracy_meters = Column(Float, nullable=True)

    # Biometric/Face verification
    biometric_verified = Column(Boolean, nullable=False, default=False)
    biometric_method = Column(String(50), nullable=True)  # fingerprint / face_id
    face_match_score = Column(Float, nullable=True)  # Similarity percentage from Rekognition
    
    # Image for audit (S3 key)
    selfie_image_url = Column(String(500), nullable=True)  # S3 key for attendance selfie

    # QR check-in
    qr_verified = Column(Boolean, nullable=False, default=False)

    # Status flags
    is_present = Column(Boolean, nullable=False, default=False)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # User ID who marked
    force_marked = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session = relationship("TrainingSession", back_populates="attendance_records")
    user = relationship("User", back_populates="attendance_records", foreign_keys=[user_id])
    marker = relationship("User", foreign_keys=[marked_by])
