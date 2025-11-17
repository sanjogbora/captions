import { useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import CaptionOverlay from './CaptionOverlay';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';

export default function VideoPlayer() {
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<number>(0);
  const isSeeking = useRef<boolean>(false);

  const { currentTime, isPlaying, setCurrentTime, setIsPlaying, videoUrl } = useUIStore();
  const { visibleCaptions } = useCaptionStore();

  // Get captions that should be visible at current time
  const activeCaptions = visibleCaptions(currentTime);

  // Throttled progress handler to reduce re-renders
  const handleProgress = useCallback((state: { playedSeconds: number }) => {
    if (isSeeking.current) return; // Don't update during seek

    const now = Date.now();
    // Only update state every 100ms to reduce lag
    if (now - lastUpdateRef.current > 100) {
      setCurrentTime(state.playedSeconds);
      lastUpdateRef.current = now;
    }
  }, [setCurrentTime]);

  useEffect(() => {
    // Seek player when currentTime changes externally (e.g., timeline click)
    // Only seek if the difference is significant (> 0.5 seconds)
    if (playerRef.current && Math.abs(playerRef.current.getCurrentTime() - currentTime) > 0.5) {
      isSeeking.current = true;
      playerRef.current.seekTo(currentTime, 'seconds');
      setTimeout(() => {
        isSeeking.current = false;
      }, 100);
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
          onProgress={handleProgress}
          onDuration={(duration) => useUIStore.getState().setVideoDuration(duration)}
          onEnded={() => setIsPlaying(false)}
          width="100%"
          height="100%"
          controls={false}
          progressInterval={100}
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
