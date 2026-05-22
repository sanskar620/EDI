"""
User Management API endpoints.
Handles user CRUD operations (admin/supervisor only).
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole, UserStatus, HRMasterData
from app.api.auth import get_current_user
from app.api.ws import broadcast_change

router = APIRouter(prefix="/users", tags=["Users"])


# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════

class UserResponse(BaseModel):
    id: int
    employee_id: str
    full_name: str
    email: Optional[str]
    mobile_number: str
    department: Optional[str]
    designation: Optional[str]
    role: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None


class UserCreateRequest(BaseModel):
    employee_id: str
    full_name: str
    mobile_number: str
    role: str = "TRAINEE"
    department: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    language: Optional[str] = "en"


# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("", response_model=List[UserResponse])
async def list_users(
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List users with filters.
    Only supervisors can access.
    """
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.employee_id.ilike(f"%{search}%"))
        )
    
    users = query.offset(skip).limit(limit).all()
    
    return [UserResponse.from_orm(u) for u in users]


@router.post("", response_model=UserResponse)
async def create_user(
    data: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user (trainer/trainee).
    Supervisors only.
    """
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if employee_id already exists
    existing = db.query(User).filter(User.employee_id == data.employee_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Employee ID already exists")
    
    new_user = User(
        employee_id=data.employee_id,
        full_name=data.full_name,
        mobile_number=data.mobile_number,
        role=data.role,
        department=data.department or ("Training" if data.role == "TRAINER" else "Operations"),
        designation=data.designation or data.role.capitalize(),
        email=data.email,
        language=data.language or "en",
        status="ACTIVE",
    )
    
    db.add(new_user)
    
    # Auto-provision HR record so the user can log in immediately
    hr_record = HRMasterData(
        employee_id=data.employee_id,
        full_name=data.full_name,
        mobile_number=data.mobile_number,
        email=data.email,
        department=data.department or ("Training" if data.role == "TRAINER" else "Operations"),
        designation=data.designation or data.role.capitalize(),
        is_active=True
    )
    db.add(hr_record)
    
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("user", "create", {
        "id": new_user.id,
        "full_name": new_user.full_name,
        "role": new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)
    })
    
    db.refresh(new_user)
    
    return UserResponse.from_orm(new_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID."""
    # Users can view their own profile
    if current_user.id != user_id and current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update user information.
    Supervisors can update any user, users can update their own profile (limited fields).
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Permission check
    is_supervisor = current_user.role in ["SUPERVISOR", "ADMIN"]
    is_self = current_user.id == user_id
    
    if not (is_supervisor or is_self):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    
    # Regular users can't change role or status
    if not is_supervisor:
        update_dict.pop("role", None)
        update_dict.pop("status", None)
    
    for field, value in update_dict.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.from_orm(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hard-delete a user and cascade-remove related records.
    Supervisors only. Cannot delete yourself.
    """
    if current_user.role not in ["SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cascade: remove related records
    from app.models.notification import Notification
    from app.models.attendance import Attendance
    from app.models.session import SessionEnrollment
    from app.models.course import CourseEnrollment
    
    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.query(Attendance).filter(Attendance.user_id == user_id).delete()
    db.query(SessionEnrollment).filter(SessionEnrollment.user_id == user_id).delete()
    db.query(CourseEnrollment).filter(CourseEnrollment.user_id == user_id).delete()
    
    # Also clean up the HR record so the employee ID can be reused
    db.query(HRMasterData).filter(HRMasterData.employee_id == user.employee_id).delete()
    
    # Hard delete the user
    db.delete(user)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("user", "delete", {
        "id": user_id
    })
    
    return {"success": True, "message": f"User '{user.full_name}' permanently deleted"}
