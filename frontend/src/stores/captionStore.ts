import { create } from 'zustand';
import { Caption, CaptionStyle } from '../types/caption.types';
import { groupCaptionsIntoSentences } from '../utils/captionUtils';
import { v4 as uuidv4 } from 'uuid';

interface CaptionState {
  // Data
  captions: Caption[];
  selectedCaptionIds: string[];
  lastSelectedIndex: number;
  history: Caption[][];
  historyIndex: number;

  // Computed
  visibleCaptions: (currentTime: number) => Caption[];
  getVisibleCaptionsInSentenceMode: (currentTime: number) => Caption[];
  getSelectedCaptions: () => Caption[];
  areSelectedCaptionsAdjacent: () => boolean;

  // Actions
  setCaptions: (captions: Caption[]) => void;
  addCaption: (caption: Caption) => void;
  updateCaptionPosition: (id: string, position: Partial<Caption['position']>) => void;
  updateCaptionStyle: (id: string, style: Partial<CaptionStyle>) => void;
  updateCaptionTiming: (id: string, startTime?: number, endTime?: number, skipHistory?: boolean) => void;
  updateCaptionText: (id: string, text: string) => void;
  mergeSelectedCaptions: () => void;
  extendSelectedCaptionsToTarget: (targetId: string) => void;
  selectCaption: (id: string, mode: 'single' | 'toggle' | 'range') => void;
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
  lastSelectedIndex: -1,
  history: [],
  historyIndex: -1,

  // Computed values
  visibleCaptions: (currentTime: number) => {
    return get().captions.filter(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    );
  },

  getVisibleCaptionsInSentenceMode: (currentTime: number) => {
    const { captions } = get();
    const sentences = groupCaptionsIntoSentences(captions);

    // Find the active sentence (where currentTime is within sentence bounds)
    const activeSentence = sentences.find(
      s => currentTime >= s.startTime && currentTime <= s.endTime
    );

    // Return all captions in the active sentence
    return activeSentence ? activeSentence.captions : [];
  },

  getSelectedCaptions: () => {
    const { captions, selectedCaptionIds } = get();
    return captions.filter(c => selectedCaptionIds.includes(c.id));
  },

  areSelectedCaptionsAdjacent: () => {
    const { captions, selectedCaptionIds } = get();
    if (selectedCaptionIds.length <= 1) return true;

    // Find indices of selected captions
    const selectedIndices = selectedCaptionIds
      .map(id => captions.findIndex(c => c.id === id))
      .filter(idx => idx !== -1)
      .sort((a, b) => a - b);

    // Check if they are consecutive
    for (let i = 1; i < selectedIndices.length; i++) {
      if (selectedIndices[i] !== selectedIndices[i - 1] + 1) {
        return false;
      }
    }
    return true;
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

  updateCaptionTiming: (id, startTime, endTime, skipHistory = false) => {
    set(state => ({
      captions: state.captions.map(caption =>
        caption.id === id
          ? {
              ...caption,
              ...(startTime !== undefined && { startTime }),
              ...(endTime !== undefined && { endTime })
            }
          : caption
      )
    }));
    if (!skipHistory) {
      get().saveToHistory();
    }
  },

  updateCaptionText: (id, text) => {
    set(state => ({
      captions: state.captions.map(caption =>
        caption.id === id
          ? { ...caption, word: text }
          : caption
      )
    }));
    get().saveToHistory();
  },

  mergeSelectedCaptions: () => {
    const { captions, selectedCaptionIds } = get();

    if (selectedCaptionIds.length < 2) return;

    // Get selected captions in order
    const selectedCaptions = captions.filter(c => selectedCaptionIds.includes(c.id));
    selectedCaptions.sort((a, b) => a.startTime - b.startTime);

    // Create merged caption
    const firstCaption = selectedCaptions[0];
    const lastCaption = selectedCaptions[selectedCaptions.length - 1];
    const mergedText = selectedCaptions.map(c => c.word).join(' ');

    const mergedCaption: Caption = {
      ...firstCaption,
      id: uuidv4(),
      word: mergedText,
      startTime: firstCaption.startTime,
      endTime: lastCaption.endTime,
      isGrouped: false,
      groupId: null,
    };

    // Remove selected captions and add merged one
    set(state => ({
      captions: [
        ...state.captions.filter(c => !selectedCaptionIds.includes(c.id)),
        mergedCaption
      ].sort((a, b) => a.startTime - b.startTime),
      selectedCaptionIds: [mergedCaption.id]
    }));
    get().saveToHistory();
  },

  extendSelectedCaptionsToTarget: (targetId) => {
    const { captions, selectedCaptionIds } = get();
    const targetCaption = captions.find(c => c.id === targetId);

    if (!targetCaption || selectedCaptionIds.length === 0) return;

    set(state => ({
      captions: state.captions.map(caption =>
        state.selectedCaptionIds.includes(caption.id)
          ? { ...caption, endTime: targetCaption.endTime }
          : caption
      )
    }));
    get().saveToHistory();
  },

  selectCaption: (id, mode) => {
    set(state => {
      const clickedIndex = state.captions.findIndex(c => c.id === id);
      if (clickedIndex === -1) return state;

      if (mode === 'toggle') {
        // Ctrl/Cmd+Click: Toggle individual item
        const isAlreadySelected = state.selectedCaptionIds.includes(id);
        if (isAlreadySelected) {
          return {
            selectedCaptionIds: state.selectedCaptionIds.filter(cid => cid !== id),
            lastSelectedIndex: state.selectedCaptionIds.length > 1 ? state.lastSelectedIndex : clickedIndex
          };
        }
        return {
          selectedCaptionIds: [...state.selectedCaptionIds, id],
          lastSelectedIndex: clickedIndex
        };
      } else if (mode === 'range') {
        // Shift+Click: Select range from last selected to clicked
        if (state.lastSelectedIndex === -1 || state.selectedCaptionIds.length === 0) {
          return {
            selectedCaptionIds: [id],
            lastSelectedIndex: clickedIndex
          };
        }

        const startIndex = Math.min(state.lastSelectedIndex, clickedIndex);
        const endIndex = Math.max(state.lastSelectedIndex, clickedIndex);

        const rangeIds = state.captions
          .slice(startIndex, endIndex + 1)
          .map(c => c.id);

        return {
          selectedCaptionIds: rangeIds,
          lastSelectedIndex: state.lastSelectedIndex // Keep the anchor point
        };
      } else {
        // Normal click: Replace selection
        return {
          selectedCaptionIds: [id],
          lastSelectedIndex: clickedIndex
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
