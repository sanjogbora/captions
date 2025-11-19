import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  transcriptMode: 'word' | 'sentence'; // Word-by-word or sentence view
  timelineZoom: number; // Timeline zoom level (1 = normal, 2 = 2x zoomed in)

  // Interaction modes
  isTargetMode: boolean; // For "extend until word X" feature
  isClickToPlaceMode: boolean; // For click-to-place mode
  clickToPlaceIndex: number; // Current word index in click-to-place mode
  pendingPlacement: { x: number; y: number } | null; // Waiting for style key after click

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
  setTranscriptMode: (mode: 'word' | 'sentence') => void;
  setTargetMode: (enabled: boolean) => void;
  setTimelineZoom: (zoom: number) => void;
  setClickToPlaceMode: (enabled: boolean) => void;
  setClickToPlaceIndex: (index: number) => void;
  setPendingPlacement: (position: { x: number; y: number } | null) => void;
  skip: (seconds: number) => void;
  saveStylePreset: (slot: number, name: string, style: Partial<CaptionStyle>) => void;
  deleteStylePreset: (slot: number) => void;
  getStylePreset: (slot: number) => StylePreset | undefined;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTime: 0,
      videoDuration: 0,
      isPlaying: false,
      videoUrl: null,
      isLoading: false,
      loadingMessage: '',
      error: null,
      viewMode: 'edit',
      transcriptMode: 'word',
      timelineZoom: 1,
      isTargetMode: false,
      isClickToPlaceMode: false,
      clickToPlaceIndex: 0,
      pendingPlacement: null,
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

  setTranscriptMode: (mode) => {
    set({ transcriptMode: mode });
  },

  setTargetMode: (enabled) => {
    set({ isTargetMode: enabled });
  },

  setTimelineZoom: (zoom) => {
    set({ timelineZoom: Math.max(0.5, Math.min(zoom, 10)) }); // Clamp between 0.5x and 10x
  },

  setClickToPlaceMode: (enabled) => {
    set({
      isClickToPlaceMode: enabled,
      clickToPlaceIndex: enabled ? 0 : 0,
      pendingPlacement: null
    });
  },

  setClickToPlaceIndex: (index) => {
    set({ clickToPlaceIndex: index });
  },

  setPendingPlacement: (position) => {
    set({ pendingPlacement: position });
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

  deleteStylePreset: (slot) => {
    set(state => ({
      stylePresets: state.stylePresets.filter(p => p.id !== slot)
    }));
  },

  getStylePreset: (slot) => {
    return get().stylePresets.find(p => p.id === slot);
  },
    }),
    {
      name: 'fastcaption-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ stylePresets: state.stylePresets }),
    }
  )
);
