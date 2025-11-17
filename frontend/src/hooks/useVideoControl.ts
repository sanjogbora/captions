import { useUIStore } from '../stores/uiStore';

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
  } = useUIStore();

  const exportVideo = async () => {
    // TODO: Implement export functionality
    console.log('Exporting video...');
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
