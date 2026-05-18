"""
Flashcards API endpoints.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.flashcard import Flashcard
from app.models.user import User
from app.api.auth import get_current_user

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

# ═══════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════

class FlashcardResponse(BaseModel):
    id: int
    topic: str
    front_text: str
    back_text: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("", response_model=List[FlashcardResponse])
def get_flashcards(
    topic: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all active flashcards, optionally filtered by topic."""
    query = db.query(Flashcard).filter(Flashcard.is_active == True)
    if topic:
        query = query.filter(Flashcard.topic == topic)
        
    flashcards = query.order_by(Flashcard.created_at.desc()).all()
    return flashcards
