"""
Application configuration — loaded from .env file.
Supabase PostgreSQL + Twilio + AWS + Firebase
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import json


class Settings(BaseSettings):
    # ── App ──────────────────────────────────
    APP_NAME: str = "LMS Training Portal"
    APP_VERSION: str = "1.0.0"
    DEBUG: str = "true"  # Changed to str to avoid parsing issues
    
    @property
    def is_debug(self) -> bool:
        return str(self.DEBUG).lower() in ("true", "1", "yes")

    # ── Database (Supabase PostgreSQL) ───────
    DATABASE_URL: str = "sqlite:///./lms_training.db"
    SUPABASE_DB_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # ── JWT ──────────────────────────────────
    JWT_SECRET_KEY: str = "dev-secret-key-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Redis (Upstash) ──────────────────────
    REDIS_URL: str = ""
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # ── OTP ──────────────────────────────────
    OTP_EXPIRE_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 3

    # ── Twilio (SMS OTP) ─────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # ── AWS (S3 + Rekognition) ───────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: str = "training-app-bucket-123"
    AWS_REKOGNITION_COLLECTION: str = "lms-faces"

    # ── Firebase (Push Notifications) ────────
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = "firebase-service-account.json"

    # ── CORS ─────────────────────────────────
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:8081"]'

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            origins = json.loads(self.CORS_ORIGINS)
            # Allow all expo URLs for development
            origins.append("*")
            return origins
        except (json.JSONDecodeError, TypeError):
            return ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
