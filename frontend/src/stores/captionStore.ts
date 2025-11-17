import { create } from 'zustand';
import { Caption, CaptionStyle } from '../types/caption.types';
import { v4 as uuidv4 } from 'uuid';

interface CaptionState {
  // Data
  captions: Caption[];
  selectedCaptionIds: string[];
  history: Caption[][];
  historyIndex: number;

  // Computed
  visibleCaptions: (currentTime: number) => Caption[];
  getSelectedCaptions: () => Caption[];

  // Actions
  setCaptions: (captions: Caption[]) => void;
  addCaption: (caption: Caption) => void;
  updateCaptionPosition: (id: string, position: Partial<Caption['position']>) => void;
  updateCaptionStyle: (id: string, style: Partial<CaptionStyle>) => void;
  selectCaption: (id: string, multiSelect: boolean) => void;
  deselectAll: () => void;
  groupSelectedCaptions: () => void;
  ungroupSelectedCaptions: () => void;
  deleteSelectedCaptions: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: () => void;
}

export const useCaptionStore = create<CaptionState>((set, get) => ({
  // Initial state
  captions: [],
  selectedCaptionIds: [],
  history: [],
  historyIndex: -1,

  // Computed values
  visibleCaptions: (currentTime: number) => {
    return get().captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );
  },

  getSelectedCaptions: () => {
    const { captions, selectedCaptionIds } = get();
    return captions.filter(c => selectedCaptionIds.includes(c.id));
  },

  // Actions
  setCaptions: (captions) => {
    set({ captions });
    get().saveToHistory();
  },

  addCaption: (caption) => {
    set(state => ({
      captions: [...state.captions, caption]
    }));
    get().saveToHistory();
  },

  updateCaptionPosition: (id, newPosition) => {
    set(state => {
      const caption = state.captions.find(c => c.id === id);
      if (!caption) return state;

      return {
        captions: state.captions.map(c => {
          // Update the dragged caption
          if (c.id === id) {
            return {
              ...c,
              position: { ...c.position, ...newPosition }
            };
          }
          // Update grouped captions
          if (c.isGrouped && c.groupId === caption.groupId && c.groupId !== null) {
            return {
              ...c,
              position: { ...c.position, ...newPosition }
            };
          }
          return c;
        })
      };
    });
    get().saveToHistory();
  },

  updateCaptionStyle: (id, newStyle) => {
    set(state => ({
      captions: state.captions.map(caption =>
        caption.id === id
          ? { ...caption, style: { ...caption.style, ...newStyle } }
          : caption
      )
    }));
    get().saveToHistory();
  },

  selectCaption: (id, multiSelect) => {
    set(state => {
      if (multiSelect) {
        // Add to selection
        const isAlreadySelected = state.selectedCaptionIds.includes(id);
        if (isAlreadySelected) {
          return {
            selectedCaptionIds: state.selectedCaptionIds.filter(cid => cid !== id)
          };
        }
        return {
          selectedCaptionIds: [...state.selectedCaptionIds, id]
        };
      } else {
        // Replace selection
        return {
          selectedCaptionIds: [id]
        };
      }
    });
  },

  deselectAll: () => {
    set({ selectedCaptionIds: [] });
  },

  groupSelectedCaptions: () => {
    const groupId = uuidv4();
    set(state => ({
      captions: state.captions.map(caption =>
        state.selectedCaptionIds.includes(caption.id)
          ? { ...caption, isGrouped: true, groupId }
          : caption
      )
    }));
    get().saveToHistory();
  },

  ungroupSelectedCaptions: () => {
    set(state => ({
      captions: state.captions.map(caption =>
        state.selectedCaptionIds.includes(caption.id)
          ? { ...caption, isGrouped: false, groupId: null }
          : caption
      )
    }));
    get().saveToHistory();
  },

  deleteSelectedCaptions: () => {
    set(state => ({
      captions: state.captions.filter(
        caption => !state.selectedCaptionIds.includes(caption.id)
      ),
      selectedCaptionIds: []
    }));
    get().saveToHistory();
  },

  saveToHistory: () => {
    set(state => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.captions]);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        captions: history[historyIndex - 1],
        historyIndex: historyIndex - 1
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        captions: history[historyIndex + 1],
        historyIndex: historyIndex + 1
      });
    }
  },

  get canUndo() {
    return get().historyIndex > 0;
  },

  get canRedo() {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },
}));
