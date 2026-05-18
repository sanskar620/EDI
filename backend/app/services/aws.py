"""
AWS Services (S3, Rekognition) for file storage and face verification.
Complete implementation for attendance system.
"""

import boto3
from typing import Optional, Tuple
from app.config import settings
import uuid
import base64
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

# Initialize clients only if credentials are provided
if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )
    rekognition_client = boto3.client(
        'rekognition',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )
    logger.info("[AWS] Clients initialized successfully")
else:
    s3_client = None
    rekognition_client = None
    logger.warning("[AWS] Credentials not found. S3 and Rekognition will be mocked.")


# ═══════════════════════════════════════════
# S3 OPERATIONS
# ═══════════════════════════════════════════

def upload_to_s3(file_bytes: bytes, filename: str, content_type: str, folder: str = "uploads") -> str:
    """
    Uploads a file to S3 and returns the object key.
    
    Args:
        file_bytes: Raw bytes of the file
        filename: Original filename
        content_type: MIME type (e.g., 'image/jpeg')
        folder: S3 folder/prefix (default: 'uploads')
    
    Returns:
        S3 object key (path) or empty string on failure
    """
    if not s3_client:
        mock_key = f"mock-s3/{folder}/{uuid.uuid4()}-{filename}"
        logger.info(f"[DEV S3] Mock upload: {mock_key}")
        return mock_key

    key = f"{folder}/{uuid.uuid4()}-{filename}"
    try:
        s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        logger.info(f"[OK] S3 Upload successful: {key}")
        return key
    except Exception as e:
        logger.error(f"[FAIL] S3 Upload failed: {e}")
        return ""


def upload_base64_image_to_s3(base64_data: str, filename: str, folder: str = "uploads") -> str:
    """
    Uploads a base64 encoded image to S3.
    
    Args:
        base64_data: Base64 encoded image data (with or without data URI prefix)
        filename: Filename to use
        folder: S3 folder/prefix
    
    Returns:
        S3 object key or empty string on failure
    """
    try:
        # Remove data URI prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(base64_data)
        
        # Determine content type from filename or default to jpeg
        if filename.lower().endswith('.png'):
            content_type = 'image/png'
        else:
            content_type = 'image/jpeg'
            if not filename.lower().endswith(('.jpg', '.jpeg')):
                filename = f"{filename}.jpg"
        
        return upload_to_s3(image_bytes, filename, content_type, folder)
    except Exception as e:
        logger.error(f"[FAIL] Base64 upload failed: {e}")
        return ""


