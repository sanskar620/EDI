import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.material import Material, MaterialType
from datetime import datetime

def add_test_pdf():
    # 1. Create a dummy PDF file in uploads/materials
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "materials")
    os.makedirs(upload_dir, exist_ok=True)
    pdf_path = os.path.join(upload_dir, "test.pdf")
    
    # We will write a tiny valid PDF file
    tiny_pdf = b"%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n"
    with open(pdf_path, "wb") as f:
        f.write(tiny_pdf)
        
    print(f"Created dummy PDF at {pdf_path}")

    # 2. Add to database for module_id = 6
    db = SessionLocal()
    try:
        # Check if already exists
        existing = db.query(Material).filter(Material.s3_key == "/uploads/materials/test.pdf").first()
        if existing:
            existing.module_id = 6
            print("Updated existing material to module_id 6")
        else:
            material = Material(
                title="Test Local PDF",
                description="This is a test PDF to check the local viewer",
                material_type=MaterialType.PDF,
                topic="Testing",
                s3_key="/uploads/materials/test.pdf",
                file_size_bytes=len(tiny_pdf),
                version=1,
                is_active=True,
                module_id=6,
                order_number=99,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(material)
            print("Added new material for module_id 6")
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    add_test_pdf()
