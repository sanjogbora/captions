from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from app.models.caption_models import RenderRequest
from app.services.rendering_service import render_video_with_captions
import os

router = APIRouter()

@router.post("/")
async def render_video(request: RenderRequest, background_tasks: BackgroundTasks):
    """Render final video with captions burned in"""

    try:
        output_path = render_video_with_captions(
            video_path=request.videoPath,
            captions=request.captions,
            output_format=request.outputFormat,
            quality=request.quality
        )

        # Schedule cleanup after download
        background_tasks.add_task(cleanup_file, output_path)

        return FileResponse(
            output_path,
            media_type=f"video/{request.outputFormat}",
            filename=f"captioned_video.{request.outputFormat}"
        )

    except Exception as e:
        print(f"Render error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def cleanup_file(file_path: str):
    """Cleanup file after some delay"""
    import time
    time.sleep(60)  # Wait 60 seconds before deleting
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Cleanup error: {e}")
