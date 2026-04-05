import base64
import time
from typing import List

from groq import Groq
from config import GROQ_API_KEY, GROQ_VISION_MODEL, GROQ_CALL_DELAY
from models.schemas import FrameAnalysis

VISION_PROMPT = """You are an expert arthroscopic surgery assistant analyzing surgical footage.

Look at this frame from an arthroscopy video and provide:
1. PHASE: Which surgical phase is this? Choose ONE from: [Setup, Insertion, Inspection, Diagnosis, Intervention/Repair, Closure, Unknown]
2. DESCRIPTION: In 2 sentences, describe exactly what is visible — instruments, anatomy, tissue condition, actions being performed.
3. FINDINGS: One key clinical finding if any (e.g., "cartilage tear visible"). Write "None" if nothing notable.

Format your response EXACTLY like this:
PHASE: <phase name>
DESCRIPTION: <2 sentence description>
FINDINGS: <finding or None>
"""


def analyze_frames(frames_info: List[dict]) -> List[FrameAnalysis]:
    """
    Sends each extracted frame to Groq Vision API (Llama 4 Scout).
    Falls back to audio-only mode gracefully on errors.
    """
    if not GROQ_API_KEY or not GROQ_API_KEY.startswith("gsk_"):
        print("[Vision] No valid Groq API key — skipping vision analysis.")
        return _fallback_frames(frames_info)

    client = Groq(api_key=GROQ_API_KEY)
    results = []

    for i, frame in enumerate(frames_info):
        print(f"[Vision] Analyzing frame {i+1}/{len(frames_info)} at {frame['timestamp_label']}")

        try:
            with open(frame["frame_path"], "rb") as f:
                image_b64 = base64.b64encode(f.read()).decode("utf-8")

            response = client.chat.completions.create(
                model=GROQ_VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_b64}"
                                }
                            },
                            {
                                "type": "text",
                                "text": VISION_PROMPT
                            }
                        ]
                    }
                ],
                max_tokens=300,
            )

            raw_text = response.choices[0].message.content.strip()
            phase, description, findings = _parse_response(raw_text)

            results.append(FrameAnalysis(
                timestamp_seconds=frame["timestamp_seconds"],
                timestamp_label=frame["timestamp_label"],
                frame_path=frame["frame_path"],
                description=description + (f" Finding: {findings}" if findings != "None" else ""),
                surgical_phase=phase,
            ))

            # Respect rate limits
            if i < len(frames_info) - 1:
                time.sleep(GROQ_CALL_DELAY)

        except Exception as e:
            err = str(e)
            print(f"[Vision] Error on frame {i+1}: {err[:120]}")

            if "rate_limit" in err.lower() or "429" in err:
                print("[Vision] Rate limit hit — switching remaining frames to audio-only.")
                for rem in frames_info[i:]:
                    results.append(_placeholder(rem))
                break

            results.append(_placeholder(frame))

    print(f"[Vision] Complete. {len(results)} frames processed.")
    return results if results else _fallback_frames(frames_info)


def _placeholder(frame: dict) -> FrameAnalysis:
    return FrameAnalysis(
        timestamp_seconds=frame["timestamp_seconds"],
        timestamp_label=frame["timestamp_label"],
        frame_path=frame["frame_path"],
        description="Visual analysis unavailable — report generated from surgeon audio narration.",
        surgical_phase="Unknown",
    )


def _fallback_frames(frames_info: List[dict]) -> List[FrameAnalysis]:
    return [_placeholder(f) for f in frames_info]


def _parse_response(text: str) -> tuple[str, str, str]:
    lines = text.strip().split("\n")
    phase, description, findings = "Unknown", text, "None"
    for line in lines:
        if line.startswith("PHASE:"):
            phase = line.replace("PHASE:", "").strip()
        elif line.startswith("DESCRIPTION:"):
            description = line.replace("DESCRIPTION:", "").strip()
        elif line.startswith("FINDINGS:"):
            findings = line.replace("FINDINGS:", "").strip()
    return phase, description, findings
