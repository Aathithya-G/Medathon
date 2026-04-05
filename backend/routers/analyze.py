import os
import glob

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from config import UPLOAD_DIR
from models.schemas import AnalysisResult
from services.frame_extractor import extract_frames
from services.audio_transcriber import transcribe_audio
from services.vision_analyzer import analyze_frames
from services.report_generator import generate_report
from services.search_service import index_frames

router = APIRouter(prefix="/analyze", tags=["Analysis"])

# In-memory job tracker — in production use Redis or a DB
_job_status: dict = {}  # video_id → {"status": ..., "result": ...}


@router.post("/{video_id}")
async def start_analysis(video_id: str, background_tasks: BackgroundTasks):
    """
    Kicks off the full AI pipeline for an uploaded video (runs in background).
    Poll GET /analyze/status/{video_id} to check progress.
    """
    # Find the uploaded video file
    matches = glob.glob(os.path.join(UPLOAD_DIR, f"{video_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"No video found for id: {video_id}")

    video_path = matches[0]
    video_filename = os.path.basename(video_path)

    if video_id in _job_status and _job_status[video_id]["status"] == "processing":
        return {"message": "Analysis already running", "video_id": video_id}

    _job_status[video_id] = {"status": "processing", "step": "starting", "result": None}

    background_tasks.add_task(_run_pipeline, video_id, video_path, video_filename)

    return {"message": "Analysis started", "video_id": video_id}


@router.get("/status/{video_id}")
async def get_status(video_id: str):
    """Poll this endpoint to check if analysis is done."""
    if video_id not in _job_status:
        raise HTTPException(status_code=404, detail="No job found for this video_id")
    return _job_status[video_id]


@router.get("/result/{video_id}")
async def get_result(video_id: str):
    """Fetch the full analysis result once status is 'done'."""
    job = _job_status.get(video_id)
    if not job:
        raise HTTPException(status_code=404, detail="No job found")
    if job["status"] != "done":
        raise HTTPException(status_code=202, detail=f"Still processing: {job['step']}")
    return job["result"]


# ── Pipeline Runner (runs in background) ──────────────────────────────────────

async def _run_pipeline(video_id: str, video_path: str, video_filename: str):
    try:
        # Step 1: Extract frames
        _job_status[video_id]["step"] = "Extracting frames..."
        frames_info, duration = extract_frames(video_path, video_id)

        # Step 2: Transcribe audio
        _job_status[video_id]["step"] = "Transcribing audio..."
        audio_transcript, _ = transcribe_audio(video_path)

        # Step 3: Analyze each frame with Gemini Vision
        _job_status[video_id]["step"] = f"Analyzing {len(frames_info)} frames with AI..."
        frame_analyses = analyze_frames(frames_info)

        # Step 4: Generate phases and report
        _job_status[video_id]["step"] = "Generating surgical report..."
        phases, full_report = generate_report(frame_analyses, audio_transcript, video_filename)

        # Step 5: Index in ChromaDB for search
        _job_status[video_id]["step"] = "Indexing for search..."
        index_frames(video_id, frame_analyses)

        # Build result
        result = AnalysisResult(
            video_id=video_id,
            video_filename=video_filename,
            duration_seconds=duration,
            frame_count=len(frame_analyses),
            frames=frame_analyses,
            audio_transcript=audio_transcript,
            phases=phases,
            full_report=full_report,
            procedure_type=phases[0].phase_name if phases else "Arthroscopic Surgery",
        )

        _job_status[video_id] = {
            "status": "done",
            "step": "complete",
            "result": result.model_dump(),
        }
        print(f"[Pipeline] ✅ Done for video_id={video_id}")

    except Exception as e:
        print(f"[Pipeline] ❌ Error for video_id={video_id}: {e}")
        _job_status[video_id] = {
            "status": "error",
            "step": str(e),
            "result": None,
        }
