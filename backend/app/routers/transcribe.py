from fastapi import APIRouter, HTTPException
from app.models.caption_models import TranscribeRequest
from app.services.transcription_service import transcribe_video

router = APIRouter()

@router.post("/")
async def transcribe(request: TranscribeRequest):
    """Transcribe video audio to word-level timestamps"""

    try:
        result = transcribe_video(request.file_path, request.language)
        return result
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
