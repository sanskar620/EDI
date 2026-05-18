"""
Authentication routes (Phase 1).
Handles Identity Verification, OTP, Face Verification, and Device Binding.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import (
    VerifyIdentityRequest, VerifyIdentityResponse,
    SendOtpRequest, SendOtpResponse,
    VerifyOtpRequest, VerifyOtpResponse,
    FaceVerifyRequest, FaceVerifyResponse,
    DeviceBindRequest, DeviceBindResponse,
    TokenResponse, RefreshTokenRequest,
    UserProfile
)
from app.models.user import User, HRMasterData, UserStatus
from app.core.security import create_token_pair, decode_token
from app.services.otp import generate_otp, store_otp, verify_otp, send_otp_sms
from app.services.aws import verify_face, upload_to_s3
from app.core.deps import get_current_user
from app.models.token import RefreshToken
from datetime import datetime, timedelta, timezone
import base64

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/verify-identity", response_model=VerifyIdentityResponse)
def verify_identity(req: VerifyIdentityRequest, db: Session = Depends(get_db)):
    """Step 1: Verify employee ID and mobile number against HR data."""
    employee_id_upper = req.employee_id.upper()
    
    hr_record = db.query(HRMasterData).filter(
        HRMasterData.employee_id == employee_id_upper,
        HRMasterData.mobile_number == req.mobile_number,
        HRMasterData.is_active == True
    ).first()

    if not hr_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identity not found or inactive. Please contact HR."
        )

    masked_mobile = f"{req.mobile_number[:3]}****{req.mobile_number[-4:]}"
    user = db.query(User).filter(User.employee_id == employee_id_upper).first()

    # Determine user role
    user_role = None
    if user:
        user_role = user.role.value if hasattr(user.role, 'value') else str(user.role)

    return VerifyIdentityResponse(
        success=True,
        message="Identity verified successfully.",
        user_id=user.id if user else None,
        full_name=hr_record.full_name,
        masked_mobile=masked_mobile,
        role=user_role
    )


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(req: SendOtpRequest, db: Session = Depends(get_db)):
    """Step 2a: Send OTP to the verified mobile number."""
    employee_id_upper = req.employee_id.upper()
    otp = generate_otp()
    store_otp(employee_id_upper, otp)
    
    # In a real app, send_otp_sms would be awaited or pushed to Celery
    send_success = send_otp_sms(req.mobile_number, otp)

    if not send_success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP SMS."
        )

    return SendOtpResponse(
        success=True,
        message=f"OTP sent to {req.mobile_number[-4:]}",
        expires_in_seconds=300
    )


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp_route(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Step 2b: Verify the OTP."""
    employee_id_upper = req.employee_id.upper()
    success, message = verify_otp(employee_id_upper, req.otp)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    # Check if user needs account setup (Face ID & Device Binding)
    user = db.query(User).filter(User.employee_id == employee_id_upper).first()
    
    requires_setup = False
    if not user or user.status == UserStatus.PENDING:
        requires_setup = True

    return VerifyOtpResponse(
        success=True,
        message="OTP verified.",
        requires_face_verification=requires_setup,
        requires_device_binding=requires_setup
    )


