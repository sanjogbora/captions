// Core caption data structure

export interface Caption {
  id: string;                    // Unique identifier
  word: string;                  // The actual word/text
  startTime: number;            // Start timestamp (seconds)
  endTime: number;              // End timestamp (seconds)
  position: Position;           // X, Y coordinates
  size: Size;                   // Width, height
  style: CaptionStyle;         // Font, color, etc.
  groupId: string | null;      // If grouped with other words
  isGrouped: boolean;          // Whether part of a group
  zIndex: number;              // Stacking order
}

export interface Position {
  x: number;                    // Pixels from left (0-1920)
  y: number;                    // Pixels from top (0-1080)
  alignment: 'left' | 'center' | 'right';
}

export interface Size {
  width: number;               // Calculated from font size
  height: number;              // Calculated from font size
}

export interface CaptionStyle {
  templateId: string;          // Reference to style template
  fontSize: number;            // In pixels
  fontFamily: string;
  color: string;               // Hex color
  strokeColor: string | null;
  strokeWidth: number;
  backgroundColor: string | null;
  backgroundOpacity: number;
  animation: AnimationType;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  textShadow: string | null;
  rotation: number;            // Degrees
}

export type AnimationType =
  | 'none'
  | 'fade'
  | 'pop'
  | 'slide_up'
  | 'slide_down'
  | 'bounce'
  | 'typewriter';

export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  style: Partial<CaptionStyle>;
  previewImage?: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Project {
  id: string;
  videoUrl: string;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  transcript: TranscriptWord[];
  captions: Caption[];
  templates: StyleTemplate[];
  currentTemplate: string;
  createdAt: Date;
  updatedAt: Date;
}
