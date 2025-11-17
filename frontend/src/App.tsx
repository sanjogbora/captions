import { useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import TranscriptPanel from './components/TranscriptPanel';
import StylePanel from './components/StylePanel';
import Timeline from './components/Timeline';
import Toolbar from './components/Toolbar';
import UploadModal from './components/UploadModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUIStore } from './stores/uiStore';

function App() {
  const [showUploadModal, setShowUploadModal] = useState(true);
  const { isLoading, loadingMessage, error, videoUrl } = useUIStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-center">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          <p>{error}</p>
          <button
            onClick={() => useUIStore.getState().setError(null)}
            className="absolute top-1 right-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal && !videoUrl}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Transcript Panel (20% width) */}
        <TranscriptPanel />

        {/* Center: Video Player (60% width) */}
        <div className="flex-1 flex flex-col">
          <VideoPlayer />
          <Timeline />
        </div>

        {/* Right: Style Panel (20% width) */}
        <StylePanel />
      </div>
    </div>
  );
}

export default App;
