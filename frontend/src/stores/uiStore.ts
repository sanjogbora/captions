import { create } from 'zustand';

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
}));
