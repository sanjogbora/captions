from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TranscriptWord(BaseModel):
    word: str
    start: float
    end: float
    confidence: float

class Position(BaseModel):
    x: float
    y: float
    alignment: str = "center"

class Size(BaseModel):
    width: float
    height: float

class CaptionStyle(BaseModel):
    templateId: str
    fontSize: int
    fontFamily: str
    color: str
    strokeColor: Optional[str] = None
    strokeWidth: int = 0
    backgroundColor: Optional[str] = None
    backgroundOpacity: float = 1.0
    animation: str = "fade"
    textTransform: str = "none"
    fontWeight: int = 400
    letterSpacing: float = 0
    lineHeight: float = 1.2
    textShadow: Optional[str] = None
    rotation: float = 0

class Caption(BaseModel):
    id: str
    word: str
    startTime: float
    endTime: float
    position: Position
    size: Size
    style: CaptionStyle
    groupId: Optional[str] = None
    isGrouped: bool = False
    zIndex: int = 1

class RenderRequest(BaseModel):
    videoPath: str
    captions: List[Caption]
    outputFormat: str = "mp4"
    quality: str = "high"

class TranscribeRequest(BaseModel):
    file_path: str
    language: str = "en"
