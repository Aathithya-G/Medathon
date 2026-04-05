import json
from typing import List

from groq import Groq
from config import GROQ_API_KEY, GROQ_TEXT_MODEL
from models.schemas import FrameAnalysis, SurgicalPhase

client = Groq(api_key=GROQ_API_KEY)


def generate_report(
    frame_analyses: List[FrameAnalysis],
    audio_transcript: str,
    video_filename: str,
) -> tuple[List[SurgicalPhase], str]:
    """
    Generates surgical phases and a formal report using Groq LLM.
    Works from audio transcript alone if vision data is unavailable.
    """
    vision_available = any(
        "unavailable" not in fa.description.lower()
        for fa in frame_analyses
    )

    if vision_available:
        timeline_lines = [
            f"[{fa.timestamp_label}] Phase={fa.surgical_phase} | {fa.description}"
            for fa in frame_analyses
        ]
        context_section = (
            "VISUAL TIMELINE:\n" + "\n".join(timeline_lines) +
            "\n\nAUDIO TRANSCRIPT:\n" + audio_transcript
        )
    else:
        print("[ReportGen] Vision unavailable — generating from audio transcript only.")
        context_section = f"SURGEON AUDIO TRANSCRIPT:\n{audio_transcript}"

    # ── Step 1: Identify surgical phases ────────────────────────────────────
    phase_prompt = f"""You are a surgical documentation specialist.

Analyze this arthroscopic surgery data and identify 3-6 distinct surgical phases.

{context_section}

Return ONLY valid JSON — no markdown, no explanation:
{{
  "procedure_type": "Shoulder Arthroscopy",
  "phases": [
    {{
      "phase_name": "Inspection",
      "start_time": "00:00",
      "end_time": "03:00",
      "summary": "What happened in this phase.",
      "key_findings": ["Finding 1", "Finding 2"]
    }}
  ]
}}"""

    phases: List[SurgicalPhase] = []
    procedure_type = "Arthroscopic Surgery"

    try:
        phase_resp = client.chat.completions.create(
            model=GROQ_TEXT_MODEL,
            messages=[{"role": "user", "content": phase_prompt}],
            max_tokens=1000,
            temperature=0.2,
        )
        raw = phase_resp.choices[0].message.content.strip()

        # Strip markdown fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)
        procedure_type = parsed.get("procedure_type", "Arthroscopic Surgery")

        for p in parsed.get("phases", []):
            phases.append(SurgicalPhase(
                phase_name=p["phase_name"],
                start_time=p["start_time"],
                end_time=p["end_time"],
                summary=p["summary"],
                key_findings=p.get("key_findings", []),
            ))

    except Exception as e:
        print(f"[ReportGen] Phase grouping error: {e}")
        phases = [SurgicalPhase(
            phase_name="Full Procedure",
            start_time="00:00",
            end_time=frame_analyses[-1].timestamp_label if frame_analyses else "00:00",
            summary="See full report below.",
            key_findings=[],
        )]

    # ── Step 2: Generate formal operative note ────────────────────────────────
    phases_text = "\n\n".join([
        f"PHASE: {p.phase_name} ({p.start_time} – {p.end_time})\n"
        f"Summary: {p.summary}\n"
        f"Findings: {', '.join(p.key_findings) if p.key_findings else 'None documented'}"
        for p in phases
    ])

    report_prompt = f"""You are a senior orthopedic surgeon writing a formal operative note.

Procedure: {procedure_type}
Video: {video_filename}

Surgical Phases:
{phases_text}

Surgeon's Intraoperative Narration:
{audio_transcript}

Write a complete structured operative note with these sections:
1. PROCEDURE NAME
2. INDICATION
3. INTRAOPERATIVE FINDINGS
4. PROCEDURE PERFORMED
5. CONCLUSION

Use only information from the data above. Be medically precise and concise."""

    try:
        report_resp = client.chat.completions.create(
            model=GROQ_TEXT_MODEL,
            messages=[{"role": "user", "content": report_prompt}],
            max_tokens=1500,
            temperature=0.3,
        )
        full_report = report_resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[ReportGen] Report generation error: {e}")
        full_report = f"Report generation failed: {e}\n\nSURGEON AUDIO TRANSCRIPT:\n{audio_transcript}"

    print(f"[ReportGen] Done. {len(phases)} phases detected.")
    return phases, full_report
