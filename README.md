# FastCaption - Fast Video Caption Editor

A web-based video caption editor that allows creators to add perfectly positioned, styled captions to 30-60 second videos in under 3 minutes.

## Features

- **Auto-transcription** using OpenAI Whisper
- **Word-level editing** with intuitive drag-and-drop
- **Style templates** for quick styling
- **Keyboard shortcuts** for power users
- **Export** to MP4 with burned-in captions
- **Undo/Redo** system for safe editing

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Zustand (state management)
- TailwindCSS
- react-player
- react-draggable

### Backend
- FastAPI (Python)
- OpenAI Whisper (transcription)
- MoviePy (video rendering)
- FFmpeg

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- FFmpeg installed on your system

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd captions
```

2. **Set up the frontend**
```bash
cd frontend
npm install
```

3. **Set up the backend**
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Application

**Option 1: Manual Start**

Terminal 1 (Frontend):
```bash
cd frontend
npm run dev
```

Terminal 2 (Backend):
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```

**Option 2: Docker Compose**
```bash
docker-compose up
```

Then open your browser to `http://localhost:3000`

## Usage

1. **Upload Video**: Click to upload or drag & drop a video file (MP4, MOV, WebM)
2. **Auto-transcription**: Wait for Whisper to transcribe your video (~30 seconds for 60s video)
3. **Review & Edit**:
   - Most captions are auto-placed at the bottom-center
   - Drag captions to reposition them
   - Click a caption to select it, then use the Style Panel to change its appearance
   - Shift+Click to select multiple captions
   - Group selected captions to move them together
4. **Export**: Click "Export Video" to render your final video with burned-in captions

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause video |
| `←` / `→` | Skip backward/forward 1 second |
| `Shift + ←` / `→` | Skip backward/forward 5 seconds |
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Shift + Z` | Redo |
| `⌘/Ctrl + G` | Group/Ungroup selected captions |
| `Backspace` / `Delete` | Delete selected captions |

## Project Structure

```
captions/
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── stores/          # Zustand stores
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── routers/         # API routes
│   │   ├── services/        # Business logic
│   │   └── models/          # Data models
│   └── requirements.txt
│
└── docker-compose.yml
```

## API Endpoints

### Upload
```
POST /api/upload/
```
Upload a video file

### Transcribe
```
POST /api/transcribe/
Body: { "file_path": "...", "language": "en" }
```
Transcribe video to word-level timestamps

### Render
```
POST /api/render/
Body: { "videoPath": "...", "captions": [...], "quality": "high" }
```
Render final video with captions

## Development

### Frontend Development
```bash
cd frontend
npm run dev
```

### Backend Development
```bash
cd backend
uvicorn app.main:app --reload
```

### Type Checking (Frontend)
```bash
cd frontend
npm run build  # This runs TypeScript compiler
```

## Performance

- Transcription: ~30 seconds for a 60-second video (using Whisper base model)
- Rendering: ~1-2 minutes for a 60-second video (high quality)
- Target: Complete caption workflow in under 3 minutes

## Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed:
- **Mac**: `brew install ffmpeg`
- **Ubuntu**: `sudo apt install ffmpeg`
- **Windows**: Download from https://ffmpeg.org/download.html

### Whisper model download
On first run, Whisper will download the model (~140MB for base model). This is normal.

### CORS errors
Make sure the backend is running on `http://localhost:8000` and frontend on `http://localhost:3000`.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
