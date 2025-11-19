from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path

from app.routers import upload, transcribe, render

app = FastAPI(
    title="FastCaption API",
    description="API for fast video caption editing",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
Path("uploads").mkdir(exist_ok=True)
Path("outputs").mkdir(exist_ok=True)

# Serve static files
app.mount("/videos", StaticFiles(directory="uploads"), name="videos")
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# Include routers
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(transcribe.router, prefix="/api/transcribe", tags=["transcribe"])
app.include_router(render.router, prefix="/api/render", tags=["render"])

@app.get("/")
def read_root():
    return {
        "message": "FastCaption API is running",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/upload/",
            "transcribe": "/api/transcribe/",
            "render": "/api/render/"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
