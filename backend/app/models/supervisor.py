"""
Supervisor session model — batch testing on shared devices.
Blueprint Phase 5: Shared device flow.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, JSON,
)
import enum
from app.database import Base


class BatchStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"


class SupervisorSession(Base):
    """Tracks a supervisor's batch testing session on a shared device."""
    __tablename__ = "supervisor_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    training_session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    device_id = Column(String(255), nullable=True)

    status = Column(Enum(BatchStatus), nullable=False, default=BatchStatus.ACTIVE)
    total_trainees = Column(Integer, nullable=False, default=0)
    completed_trainees = Column(Integer, nullable=False, default=0)

    # Ordered list of trainee_ids to test
    trainee_queue = Column(JSON, nullable=True)
    current_trainee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
