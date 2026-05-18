"""
Notifications API endpoints.
Handles push notifications storage and retrieval.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.api.auth import get_current_user
from app.api.ws import broadcast_change

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════

class NotificationCreate(BaseModel):
    user_ids: List[int]
    notification_type: NotificationType
    title: str
    message: str
    target_role: Optional[str] = 'ALL'
    data: Optional[dict] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    target_role: Optional[str] = 'ALL'
    is_read: bool
    session_id: Optional[int] = None
    created_at: datetime
    recipient_count: Optional[int] = 1
    
    class Config:
        from_attributes = True

    @classmethod
    def from_notification(cls, n: Notification, target_role: str = 'ALL', recipient_count: int = 1) -> 'NotificationResponse':
        """Build response from Notification ORM, mapping body -> message."""
        return cls(
            id=n.id,
            user_id=n.user_id,
            notification_type=n.notification_type.value if hasattr(n.notification_type, 'value') else str(n.notification_type),
            title=n.title,
            message=n.body or '',
            target_role=target_role,
            is_read=n.is_read,
            session_id=n.session_id,
            created_at=n.created_at,
            recipient_count=recipient_count,
        )


# ═══════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════

def send_fcm_notification(fcm_token: str, title: str, body: str, data: dict = None):
    """Send push notification via Firebase Cloud Messaging (stub - FCM not configured)."""
    # FCM integration placeholder. Firebase admin SDK not installed locally.
    print(f"[Notification] Would send FCM to token={fcm_token[:8]}... title={title}")
    return None


# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("/my-notifications", response_model=List[NotificationResponse])
async def get_my_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notifications for current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).all()
    
    return [NotificationResponse.from_notification(n) for n in notifications]

@router.get("/all", response_model=List[NotificationResponse])
async def get_all_notifications(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all notifications grouped as broadcasts (Supervisor/Admin only)."""
    if current_user.role not in ["SUPERVISOR", "ADMIN", "TRAINER"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all notifications ordered by time desc
    all_notifs = db.query(Notification).order_by(Notification.created_at.desc()).all()
    
    # Deduplicate: group by title+body and pick the most recent one as representative
    seen = set()
    result = []
    for n in all_notifs:
        key = (n.title, n.body)
        if key not in seen:
            seen.add(key)
            # Count how many users received this exact notification
            count = sum(1 for x in all_notifs if (x.title, x.body) == key)
            result.append(NotificationResponse.from_notification(n, target_role='ALL', recipient_count=count))
        if len(result) >= limit:
            break
    
    return result

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all notifications in a broadcast (Supervisor/Admin only)."""
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Delete all notifications with the same title and body (the whole broadcast)
    db.query(Notification).filter(
        Notification.title == notification.title,
        Notification.body == notification.body
    ).delete(synchronize_session=False)
    db.commit()
    return {"success": True, "message": "Notification broadcast deleted"}


@router.post("/send", status_code=201)
async def send_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send notifications to multiple users.
    Trainers and supervisors only.
    """
    if current_user.role not in ["TRAINER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    sent_count = 0
    failed_count = 0
    
    for user_id in notification_data.user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            failed_count += 1
            continue
        
        # Create notification record
        notification = Notification(
            user_id=user_id,
            notification_type=notification_data.notification_type,
            title=notification_data.title,
            body=notification_data.message,
            is_read=False,
            is_sent=True,
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        
        # Send FCM push notification if user has FCM token
        if hasattr(user, 'fcm_token') and user.fcm_token:
            send_fcm_notification(
                user.fcm_token,
                notification_data.title,
                notification_data.message,
                notification_data.data
            )
        
        sent_count += 1
    
    db.commit()
    
    # Broadcast real-time update to all connected clients
    await broadcast_change("notification", "create", {
        "title": notification_data.title,
        "user_ids": notification_data.user_ids,
        "sent_count": sent_count,
    })
    
    return {
        "success": True,
        "sent": sent_count,
        "failed": failed_count,
        "message": f"Notifications sent to {sent_count} users"
    }


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    
    return {"success": True, "message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    
@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    db.delete(notification)
    db.commit()
    return {"success": True, "message": "Notification deleted"}

@router.delete("/read-all")
async def delete_read_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all read notifications."""
    deleted_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == True
    ).delete()
    
    db.commit()
    return {"success": True, "deleted": deleted_count, "message": "Read notifications deleted"}
