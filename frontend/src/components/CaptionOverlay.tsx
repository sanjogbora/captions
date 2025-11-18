import { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Caption } from '../types/caption.types';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';

interface CaptionOverlayProps {
  captions: Caption[];
  videoWidth: number;
  videoHeight: number;
}

export default function CaptionOverlay({
  captions,
  videoWidth,
  videoHeight
}: CaptionOverlayProps) {
  const { updateCaptionPosition, updateCaptionStyle, selectedCaptionIds, selectCaption, extendSelectedCaptionsToTarget } = useCaptionStore();
  const { isTargetMode, setTargetMode } = useUIStore();
  const [resizing, setResizing] = useState<string | null>(null);
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

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {captions.map(caption => {
        // Scale position from reference size to actual video size
        const scaleX = videoWidth / REFERENCE_WIDTH;
        const scaleY = videoHeight / REFERENCE_HEIGHT;

        const scaledX = caption.position.x * scaleX;
        const scaledY = caption.position.y * scaleY;

        // Use measured size if available, otherwise estimate
        const measuredSize = captionSizes.get(caption.id);
        const captionWidth = measuredSize?.width || caption.word.length * caption.style.fontSize * 0.6;
        const captionHeight = measuredSize?.height || caption.style.fontSize * 1.2;

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
              // Constrain to bounds before storing
              const constrainedX = Math.max(0, Math.min(data.x, bounds.right));
              const constrainedY = Math.max(0, Math.min(data.y, bounds.bottom));

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
              style={{
                fontSize: caption.style.fontSize,
                fontFamily: caption.style.fontFamily,
                color: caption.style.color,
                fontWeight: caption.style.fontWeight,
                textTransform: caption.style.textTransform,
                letterSpacing: caption.style.letterSpacing,
                textShadow: caption.style.textShadow || undefined,
                transform: `rotate(${caption.style.rotation}deg)`,
                WebkitTextStroke: caption.style.strokeWidth
                  ? `${caption.style.strokeWidth}px ${caption.style.strokeColor}`
                  : 'none',
                backgroundColor: caption.style.backgroundColor
                  ? `${caption.style.backgroundColor}${Math.round(caption.style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                  : 'transparent',
                padding: caption.style.backgroundColor ? '8px 16px' : '0',
                borderRadius: caption.style.backgroundColor ? '4px' : '0',
                whiteSpace: 'nowrap',
                zIndex: caption.zIndex,
                display: 'inline-block',
                width: 'auto',
                maxWidth: 'none',
              }}
            >
              {caption.word}

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
                      const deltaY = startY - moveEvent.clientY; // Inverted: up = increase
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
