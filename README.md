# Learning Management System (LMS) - Training App

A comprehensive, robust, and mobile-first Learning Management System designed to streamline training workflows, enforce compliance, and deliver rich educational content. Built with a modern **React Native** (Expo) frontend and a **FastAPI** Python backend.

## 🌟 Key Features

### 👤 Role-Based Access Control
The application provides distinct, specialized dashboards for three roles:
- **Trainees**: Access learning paths, view offline materials (PDFs, Videos), take assessments, view flashcards, and claim certificates.
- **Trainers**: Manage sessions, enroll trainees, upload materials, grade tests, and monitor attendance.
- **Supervisors**: Broad oversight, compliance tracking, analytics, and bulk enrollment capabilities.

### 🛡️ Facial Recognition & Smart Attendance
- Enforces strict attendance marking windows (exactly during session hours).
- **Facial Verification**: Uses computer vision (DeepFace/OpenCV) to verify the trainee's identity before they can mark attendance.
- Attendance history and analytics are synced in real-time.

### 📚 Rich Content Delivery
- **Multimedia Support**: Upload and view PDFs, Videos (MP4), and Presentations.
- **In-App Viewing**: Uses Mozilla PDF.js for seamless inline document rendering and Expo Video for native video playback.
- **Offline Support**: Trainees can download materials securely for offline viewing.

### 📝 Assessments & Certification
- Pre-tests and Post-tests to measure knowledge retention.
- Automated certificate generation upon 100% course completion.
- Interactive Study Flashcards for quick revision.

### ⚡ Real-Time Sync & Architecture
- **WebSocket Integration**: Instant updates for session changes, material uploads, and attendance status.
- **RESTful API**: Fast and scalable endpoints powered by FastAPI.
- **Database**: Flexible backend supporting SQLite and Supabase for cloud persistence.

---

## 🛠️ Technology Stack

### Frontend (Mobile App)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Styling**: Context-aware custom theme engine (Dark/Light mode support)

### Backend (API)
- **Framework**: FastAPI (Python)
- **Database**: SQLite (local) / Supabase (PostgreSQL) via SQLAlchemy ORM
- **Computer Vision**: OpenCV, DeepFace
- **Authentication**: JWT (JSON Web Tokens)
- **Realtime**: FastAPI WebSockets

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Expo CLI (`npm install -g expo-cli`)

### 1. Setting up the Backend
```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations and seed mock data
python scripts/seed_sqlite.py

# Start the FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*The API documentation will be available at `http://localhost:8000/docs`.*

### 2. Setting up the Mobile App
```bash
cd TrainingApp

# Install dependencies
npm install

# Configure environment
# Update API_BASE_URL in src/services/api.ts to point to your local backend IP.

# Start the Expo development server
npx expo start -c
```
*Use the Expo Go app on your physical device, or run it on an Android/iOS emulator.*

---

## 📁 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routers (auth, sessions, materials, etc.)
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── services/      # Business logic (e.g., face_auth.py)
│   │   └── main.py        # Application entry point
│   ├── scripts/           # DB seeding and migration scripts
│   └── uploads/           # Locally stored media and documents
│
├── TrainingApp/
│   ├── src/
│   │   ├── navigation/    # Role-based navigation stacks
│   │   ├── screens/       # UI screens organized by role
│   │   ├── services/      # API communication layer
│   │   ├── stores/        # Zustand state management
│   │   └── theme/         # Theming engine
│   └── App.tsx            # Main application wrapper
```

## 🔐 Security
- Secure JWT-based authentication.
- API endpoints are protected using dependency injection.
- Role-based middleware ensures users can only access their authorized endpoints.
- Facial recognition prevents proxy attendance.

## 📄 License
This project is proprietary and confidential.
