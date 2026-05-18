"""
Main FastAPI application entry point.
"""
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, Base
import app.models # Ensure all models are registered
from app.api import auth, sessions, courses, enrollments, materials, attendance, assessments, users, notifications, reports, certificates, flashcards
from app.api import ws as ws_router
from app.utils.backup import backup_scheduler
import asyncio
from fastapi.staticfiles import StaticFiles

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Initialize FastAPI App
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for LMS Training Application",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.on_event("startup")
async def startup_event():
    # Start the automated backup scheduler in the background
    asyncio.create_task(backup_scheduler())

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(enrollments.router, prefix="/api/v1")
app.include_router(materials.router, prefix="/api/v1")
app.include_router(attendance.router, prefix="/api/v1")
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(certificates.router, prefix="/api/v1")
app.include_router(flashcards.router, prefix="/api/v1")

# WebSocket route (no prefix — accessed directly at /ws/sync)
app.include_router(ws_router.router)

# Mount the uploads directory to serve static files (documents, images, videos)
import os
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online"
    }

@app.get("/health")
def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy"}

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )
