import whisper
from typing import List, Dict
import torch

# Load Whisper model (cache it)
device = "cuda" if torch.cuda.is_available() else "cpu"
model = None

def get_model():
    global model
    if model is None:
        print(f"Loading Whisper model on {device}...")
        model = whisper.load_model("base", device=device)
    return model

def transcribe_video(file_path: str, language: str = "en") -> Dict:
    """
    Transcribe video using Whisper with word-level timestamps
    """

    model = get_model()

    # Transcribe
    result = model.transcribe(
        file_path,
        language=language,
        word_timestamps=True,
        verbose=False
    )

    # Extract word-level data
    words = []
    for segment in result["segments"]:
        if "words" in segment:
            for word_data in segment["words"]:
                words.append({
                    "word": word_data["word"].strip(),
                    "start": word_data["start"],
                    "end": word_data["end"],
                    "confidence": word_data.get("probability", 1.0)
                })

    return {
        "text": result["text"],
        "language": result["language"],
        "duration": result["segments"][-1]["end"] if result["segments"] else 0,
        "words": words
    }
