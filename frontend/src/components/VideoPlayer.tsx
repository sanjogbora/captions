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

  const { currentTime, isPlaying, setCurrentTime, setIsPlaying, videoUrl, transcriptMode, isClickToPlaceMode, setPendingPlacement, pendingPlacement, clickToPlaceIndex } = useUIStore();
  const { visibleCaptions, getVisibleCaptionsInSentenceMode, captions } = useCaptionStore();

  // Get captions that should be visible at current time
  const activeCaptions = transcriptMode === 'sentence'
    ? getVisibleCaptionsInSentenceMode(currentTime)
    : visibleCaptions(currentTime);

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

  // Handle click to place caption
  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isClickToPlaceMode || !containerRef.current) return;

    // Get click position relative to video container
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Scale from actual video size to reference coordinates (800x450)
    const REFERENCE_WIDTH = 800;
    const REFERENCE_HEIGHT = 450;
    const actualWidth = rect.width;
    const actualHeight = rect.height;

    const scaleX = REFERENCE_WIDTH / actualWidth;
    const scaleY = REFERENCE_HEIGHT / actualHeight;

    const referenceX = clickX * scaleX;
    const referenceY = clickY * scaleY;

    // Store pending placement in reference coordinates
    setPendingPlacement({ x: referenceX, y: referenceY });
  }, [isClickToPlaceMode, setPendingPlacement]);

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
        className={`relative aspect-video max-h-[70vh] w-full mx-auto ${isClickToPlaceMode ? 'cursor-crosshair' : ''}`}
        onClick={handleVideoClick}
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

        {/* Click-to-Place Mode Indicator */}
        {isClickToPlaceMode && pendingPlacement && captions[clickToPlaceIndex] && containerRef.current && (() => {
          // Scale from reference coordinates back to actual video size for display
          const REFERENCE_WIDTH = 800;
          const REFERENCE_HEIGHT = 450;
          const rect = containerRef.current.getBoundingClientRect();
          const scaleX = rect.width / REFERENCE_WIDTH;
          const scaleY = rect.height / REFERENCE_HEIGHT;
          const displayX = pendingPlacement.x * scaleX;
          const displayY = pendingPlacement.y * scaleY;

          return (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${displayX}px`,
                top: `${displayY}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
            {/* Crosshair marker */}
            <div className="relative">
              <div className="absolute w-8 h-0.5 bg-yellow-400 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute w-0.5 h-8 bg-yellow-400 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute w-4 h-4 border-2 border-yellow-400 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            {/* Word preview */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 text-yellow-400 px-3 py-1 rounded text-sm whitespace-nowrap">
              "{captions[clickToPlaceIndex].word}" - Press 1-9
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