def get_s3_object_bytes(s3_key: str) -> Optional[bytes]:
    """
    Downloads an object from S3 and returns its bytes.
    
    Args:
        s3_key: The S3 object key
    
    Returns:
        Bytes of the object or None on failure
    """
    if not s3_client:
        logger.info(f"[DEV S3] Mock download: {s3_key}")
        return None

    try:
        response = s3_client.get_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=s3_key
        )
        return response['Body'].read()
    except Exception as e:
        logger.error(f"[FAIL] S3 Download failed for {s3_key}: {e}")
        return None


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generates a pre-signed URL for accessing an S3 object.
    
    Args:
        s3_key: The S3 object key
        expiration: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Pre-signed URL or mock URL
    """
    if not s3_client:
        return f"http://localhost:8000/mock-s3/{s3_key}"

    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.AWS_S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return response
    except Exception as e:
        logger.error(f"[FAIL] Generate Presigned URL failed: {e}")
        return ""


def delete_from_s3(s3_key: str) -> bool:
    """
    Deletes an object from S3.
    
    Args:
        s3_key: The S3 object key to delete
    
    Returns:
        True if successful, False otherwise
    """
    if not s3_client:
        logger.info(f"[DEV S3] Mock delete: {s3_key}")
        return True

    try:
        s3_client.delete_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=s3_key
        )
        logger.info(f"[OK] S3 Delete successful: {s3_key}")
        return True
    except Exception as e:
        logger.error(f"[FAIL] S3 Delete failed: {e}")
        return False


def get_s3_url(s3_key: str) -> str:
    """
    Returns the full S3 URL for an object.
    
    Args:
        s3_key: The S3 object key
    
    Returns:
        Full S3 URL
    """
    if not s3_key:
        return ""
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"


# ═══════════════════════════════════════════
# REKOGNITION OPERATIONS
# ═══════════════════════════════════════════

FACE_SIMILARITY_THRESHOLD = 80.0  # Minimum similarity percentage for face match


def verify_face(reference_image_bytes: bytes, target_image_bytes: bytes, threshold: float = FACE_SIMILARITY_THRESHOLD) -> Tuple[bool, float]:
    """
    Compares two faces using AWS Rekognition.
    
    Args:
        reference_image_bytes: Bytes of the stored profile image
        target_image_bytes: Bytes of the live selfie
        threshold: Minimum similarity percentage (default: 80%)
    
    Returns:
        Tuple of (is_match: bool, confidence_score: float)
    """
    if not rekognition_client:
        logger.info("[DEV REKOGNITION] Mock face match: Passed (95.0%)")
        return True, 95.0

    try:
        response = rekognition_client.compare_faces(
            SourceImage={'Bytes': reference_image_bytes},
            TargetImage={'Bytes': target_image_bytes},
            SimilarityThreshold=threshold
        )

        if response['FaceMatches']:
            similarity = response['FaceMatches'][0]['Similarity']
            is_match = similarity >= threshold
            logger.info(f"Rekognition: Face match {'SUCCESS' if is_match else 'FAILED'} ({similarity:.1f}%)")
            return is_match, similarity
        else:
            logger.warning("Rekognition: No face matches found")
            return False, 0.0
    except rekognition_client.exceptions.InvalidParameterException as e:
        logger.error(f"Rekognition InvalidParameter: {e}")
        return False, 0.0
    except Exception as e:
        logger.error(f"Rekognition CompareFaces failed: {e}")
        return False, 0.0


def verify_face_from_s3_keys(reference_s3_key: str, target_s3_key: str, threshold: float = FACE_SIMILARITY_THRESHOLD) -> Tuple[bool, float]:
    """
    Compares two faces using S3 keys directly (more efficient for large images).
    
    Args:
        reference_s3_key: S3 key of the stored profile image
        target_s3_key: S3 key of the live selfie
        threshold: Minimum similarity percentage
    
    Returns:
        Tuple of (is_match: bool, confidence_score: float)
    """
    if not rekognition_client:
        logger.info("[DEV REKOGNITION] Mock S3 face match: Passed (95.0%)")
        return True, 95.0

    try:
        response = rekognition_client.compare_faces(
            SourceImage={
                'S3Object': {
                    'Bucket': settings.AWS_S3_BUCKET,
                    'Name': reference_s3_key
                }
            },
            TargetImage={
                'S3Object': {
                    'Bucket': settings.AWS_S3_BUCKET,
                    'Name': target_s3_key
                }
            },
            SimilarityThreshold=threshold
        )

        if response['FaceMatches']:
            similarity = response['FaceMatches'][0]['Similarity']
            is_match = similarity >= threshold
            logger.info(f"Rekognition S3: Face match {'SUCCESS' if is_match else 'FAILED'} ({similarity:.1f}%)")
            return is_match, similarity
        else:
            logger.warning("Rekognition S3: No face matches found")
            return False, 0.0
    except Exception as e:
        logger.error(f"Rekognition S3 CompareFaces failed: {e}")
        return False, 0.0


def detect_faces(image_bytes: bytes) -> dict:
    """
    Detects faces in an image and returns face details.
    
    Args:
        image_bytes: Bytes of the image
    
    Returns:
        Dict with face detection results
    """
    if not rekognition_client:
        return {
            "success": True,
            "face_count": 1,
            "faces": [{"confidence": 99.9, "quality": "HIGH"}],
            "is_mock": True
        }

    try:
        response = rekognition_client.detect_faces(
            Image={'Bytes': image_bytes},
            Attributes=['DEFAULT']
        )
        
        faces = response.get('FaceDetails', [])
        return {
            "success": True,
            "face_count": len(faces),
            "faces": [
                {
                    "confidence": face.get('Confidence', 0),
                    "quality": face.get('Quality', {})
                }
                for face in faces
            ]
        }
    except Exception as e:
        logger.error(f"Rekognition DetectFaces failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "face_count": 0,
            "faces": []
        }


def validate_face_image(image_bytes: bytes) -> Tuple[bool, str]:
    """
    Validates that an image contains exactly one clear face.
    
    Args:
        image_bytes: Bytes of the image
    
    Returns:
        Tuple of (is_valid: bool, message: str)
    """
    result = detect_faces(image_bytes)
    
    if not result.get("success"):
        return False, result.get("error", "Face detection failed")
    
    face_count = result.get("face_count", 0)
    
    if face_count == 0:
        return False, "No face detected in the image"
    
    if face_count > 1:
        return False, f"Multiple faces ({face_count}) detected. Please ensure only your face is in the image"
    
    # Check face quality/confidence
    faces = result.get("faces", [])
    if faces and faces[0].get("confidence", 0) < 90:
        return False, "Face not clearly visible. Please ensure good lighting and face the camera directly"
    
    return True, "Face validated successfully"
