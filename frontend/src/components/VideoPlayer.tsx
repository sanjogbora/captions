import { useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import CaptionOverlay from './CaptionOverlay';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';

export default function VideoPlayer() {
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { currentTime, isPlaying, setCurrentTime, setIsPlaying, videoUrl } = useUIStore();
  const { visibleCaptions } = useCaptionStore();

  // Get captions that should be visible at current time
  const activeCaptions = visibleCaptions(currentTime);

  useEffect(() => {
    // Seek player when currentTime changes externally
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, 'seconds');
    }
  }, [currentTime]);

  if (!videoUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-center text-gray-400">
          <p className="text-xl mb-2">No video loaded</p>
          <p className="text-sm">Upload a video to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black">
      <div
        ref={containerRef}
        className="relative aspect-video max-h-[70vh] w-full mx-auto"
      >
        {/* Video */}
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={isPlaying}
          onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
          onDuration={(duration) => useUIStore.getState().setVideoDuration(duration)}
          onEnded={() => setIsPlaying(false)}
          width="100%"
          height="100%"
          controls={false}
        />

        {/* Caption Overlay */}
        <CaptionOverlay
          captions={activeCaptions}
          videoWidth={containerRef.current?.clientWidth || 1920}
          videoHeight={containerRef.current?.clientHeight || 1080}
        />
      </div>
    </div>
  );
}
