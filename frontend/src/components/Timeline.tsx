import { useRef, useState } from 'react';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';
import { formatTimeSimple } from '../utils/captionUtils';

export default function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { captions, selectedCaptionIds, updateCaptionTiming, saveToHistory } = useCaptionStore();
  const { currentTime, videoDuration, setCurrentTime } = useUIStore();
  const [dragging, setDragging] = useState<{ id: string; type: 'start' | 'end' | 'move'; initialTime: number } | null>(null);

  const pixelToTime = (pixelX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, pixelX / rect.width));
    return percentage * videoDuration;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || videoDuration === 0 || dragging) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = pixelToTime(x);

    setCurrentTime(newTime);
  };

  const handleDragStart = (e: React.MouseEvent, captionId: string, type: 'start' | 'end' | 'move') => {
    e.stopPropagation();
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = pixelToTime(clickX);

    setDragging({ id: captionId, type, initialTime: clickTime });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentTime = pixelToTime(currentX);

    const caption = captions.find(c => c.id === dragging.id);
    if (!caption) return;

    if (dragging.type === 'start') {
      const newStartTime = Math.max(0, Math.min(currentTime, caption.endTime - 0.1));
      updateCaptionTiming(dragging.id, newStartTime, undefined, true); // Skip history during drag
    } else if (dragging.type === 'end') {
      const newEndTime = Math.max(caption.startTime + 0.1, Math.min(currentTime, videoDuration));
      updateCaptionTiming(dragging.id, undefined, newEndTime, true); // Skip history during drag
    } else if (dragging.type === 'move') {
      const delta = currentTime - dragging.initialTime;
      const duration = caption.endTime - caption.startTime;
      const newStartTime = Math.max(0, Math.min(caption.startTime + delta, videoDuration - duration));
      const newEndTime = newStartTime + duration;
      updateCaptionTiming(dragging.id, newStartTime, newEndTime, true); // Skip history during drag
      setDragging({ ...dragging, initialTime: currentTime });
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      // Save to history once when drag ends
      saveToHistory();
    }
    setDragging(null);
  };

  return (
    <div className="bg-gray-900 p-4">
      {/* Timeline Bar */}
      <div
        ref={timelineRef}
        className="relative h-16 bg-gray-800 rounded cursor-pointer"
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Caption Markers */}
        {videoDuration > 0 && captions.map(caption => {
          const left = (caption.startTime / videoDuration) * 100;
          const width = ((caption.endTime - caption.startTime) / videoDuration) * 100;
          const isSelected = selectedCaptionIds.includes(caption.id);

          return (
            <div
              key={caption.id}
              className={`absolute h-full ${isSelected ? 'bg-blue-500/60' : 'bg-blue-500/30'} border-l border-r border-blue-500`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              title={caption.word}
            >
              {/* Only show edit handles for selected captions */}
              {isSelected && (
                <>
                  {/* Left handle - adjust startTime */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 bg-blue-400 cursor-ew-resize hover:bg-blue-300"
                    onMouseDown={(e) => handleDragStart(e, caption.id, 'start')}
                    title="Drag to adjust start time"
                  />

                  {/* Middle - move entire block */}
                  <div
                    className="absolute left-2 right-2 top-0 bottom-0 cursor-move hover:bg-blue-500/80"
                    onMouseDown={(e) => handleDragStart(e, caption.id, 'move')}
                    title="Drag to move"
                  />

                  {/* Right handle - adjust endTime */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 bg-blue-400 cursor-ew-resize hover:bg-blue-300"
                    onMouseDown={(e) => handleDragStart(e, caption.id, 'end')}
                    title="Drag to adjust end time"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Playhead */}
        {videoDuration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
            style={{
              left: `${(currentTime / videoDuration) * 100}%`,
            }}
          >
            <div className="absolute top-0 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="flex justify-between mt-2 text-sm text-gray-400">
        <span>{formatTimeSimple(currentTime)}</span>
        <span>{formatTimeSimple(videoDuration)}</span>
      </div>
    </div>
  );
}
