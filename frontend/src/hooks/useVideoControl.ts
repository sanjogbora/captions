import { useUIStore } from '../stores/uiStore';
import { useCaptionStore } from '../stores/captionStore';

export function useVideoControl() {
  const {
    currentTime,
    videoDuration,
    isPlaying,
    videoUrl,
    setCurrentTime,
    setVideoDuration,
    setIsPlaying,
    togglePlay,
    skip,
    setError,
  } = useUIStore();

  const { captions } = useCaptionStore();

  const exportVideo = async () => {
    if (!videoUrl) {
      setError('No video loaded');
      return;
    }

    if (captions.length === 0) {
      setError('No captions to export');
      return;
    }

    try {
      // Extract video path from the URL
      // Assuming videoUrl is like "http://localhost:8000/videos/filename.mp4"
      const videoPath = videoUrl.replace(/^.*\/videos\//, 'uploads/');

      const response = await fetch('http://localhost:8000/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoPath,
          captions: captions.map(caption => ({
            id: caption.id,
            word: caption.word,
            startTime: caption.startTime,
            endTime: caption.endTime,
            position: caption.position,
            size: caption.size,
            style: caption.style,
            groupId: caption.groupId,
            isGrouped: caption.isGrouped,
            zIndex: caption.zIndex,
          })),
          outputFormat: 'mp4',
          quality: 'high',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'captioned_video.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      setError(error instanceof Error ? error.message : 'Failed to export video');
      throw error;
    }
  };

  return {
    currentTime,
    videoDuration,
    isPlaying,
    videoUrl,
    setCurrentTime,
    setVideoDuration,
    setIsPlaying,
    togglePlay,
    skip,
    exportVideo,
  };
}
