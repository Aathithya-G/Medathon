from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import UPLOAD_DIR, FRAMES_DIR
from routers import upload, analyze, search

app = FastAPI(
    title="Arthroscopy Video Intelligence API",
    description="AI-powered surgical video to structured report converter",
    version="1.0.0",
)

# ── CORS (allow React frontend on port 5173) ──────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve uploaded frames as static files (for the video thumbnail previews) ──
app.mount("/frames", StaticFiles(directory=FRAMES_DIR), name="frames")
app.mount("/videos", StaticFiles(directory=UPLOAD_DIR), name="videos")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(search.router)


@app.get("/")
def root():
    return {
        "message": "Arthroscopy Video Intelligence API is running",
        "docs": "/docs",
        "endpoints": ["/upload/video", "/analyze/{video_id}", "/search/"],
    }


@app.get("/health")
def health():
    return {"status": "ok"}
