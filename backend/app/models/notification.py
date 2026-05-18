"""
Notification model.
Blueprint Phase 2: Push notifications, reminders, invite tracking.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum,
)
import enum
from app.database import Base


class NotificationType(str, enum.Enum):
    TRAINING_INVITE = "TRAINING_INVITE"
    REMINDER_24H = "REMINDER_24H"
    REMINDER_1H = "REMINDER_1H"
    MATERIAL_RELEASED = "MATERIAL_RELEASED"
    RESULT_PUBLISHED = "RESULT_PUBLISHED"
    CERTIFICATE_ISSUED = "CERTIFICATE_ISSUED"
    EXPIRY_WARNING = "EXPIRY_WARNING"
    INTEGRITY_ALERT = "INTEGRITY_ALERT"
    SYNC_REQUIRED = "SYNC_REQUIRED"
    GENERAL = "GENERAL"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(300), nullable=False)
    body = Column(Text, nullable=True)
    # Deep link into the app
    action_url = Column(String(500), nullable=True)
    # Related entity
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    is_sent = Column(Boolean, nullable=False, default=False)
    sent_via = Column(String(50), nullable=True)  # push / sms / email
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
