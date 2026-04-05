# PROJECT_CONTEXT.md — Medathon: AI Video-to-Text Transcription for Arthroscopy

## What This Project Is
Problem Statement #4 from Medathon hackathon.
Build an AI tool that watches arthroscopic surgery videos and automatically converts them into
structured, timestamped, searchable text reports.

## Presentation Date
April 6, 2025 (Final round — shortlisted teams present live)

## Official Submission Email
aidshealthcare26@gmail.com

## Core Pipeline (How It Works)
1. User uploads a surgery video via the web UI
2. Backend extracts one frame every 8 seconds using OpenCV
3. Each frame is sent to Gemini Vision API → returns text description of what's happening
4. Whisper transcribes the audio track of the video
5. All descriptions + audio are fed to Gemini LLM → groups into surgical phases + generates report
6. Report stored in ChromaDB for semantic search
7. Frontend shows: video player (left) + timestamped report (right) + search bar

## Tech Stack
- Backend: Python 3.11+ / FastAPI
- Frame Extraction: OpenCV (cv2)
- Audio Transcription: OpenAI Whisper (runs locally, no API key needed)
- Vision + Report AI: Google Gemini 1.5 Flash API (free tier)
- Search: ChromaDB (local vector DB)
- Frontend: React + Vite + Tailwind CSS

## Key Files
- backend/main.py          — FastAPI app entry point
- backend/services/        — All AI pipeline logic lives here
- backend/routers/         — API route handlers
- frontend/src/            — React UI
- .env                     — API keys (never commit this)
- .env.example             — Template for .env

## Environment Variables Needed
GEMINI_API_KEY=your_google_gemini_api_key_here

Get free Gemini API key at: https://aistudio.google.com/app/apikey

## How to Run (after setup)
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173

## Constraints
- No custom model training — use existing APIs only
- Must work as a live demo
- Video files up to ~500MB supported
- Processes at ~1 frame per 8 seconds of video (configurable in config.py)
