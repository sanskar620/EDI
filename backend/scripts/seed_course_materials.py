import os
import sys

# Add parent directory to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.course import Course, CourseEnrollment, CourseMaterial

def seed_materials():
    db = SessionLocal()
    try:
        # Find all courses that have enrollments with progress == 0
        zero_progress_enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.progress == 0).all()
        course_ids = {e.course_id for e in zero_progress_enrollments}
        
        print(f"Found {len(course_ids)} courses with 0 progress enrollments.")
        
        materials_added = 0
        for course_id in course_ids:
            # Check existing materials
            existing = db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).count()
            if existing == 0:
                # Add Document
                doc = CourseMaterial(
                    course_id=course_id,
                    title="Introduction Guide",
                    material_type="DOCUMENT",
                    content_url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    description="Read this introductory guide before watching the video.",
                    order_index=0
                )
                
                # Add Video
                vid = CourseMaterial(
                    course_id=course_id,
                    title="Concept Overview Video",
                    material_type="VIDEO",
                    content_url="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    description="An overview of the core concepts of this course.",
                    duration_seconds=596,
                    order_index=1
                )
                
                db.add(doc)
                db.add(vid)
                materials_added += 2
                print(f"Added Document and Video to Course ID: {course_id}")
            else:
                print(f"Course ID: {course_id} already has {existing} materials.")
                
        db.commit()
        print(f"Successfully added {materials_added} new course materials.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_materials()
