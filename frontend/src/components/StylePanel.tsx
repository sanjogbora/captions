import { useState } from 'react';
import { useCaptionStore } from '../stores/captionStore';
import { useUIStore } from '../stores/uiStore';

export default function StylePanel() {
  const {
    selectedCaptionIds,
    updateCaptionStyle,
    groupSelectedCaptions,
    ungroupSelectedCaptions,
    getSelectedCaptions,
    areSelectedCaptionsAdjacent
  } = useCaptionStore();

  const { stylePresets, saveStylePreset } = useUIStore();
  const [savingPreset, setSavingPreset] = useState<number | null>(null);
  const [presetName, setPresetName] = useState('');

  const selectedCaptions = getSelectedCaptions();
  const hasSelection = selectedCaptions.length > 0;
  const firstCaption = selectedCaptions[0];

  const applyStyle = (style: any) => {
    selectedCaptionIds.forEach(id => {
      updateCaptionStyle(id, style);
    });
  };

  const handleSavePreset = (slot: number) => {
    if (presetName.trim()) {
      saveStylePreset(slot, presetName, firstCaption.style);
      setSavingPreset(null);
      setPresetName('');
    }
  };

  return (
    <div className="w-80 bg-gray-900 text-white overflow-y-auto p-4">
      <h3 className="text-lg font-bold mb-4">Style Editor</h3>

      {!hasSelection ? (
        <p className="text-gray-400 text-sm">
          Select a caption to edit its style
        </p>
      ) : (
        <div className="space-y-4">
          {/* Selected Count */}
          <div className="text-sm text-gray-400">
            {selectedCaptions.length} caption(s) selected
          </div>

          {/* Style Presets */}
          <div className="pt-2 border-t border-gray-700">
            <label className="block text-sm font-medium mb-2">
              Style Presets (Press 1-9)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(slot => {
                const preset = stylePresets.find(p => p.id === slot);
                return (
                  <div key={slot} className="relative">
                    {preset ? (
                      <button
                        onClick={() => {
                          selectedCaptionIds.forEach(id => {
                            updateCaptionStyle(id, preset.style);
                          });
                        }}
                        className="w-full px-2 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                        title={preset.name}
                      >
                        {slot}: {preset.name.slice(0, 6)}
                      </button>
                    ) : (
                      <button
                        onClick={() => setSavingPreset(slot)}
                        className="w-full px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                      >
                        {slot}: Save
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save Preset Dialog */}
            {savingPreset !== null && (
              <div className="mt-2 p-3 bg-gray-800 rounded">
                <label className="block text-xs font-medium mb-1">
                  Save to slot {savingPreset}
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm mb-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePreset(savingPreset);
                    } else if (e.key === 'Escape') {
                      setSavingPreset(null);
                      setPresetName('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSavePreset(savingPreset)}
                    className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setSavingPreset(null);
                      setPresetName('');
                    }}
                    className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Font Size: {firstCaption?.style.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="120"
              value={firstCaption?.style.fontSize || 36}
              onChange={(e) => applyStyle({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Font Weight: {firstCaption?.style.fontWeight}
            </label>
            <input
              type="range"
              min="100"
              max="900"
              step="100"
              value={firstCaption?.style.fontWeight || 400}
              onChange={(e) => applyStyle({ fontWeight: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Text Color
            </label>
            <input
              type="color"
              value={firstCaption?.style.color || '#FFFFFF'}
              onChange={(e) => applyStyle({ color: e.target.value })}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-2">
              <span>Background</span>
              <input
                type="checkbox"
                checked={!!firstCaption?.style.backgroundColor}
                onChange={(e) => applyStyle({
                  backgroundColor: e.target.checked ? '#000000' : null
                })}
                className="cursor-pointer"
              />
            </label>
            {firstCaption?.style.backgroundColor && (
              <>
                <input
                  type="color"
                  value={firstCaption.style.backgroundColor}
                  onChange={(e) => applyStyle({ backgroundColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer mb-2"
                />
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Opacity: {Math.round(firstCaption.style.backgroundOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={firstCaption.style.backgroundOpacity}
                    onChange={(e) => applyStyle({ backgroundOpacity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Text Stroke */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-2">
              <span>Stroke</span>
              <input
                type="checkbox"
                checked={firstCaption?.style.strokeWidth > 0}
                onChange={(e) => applyStyle({
                  strokeWidth: e.target.checked ? 2 : 0,
                  strokeColor: e.target.checked ? '#000000' : null
                })}
                className="cursor-pointer"
              />
            </label>
            {firstCaption?.style.strokeWidth > 0 && (
              <>
                <input
                  type="color"
                  value={firstCaption.style.strokeColor || '#000000'}
                  onChange={(e) => applyStyle({ strokeColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer mb-2"
                />
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Width: {firstCaption.style.strokeWidth}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={firstCaption.style.strokeWidth}
                    onChange={(e) => applyStyle({ strokeWidth: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Text Shadow */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-2">
              <span>Text Shadow</span>
              <input
                type="checkbox"
                checked={!!firstCaption?.style.textShadow}
                onChange={(e) => applyStyle({
                  textShadow: e.target.checked ? '2px 2px 4px rgba(0,0,0,0.8)' : null
                })}
                className="cursor-pointer"
              />
            </label>
            {firstCaption?.style.textShadow && (
              <select
                value={firstCaption.style.textShadow}
                onChange={(e) => applyStyle({ textShadow: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              >
                <option value="2px 2px 4px rgba(0,0,0,0.5)">Light</option>
                <option value="2px 2px 4px rgba(0,0,0,0.8)">Medium</option>
                <option value="4px 4px 8px rgba(0,0,0,1)">Strong</option>
                <option value="0px 0px 10px rgba(255,255,255,0.8)">Glow</option>
              </select>
            )}
          </div>

          {/* Letter Spacing (Kerning) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Letter Spacing: {firstCaption?.style.letterSpacing}px
            </label>
            <input
              type="range"
              min="-5"
              max="20"
              value={firstCaption?.style.letterSpacing || 0}
              onChange={(e) => applyStyle({ letterSpacing: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Line Height: {firstCaption?.style.lineHeight}
            </label>
            <input
              type="range"
              min="0.8"
              max="2"
              step="0.1"
              value={firstCaption?.style.lineHeight || 1.2}
              onChange={(e) => applyStyle({ lineHeight: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Text Transform */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Text Transform
            </label>
            <select
              value={firstCaption?.style.textTransform || 'none'}
              onChange={(e) => applyStyle({ textTransform: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Rotation: {firstCaption?.style.rotation}°
            </label>
            <input
              type="range"
              min="-45"
              max="45"
              value={firstCaption?.style.rotation || 0}
              onChange={(e) => applyStyle({ rotation: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Grouping */}
          <div className="pt-4 border-t border-gray-700">
            <label className="block text-sm font-medium mb-2">
              Grouping
            </label>
            {selectedCaptions.length > 1 ? (
              <button
                onClick={() => {
                  if (areSelectedCaptionsAdjacent()) {
                    groupSelectedCaptions();
                  } else {
                    alert('Can only group adjacent captions');
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Group Selected ({selectedCaptions.length} words)
              </button>
            ) : selectedCaptions[0]?.isGrouped ? (
              <button
                onClick={() => ungroupSelectedCaptions()}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Ungroup
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Select multiple adjacent words to group them
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
