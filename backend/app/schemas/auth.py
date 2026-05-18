"""
Auth schemas — request/response models for Phase 1 authentication.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Verify Identity (Step 1) ────────────────────
class VerifyIdentityRequest(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=50, examples=["EMP-90210"])
    mobile_number: str = Field(..., min_length=10, max_length=15, examples=["+919876543210"])


class VerifyIdentityResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None
    full_name: Optional[str] = None
    masked_mobile: Optional[str] = None  # "+91****3210"
    role: Optional[str] = None  # User's assigned role from HR/users table


# ── OTP (Step 2) ───────────────────────────────
class SendOtpRequest(BaseModel):
    employee_id: str
    mobile_number: str


class SendOtpResponse(BaseModel):
    success: bool
    message: str
    expires_in_seconds: int = 300


class VerifyOtpRequest(BaseModel):
    employee_id: str
    otp: str = Field(..., min_length=6, max_length=6)


class VerifyOtpResponse(BaseModel):
    success: bool
    message: str
    requires_face_verification: bool = False
    requires_device_binding: bool = False


# ── Face Verification (Step 3) ──────────────────
class FaceVerifyRequest(BaseModel):
    employee_id: str
    # Photo sent as base64 or multipart — handled in route


class FaceVerifyResponse(BaseModel):
    success: bool
    message: str
    confidence_score: Optional[float] = None
    liveness_passed: bool = False


# ── Device Binding ──────────────────────────────
class DeviceBindRequest(BaseModel):
    employee_id: str
    device_id: str
    device_model: Optional[str] = None


class DeviceBindResponse(BaseModel):
    success: bool
    message: str


# ── Token Response (Final Step) ─────────────────
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    employee_id: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Version Check ──────────────────────────────
class VersionCheckRequest(BaseModel):
    current_version: str
    platform: str  # "android" / "ios"


class VersionCheckResponse(BaseModel):
    update_required: bool
    latest_version: str
    update_url: Optional[str] = None
    message: Optional[str] = None


# ── Language ────────────────────────────────────
class SetLanguageRequest(BaseModel):
    language: str = Field(..., min_length=2, max_length=5, examples=["en", "hi", "ta"])


# ── User Profile ───────────────────────────────
class UserProfile(BaseModel):
    id: int
    employee_id: str
    full_name: str
    role: str
    department: Optional[str] = None
    designation: Optional[str] = None
    language: str
    profile_photo_url: Optional[str] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True
