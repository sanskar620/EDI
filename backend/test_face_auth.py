import numpy as np
import cv2
from app.services.face_auth import extract_face_embedding, verify_face

print("Creating a fake image with OpenCV for testing...")
img = np.zeros((300, 300, 3), dtype=np.uint8)
cv2.rectangle(img, (100, 100), (200, 200), (255, 255, 255), -1) # White square

success, encoded_image = cv2.imencode('.jpg', img)
image_bytes = encoded_image.tobytes()

print("Testing extract_face_embedding...")
try:
    embedding = extract_face_embedding(image_bytes)
    print("Extracted embedding:", embedding is not None)
except Exception as e:
    print("Extract error:", e)
