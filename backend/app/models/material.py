"""
Material model — PDFs, PPTs, videos stored on S3.
Blueprint Phase 2 (pre-study), Phase 4 (in-session).
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, Enum, ForeignKey
)
import enum
from sqlalchemy.orm import relationship
from app.database import Base


class MaterialType(str, enum.Enum):
    PDF = "PDF"
    PPT = "PPT"
    VIDEO = "VIDEO"
    IMAGE = "IMAGE"
    DOCUMENT = "DOCUMENT"


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(300), nullable=False)
    description = Column(String(500), nullable=True)
    material_type = Column(Enum(MaterialType), nullable=False)
    topic = Column(String(200), nullable=False)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=True)

    # S3 storage
    s3_key = Column(String(500), nullable=False)
    s3_key_compressed = Column(String(500), nullable=True)  # "Data Saver" version
    file_size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)  # for videos

    # Metadata
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    order_number = Column(Integer, nullable=False, default=1)

    module = relationship("Module", back_populates="materials")
