"""
Offline sync queue — holds data captured without internet.
Blueprint Phase 6: Offline sync for remote sites.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Enum,
)
import enum
from app.database import Base


class SyncStatus(str, enum.Enum):
    PENDING = "PENDING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"
    CONFLICT = "CONFLICT"


class SyncQueueItem(Base):
    __tablename__ = "sync_queue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    entity_type = Column(String(50), nullable=False)  # attendance / score / photo / signature
    entity_id = Column(String(100), nullable=True)
    payload = Column(JSON, nullable=False)
    status = Column(Enum(SyncStatus), nullable=False, default=SyncStatus.PENDING)
    device_timestamp = Column(DateTime, nullable=False)
    server_timestamp = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
