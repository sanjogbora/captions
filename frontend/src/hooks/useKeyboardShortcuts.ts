import { useEffect } from 'react';
import { useCaptionStore } from '../stores/captionStore';
import { useVideoControl } from './useVideoControl';
import { useUIStore } from '../stores/uiStore';

export function useKeyboardShortcuts() {
  const {
    captions,
    selectedCaptionIds,
    undo,
    redo,
    deleteSelectedCaptions,
    groupSelectedCaptions,
    ungroupSelectedCaptions,
    getSelectedCaptions,
    selectCaption,
    areSelectedCaptionsAdjacent,
    updateCaptionStyle
  } = useCaptionStore();

  const { togglePlay } = useVideoControl();
  const { currentTime, setCurrentTime, getStylePreset, isTargetMode, setTargetMode } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }

      // Undo
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo
      if (cmdOrCtrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }

      // Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteSelectedCaptions();
      }

      // Group/Ungroup
      if (cmdOrCtrl && e.key === 'g') {
        e.preventDefault();
        const selected = getSelectedCaptions();
        if (selected.length > 1) {
          if (areSelectedCaptionsAdjacent()) {
            groupSelectedCaptions();
          } else {
            console.warn('Cannot group non-adjacent captions');
          }
        } else if (selected.length === 1 && selected[0].isGrouped) {
          ungroupSelectedCaptions();
        }
      }

      // Navigate to next/previous caption with Arrow keys
      if (e.key === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault();
        navigateToNextCaption();
      }
      if (e.key === 'ArrowLeft' && !e.shiftKey) {
        e.preventDefault();
        navigateToPreviousCaption();
      }

      // Apply style presets with number keys (1-9)
      if (/^[1-9]$/.test(e.key) && !cmdOrCtrl && !e.shiftKey) {
        e.preventDefault();
        const slot = parseInt(e.key);
        const preset = getStylePreset(slot);
        if (preset && selectedCaptionIds.length > 0) {
          selectedCaptionIds.forEach(id => {
            updateCaptionStyle(id, preset.style);
          });
        }
      }

      // 'E' key: Enter/Exit target mode for "extend until word X"
      if (e.key.toLowerCase() === 'e' && !cmdOrCtrl && !e.shiftKey) {
        e.preventDefault();
        if (selectedCaptionIds.length > 0) {
          setTargetMode(!isTargetMode);
        }
      }

      // Escape: Cancel target mode
      if (e.key === 'Escape' && isTargetMode) {
        e.preventDefault();
        setTargetMode(false);
      }
    };

    const navigateToNextCaption = () => {
      if (captions.length === 0) return;

      // Find the next caption after current time
      const nextCaption = captions.find(c => c.startTime > currentTime);
      if (nextCaption) {
        setCurrentTime(nextCaption.startTime);
        selectCaption(nextCaption.id, 'single');
      }
    };

    const navigateToPreviousCaption = () => {
      if (captions.length === 0) return;

      // Find the previous caption before current time
      const previousCaption = [...captions]
        .reverse()
        .find(c => c.endTime < currentTime);

      if (previousCaption) {
        setCurrentTime(previousCaption.startTime);
        selectCaption(previousCaption.id, 'single');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    captions,
    currentTime,
    selectedCaptionIds,
    undo,
    redo,
    deleteSelectedCaptions,
    groupSelectedCaptions,
    ungroupSelectedCaptions,
    getSelectedCaptions,
    selectCaption,
    togglePlay,
    setCurrentTime,
    areSelectedCaptionsAdjacent,
    updateCaptionStyle,
    getStylePreset,
    isTargetMode,
    setTargetMode
  ]);
}
