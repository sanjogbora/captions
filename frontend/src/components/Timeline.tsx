import { useRef } from 'react';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';
import { formatTimeSimple } from '../utils/captionUtils';

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { captions } = useCaptionStore();
  const { currentTime, videoDuration, setCurrentTime } = useUIStore();

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * videoDuration;

    setCurrentTime(newTime);
  };

  return (
    <div className="bg-gray-900 p-4">
      {/* Timeline Bar */}
      <div
        ref={timelineRef}
        className="relative h-16 bg-gray-800 rounded cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Caption Markers */}
        {captions.map(caption => {
          const left = (caption.startTime / videoDuration) * 100;
          const width = ((caption.endTime - caption.startTime) / videoDuration) * 100;

          return (
            <div
              key={caption.id}
              className="absolute h-full bg-blue-500/30 border-l border-r border-blue-500"
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              title={caption.word}
            />
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
          style={{
            left: `${(currentTime / videoDuration) * 100}%`,
          }}
        >
          <div className="absolute top-0 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Time Display */}
      <div className="flex justify-between mt-2 text-sm text-gray-400">
        <span>{formatTimeSimple(currentTime)}</span>
        <span>{formatTimeSimple(videoDuration)}</span>
      </div>
    </div>
  );
}
