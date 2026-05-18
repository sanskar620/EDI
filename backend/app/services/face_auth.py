"""
Local Machine Learning Face Verification Service using DeepFace.
Replaces AWS Rekognition.
"""

import numpy as np
import cv2
import json
from deepface import DeepFace
from typing import Optional, List

# Distance threshold for cosine similarity (VGG-Face standard)
VERIFICATION_THRESHOLD = 0.40

def _bytes_to_cv2_image(image_bytes: bytes):
    """Converts raw bytes to an OpenCV image."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file or format not supported.")
    return img

def extract_face_embedding(image_bytes: bytes) -> Optional[str]:
    """
    Extracts the face from an image and generates a 128-dimensional embedding.
    Returns the embedding as a JSON string for easy DB storage.
    """
    try:
        img = _bytes_to_cv2_image(image_bytes)
        
        # DeepFace represent returns a list of dictionaries (one for each face found)
        # We enforce finding at least one face.
        result = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=True)
        
        if not result or len(result) == 0:
            return None
            
        # Extract the embedding array from the primary face
        embedding = result[0]["embedding"]
        return json.dumps(embedding)
    except Exception as e:
        print(f"[FaceAuth] Error extracting embedding: {e}")
        return None

def verify_face(image_bytes: bytes, stored_embedding_json: str) -> bool:
    """
    Extracts face from live image, generates embedding, and compares it against stored embedding.
    Returns True if faces match.
    """
    try:
        if not stored_embedding_json:
            return False
            
        stored_embedding = np.array(json.loads(stored_embedding_json))
        img = _bytes_to_cv2_image(image_bytes)
        
        result = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=True)
        
        if not result or len(result) == 0:
            return False
            
        live_embedding = np.array(result[0]["embedding"])
        
        # Calculate Cosine Distance
        dot_product = np.dot(stored_embedding, live_embedding)
        norm_stored = np.linalg.norm(stored_embedding)
        norm_live = np.linalg.norm(live_embedding)
        
        cosine_similarity = dot_product / (norm_stored * norm_live)
        cosine_distance = 1 - cosine_similarity
        
        print(f"[FaceAuth] Cosine Distance: {cosine_distance:.4f} (Threshold: {VERIFICATION_THRESHOLD})")
        
        return cosine_distance <= VERIFICATION_THRESHOLD
        
    except Exception as e:
        print(f"[FaceAuth] Error verifying face: {e}")
        return False
