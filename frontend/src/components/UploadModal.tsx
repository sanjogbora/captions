import { useState, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useCaptionStore } from '../stores/captionStore';
import { createCaptionFromWord } from '../utils/captionUtils';
import { v4 as uuidv4 } from 'uuid';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
      const captions = transcribeData.words.map((word: any) =>
        createCaptionFromWord(
          word.word,
          word.start,
          word.end,
          1920,
          1080,
          uuidv4()
        )
      );

      // Set video URL and captions
      const videoUrl = URL.createObjectURL(file);
      setVideoUrl(videoUrl);
      setCaptions(captions);

      // Close modal
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
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

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Upload & Transcribe
          </button>
        </div>
      </div>
    </div>
  );
}
