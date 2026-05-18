# models package — import all models here for Alembic auto-detection
from app.models.user import User, HRMasterData
from app.models.session import TrainingSession, SessionEnrollment, SessionMaterial, Module
from app.models.course import Course, CourseMaterial, CourseEnrollment
from app.models.attendance import Attendance, CampusGeofence
from app.models.assessment import QuestionBank, AssessmentSession, AssessmentAttempt, AssessmentResult, PracticalScore
from app.models.material import Material
from app.models.certificate import Certificate
from app.models.feedback import SessionFeedback
from app.models.flashcard import Flashcard
from app.models.notification import Notification
from app.models.supervisor import SupervisorSession
from app.models.sync_queue import SyncQueueItem
from app.models.proctoring import ProctoringSnapshot
from app.models.token import RefreshToken
