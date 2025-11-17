import { useCaptionStore } from '../stores/captionStore';
import { STYLE_TEMPLATES } from '../utils/styleTemplates';

export default function StylePanel() {
  const {
    selectedCaptionIds,
    updateCaptionStyle,
    groupSelectedCaptions,
    ungroupSelectedCaptions,
    getSelectedCaptions
  } = useCaptionStore();

  const selectedCaptions = getSelectedCaptions();
  const hasSelection = selectedCaptions.length > 0;
  const firstCaption = selectedCaptions[0];

  return (
    <div className="w-80 bg-gray-900 text-white overflow-y-auto p-4">
      <h3 className="text-lg font-bold mb-4">Style</h3>

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

          {/* Style Templates */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Style Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    selectedCaptionIds.forEach(id => {
                      updateCaptionStyle(id, template.style);
                    });
                  }}
                  className={`
                    p-3 rounded border-2 text-left transition-colors
                    ${firstCaption?.style.templateId === template.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 hover:border-gray-600'
                    }
                  `}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Font Size
            </label>
            <input
              type="range"
              min="20"
              max="80"
              value={firstCaption?.style.fontSize || 36}
              onChange={(e) => {
                selectedCaptionIds.forEach(id => {
                  updateCaptionStyle(id, {
                    fontSize: parseInt(e.target.value)
                  });
                });
              }}
              className="w-full"
            />
            <div className="text-sm text-gray-400 mt-1">
              {firstCaption?.style.fontSize}px
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Text Color
            </label>
            <input
              type="color"
              value={firstCaption?.style.color || '#FFFFFF'}
              onChange={(e) => {
                selectedCaptionIds.forEach(id => {
                  updateCaptionStyle(id, { color: e.target.value });
                });
              }}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>

          {/* Grouping */}
          <div className="pt-4 border-t border-gray-700">
            <label className="block text-sm font-medium mb-2">
              Grouping
            </label>
            {selectedCaptions.length > 1 ? (
              <button
                onClick={groupSelectedCaptions}
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
                Select multiple words to group them
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
