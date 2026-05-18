"""
Session, Attendance, Assessment, Feedback, Certificate schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Common ──────────────────────────────────────
class MessageResponse(BaseModel):
    success: bool
    message: str


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int


# ── Training Session ────────────────────────────
class SessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    scheduled_date: datetime
    start_time: datetime
    end_time: datetime
    campus_id: Optional[int] = None
    venue_name: Optional[str] = None
    pre_test_enabled: bool = True
    post_test_enabled: bool = True
    passing_threshold: float = 70.0
    max_retakes: int = 2


class SessionResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    topic: str
    scheduled_date: datetime
    start_time: datetime
    end_time: datetime
    venue_name: Optional[str] = None
    status: str
    trainer_name: Optional[str] = None
    enrolled_count: int = 0
    attended_count: int = 0

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total: int


# ── Enrollment / RSVP ──────────────────────────
class EnrollTraineesRequest(BaseModel):
    session_id: int
    trainee_ids: List[int]


class RsvpRequest(BaseModel):
    session_id: int
    response: str  # "ACCEPTED" / "DECLINED"


# ── QR Check-in ────────────────────────────────
class QrCheckinRequest(BaseModel):
    qr_token: str
    session_id: int


# ── Attendance ──────────────────────────────────
class AttendanceCheckinRequest(BaseModel):
    session_id: int
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = None


class AttendanceFinalizeRequest(BaseModel):
    session_id: int
    biometric_verified: bool
    biometric_method: Optional[str] = None  # "fingerprint" / "face_id"


class AttendanceStatusResponse(BaseModel):
    session_id: int
    present: int
    pending: int
    absent: int
    total: int
    trainees: list  # list of trainee attendance dicts


class ForceAttendanceRequest(BaseModel):
    session_id: int
    user_id: int
    is_present: bool
    notes: Optional[str] = None


# ── Group Photo ─────────────────────────────────
class GroupPhotoResponse(BaseModel):
    success: bool
    detected_faces: int
    digital_checkins: int
    mismatch: bool
    message: str


# ── Materials ───────────────────────────────────
class MaterialResponse(BaseModel):
    id: int
    title: str
    material_type: str
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[int] = None
    is_released: bool = False
    presigned_url: Optional[str] = None

    class Config:
        from_attributes = True


class ReleaseMaterialRequest(BaseModel):
    session_id: int
    material_id: int


# ── Assessment ──────────────────────────────────
class QuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[list] = None
    points: float = 1.0


class FetchQuestionsResponse(BaseModel):
    assessment_session_id: int
    questions: List[QuestionResponse]
    time_limit_seconds: int
    total_questions: int


class SubmitAnswerRequest(BaseModel):
    assessment_session_id: int
    question_id: int
    selected_answer: str
    time_spent_seconds: Optional[int] = None


class SubmitAssessmentRequest(BaseModel):
    assessment_session_id: int
    answers: List[SubmitAnswerRequest]


class AssessmentResultResponse(BaseModel):
    assessment_session_id: int
    total_questions: int
    correct_answers: int
    score_percentage: float
    passed: bool
    passing_threshold: float
    attempt_number: int
    retakes_remaining: int


class IntegrityEventRequest(BaseModel):
    assessment_session_id: int
    event_type: str  # "app_switch" / "screen_capture" / "face_mismatch"
    details: Optional[str] = None


# ── Practical Scoring ───────────────────────────
class PracticalScoreRequest(BaseModel):
    session_id: int
    user_id: int
    criteria_scores: dict  # {"evacuation_speed": 4, "equipment_handling": 5}
    comment: Optional[str] = None
    is_offline: bool = False


# ── Proctoring ──────────────────────────────────
class ProctoringSnapshotResponse(BaseModel):
    success: bool
    face_matched: Optional[bool] = None
    confidence_score: Optional[float] = None
    faces_detected: Optional[int] = None
    is_flagged: bool = False


# ── Feedback ────────────────────────────────────
class FeedbackSubmitRequest(BaseModel):
    session_id: int
    trainer_clarity: Optional[float] = Field(None, ge=1, le=5)
    content_relevance: Optional[float] = Field(None, ge=1, le=5)
    venue_quality: Optional[float] = Field(None, ge=1, le=5)
    overall_rating: Optional[float] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


# ── Certificate ─────────────────────────────────
class CertificateResponse(BaseModel):
    id: int
    certificate_uid: str
    module_name: str
    score_percentage: float
    issued_date: datetime
    expiry_date: datetime
    is_expired: bool
    certificate_url: Optional[str] = None

    class Config:
        from_attributes = True


# ── Signature ───────────────────────────────────
class SignSessionRequest(BaseModel):
    session_id: int
    role: str  # "trainee" / "trainer"
    # signature_image sent as multipart file
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ── Compliance ──────────────────────────────────
class ComplianceStatusResponse(BaseModel):
    user_id: int
    overall_status: str  # "green" / "amber" / "red"
    total_certificates: int
    valid: int
    expiring_soon: int
    expired: int
    certificates: List[CertificateResponse]


# ── Supervisor Batch ────────────────────────────
class StartBatchSessionRequest(BaseModel):
    training_session_id: int
    trainee_ids: List[int]


class BatchSessionResponse(BaseModel):
    id: int
    training_session_id: int
    total_trainees: int
    completed_trainees: int
    current_trainee_id: Optional[int] = None
    status: str


class CompleteTraineeRequest(BaseModel):
    batch_session_id: int
    trainee_id: int
    # photo + signature sent as multipart


# ── Flashcards ──────────────────────────────────
class FlashcardResponse(BaseModel):
    id: int
    topic: str
    front_text: str
    back_text: str
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


# ── Sync ────────────────────────────────────────
class SyncBatchUploadRequest(BaseModel):
    items: list  # array of sync queue items


class SyncBatchUploadResponse(BaseModel):
    success: bool
    synced: int
    failed: int
    conflicts: int
