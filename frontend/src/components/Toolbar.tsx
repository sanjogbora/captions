import { useVideoControl } from '../hooks/useVideoControl';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';

export default function Toolbar() {
  const { isPlaying, togglePlay, exportVideo } = useVideoControl();
  const { undo, redo, canUndo, canRedo } = useCaptionStore();
  const { setLoading } = useUIStore();

  const handleExport = async () => {
    setLoading(true, 'Exporting video...');
    try {
      await exportVideo();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* Logo */}
        <h1 className="text-xl font-bold text-white">FastCaption</h1>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlay}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <span className="text-gray-400 text-sm">Space</span>
        </div>
      </div>

      {/* Edit Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          Undo (⌘Z)
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          Redo (⌘⇧Z)
        </button>
      </div>

      {/* Export */}
      <div>
        <button
          onClick={handleExport}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium transition-colors"
        >
          Export Video
        </button>
      </div>
    </div>
  );
}
