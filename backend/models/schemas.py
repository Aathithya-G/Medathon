from pydantic import BaseModel
from typing import List, Optional


class FrameAnalysis(BaseModel):
    """AI description of a single video frame."""
    timestamp_seconds: float
    timestamp_label: str        # e.g. "00:08"
    frame_path: str
    description: str            # Gemini's description of this frame
    surgical_phase: str         # e.g. "Inspection", "Repair"


class AudioSegment(BaseModel):
    """A segment of transcribed audio from Whisper."""
    start: float
    end: float
    text: str


class SurgicalPhase(BaseModel):
    """A grouped phase of the surgery."""
    phase_name: str             # e.g. "Setup", "Inspection", "Repair", "Closure"
    start_time: str             # e.g. "00:00"
    end_time: str               # e.g. "03:45"
    summary: str                # What happened in this phase
    key_findings: List[str]     # Bullet points of important findings


class AnalysisResult(BaseModel):
    """The full output of the AI pipeline for one video."""
    video_id: str
    video_filename: str
    duration_seconds: float
    frame_count: int
    frames: List[FrameAnalysis]
    audio_transcript: str
    phases: List[SurgicalPhase]
    full_report: str            # The final formatted medical report
    procedure_type: str         # e.g. "Knee Arthroscopy"


class SearchQuery(BaseModel):
    query: str
    video_id: Optional[str] = None   # None = search across all videos
    top_k: int = 5


class SearchResult(BaseModel):
    timestamp_label: str
    timestamp_seconds: float
    description: str
    video_id: str
    relevance_score: float
