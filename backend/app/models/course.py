"""
Course, CourseMaterial, and CourseEnrollment models for digital curriculum.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    topic = Column(String(200), nullable=False)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), nullable=False, default="DRAFT")
    thumbnail_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trainer = relationship("User", foreign_keys=[trainer_id])
    materials = relationship("CourseMaterial", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")

class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(300), nullable=False)
    material_type = Column(String(50), nullable=False) # VIDEO, PDF, QUIZ
    content_url = Column(String(500), nullable=True)
    quiz_data = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="materials")

class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    progress = Column(Float, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="ENROLLED")
    enrolled_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    course = relationship("Course", back_populates="enrollments")
    user = relationship("User", foreign_keys=[user_id])

class CourseQuizAttempt(Base):
    __tablename__ = "course_quiz_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("course_materials.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1)
    answers_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
