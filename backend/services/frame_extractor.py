import cv2
import os
import uuid
from typing import List, Tuple

from config import FRAME_INTERVAL_SECONDS, FRAMES_DIR


def extract_frames(video_path: str, video_id: str) -> Tuple[List[dict], float]:
    """
    Opens the video and saves one frame every FRAME_INTERVAL_SECONDS.

    Returns:
        frames_info  — list of {timestamp_seconds, timestamp_label, frame_path}
        duration     — total video duration in seconds
    """
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    # Create a subfolder for this video's frames
    video_frames_dir = os.path.join(FRAMES_DIR, video_id)
    os.makedirs(video_frames_dir, exist_ok=True)

    frames_info = []
    frame_interval = int(fps * FRAME_INTERVAL_SECONDS)
    frame_number = 0

    while True:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()

        if not ret:
            break

        timestamp_seconds = frame_number / fps
        timestamp_label = _format_timestamp(timestamp_seconds)

        frame_filename = f"frame_{int(timestamp_seconds):05d}.jpg"
        frame_path = os.path.join(video_frames_dir, frame_filename)

        cv2.imwrite(frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])

        frames_info.append({
            "timestamp_seconds": timestamp_seconds,
            "timestamp_label": timestamp_label,
            "frame_path": frame_path,
        })

        frame_number += frame_interval

    cap.release()
    print(f"[FrameExtractor] Extracted {len(frames_info)} frames from {duration:.1f}s video")
    return frames_info, duration


def _format_timestamp(seconds: float) -> str:
    """Convert float seconds to MM:SS string."""
    m = int(seconds) // 60
    s = int(seconds) % 60
    return f"{m:02d}:{s:02d}"
