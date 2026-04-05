# ArthroAI — Surgical Video Intelligence Platform
### Medathon Hackathon · Problem Statement #4

An AI-powered platform that automatically converts arthroscopic surgery videos into
structured, timestamped, and searchable medical reports.

---

## How It Works

```
Surgery Video → Frame Extraction → Gemini Vision (per frame) → Phase Grouping → Report
                                ↘ Whisper Audio Transcription ↗
                                              ↓
                                    ChromaDB (Semantic Search)
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- FFmpeg → `brew install ffmpeg` (Mac) or `sudo apt install ffmpeg` (Linux)
- A free Gemini API key → https://aistudio.google.com/app/apikey

### 1. Backend Setup
```bash
cd backend

# Copy and fill in your API key
cp .env.example .env
# Edit .env → paste your GEMINI_API_KEY

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
# API docs available at http://localhost:8000/docs
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 3. Get a Sample Video
Search YouTube for "knee arthroscopy educational" and download a 3–5 min clip,
or use any arthroscopy video you have access to.

---

## Project Structure
```
Medathon/
├── backend/
│   ├── main.py                   # FastAPI entry point
│   ├── config.py                 # Tune frame interval, Whisper model here
│   ├── requirements.txt
│   ├── .env.example              # Copy to .env and add GEMINI_API_KEY
│   ├── models/schemas.py         # All data models
│   ├── services/
│   │   ├── frame_extractor.py    # OpenCV — extracts 1 frame/8 seconds
│   │   ├── audio_transcriber.py  # Whisper — transcribes surgeon audio
│   │   ├── vision_analyzer.py    # Gemini Vision — describes each frame
│   │   ├── report_generator.py   # Gemini LLM — groups phases + writes report
│   │   └── search_service.py     # ChromaDB — semantic search
│   └── routers/
│       ├── upload.py             # POST /upload/video
│       ├── analyze.py            # POST /analyze/{id}, GET /analyze/status/{id}
│       └── search.py             # POST /search/
└── frontend/
    └── src/
        ├── App.jsx               # Main layout + state
        └── components/
            ├── VideoPlayer.jsx   # Video + phase timeline bar
            ├── ReportPanel.jsx   # Timeline / Phases / Full Report tabs
            └── SearchBar.jsx     # Semantic search UI
```

## API Reference
| Endpoint | Method | Description |
|---|---|---|
| `/upload/video` | POST | Upload a video file |
| `/analyze/{video_id}` | POST | Start AI analysis pipeline |
| `/analyze/status/{video_id}` | GET | Poll for progress |
| `/analyze/result/{video_id}` | GET | Fetch completed result |
| `/search/` | POST | Semantic search across reports |
| `/docs` | GET | Interactive API docs (Swagger) |
