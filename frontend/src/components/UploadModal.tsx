import { useState, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useCaptionStore } from '../stores/captionStore';
import { createCaptionFromWord } from '../utils/captionUtils';
import { v4 as uuidv4 } from 'uuid';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProgressStage = 'idle' | 'uploading' | 'transcribing' | 'processing' | 'done';

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progressStage, setProgressStage] = useState<ProgressStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { setVideoUrl, setLoading, setError } = useUIStore();
  const { setCaptions } = useCaptionStore();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setProgressStage('uploading');
    setLoading(true, 'Uploading video...');

    try {
      // Upload video
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('http://localhost:8000/api/upload/', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();

      // Transcribe video
      setProgressStage('transcribing');
      setLoading(true, 'Transcribing video...');

      const transcribeResponse = await fetch('http://localhost:8000/api/transcribe/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: uploadData.path,
          language: 'en'
        }),
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const transcribeData = await transcribeResponse.json();

      // Create captions from transcript
      setProgressStage('processing');
      setLoading(true, 'Processing captions...');

      // Use a standard reference size that works for most video players
      const referenceWidth = 800;
      const referenceHeight = 450; // 16:9 aspect ratio

      const captions = transcribeData.words.map((word: any) =>
        createCaptionFromWord(
          word.word,
          word.start,
          word.end,
          referenceWidth,
          referenceHeight,
          uuidv4()
        )
      );

      // Set video URL and captions
      const videoUrl = URL.createObjectURL(file);
      setVideoUrl(videoUrl);
      setCaptions(captions);

      setProgressStage('done');

      // Close modal after brief delay
      setTimeout(() => {
        onClose();
        setProgressStage('idle');
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setProgressStage('idle');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Upload Video</h2>

        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center
            ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700'}
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="text-white">
              <p className="font-medium mb-2">{file.name}</p>
              <p className="text-sm text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="text-gray-400">
              <p className="mb-2">Drag and drop your video here</p>
              <p className="text-sm">or</p>
            </div>
          )}

          <label className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors">
            {file ? 'Choose Different File' : 'Choose File'}
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Progress Indicator */}
        {progressStage !== 'idle' && (
          <div className="mt-6 space-y-3">
            {/* Stage 1: Uploading */}
            <div className="flex items-center gap-3">
              {progressStage === 'uploading' ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : progressStage !== 'idle' ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
              )}
              <span className={`text-sm ${progressStage === 'uploading' ? 'text-white font-medium' : 'text-gray-400'}`}>
                Uploading video {file && `(${(file.size / 1024 / 1024).toFixed(1)} MB)`}
              </span>
            </div>

            {/* Stage 2: Transcribing */}
            <div className="flex items-center gap-3">
              {progressStage === 'transcribing' ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : ['processing', 'done'].includes(progressStage) ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
              )}
              <span className={`text-sm ${progressStage === 'transcribing' ? 'text-white font-medium' : 'text-gray-400'}`}>
                Transcribing with AI
              </span>
            </div>

            {/* Stage 3: Processing */}
            <div className="flex items-center gap-3">
              {progressStage === 'processing' ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : progressStage === 'done' ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
              )}
              <span className={`text-sm ${progressStage === 'processing' ? 'text-white font-medium' : 'text-gray-400'}`}>
                Processing captions
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            disabled={progressStage !== 'idle' && progressStage !== 'done'}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || (progressStage !== 'idle' && progressStage !== 'done')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Upload & Transcribe
          </button>
        </div>
      </div>
    </div>
  );
}
