import os
from dotenv import load_dotenv

load_dotenv()

# ── Groq ──────────────────────────────────────────────────
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

# Vision model — supports image input
GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"

# Text model — for report generation and phase grouping
GROQ_TEXT_MODEL: str = "llama-3.3-70b-versatile"

# ── Frame Extraction ──────────────────────────────────────
# 30s interval = ~22 frames for an 11-min video
# Groq handles this easily within free tier
FRAME_INTERVAL_SECONDS: int = 30

# ── Rate limiting ─────────────────────────────────────────
# Groq free tier: 30 req/min — 2s delay keeps us safe
GROQ_CALL_DELAY: float = 2.0

# ── File Storage ──────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
FRAMES_DIR = os.path.join(UPLOAD_DIR, "frames")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

# ── ChromaDB ──────────────────────────────────────────────
CHROMA_PERSIST_DIR = os.path.join(BASE_DIR, "chroma_db")
CHROMA_COLLECTION_NAME = "surgical_reports"

# ── Whisper ───────────────────────────────────────────────
WHISPER_MODEL_SIZE: str = "base"
