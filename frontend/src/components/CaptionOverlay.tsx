import Draggable from 'react-draggable';
import { Caption } from '../types/caption.types';
import { useCaptionStore } from '../stores/captionStore';

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
  const { updateCaptionPosition, selectedCaptionIds, selectCaption } = useCaptionStore();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {captions.map(caption => (
        <Draggable
          key={caption.id}
          position={{ x: caption.position.x, y: caption.position.y }}
          onStop={(e, data) => {
            updateCaptionPosition(caption.id, {
              x: data.x,
              y: data.y
            });
          }}
          bounds="parent"
        >
          <div
            className={`
              absolute pointer-events-auto cursor-move
              ${selectedCaptionIds.includes(caption.id) ? 'ring-2 ring-blue-500' : ''}
            `}
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey) {
                selectCaption(caption.id, true); // Multi-select
              } else {
                selectCaption(caption.id, false); // Single select
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
            }}
          >
            {caption.word}
          </div>
        </Draggable>
      ))}
    </div>
  );
}
