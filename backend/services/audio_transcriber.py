import whisper
import os
from typing import List
from models.schemas import AudioSegment
from config import WHISPER_MODEL_SIZE

# Load model once at import time so it isn't reloaded on every request
_model = None


def _get_model():
    global _model
    if _model is None:
        print(f"[Whisper] Loading '{WHISPER_MODEL_SIZE}' model — first run downloads ~140MB...")
        _model = whisper.load_model(WHISPER_MODEL_SIZE)
        print("[Whisper] Model loaded.")
    return _model


def transcribe_audio(video_path: str) -> tuple[str, List[AudioSegment]]:
    """
    Runs Whisper on the video file directly.
    Whisper can handle video files — it extracts audio internally.

    Returns:
        full_text    — complete transcript as one string
        segments     — list of AudioSegment with start/end times
    """
    model = _get_model()

    print(f"[Whisper] Transcribing: {os.path.basename(video_path)}")
    result = model.transcribe(video_path, language="en", verbose=False)

    full_text = result.get("text", "").strip()

    segments = []
    for seg in result.get("segments", []):
        segments.append(AudioSegment(
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
        ))

    if not full_text:
        full_text = "[No spoken audio detected in the video]"

    print(f"[Whisper] Transcription done. {len(segments)} segments, {len(full_text)} chars")
    return full_text, segments
