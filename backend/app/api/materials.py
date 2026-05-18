"""
Materials API endpoints.
Handles upload and management of training materials.
"""
import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError

from app.database import get_db
from app.models.material import Material, MaterialType
from app.models.user import User
from app.api.auth import get_current_user
from app.api.ws import broadcast_change
from app.config import settings

router = APIRouter(prefix="/materials", tags=["Materials"])

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)


# ═══════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════════

class MaterialResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    material_type: str
    topic: str
    s3_key: str
    file_size_bytes: Optional[int]
    duration_seconds: Optional[int]
    version: int
    is_active: bool
    module_id: Optional[int]
    order_number: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════

def upload_to_local(file: UploadFile, folder: str = "materials") -> tuple[str, int]:
    """
    Upload file to local directory and return (URL, file_size).
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(f"uploads/{folder}", exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = f"uploads/{folder}/{unique_filename}"
        
        # Read and write file content
        file_content = file.file.read()
        file_size = len(file_content)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        # Generate local URL (relative to FastAPI static files)
        file_url = f"/uploads/{folder}/{unique_filename}"
        
        return file_url, file_size
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


def get_material_type_from_extension(filename: str) -> MaterialType:
    """Determine material type from file extension."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in ['.pdf', '.doc', '.docx']:
        return MaterialType.PDF
    elif ext in ['.mp4', '.avi', '.mov']:
        return MaterialType.VIDEO
    elif ext in ['.ppt', '.pptx']:
        return MaterialType.PPT
    elif ext in ['.jpg', '.jpeg', '.png']:
        return MaterialType.IMAGE
    else:
        return MaterialType.DOCUMENT


# ═══════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════

@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    topic: Optional[str] = None,
    material_type: Optional[MaterialType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all materials with optional filters.
    """
    query = db.query(Material).filter(Material.is_active == True)
    
    if topic:
        query = query.filter(Material.topic.ilike(f"%{topic}%"))
    if material_type:
        query = query.filter(Material.material_type == material_type)
    
    materials = query.all()
    
    return [MaterialResponse.from_orm(m) for m in materials]


@router.post("/upload", response_model=MaterialResponse, status_code=201)
async def upload_material(
    title: str = Form(...),
    topic: str = Form(...),
    description: str = Form(None),
    module_id: Optional[int] = Form(None),
    order_number: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a material file to S3 and create database record.
    Only trainers can upload materials.
    """
    if current_user.role not in ["TRAINER", "SUPERVISOR"]:
        raise HTTPException(status_code=403, detail="Only trainers can upload materials")
    
    # Upload to local storage
    file_url, file_size = upload_to_local(file, folder=f"materials")
    
    # Determine material type
    material_type = get_material_type_from_extension(file.filename)
    
    # Extract S3 key from URL
    s3_key = file_url.split('.com/')[-1] if '.com/' in file_url else file_url
    
    # Determine order number
    if order_number is None and module_id is not None:
        max_order = db.query(Material).filter(Material.module_id == module_id).order_by(Material.order_number.desc()).first()
        final_order_number = max_order.order_number + 1 if max_order else 1
    else:
        final_order_number = order_number or 1

    # Create database record
    new_material = Material(
        title=title,
        description=description,
        material_type=material_type,
        topic=topic,
        s3_key=s3_key,
        file_size_bytes=file_size,
        version=1,
        is_active=True,
        module_id=module_id,
        order_number=final_order_number,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_material)
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("material", "create", {
        "id": new_material.id,
        "title": new_material.title
    })
    db.refresh(new_material)
    
    return MaterialResponse.from_orm(new_material)


@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get material details."""
    material = db.query(Material).filter(Material.id == material_id).first()
    
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return MaterialResponse.from_orm(material)


@router.delete("/{material_id}")
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a material (soft delete)."""
    material = db.query(Material).filter(Material.id == material_id).first()
    
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Check permission
    if current_user.role not in ["TRAINER", "SUPERVISOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete materials")
    
    # Soft delete
    material.is_active = False
    material.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Broadcast real-time update
    await broadcast_change("material", "delete", {
        "id": material_id
    })
    
    return {"success": True, "message": "Material deleted successfully"}
