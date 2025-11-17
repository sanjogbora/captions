import { useEffect } from 'react';
import { useCaptionStore } from '../stores/captionStore';
import { useVideoControl } from './useVideoControl';

export function useKeyboardShortcuts() {
  const {
    undo,
    redo,
    deleteSelectedCaptions,
    groupSelectedCaptions,
    ungroupSelectedCaptions,
    getSelectedCaptions
  } = useCaptionStore();

  const { togglePlay, skip } = useVideoControl();

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

      // Group
      if (cmdOrCtrl && e.key === 'g') {
        e.preventDefault();
        const selected = getSelectedCaptions();
        if (selected.length > 1) {
          groupSelectedCaptions();
        } else if (selected.length === 1 && selected[0].isGrouped) {
          ungroupSelectedCaptions();
        }
      }

      // Skip forward/backward
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        skip(e.shiftKey ? 5 : 1); // 5 seconds if shift, 1 second otherwise
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skip(e.shiftKey ? -5 : -1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelectedCaptions, groupSelectedCaptions, ungroupSelectedCaptions, getSelectedCaptions, togglePlay, skip]);
}
