@echo off
echo Starting FastAPI Backend...
cd backend
py -m uvicorn app.main:app --host 0.0.0.0 --reload
