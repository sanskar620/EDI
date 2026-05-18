"""
Comprehensive seed script for EMP001 mock data.
Creates 3 sessions (yesterday, today, tomorrow), enrollments, 
questions for pre/post tests, and material (PDF + video) per session.
"""
import os, sys, uuid
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.models.session import (
    TrainingSession, SessionEnrollment, EnrollmentStatus,
    SessionStatus, Module, SessionMaterial
)
from app.models.attendance import Attendance
from app.models.certificate import Certificate
from app.models.assessment import (
    QuestionBank, QuestionType, AssessmentType,
    AssessmentSession, AssessmentResult
)
from app.models.material import Material, MaterialType


# ── Session definitions relative to today ──
now = datetime.now(timezone.utc)
today_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
yesterday_start = today_start - timedelta(days=1)
tomorrow_start = today_start + timedelta(days=1)

SESSIONS = [
    {
        "title": "Fire Safety & Emergency Procedures",
        "description": "Learn fire safety protocols including evacuation drills, extinguisher handling, and emergency response.",
        "topic": "Fire Safety",
        "scheduled_date": yesterday_start,
        "start_time": yesterday_start,
        "end_time": yesterday_start + timedelta(hours=2),
        "duration_minutes": 120,
        "venue_name": "Training Hall A",
        "status": SessionStatus.COMPLETED,
    },
    {
        "title": "Workplace Compliance Training",
        "description": "Comprehensive workplace compliance covering safety regulations, reporting procedures, and legal requirements.",
        "topic": "Compliance",
        "scheduled_date": today_start,
        "start_time": today_start,
        "end_time": today_start + timedelta(hours=2),
        "duration_minutes": 120,
        "venue_name": "Conference Room B",
        "status": SessionStatus.PUBLISHED,
    },
    {
        "title": "Leadership Development Workshop",
        "description": "Develop leadership skills including team management, conflict resolution, and strategic thinking.",
        "topic": "Leadership",
        "scheduled_date": tomorrow_start,
        "start_time": tomorrow_start,
        "end_time": tomorrow_start + timedelta(hours=3),
        "duration_minutes": 180,
        "venue_name": "Auditorium",
        "status": SessionStatus.PUBLISHED,
    },
]

# ── Question bank per topic ──
QUESTIONS = {
    "Fire Safety": [
        ("What is the primary purpose of a fire extinguisher?", ["To put out fires", "To start fires", "To store water", "To cool rooms"], "To put out fires"),
        ("What does the acronym PASS stand for?", ["Pull Aim Squeeze Sweep", "Push Aim Spray Stop", "Pull Activate Squeeze Spray", "Push Alert Squeeze Sweep"], "Pull Aim Squeeze Sweep"),
        ("Which class of fire involves electrical equipment?", ["Class A", "Class B", "Class C", "Class D"], "Class C"),
        ("What should you do first when you discover a fire?", ["Fight it", "Sound the alarm", "Open windows", "Call your manager"], "Sound the alarm"),
    ],
    "Compliance": [
        ("What is the main purpose of workplace compliance?", ["Increase profits", "Ensure legal and safety standards", "Reduce staff", "Improve marketing"], "Ensure legal and safety standards"),
        ("Who is responsible for workplace safety?", ["Only the manager", "Only HR", "Everyone", "Only the safety officer"], "Everyone"),
        ("What should you do if you witness a safety violation?", ["Ignore it", "Report it immediately", "Fix it yourself", "Wait for inspection"], "Report it immediately"),
        ("How often should safety training be conducted?", ["Once", "Annually", "Every 5 years", "Never"], "Annually"),
    ],
    "Leadership": [
        ("What is a key trait of effective leaders?", ["Micromanagement", "Communication", "Isolation", "Secrecy"], "Communication"),
        ("What does servant leadership focus on?", ["Profits", "Serving team members", "Self-promotion", "Competition"], "Serving team members"),
        ("How should a leader handle conflict?", ["Avoid it", "Address it constructively", "Take sides", "Ignore complaints"], "Address it constructively"),
        ("What is the importance of delegation?", ["Avoid work", "Empower team members", "Show authority", "Reduce accountability"], "Empower team members"),
    ],
}


def find_trainer(db):
    """Find a trainer user or fall back to EMP001 user."""
    trainer = db.query(User).filter(User.role == "TRAINER").first()
    if trainer:
        return trainer
    # Fallback: use EMP001 itself (just to have a valid FK)
    return db.query(User).filter(User.employee_id == "EMP001").first()


