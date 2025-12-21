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
  // Default: centered horizontally, near bottom of video (like traditional subtitles)
  const x = (videoWidth - textSize.width) / 2;
  // Position at 85% of video height (near bottom, with some margin)
  const y = videoHeight * 0.85 - textSize.height;

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

export interface Sentence {
  id: string;
  text: string;
  captions: Caption[];
  startTime: number;
  endTime: number;
}

export function groupCaptionsIntoSentences(captions: Caption[]): Sentence[] {
  const sentences: Sentence[] = [];
  let currentSentence: Caption[] = [];

  captions.forEach((caption, index) => {
    currentSentence.push(caption);

    // Check if this word ends a sentence
    const endsWithPunctuation = /[.!?]$/.test(caption.word.trim());
    const nextCaption = captions[index + 1];
    const hasLongPause = nextCaption && (nextCaption.startTime - caption.endTime) > 0.5; // 500ms pause
    const isLastWord = index === captions.length - 1;

    if (endsWithPunctuation || hasLongPause || isLastWord) {
      // Create sentence from current group
      const text = currentSentence.map(c => c.word).join(' ');
      const startTime = currentSentence[0].startTime;
      const endTime = currentSentence[currentSentence.length - 1].endTime;

      sentences.push({
        id: `sentence-${sentences.length}`,
        text,
        captions: [...currentSentence],
        startTime,
        endTime
      });

      currentSentence = [];
    }
  });

  return sentences;
}
