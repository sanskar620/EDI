"""
FastAPI dependencies — authentication, authorization, DB session.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole


security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the JWT from the Authorization header."""
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def require_roles(*roles: UserRole):
    """Dependency factory — restricts endpoint to specific roles."""
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(r.value for r in roles)}",
            )
        return user
    return role_checker


# Convenience shortcuts
get_trainee = require_roles(UserRole.TRAINEE)
get_trainer = require_roles(UserRole.TRAINER)
get_supervisor = require_roles(UserRole.SUPERVISOR)
get_admin = require_roles(UserRole.ADMIN)
get_trainer_or_supervisor = require_roles(UserRole.TRAINER, UserRole.SUPERVISOR)
get_any_authenticated = require_roles(UserRole.TRAINEE, UserRole.TRAINER, UserRole.SUPERVISOR, UserRole.ADMIN)
