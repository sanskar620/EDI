"""
Assessment API endpoints.
Handles quiz creation, question management, and answer submission.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.assessment import (
    QuestionBank, AssessmentSession, AssessmentAttempt, AssessmentResult,
    QuestionType, AssessmentType
)
from app.models.session import TrainingSession
from app.models.user import User
from app.api.auth import get_current_user
from app.api.ws import broadcast_change

router = APIRouter(prefix="/assessments", tags=["Assessments"])


# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════

class QuestionCreate(BaseModel):
    session_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str  # 'A', 'B', 'C', or 'D'
    explanation: Optional[str] = None
    difficulty: int = 2  # 1=easy, 2=medium, 3=hard
    marks: int = 1


class QuestionResponse(BaseModel):
    id: int
    session_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: Optional[str] = None  # Hidden for trainees during exam
    explanation: Optional[str] = None
    difficulty: int
    marks: int
    
    class Config:
        from_attributes = True


class StartAssessmentRequest(BaseModel):
    session_id: int
    assessment_type: str  # 'PRE_TEST' or 'POST_TEST'


class SubmitAnswerRequest(BaseModel):
    question_id: int
    selected_answer: str  # 'A', 'B', 'C', or 'D'


class AssessmentResultResponse(BaseModel):
    assessment_id: int
    total_questions: int
    answered: int
    correct_answers: int
    score_percentage: float
    passed: bool


# ═══════════════════════════════════════════
# ENDPOINTS - Question Management
# ═══════════════════════════════════════════

@router.post("/questions", response_model=QuestionResponse, status_code=201)
async def create_question(
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new question for a session.
    Only trainers can create questions.
    """
    if current_user.role != "TRAINER":
        raise HTTPException(status_code=403, detail="Only trainers can create questions")
    
    session = db.query(TrainingSession).filter(
        TrainingSession.id == question_data.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    
    # Map correct answer from A, B, C, D to actual text or keep letter based on what frontend expects. 
    # Frontend seems to send letter 'A' etc., but DB expects the actual text or a clear index. 
    # If the app stores 'A', we can keep it. But we need to build the options array.
    options_array = [
        question_data.option_a,
        question_data.option_b,
        question_data.option_c,
        question_data.option_d
    ]
    
    # Create question
    new_question = QuestionBank(
        topic=session.topic,
        module_code=session.module_code,
        question_text=question_data.question_text,
        question_type=QuestionType.MCQ,
        options=options_array,
        correct_answer=question_data.correct_answer,
        difficulty=question_data.difficulty,
        points=float(question_data.marks),
        created_at=datetime.utcnow()
    )
    
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    
    # Broadcast real-time update
    await broadcast_change("assessment_question", "create", {
        "session_id": question_data.session_id,
        "id": new_question.id
    })
    
    response_dict = {
        "id": new_question.id,
        "session_id": question_data.session_id,
        "question_text": new_question.question_text,
        "option_a": options_array[0],
        "option_b": options_array[1],
        "option_c": options_array[2],
        "option_d": options_array[3],
        "correct_answer": new_question.correct_answer,
        "explanation": None,
        "difficulty": new_question.difficulty,
        "marks": int(new_question.points)
    }
    
    return QuestionResponse(**response_dict)


@router.get("/questions/session/{session_id}", response_model=List[QuestionResponse])
async def get_session_questions(
    session_id: int,
    include_answers: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all questions for a session.
    Trainers see answers, trainees don't (unless include_answers=True after completion).
    """
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    questions = db.query(QuestionBank).filter(
        QuestionBank.topic == session.topic
    ).all()
    
    result = []
    for q in questions:
        opts = q.options or []
        # Pad options to at least 4 elements
        while len(opts) < 4:
            opts.append("")
            
        q_dict = {
            "id": q.id,
            "session_id": session_id,
            "question_text": q.question_text,
            "option_a": opts[0],
            "option_b": opts[1],
            "option_c": opts[2],
            "option_d": opts[3],
            "correct_answer": q.correct_answer,
            "explanation": None,
            "difficulty": q.difficulty,
            "marks": int(q.points)
        }
        
        # Hide correct answer for trainees during active assessment
        if current_user.role == "TRAINEE" and not include_answers:
            q_dict["correct_answer"] = None
        
        result.append(QuestionResponse(**q_dict))
    
    return result


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a question (trainers only)."""
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Permissions: Only supervisors or trainers can delete questions
    if current_user.role not in ["TRAINER", "SUPERVISOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete questions")
    
    db.delete(question)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("assessment_question", "delete", {
        "id": question_id
    })
    
    return {"success": True, "message": "Question deleted"}


# ═══════════════════════════════════════════
# ENDPOINTS - Assessment Sessions
# ═══════════════════════════════════════════

@router.post("/start", status_code=201)
async def start_assessment(
    req: StartAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start an assessment session for a trainee.
    """
    session = db.query(TrainingSession).filter(TrainingSession.id == req.session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if assessment already exists
    existing = db.query(AssessmentSession).filter(
        AssessmentSession.session_id == req.session_id,
        AssessmentSession.user_id == current_user.id,
        AssessmentSession.assessment_type == req.assessment_type
    ).first()
    
    if existing:
        return {
            "assessment_id": existing.id,
            "started_at": existing.started_at,
            "message": "Assessment already in progress"
        }
    
    # Create new assessment session
    assessment = AssessmentSession(
        session_id=req.session_id,
        user_id=current_user.id,
        assessment_type=req.assessment_type,
        started_at=datetime.utcnow(),
        status='IN_PROGRESS',
        created_at=datetime.utcnow()
    )
    
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    
    return {
        "assessment_id": assessment.id,
        "started_at": assessment.started_at,
        "message": "Assessment started"
    }


@router.post("/answer/{assessment_id}")
async def submit_answer(
    assessment_id: int,
    answer_data: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit answer for a question in assessment.
    """
    assessment = db.query(AssessmentSession).filter(
        AssessmentSession.id == assessment_id,
        AssessmentSession.user_id == current_user.id
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if assessment.status == 'COMPLETED':
        raise HTTPException(status_code=400, detail="Assessment already completed")
    
    # Get question
    question = db.query(QuestionBank).filter(QuestionBank.id == answer_data.question_id).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if answer already exists
    existing = db.query(AssessmentAnswer).filter(
        AssessmentAnswer.assessment_session_id == assessment_id,
        AssessmentAnswer.question_id == answer_data.question_id
    ).first()
    
    if existing:
        # Update existing answer
        existing.selected_answer = answer_data.selected_answer
        existing.is_correct = (answer_data.selected_answer == question.correct_answer)
        existing.updated_at = datetime.utcnow()
    else:
        # Create new answer
        answer = AssessmentAnswer(
            assessment_session_id=assessment_id,
            question_id=answer_data.question_id,
            selected_answer=answer_data.selected_answer,
            is_correct=(answer_data.selected_answer == question.correct_answer),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(answer)
    
    db.commit()
    
    return {"success": True, "message": "Answer saved"}


@router.post("/submit/{assessment_id}", response_model=AssessmentResultResponse)
async def submit_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit assessment and calculate results.
    """
    assessment = db.query(AssessmentSession).filter(
        AssessmentSession.id == assessment_id,
        AssessmentSession.user_id == current_user.id
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get all answers
    answers = db.query(AssessmentAnswer).filter(
        AssessmentAnswer.assessment_session_id == assessment_id
    ).all()
    
    # Get total questions
    total_questions = db.query(QuestionBank).filter(
        QuestionBank.session_id == assessment.session_id
    ).count()
    
    # Calculate score
    correct_count = sum(1 for a in answers if a.is_correct)
    answered_count = len(answers)
    
    score_percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
    
    # Update assessment session
    assessment.completed_at = datetime.utcnow()
    assessment.is_submitted = True
    assessment.submitted_at = datetime.utcnow()
    
    # Get session passing threshold
    session = db.query(TrainingSession).filter(TrainingSession.id == assessment.session_id).first()
    passing_threshold = session.passing_threshold if session else 70.0
    
    passed = score_percentage >= passing_threshold
    
    # Check if a result already exists, if not create one
    result_record = db.query(AssessmentResult).filter(
        AssessmentResult.assessment_session_id == assessment_id
    ).first()
    
    if not result_record:
        result_record = AssessmentResult(
            assessment_session_id=assessment_id,
            session_id=assessment.session_id,
            user_id=current_user.id,
            assessment_type=assessment.assessment_type,
            total_questions=total_questions,
            correct_answers=correct_count,
            score_percentage=score_percentage,
            passed=passed
        )
        db.add(result_record)
    else:
        result_record.correct_answers = correct_count
        result_record.score_percentage = score_percentage
        result_record.passed = passed
    
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("assessment_result", "create", {
        "assessment_id": assessment_id,
        "session_id": assessment.session_id,
        "user_id": current_user.id,
        "score": score_percentage,
        "passed": passed
    })
    
    return AssessmentResultResponse(
        assessment_id=assessment_id,
        total_questions=total_questions,
        answered=answered_count,
        correct_answers=correct_count,
        score_percentage=score_percentage,
        passed=passed
    )


@router.get("/results/{assessment_id}", response_model=AssessmentResultResponse)
async def get_assessment_results(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get results for a completed assessment."""
    assessment = db.query(AssessmentSession).filter(
        AssessmentSession.id == assessment_id
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Permission check
    if assessment.user_id != current_user.id:
        session = db.query(TrainingSession).filter(TrainingSession.id == assessment.session_id).first()
        if session and session.trainer_id != current_user.id and current_user.role != "SUPERVISOR":
            raise HTTPException(status_code=403, detail="Not authorized")

    # Reconstruct result based on attempts if no explicit result table exists, or return assessment details.
    answers = db.query(AssessmentAttempt).filter(AssessmentAttempt.assessment_session_id == assessment_id).all()
    correct_count = sum(1 for a in answers if a.is_correct)
    
    # Look for saved result
    result_record = db.query(AssessmentResult).filter(AssessmentResult.assessment_session_id == assessment_id).first()
    
    if result_record:
        score_percentage = result_record.score_percentage
        passed = result_record.passed
    else:
        score_percentage = (correct_count / assessment.total_questions * 100) if assessment.total_questions > 0 else 0
        
        session = db.query(TrainingSession).filter(TrainingSession.id == assessment.session_id).first()
        passing_threshold = session.passing_threshold if session else 70.0
        passed = score_percentage >= passing_threshold
    
    return {
        "assessment_id": assessment_id,
        "total_questions": assessment.total_questions,
        "answered": len(answers),
        "correct_answers": correct_count,
        "score_percentage": score_percentage,
        "passed": passed
    }

@router.get("/user/{user_id}/history")
async def get_user_assessment_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all completed assessments for a user."""
    # Ensure trainees can only see their own history
    if current_user.role == "TRAINEE" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    assessments = db.query(AssessmentSession).filter(
        AssessmentSession.user_id == user_id,
        AssessmentSession.is_submitted == True
    ).order_by(AssessmentSession.submitted_at.desc()).all()
    
    result = []
    for a in assessments:
        session = db.query(TrainingSession).filter(TrainingSession.id == a.session_id).first()
        result.append({
            "assessment_id": a.id,
            "session_id": a.session_id,
            "assessment_type": a.assessment_type,
            "score_percentage": a.score_percentage if hasattr(a, 'score_percentage') else 0.0,
            "passed": a.passed if hasattr(a, 'passed') else False,
            "completed_at": a.completed_at,
            "session": {
                "id": session.id,
                "title": session.title,
                "topic": session.topic
            } if session else None
        })
        
    return result
    
    if assessment.status != 'COMPLETED':
        raise HTTPException(status_code=400, detail="Assessment not completed yet")
    
    # Get totals
    total_questions = db.query(QuestionBank).filter(
        QuestionBank.session_id == assessment.session_id
    ).count()
    
    answers = db.query(AssessmentAnswer).filter(
        AssessmentAnswer.assessment_session_id == assessment_id
    ).all()
    
    correct_count = sum(1 for a in answers if a.is_correct)
    
    session = db.query(TrainingSession).filter(TrainingSession.id == assessment.session_id).first()
    passing_threshold = session.passing_threshold if session else 70.0
    
    return AssessmentResultResponse(
        assessment_id=assessment_id,
        total_questions=total_questions,
        answered=len(answers),
        correct_answers=correct_count,
        score_percentage=assessment.score_percentage,
        passed=(assessment.score_percentage >= passing_threshold)
    )
