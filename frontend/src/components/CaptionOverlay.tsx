import { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Caption } from '../types/caption.types';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';

interface CaptionOverlayProps {
  captions: Caption[];
  videoWidth: number;
  videoHeight: number;
  sentenceMode?: boolean;
}

export default function CaptionOverlay({
  captions,
  videoWidth,
  videoHeight,
  sentenceMode = false
}: CaptionOverlayProps) {
  const { updateCaptionPosition, updateCaptionStyle, selectedCaptionIds, selectCaption, extendSelectedCaptionsToTarget, updateCaptionText } = useCaptionStore();
  const { isTargetMode, setTargetMode } = useUIStore();
  const [resizing, setResizing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [captionSizes, setCaptionSizes] = useState<Map<string, { width: number; height: number }>>(new Map());
  const captionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Reference size used when creating captions
  const REFERENCE_WIDTH = 800;
  const REFERENCE_HEIGHT = 450;

  // Measure actual caption sizes after render
  useEffect(() => {
    const newSizes = new Map<string, { width: number; height: number }>();
    captionRefs.current.forEach((element, id) => {
      if (element) {
        const rect = element.getBoundingClientRect();
        newSizes.set(id, { width: rect.width, height: rect.height });
      }
    });
    setCaptionSizes(newSizes);
  }, [captions, videoWidth, videoHeight]); // Remeasure when captions or video size changes

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

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // In sentence mode, combine all captions into one
  if (sentenceMode && captions.length > 0) {
    const firstCaption = captions[0];
    const sentenceText = captions.map(c => c.word).join(' ');
    const scaleX = videoWidth / REFERENCE_WIDTH;
    const scaleY = videoHeight / REFERENCE_HEIGHT;
    const scaledX = firstCaption.position.x * scaleX;
    const scaledY = firstCaption.position.y * scaleY;
    const scaleFactor = Math.min(scaleX, scaleY); // Use uniform scale for fonts

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute pointer-events-auto"
          style={{
            left: `${scaledX}px`,
            top: `${scaledY}px`,
            fontSize: `${firstCaption.style.fontSize * scaleFactor}px`,
            fontFamily: firstCaption.style.fontFamily,
            color: firstCaption.style.color,
            fontWeight: firstCaption.style.fontWeight,
            textTransform: firstCaption.style.textTransform,
            letterSpacing: `${firstCaption.style.letterSpacing * scaleFactor}px`,
            textShadow: firstCaption.style.textShadow || undefined,
            transform: `rotate(${firstCaption.style.rotation}deg)`,
            WebkitTextStroke: firstCaption.style.strokeWidth
              ? `${firstCaption.style.strokeWidth * scaleFactor}px ${firstCaption.style.strokeColor}`
              : 'none',
            backgroundColor: firstCaption.style.backgroundColor
              ? `${firstCaption.style.backgroundColor}${Math.round(firstCaption.style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
              : 'transparent',
            padding: firstCaption.style.backgroundColor ? `${8 * scaleFactor}px ${16 * scaleFactor}px` : '0',
            borderRadius: firstCaption.style.backgroundColor ? `${4 * scaleFactor}px` : '0',
            whiteSpace: 'nowrap',
            zIndex: firstCaption.zIndex,
            display: 'inline-block',
          }}
        >
          {sentenceText}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {captions.map(caption => {
        // Scale position from reference size to actual video size
        const scaleX = videoWidth / REFERENCE_WIDTH;
        const scaleY = videoHeight / REFERENCE_HEIGHT;
        const scaleFactor = Math.min(scaleX, scaleY); // Use uniform scale for fonts

        const scaledX = caption.position.x * scaleX;
        const scaledY = caption.position.y * scaleY;

        // Use measured size if available, otherwise estimate with scaled fontSize
        const measuredSize = captionSizes.get(caption.id);
        const scaledFontSize = caption.style.fontSize * scaleFactor;
        const captionWidth = measuredSize?.width || caption.word.length * scaledFontSize * 0.6;
        const captionHeight = measuredSize?.height || scaledFontSize * 1.2;

        // Calculate bounds to prevent captions from going outside
        const bounds = {
          left: 0,
          top: 0,
          right: Math.max(0, videoWidth - captionWidth),
          bottom: Math.max(0, videoHeight - captionHeight)
        };

        return (
          <Draggable
            key={caption.id}
            position={{ x: scaledX, y: scaledY }}
            onStop={(_e, data) => {
              // Get the actual element to measure its current size
              const element = captionRefs.current.get(caption.id);
              let actualWidth = captionWidth;
              let actualHeight = captionHeight;

              if (element) {
                const rect = element.getBoundingClientRect();
                const containerRect = element.parentElement?.parentElement?.getBoundingClientRect();
                if (containerRect) {
                  actualWidth = rect.width;
                  actualHeight = rect.height;
                }
              }

              // Recalculate bounds with actual measured size
              const safeBounds = {
                left: 0,
                top: 0,
                right: Math.max(0, videoWidth - actualWidth),
                bottom: Math.max(0, videoHeight - actualHeight)
              };

              // Constrain to bounds before storing
              const constrainedX = Math.max(safeBounds.left, Math.min(data.x, safeBounds.right));
              const constrainedY = Math.max(safeBounds.top, Math.min(data.y, safeBounds.bottom));

              // Store position in reference coordinates
              updateCaptionPosition(caption.id, {
                x: constrainedX / scaleX,
                y: constrainedY / scaleY
              });
            }}
            bounds={bounds}
            disabled={resizing === caption.id}
          >
            <div
              ref={(el) => {
                if (el) {
                  captionRefs.current.set(caption.id, el);
                } else {
                  captionRefs.current.delete(caption.id);
                }
              }}
              className={`
                absolute pointer-events-auto
                ${selectedCaptionIds.includes(caption.id) ? 'ring-2 ring-blue-500' : ''}
                ${isTargetMode ? 'cursor-crosshair' : resizing === caption.id ? 'cursor-nwse-resize' : 'cursor-move'}
              `}
              onClick={(e) => {
                e.stopPropagation();

                // Handle target mode
                if (isTargetMode) {
                  extendSelectedCaptionsToTarget(caption.id);
                  setTargetMode(false);
                  return;
                }

                // Windows Explorer-style selection
                if (e.shiftKey) {
                  selectCaption(caption.id, 'range'); // Shift: Select range
                } else if (e.ctrlKey || e.metaKey) {
                  selectCaption(caption.id, 'toggle'); // Ctrl/Cmd: Toggle
                } else {
                  selectCaption(caption.id, 'single'); // Normal: Single select
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEditing(caption.id, caption.word);
              }}
              style={{
                fontSize: `${scaledFontSize}px`,
                fontFamily: caption.style.fontFamily,
                color: caption.style.color,
                fontWeight: caption.style.fontWeight,
                textTransform: caption.style.textTransform,
                letterSpacing: `${caption.style.letterSpacing * scaleFactor}px`,
                textShadow: caption.style.textShadow || undefined,
                transform: `rotate(${caption.style.rotation}deg)`,
                WebkitTextStroke: caption.style.strokeWidth
                  ? `${caption.style.strokeWidth * scaleFactor}px ${caption.style.strokeColor}`
                  : 'none',
                backgroundColor: caption.style.backgroundColor
                  ? `${caption.style.backgroundColor}${Math.round(caption.style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                  : 'transparent',
                padding: caption.style.backgroundColor ? `${8 * scaleFactor}px ${16 * scaleFactor}px` : '0',
                borderRadius: caption.style.backgroundColor ? `${4 * scaleFactor}px` : '0',
                whiteSpace: 'nowrap',
                zIndex: caption.zIndex,
                display: 'inline-block',
                width: 'auto',
                maxWidth: 'none',
              }}
            >
              {editingId === caption.id ? (
                <input
                  type="text"
                  className="bg-transparent outline-none border-2 border-blue-500 px-1"
                  style={{
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    color: 'inherit',
                    fontWeight: 'inherit',
                    width: `${Math.max(editText.length * scaledFontSize * 0.6, scaledFontSize * 2)}px`,
                  }}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEdit}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              ) : (
                caption.word
              )}

              {/* Resize Handle */}
              {selectedCaptionIds.includes(caption.id) && (
                <div
                  className="absolute w-3 h-3 bg-blue-500 cursor-nwse-resize rounded-full"
                  style={{
                    bottom: '-6px',
                    right: '-6px',
                    pointerEvents: 'auto'
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setResizing(caption.id);
                    const startY = e.clientY;
                    const startFontSize = caption.style.fontSize;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      moveEvent.preventDefault();
                      const deltaY = moveEvent.clientY - startY; // down = increase, up = decrease
                      const newFontSize = Math.max(12, Math.min(120, startFontSize + deltaY));
                      updateCaptionStyle(caption.id, { fontSize: newFontSize });
                    };

                    const handleMouseUp = () => {
                      setResizing(null);
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
              )}
            </div>
          </Draggable>
        );
      })}
    </div>
  );
}
