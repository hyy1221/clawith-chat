"""
OpenAI-compatible Whisper API server using faster-whisper.
Runs on http://localhost:9000 with endpoint /v1/audio/transcriptions

Usage:
    python whisper_server.py                    # CPU (medium model)
    python whisper_server.py --model large-v3  # Large model
    python whisper_server.py --device cpu      # Force CPU
    python whisper_server.py --device cuda     # GPU (if available)
"""

import argparse
import tempfile
import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import faster_whisper

app = FastAPI(title="Whisper API", version="1.0.0")

# Global model instance
model = None


def load_model(name: str, device: str):
    """Load faster-whisper model."""
    global model
    compute_type = "float16" if device == "cuda" else "int8"
    print(f"[Whisper] Loading model '{name}' on {device} (compute={compute_type})...")
    model = faster_whisper.WhisperModel(name, device=device, compute_type=compute_type)
    print(f"[Whisper] Model loaded: {name}")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/audio/transcriptions")
async def transcribe(file: UploadFile = File(...)):
    """OpenAI-compatible transcription endpoint."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate content type
    allowed = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/webm",
               "audio/ogg", "audio/m4a", "audio/aac", "audio/x-m4a",
               "application/octet-stream"}
    content_type = file.content_type or ""
    if content_type not in allowed and not content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {content_type}")

    # Save uploaded file to temp
    suffix = Path(file.filename).suffix if file.filename else ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language="zh",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        text = "".join(seg.text for seg in segments)
        return JSONResponse(content={"text": text.strip()})
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Whisper API Server")
    parser.add_argument("--model", default="medium",
                        help="Model: tiny, base, small, medium, large-v3 (default: medium)")
    parser.add_argument("--device", default="auto",
                        help="Device: auto, cpu, cuda (default: auto)")
    parser.add_argument("--port", type=int, default=9000,
                        help="Port (default: 9000)")
    args = parser.parse_args()

    device = args.device
    if device == "auto":
        device = "cuda"

    load_model(args.model, device)
    print(f"[Whisper] Server starting on http://0.0.0.0:{args.port}")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
