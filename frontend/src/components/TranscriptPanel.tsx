import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';
import { formatTime } from '../utils/captionUtils';

export default function TranscriptPanel() {
  const { captions, selectCaption, selectedCaptionIds } = useCaptionStore();
  const { currentTime, setCurrentTime } = useUIStore();

  if (captions.length === 0) {
    return (
      <div className="w-80 bg-gray-900 text-white overflow-y-auto p-4">
        <h3 className="text-lg font-bold mb-4">Transcript</h3>
        <p className="text-sm text-gray-400">
          No transcript available. Upload and transcribe a video to see the transcript.
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900 text-white overflow-y-auto">
      <div className="p-4">
        <h3 className="text-lg font-bold mb-4">Transcript</h3>

        <div className="space-y-1">
          {captions.map(caption => {
            const isActive = currentTime >= caption.startTime && currentTime <= caption.endTime;
            const isSelected = selectedCaptionIds.includes(caption.id);

            return (
              <div
                key={caption.id}
                className={`
                  p-2 rounded cursor-pointer transition-colors
                  ${isActive ? 'bg-blue-600' : ''}
                  ${isSelected ? 'ring-2 ring-blue-400' : ''}
                  ${!isActive && !isSelected ? 'hover:bg-gray-800' : ''}
                `}
                onClick={(e) => {
                  // Jump to this word's time
                  setCurrentTime(caption.startTime);

                  // Select the word
                  if (e.shiftKey) {
                    selectCaption(caption.id, true);
                  } else {
                    selectCaption(caption.id, false);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {formatTime(caption.startTime)}
                  </span>
                  <span className={`text-sm ${isActive ? 'font-bold' : ''}`}>
                    {caption.word}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
