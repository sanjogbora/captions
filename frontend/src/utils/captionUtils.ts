import { Caption, Position, Size } from '../types/caption.types';
import { DEFAULT_CAPTION_STYLE } from './styleTemplates';

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function formatTimeSimple(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateTextSize(text: string, fontSize: number): Size {
  // Rough estimation - should use canvas measureText for accuracy
  const avgCharWidth = fontSize * 0.6;
  const width = text.length * avgCharWidth;
  const height = fontSize * 1.2;

  return { width, height };
}

export function getDefaultCaptionPosition(
  videoWidth: number,
  videoHeight: number,
  textSize: Size
): Position {
  // Default: centered position
  const x = (videoWidth - textSize.width) / 2;
  const y = (videoHeight - textSize.height) / 2;

  return {
    x: Math.max(10, Math.min(videoWidth - textSize.width - 10, x)), // Keep within bounds
    y: Math.max(10, Math.min(videoHeight - textSize.height - 10, y)), // Keep within bounds
    alignment: 'center'
  };
}

export function createCaptionFromWord(
  word: string,
  startTime: number,
  endTime: number,
  videoWidth: number,
  videoHeight: number,
  id: string
): Caption {
  const fontSize = DEFAULT_CAPTION_STYLE.fontSize || 36;
  const size = calculateTextSize(word, fontSize);
  const position = getDefaultCaptionPosition(videoWidth, videoHeight, size);

  return {
    id,
    word,
    startTime,
    endTime,
    position,
    size,
    style: { ...DEFAULT_CAPTION_STYLE } as Caption['style'],
    groupId: null,
    isGrouped: false,
    zIndex: 1,
  };
}
