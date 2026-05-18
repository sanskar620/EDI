# LMS Training Application — Backend

This is the FastAPI backend for the LMS Training Mobile App.

## Technology Stack
*   **FastAPI**: Web framework
*   **SQLAlchemy ORM**: Database agnosticism (MySQL by default, switchable to PostgreSQL)
*   **Alembic**: Database migrations
*   **Redis**: OTP storage and caching
*   **Celery**: Background jobs (ready for future addition)
*   **AWS**: S3 (files), Rekognition (face match)

## Setup Instructions

### 1. Requirements
*   Python 3.9+
*   MySQL Server (>= 8.0)
*   Redis (optional, falls back to in-memory for local development)

### 2. Installation
```bash
cd backend
python -m venv venv
# Windows:
venv\\Scripts\\activate
# macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Database Creation (MySQL)
Create a new schema in your MySQL server:
```sql
CREATE DATABASE lms_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configuration
1.  Copy `.env.example` to `.env`:
    *   Windows: `copy .env.example .env`
    *   Mac/Linux: `cp .env.example .env`
2.  Edit `.env` and set your `DATABASE_URL` (replace `root:password` with your credentials).

> **Note on PostgreSQL**: To switch to Postgres, simply change the `DATABASE_URL` in `.env` to:
> `postgresql+psycopg2://user:password@localhost:5432/lms_training`
> And install the driver: `pip install psycopg2-binary`

### 5. Run Migrations
Generate the database tables using Alembic:
```bash
alembic revision --autogenerate -m "Initial Schema"
alembic upgrade head
```

### 6. Start the Server
Start the FastAPI application in development mode:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*   **Swagger API Docs**: http://localhost:8000/docs
*   **ReDoc Docs**: http://localhost:8000/redoc

## Notes on Auth API (Phase 1)
The onboarding flow has 4 steps:
1.  `POST /api/v1/auth/verify-identity`: Checks HR records (`employee_id` + mobile).
2.  `POST /api/v1/auth/send-otp` & `verify-otp`: Verifies possession of the device.
3.  `POST /api/v1/auth/verify-face`: Compares selfie against HR profile photo (AWS Rekognition stubbed in dev).
4.  `POST /api/v1/auth/bind-device`: Issues JWT access and refresh tokens and registers the device ID.
