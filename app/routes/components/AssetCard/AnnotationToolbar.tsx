import React from "react";
import type { AnnotationTool } from "./useAnnotations";

interface AnnotationToolbarProps {
    annotationTool: string;
    setAnnotationTool: (tool: AnnotationTool) => void;
    brushColor: string;
    setBrushColor: (color: string) => void;
    brushSize: number;
    setBrushSize: (size: number) => void;
    annotationDuration: number;
    setAnnotationDuration: (duration: number) => void;
    onSave: () => void;
    onClear: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const tools: { id: AnnotationTool; icon: string; label: string; shortcut: string }[] = [
    { id: 'pen', icon: '✏️', label: 'Pen', shortcut: 'P' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: '⭕', label: 'Circle', shortcut: 'C' },
    { id: 'arrow', icon: '↗', label: 'Arrow', shortcut: 'A' },
    { id: 'highlight', icon: '🖍', label: 'Highlight', shortcut: 'H' },
    { id: 'text', icon: 'T', label: 'Text', shortcut: 'T' },
];

const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
    annotationTool,
    setAnnotationTool,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    annotationDuration,
    setAnnotationDuration,
    onSave,
    onClear,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
}) => {
    return (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 z-20 flex-wrap">
            {/* Drawing tools */}
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setAnnotationTool(tool.id)}
                    className={`p-2 rounded transition-colors ${annotationTool === tool.id
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                    title={`${tool.label} Tool (${tool.shortcut})`}
                >
                    {tool.icon}
                </button>
            ))}

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Undo / Redo */}
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded transition-colors ${canUndo
                        ? 'bg-gray-200 hover:bg-gray-300'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                title="Undo (Ctrl+Z)"
            >
                ↩
            </button>
            <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded transition-colors ${canRedo
                        ? 'bg-gray-200 hover:bg-gray-300'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                title="Redo (Ctrl+Y)"
            >
                ↪
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Color & Size */}
            <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 rounded border"
                title="Color"
            />

            <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-16"
                title="Brush Size"
            />

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Duration */}
            <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 whitespace-nowrap">⏱ {annotationDuration}s</span>
                <input
                    type="range"
                    min="1"
                    max="30"
                    value={annotationDuration}
                    onChange={(e) => setAnnotationDuration(Number(e.target.value))}
                    className="w-16"
                    title={`Duration: ${annotationDuration} seconds`}
                />
            </div>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Save & Clear */}
            <button
                onClick={onSave}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                title="Save Annotation"
            >
                Save
            </button>

            <button
                onClick={onClear}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                title="Clear Annotations"
            >
                Clear
            </button>
        </div>
    );
};

export default AnnotationToolbar;
