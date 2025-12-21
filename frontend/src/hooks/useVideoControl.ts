import { useUIStore } from '../stores/uiStore';
import { useCaptionStore } from '../stores/captionStore';

export function useVideoControl() {
  const {
    currentTime,
    videoDuration,
    isPlaying,
    videoUrl,
    setCurrentTime,
    setVideoDuration,
    setIsPlaying,
    togglePlay,
    skip,
    setError,
  } = useUIStore();

  const { captions } = useCaptionStore();

  const exportVideo = async () => {
    if (!videoUrl) {
      setError('No video loaded');
      return;
    }

    if (captions.length === 0) {
      setError('No captions to export');
      return;
    }

    try {
      // Extract filename from the URL
      // videoUrl is like "http://localhost:8000/videos/filename.mp4"
      const filename = videoUrl.split('/videos/').pop();
      if (!filename) {
        throw new Error('Invalid video URL');
      }
      const videoPath = `uploads/${filename}`;

      // Log captions being sent for debugging
      console.log('=== EXPORT: Sending captions to backend ===');
      console.log(`Total captions: ${captions.length}`);
      
      // Check for duplicate IDs
      const idSet = new Set<string>();
      const duplicateIds: string[] = [];
      captions.forEach((cap) => {
        if (idSet.has(cap.id)) {
          duplicateIds.push(cap.id);
        }
        idSet.add(cap.id);
      });
      
      if (duplicateIds.length > 0) {
        console.error('⚠️ DUPLICATE CAPTION IDs DETECTED:', duplicateIds);
      }
      
      // Check for overlapping captions at same position
      const positionMap = new Map<string, string[]>();
      captions.forEach((cap) => {
        const posKey = `${Math.round(cap.position.x)},${Math.round(cap.position.y)}`;
        if (!positionMap.has(posKey)) {
          positionMap.set(posKey, []);
        }
        positionMap.get(posKey)!.push(cap.word);
      });
      
      console.log('Position distribution:');
      positionMap.forEach((words, pos) => {
        if (words.length > 1) {
          console.warn(`  ⚠️ ${words.length} captions at position (${pos}): ${words.join(', ')}`);
        }
      });
      
      captions.forEach((cap, i) => {
        console.log(`  [${i}] "${cap.word}" | id: ${cap.id.slice(0,8)}... | time: ${cap.startTime.toFixed(2)}-${cap.endTime.toFixed(2)}s | pos: (${cap.position.x.toFixed(1)}, ${cap.position.y.toFixed(1)}) | fontSize: ${cap.style.fontSize}`);
      });
      console.log('==========================================');

      const response = await fetch('http://localhost:8000/api/render/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoPath,
          captions: captions.map(caption => ({
            id: caption.id,
            word: caption.word,
            startTime: caption.startTime,
            endTime: caption.endTime,
            position: caption.position,
            size: caption.size,
            style: caption.style,
            groupId: caption.groupId,
            isGrouped: caption.isGrouped,
            zIndex: caption.zIndex,
          })),
          outputFormat: 'mp4',
          quality: 'high',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'captioned_video.mp4';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      setError(error instanceof Error ? error.message : 'Failed to export video');
      throw error;
    }
  };

  return {
    currentTime,
    videoDuration,
    isPlaying,
    videoUrl,
    setCurrentTime,
    setVideoDuration,
    setIsPlaying,
    togglePlay,
    skip,
    exportVideo,
  };
}