def seed():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.employee_id == "EMP001").first()
        if not user:
            print("[ERROR] User EMP001 not found.")
            return

        trainer = find_trainer(db)
        if not trainer:
            print("[ERROR] No trainer user found.")
            return

        print(f"[OK] Found EMP001: {user.full_name} (id={user.id})")
        print(f"[OK] Using trainer: {trainer.full_name} (id={trainer.id})")

        created_session_ids = []

        for sess_def in SESSIONS:
            # Create session
            session = TrainingSession(
                title=sess_def["title"],
                description=sess_def["description"],
                topic=sess_def["topic"],
                scheduled_date=sess_def["scheduled_date"],
                start_time=sess_def["start_time"],
                end_time=sess_def["end_time"],
                duration_minutes=sess_def["duration_minutes"],
                venue_name=sess_def["venue_name"],
                trainer_id=trainer.id,
                status=sess_def["status"],
                max_capacity=30,
                is_materials_released=True,
                pre_test_enabled=True,
                post_test_enabled=True,
                passing_threshold=70.0,
                max_retakes=2,
            )
            db.add(session)
            db.flush()
            created_session_ids.append(session.id)
            print(f"  [+] Created session '{session.title}' (id={session.id})")

            # Enroll EMP001
            enrollment = SessionEnrollment(
                session_id=session.id,
                user_id=user.id,
                status=EnrollmentStatus.ATTENDED if sess_def["status"] == SessionStatus.COMPLETED else EnrollmentStatus.ACCEPTED,
            )
            db.add(enrollment)

            # Attendance for past session
            if sess_def["status"] == SessionStatus.COMPLETED:
                attendance = Attendance(
                    session_id=session.id,
                    user_id=user.id,
                    status="PRESENT",
                    check_in_time=sess_def["start_time"],
                    method="FACE",
                    is_present=True,
                )
                db.add(attendance)
                print(f"    [OK] Marked attendance for completed session")

            # Create Module
            module = Module(
                session_id=session.id,
                title=f"{sess_def['topic']} - Module 1",
                order_number=1,
            )
            db.add(module)
            db.flush()

            # Create PDF Material (use the existing uploaded PDF)
            pdf_material = Material(
                title=f"{sess_def['topic']} Study Guide.pdf",
                description=f"Comprehensive study material for {sess_def['topic']}",
                material_type=MaterialType.PDF,
                topic=sess_def["topic"],
                session_id=session.id,
                s3_key="uploads/materials/25a6f26f-0248-424f-8231-1697d4ec8fd2.pdf",
                file_size_bytes=1626529,
                is_active=True,
                module_id=module.id,
                order_number=1,
            )
            db.add(pdf_material)

            # Create Video Material (mock - points to a sample video URL)
            video_material = Material(
                title=f"{sess_def['topic']} Training Video.mp4",
                description=f"Training video demonstration for {sess_def['topic']}",
                material_type=MaterialType.VIDEO,
                topic=sess_def["topic"],
                session_id=session.id,
                s3_key="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                file_size_bytes=5000000,
                duration_seconds=600,
                is_active=True,
                module_id=module.id,
                order_number=2,
            )
            db.add(video_material)
            db.flush()

            # Link materials to session
            for mat in [pdf_material, video_material]:
                link = SessionMaterial(
                    session_id=session.id,
                    material_id=mat.id,
                    sort_order=mat.order_number,
                    is_released=True,
                    released_at=sess_def["scheduled_date"] - timedelta(hours=48),
                )
                db.add(link)

            print(f"    [+] Added PDF + Video material")

            # Create Questions (2 for PRE_TEST, 2 for POST_TEST)
            topic = sess_def["topic"]
            topic_questions = QUESTIONS.get(topic, [])
            
            for i, (q_text, options, correct) in enumerate(topic_questions):
                q = QuestionBank(
                    topic=topic,
                    question_text=q_text,
                    question_type=QuestionType.MCQ,
                    options=options,
                    correct_answer=correct,
                    difficulty=2,
                    points=1.0,
                    is_active=True,
                )
                db.add(q)

            print(f"    [+] Added {len(topic_questions)} questions for topic '{topic}'")

        # Create a certificate for the completed (yesterday) session
        completed_session_id = created_session_ids[0]
        cert = Certificate(
            certificate_uid=str(uuid.uuid4()),
            user_id=user.id,
            session_id=completed_session_id,
            module_name="Fire Safety & Emergency Procedures",
            score_percentage=90.0,
            passed=True,
            certificate_s3_key="upload/certificates/template.pdf",
            issued_date=yesterday_start + timedelta(hours=2),
            expiry_date=yesterday_start + timedelta(days=365),
        )
        db.add(cert)

        # Create an AssessmentResult for the completed session (for performance metrics)
        # First create the assessment session
        assessment_session = AssessmentSession(
            session_id=completed_session_id,
            user_id=user.id,
            assessment_type=AssessmentType.POST_TEST,
            total_questions=4,
            time_limit_seconds=1800,
            is_submitted=True,
            submitted_at=yesterday_start + timedelta(hours=1, minutes=30),
            started_at=yesterday_start + timedelta(hours=1),
        )
        db.add(assessment_session)
        db.flush()

        result = AssessmentResult(
            assessment_session_id=assessment_session.id,
            session_id=completed_session_id,
            user_id=user.id,
            assessment_type=AssessmentType.POST_TEST,
            total_questions=4,
            correct_answers=3,
            score_percentage=75.0,
            passed=True,
            attempt_number=1,
        )
        db.add(result)

        print(f"  [+] Created certificate + assessment result for completed session")

        db.commit()
        print(f"\n[DONE] Successfully seeded {len(SESSIONS)} sessions with materials, questions, and enrollments for EMP001!")
        print(f"   Session IDs: {created_session_ids}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
