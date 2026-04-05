import os
import uuid
import aiofiles

from fastapi import APIRouter, UploadFile, File, HTTPException
from config import UPLOAD_DIR

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


@router.post("/video")
async def upload_video(file: UploadFile = File(...)):
    """
    Accepts a video file upload.
    Saves it to disk and returns a unique video_id for tracking.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    video_id = str(uuid.uuid4())[:8]  # short ID like "a3f92c1b"
    save_filename = f"{video_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, save_filename)

    # Write file in chunks to avoid loading it all into memory
    async with aiofiles.open(save_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            await out_file.write(chunk)

    file_size_mb = os.path.getsize(save_path) / (1024 * 1024)
    print(f"[Upload] Saved {file.filename} → {save_path} ({file_size_mb:.1f} MB)")

    return {
        "video_id": video_id,
        "original_filename": file.filename,
        "saved_path": save_path,
        "size_mb": round(file_size_mb, 2),
    }
