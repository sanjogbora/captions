from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
from pathlib import Path
import uuid

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file"""

    # Validate file type
    allowed_types = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {allowed_types}"
        )

    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename or "video.mp4")[1]
    filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / filename

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "file_id": file_id,
        "filename": filename,
        "path": str(file_path),
        "size": os.path.getsize(file_path),
    }
