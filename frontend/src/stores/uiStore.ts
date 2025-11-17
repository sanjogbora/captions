import { create } from 'zustand';
import { CaptionStyle } from '../types/caption.types';

interface StylePreset {
  id: number;
  name: string;
  style: Partial<CaptionStyle>;
}

interface UIState {
  // Video control
  currentTime: number;
  videoDuration: number;
  isPlaying: boolean;
  videoUrl: string | null;

  // UI state
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  // View mode
  viewMode: 'edit' | 'frame' | 'timeline';

  // Style presets
  stylePresets: StylePreset[];

  // Actions
  setCurrentTime: (time: number) => void;
  setVideoDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setVideoUrl: (url: string) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setViewMode: (mode: 'edit' | 'frame' | 'timeline') => void;
  skip: (seconds: number) => void;
  saveStylePreset: (slot: number, name: string, style: Partial<CaptionStyle>) => void;
  getStylePreset: (slot: number) => StylePreset | undefined;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  currentTime: 0,
  videoDuration: 0,
  isPlaying: false,
  videoUrl: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
  viewMode: 'edit',
  stylePresets: [],

  // Actions
  setCurrentTime: (time) => {
    const { videoDuration } = get();
    const clampedTime = Math.max(0, Math.min(time, videoDuration));
    set({ currentTime: clampedTime });
  },

  setVideoDuration: (duration) => {
    set({ videoDuration: duration });
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }));
  },

  setVideoUrl: (url) => {
    set({ videoUrl: url });
  },

  setLoading: (loading, message = '') => {
    set({ isLoading: loading, loadingMessage: message });
  },

  setError: (error) => {
    set({ error });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  skip: (seconds) => {
    const { currentTime, videoDuration } = get();
    const newTime = Math.max(0, Math.min(currentTime + seconds, videoDuration));
    set({ currentTime: newTime });
  },

  saveStylePreset: (slot, name, style) => {
    set(state => {
      const existingIndex = state.stylePresets.findIndex(p => p.id === slot);
      const newPreset = { id: slot, name, style };

      if (existingIndex >= 0) {
        // Update existing preset
        const newPresets = [...state.stylePresets];
        newPresets[existingIndex] = newPreset;
        return { stylePresets: newPresets };
      } else {
        // Add new preset
        return { stylePresets: [...state.stylePresets, newPreset] };
      }
    });
  },

  getStylePreset: (slot) => {
    return get().stylePresets.find(p => p.id === slot);
  },
}));
