import { useMemo, useState } from 'react';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';
import { formatTime, groupCaptionsIntoSentences } from '../utils/captionUtils';

export default function TranscriptPanel() {
  const { captions, selectCaption, selectedCaptionIds, extendSelectedCaptionsToTarget, updateCaptionText } = useCaptionStore();
  const { currentTime, setCurrentTime, isTargetMode, setTargetMode, transcriptMode, setTranscriptMode } = useUIStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Group captions into sentences
  const sentences = useMemo(() => groupCaptionsIntoSentences(captions), [captions]);

  const startEditing = (captionId: string, currentText: string) => {
    setEditingId(captionId);
    setEditText(currentText);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      updateCaptionText(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

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
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-2">Transcript</h3>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setTranscriptMode('word')}
              className={`flex-1 px-3 py-1 text-xs rounded ${
                transcriptMode === 'word'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Word Mode
            </button>
            <button
              onClick={() => setTranscriptMode('sentence')}
              className={`flex-1 px-3 py-1 text-xs rounded ${
                transcriptMode === 'sentence'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sentence Mode
            </button>
          </div>

          {/* Target Mode Indicator */}
          {isTargetMode && (
            <div className="text-xs bg-yellow-600 px-2 py-1 rounded text-center">
              Target Mode (ESC to cancel)
            </div>
          )}
        </div>

        <div className="space-y-1">
          {transcriptMode === 'word' ? (
            // Word Mode: Show individual words
            captions.map(caption => {
              const isActive = currentTime >= caption.startTime && currentTime <= caption.endTime;
              const isSelected = selectedCaptionIds.includes(caption.id);

            return (
              <div
                key={caption.id}
                className={`
                  p-2 rounded cursor-pointer transition-colors
                  ${isActive && !isSelected ? 'bg-blue-900/40' : ''}
                  ${isSelected ? 'bg-blue-600 ring-2 ring-blue-400' : ''}
                  ${!isActive && !isSelected ? 'hover:bg-gray-800' : ''}
                `}
                onClick={(e) => {
                  // Handle target mode
                  if (isTargetMode) {
                    extendSelectedCaptionsToTarget(caption.id);
                    setTargetMode(false);
                    return;
                  }

                  // Determine selection mode
                  let mode: 'single' | 'toggle' | 'range' = 'single';
                  if (e.shiftKey) {
                    mode = 'range';
                  } else if (e.ctrlKey || e.metaKey) {
                    mode = 'toggle';
                  }

                  // Select the word with the appropriate mode
                  selectCaption(caption.id, mode);

                  // Jump to this word's time (after selection to avoid confusion)
                  setCurrentTime(caption.startTime);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing(caption.id, caption.word);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {formatTime(caption.startTime)}
                  </span>
                  {editingId === caption.id ? (
                    <input
                      type="text"
                      className="flex-1 ml-2 px-2 py-1 text-sm bg-gray-800 text-white border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className={`text-sm ${isActive ? 'font-bold' : ''}`}>
                      {caption.word}
                    </span>
                  )}
                </div>
              </div>
            );
            })
          ) : (
            // Sentence Mode: Show sentences
            sentences.map(sentence => {
              const isActive = currentTime >= sentence.startTime && currentTime <= sentence.endTime;
              const sentenceSelected = sentence.captions.every(c => selectedCaptionIds.includes(c.id));
              const someSelected = sentence.captions.some(c => selectedCaptionIds.includes(c.id));

              return (
                <div
                  key={sentence.id}
                  className={`
                    p-2 rounded cursor-pointer transition-colors
                    ${isActive && !sentenceSelected ? 'bg-blue-900/40' : ''}
                    ${sentenceSelected ? 'bg-blue-600 ring-2 ring-blue-400' : someSelected ? 'bg-blue-700/50' : ''}
                    ${!isActive && !sentenceSelected && !someSelected ? 'hover:bg-gray-800' : ''}
                  `}
                  onClick={(e) => {
                    // Handle target mode
                    if (isTargetMode) {
                      // Use last word of sentence as target
                      const targetId = sentence.captions[sentence.captions.length - 1].id;
                      extendSelectedCaptionsToTarget(targetId);
                      setTargetMode(false);
                      return;
                    }

                    // In sentence mode, clicking selects all words in the sentence
                    const firstCaptionId = sentence.captions[0].id;

                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      // Multi-select: add all sentence words
                      sentence.captions.forEach(cap => {
                        if (!selectedCaptionIds.includes(cap.id)) {
                          selectCaption(cap.id, 'toggle');
                        }
                      });
                    } else {
                      // Normal click: select first word, then range to last
                      selectCaption(firstCaptionId, 'single');
                      if (sentence.captions.length > 1) {
                        const lastCaptionId = sentence.captions[sentence.captions.length - 1].id;
                        selectCaption(lastCaptionId, 'range');
                      }
                    }

                    // Jump to sentence start
                    setCurrentTime(sentence.startTime);
                  }}
                >
                  <div className="text-xs text-gray-400 mb-1">
                    {formatTime(sentence.startTime)} - {formatTime(sentence.endTime)}
                  </div>
                  <div className={`text-sm ${isActive ? 'font-bold' : ''}`}>
                    {sentence.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
