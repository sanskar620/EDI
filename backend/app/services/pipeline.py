"""
Cross-Role Data Pipeline Engine.
This processes Offline Sync data and cascades events mapping Trainers to Trainees & Supervisors.
"""

from sqlalchemy.orm import Session
from app.models.sync_queue import SyncQueueItem, SyncStatus
from app.models.session import TrainingSession, SessionEnrollment
from app.models.user import User, TraineeProfile, SupervisorProfile
from app.models.supervisor import SupervisorSession
from app.models.attendance import Attendance
from app.models.assessment import PracticalScore, AssessmentResult
from app.models.certificate import Certificate
import json
from datetime import datetime

def process_sync_queue(db: Session, sync_items: list[SyncQueueItem]):
    """Process incoming sync items from a device."""
    for item in sync_items:
        if item.status != SyncStatus.PENDING:
            continue
            
        try:
            # Route processing based on entity type
            if item.entity_type == "TrainingSession":
                handle_session_creation(db, item)
            elif item.entity_type == "Attendance":
                handle_attendance_checkin(db, item)
            elif item.entity_type == "PracticalScore":
                handle_practical_score(db, item)
            elif item.entity_type == "CreateTrainer":
                handle_create_trainer(db, item)
                
            item.status = SyncStatus.SYNCED
        except Exception as e:
            item.status = SyncStatus.FAILED
            item.error_message = str(e)
            print(f"Pipeline error for {item.entity_type}: {e}")

    db.commit()


def handle_session_creation(db: Session, queue_item: SyncQueueItem):
    """
    Pipeline Flow 1: Trainer Creates Session
    Cascade: Find Trainees in the same batch -> Create SessionEnrollment
    Cascade: Find Supervisor for Region -> Map SupervisorSession
    """
    payload = queue_item.payload # expected dict
    
    # 1. Re-create the session in the DB
    def parse_dt(dt_str):
        if not dt_str: return None
        return datetime.fromisoformat(dt_str.replace('Z', '+00:00').split('+')[0])

    session = TrainingSession(
        title=payload.get("title", "New Offline Session"),
        topic=payload.get("topic", "General"),
        scheduled_date=parse_dt(payload.get("scheduled_date")),
        start_time=parse_dt(payload.get("start_time")),
        end_time=parse_dt(payload.get("end_time")),
        trainer_id=queue_item.user_id,
        status="PUBLISHED"
    )
    db.add(session)
    db.flush() # flush to get session.id
    
    # 2. Identify the Trainees (assuming payload has a 'batch_id' target)
    target_batch = payload.get("target_batch_id")
    if target_batch:
        trainees = db.query(TraineeProfile).filter(TraineeProfile.batch_id == target_batch).all()
        for trainee in trainees:
            enrollment = SessionEnrollment(
                session_id=session.id,
                user_id=trainee.user_id,
                status="INVITED"
            )
            db.add(enrollment)
            
    # 3. Identify Supervisor (assuming mapping through campus)
    # This is a stub for the Supervisor Pipeline
    trainer_user = db.query(User).filter(User.id == queue_item.user_id).first()
    # Find any supervisor managing this trainer's campus
    if hasattr(trainer_user, 'campus_id') and trainer_user.campus_id:
         supervisor_profiles = db.query(SupervisorProfile).filter(SupervisorProfile.managed_campus_id == trainer_user.campus_id).all()
         for sup_profile in supervisor_profiles:
             sup_session = SupervisorSession(
                 supervisor_id=sup_profile.user_id,
                 training_session_id=session.id,
                 total_trainees=len(trainees) if target_batch else 0
             )
             db.add(sup_session)

def handle_attendance_checkin(db: Session, queue_item: SyncQueueItem):
    """
    Pipeline Flow 2: Trainee Marks Attendance Offline
    Cascade: Record it so Trainer's device pulls the incremented heartbeat.
    """
    payload = queue_item.payload
    attendance = Attendance(
        session_id=payload["session_id"],
        user_id=queue_item.user_id,
        check_in_time=payload.get("check_in_time"),
        check_in_lat=payload.get("lat"),
        check_in_lng=payload.get("lng"),
        is_present=payload.get("is_present", True),
        marked_by="self"
    )
    db.add(attendance)

def handle_practical_score(db: Session, queue_item: SyncQueueItem):
    """
    Pipeline Flow 4: Trainer Grades Trainee Drill Offline
    Cascade: Combine score to print Certificate -> Trigger Pull Sync for Trainee to sign it.
    """
    payload = queue_item.payload
    score = PracticalScore(
        session_id=payload["session_id"],
        user_id=payload["target_user_id"],
        trainer_id=queue_item.user_id,
        criteria_scores=payload["criteria_scores"],
        total_score=payload["total_score"],
        max_score=payload["max_score"]
    )
    db.add(score)
    db.flush()
    
    # Auto-issue Certificate logic stub
    if score.total_score >= (score.max_score * 0.7):
        cert = Certificate(
            certificate_uid=f"CERT-{score.user_id}-{int(datetime.utcnow().timestamp())}",
            user_id=score.user_id,
            session_id=score.session_id,
            module_name=payload.get("module_name", "Practical Drill"),
            score_percentage=(score.total_score / score.max_score) * 100,
            expiry_date=datetime.utcnow() # Real logic would add years
        )
        db.add(cert)

from app.models.user import UserRole, UserStatus
def handle_create_trainer(db: Session, queue_item: SyncQueueItem):
    """
    Pipeline Flow: Trainer creates a peer Trainer offline via the App UI.
    """
    payload = queue_item.payload
    import uuid
    # Create the base user authentication wrapper
    new_user = User(
        employee_id=payload["employee_id"],
        mobile_number=payload["mobile_number"],
        full_name=payload["full_name"],
        role=UserRole.TRAINER,
        status=UserStatus.ACTIVE,
        password_hash=str(uuid.uuid4()) # Auto-generated secure placeholder
    )
    db.add(new_user)
    db.flush()
    # Create the strongly typed TrainerProfile layer
    from app.models.user import TrainerProfile
    tp = TrainerProfile(user_id=new_user.id, expertise_areas=["General Training"])
    db.add(tp)
