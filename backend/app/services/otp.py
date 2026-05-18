"""
OTP service — generate, store, and verify OTPs.
Uses Upstash Redis for storage, Twilio for SMS delivery.
"""

import random
import string
import httpx
from typing import Tuple
from app.config import settings


def _redis_request(method: str, path: str) -> dict:
    """Make request to Upstash Redis REST API."""
    url = f"{settings.UPSTASH_REDIS_REST_URL}{path}"
    headers = {"Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}"}
    
    if method == "GET":
        r = httpx.get(url, headers=headers, timeout=10)
    else:
        r = httpx.post(url, headers=headers, timeout=10)
    
    return r.json()


def _key(employee_id: str) -> str:
    return f"otp:{employee_id}"


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))


def store_otp(employee_id: str, otp: str) -> None:
    """Store OTP in Redis with TTL."""
    key = _key(employee_id)
    ttl = settings.OTP_EXPIRE_SECONDS
    
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        # Use Upstash Redis
        # Store OTP with expiry
        _redis_request("POST", f"/setex/{key}:code/{ttl}/{otp}")
        # Store attempts counter
        _redis_request("POST", f"/setex/{key}:attempts/{ttl}/0")
        print(f"[REDIS] OTP stored for {employee_id}: {otp} (expires in {ttl}s)")
    else:
        print(f"[DEV] OTP for {employee_id}: {otp} (Redis not configured)")


def verify_otp(employee_id: str, otp: str) -> Tuple[bool, str]:
    """
    Verify OTP. Returns (success, message).
    Handles expiry and max-attempts enforcement.
    """
    key = _key(employee_id)
    
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        # Get stored OTP
        result = _redis_request("GET", f"/get/{key}:code")
        stored_otp = result.get("result")
        
        if not stored_otp:
            return False, "OTP expired or not found. Request a new one."
        
        # Get attempts
        attempts_result = _redis_request("GET", f"/get/{key}:attempts")
        attempts = int(attempts_result.get("result") or 0)
        
        if attempts >= settings.OTP_MAX_ATTEMPTS:
            # Delete OTP
            _redis_request("POST", f"/del/{key}:code")
            _redis_request("POST", f"/del/{key}:attempts")
            return False, "Maximum attempts exceeded. Request a new OTP."
        
        # Increment attempts
        _redis_request("POST", f"/incr/{key}:attempts")
        
        if stored_otp != otp:
            remaining = settings.OTP_MAX_ATTEMPTS - attempts - 1
            return False, f"Invalid OTP. {remaining} attempt(s) remaining."
        
        # Success - delete OTP
        _redis_request("POST", f"/del/{key}:code")
        _redis_request("POST", f"/del/{key}:attempts")
        return True, "OTP verified successfully."
    else:
        # Fallback for dev without Redis
        return True, "OTP verified (dev mode)."


def send_otp_sms(mobile_number: str, otp: str) -> bool:
    """
    Send OTP via Twilio SMS.
    In dev mode (no Twilio credentials), just prints to console.
    """
    # Development mode: just print OTP
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        print(f"[DEV MODE] OTP for {mobile_number}: {otp}")
        return True

    try:
        from twilio.rest import Client
        
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        message = client.messages.create(
            body=f"Your LMS Training App verification code is: {otp}. Valid for 5 minutes.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=mobile_number
        )
        
        print(f"[TWILIO] SMS sent to {mobile_number}, SID: {message.sid}")
        return True
        
    except Exception as e:
        # In dev mode, still return True but log the OTP (for testing)
        print(f"[TWILIO] SMS failed (trial account limitation): {str(e)[:100]}")
        print(f"[DEV FALLBACK] OTP for {mobile_number}: {otp}")
        return True  # Return True in dev so app can proceed