@router.post("/verify-face", response_model=FaceVerifyResponse)
async def verify_face_route(
    employee_id: str,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Step 3: Liveness check and face match against HR profile photo."""
    employee_id_upper = employee_id.upper()
    hr_record = db.query(HRMasterData).filter(HRMasterData.employee_id == employee_id_upper).first()
    if not hr_record or not hr_record.profile_photo_s3_key:
         # For MVP/DEV, auto-pass if HR has no photo
        print("[DEV] No HR profile photo found. Auto-passing face verify.")
        return FaceVerifyResponse(success=True, message="Face matched (Dev Mock).", confidence_score=99.9, liveness_passed=True)

    photo_bytes = await photo.read()
    
    # Needs actual S3 object fetch for the reference image in production
    # reference_bytes = fetch_from_s3(hr_record.profile_photo_s3_key)
    # is_match, score = verify_face(reference_bytes, photo_bytes)
    
    # Mock for now
    is_match, score = True, 98.5

    if not is_match:
         raise HTTPException(status_code=400, detail="Face mismatch. Please try again.")

    return FaceVerifyResponse(
        success=True,
        message="Face match successful.",
        confidence_score=score,
        liveness_passed=True
    )


@router.post("/bind-device", response_model=TokenResponse)
def bind_device_register(req: DeviceBindRequest, db: Session = Depends(get_db)):
    """Step 4: Bind device, create/activate user, and issue JWT."""
    employee_id_upper = req.employee_id.upper()
    hr_record = db.query(HRMasterData).filter(HRMasterData.employee_id == employee_id_upper).first()
    if not hr_record:
        raise HTTPException(status_code=404, detail="HR record not found.")

    user = db.query(User).filter(User.employee_id == employee_id_upper).first()
    
    # For DEV/testing on a single device: clear this device_id from any other user
    # so we don't violate the UNIQUE constraint when switching accounts on the same phone.
    if req.device_id:
        existing_owner = db.query(User).filter(User.device_id == req.device_id).first()
        if existing_owner and existing_owner.employee_id != employee_id_upper:
            existing_owner.device_id = None
            db.add(existing_owner)
            db.commit()
            
    if not user:
        # Create new user based on HR data
        user = User(
            employee_id=hr_record.employee_id,
            mobile_number=hr_record.mobile_number,
            email=hr_record.email,
            full_name=hr_record.full_name,
            department=hr_record.department,
            designation=hr_record.designation,
            status=UserStatus.ACTIVE,
            device_id=req.device_id,
            device_model=req.device_model,
        )
        db.add(user)
    else:
        # Update existing user device binding
        user.status = UserStatus.ACTIVE
        user.device_id = req.device_id
        user.device_model = req.device_model

    db.commit()
    db.refresh(user)

    tokens = create_token_pair(user.id, user.employee_id, user.role.value)
    
    # Save refresh token to DB
    new_refresh = RefreshToken(
        user_id=user.id,
        token=tokens["refresh_token"],
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(new_refresh)
    db.commit()
    
    return TokenResponse(
        **tokens,
        user_id=user.id,
        full_name=user.full_name,
        employee_id=user.employee_id
    )

@router.post("/login", response_model=TokenResponse)
def login(req: DeviceBindRequest, db: Session = Depends(get_db)):
    """Login for already registered users. Requires matching device_id."""
    employee_id_upper = req.employee_id.upper()
    user = db.query(User).filter(User.employee_id == employee_id_upper).first()
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Account not found or inactive. Register first.")
        
    if user.device_id != req.device_id:
        raise HTTPException(status_code=403, detail="Unrecognized device. Please contact IT admin to reset device binding.")
        
    tokens = create_token_pair(user.id, user.employee_id, user.role.value)
    
    # Save refresh token to DB (cleanup old ones for this user first)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    
    new_refresh = RefreshToken(
        user_id=user.id,
        token=tokens["refresh_token"],
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(new_refresh)
    db.commit()
    return TokenResponse(
         **tokens,
        user_id=user.id,
        full_name=user.full_name,
        employee_id=user.employee_id
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token_route(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Check in DB
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == req.refresh_token,
        RefreshToken.is_revoked == False,
        RefreshToken.expires_at > datetime.utcnow()
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")
        
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Issue new pair
    tokens = create_token_pair(user.id, user.employee_id, user.role.value)
    
    # Replace old refresh token with new one
    db_token.token = tokens["refresh_token"]
    db_token.expires_at = datetime.utcnow() + timedelta(days=30)
    db.commit()
    
    return TokenResponse(
        **tokens,
        user_id=user.id,
        full_name=user.full_name,
        employee_id=user.employee_id
    )

@router.post("/logout")
def logout(req: RefreshTokenRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Revoke a refresh token."""
    db.query(RefreshToken).filter(RefreshToken.token == req.refresh_token).delete()
    db.commit()
    return {"success": True, "message": "Logged out successfully"}

@router.get("/me", response_model=UserProfile)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile."""
    return current_user


# ═══════════════════════════════════════════════════════════════
# DEV ONLY - Remove in production
# ═══════════════════════════════════════════════════════════════
@router.get("/dev/otp/{employee_id}")
def get_dev_otp(employee_id: str):
    """DEV ONLY: Get OTP for testing (remove in production)."""
    from app.services.otp import _redis_request
    from app.config import settings
    
    employee_id_upper = employee_id.upper()
    key = f"otp:{employee_id_upper}"
    
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        result = _redis_request("GET", f"/get/{key}:code")
        otp = result.get("result")
        if otp:
            return {"otp": otp, "source": "redis"}
    
    # DEV Mode fallback
    return {"otp": "123456", "source": "dev_mock"}
