import React from "react";

interface AnnotationToolbarProps {
    annotationTool: string;
    setAnnotationTool: (tool: any) => void;
    brushColor: string;
    setBrushColor: (color: string) => void;
    brushSize: number;
    setBrushSize: (size: number) => void;
    annotationDuration: number;
    setAnnotationDuration: (duration: number) => void;
    onSave: () => void;
    onClear: () => void;
}

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
}) => {
    return (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 z-20">
            <button
                onClick={() => setAnnotationTool('pen')}
                className={`p-2 rounded ${annotationTool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                title="Pen Tool"
            >
                ✏️
            </button>
            <button
                onClick={() => setAnnotationTool('rectangle')}
                className={`p-2 rounded ${annotationTool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                title="Rectangle Tool"
            >
                ⬜
            </button>
            <button
                onClick={() => setAnnotationTool('circle')}
                className={`p-2 rounded ${annotationTool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                title="Circle Tool"
            >
                ⭕
            </button>
            <button
                onClick={() => setAnnotationTool('text')}
                className={`p-2 rounded ${annotationTool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                title="Text Tool"
            >
                T
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

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

            <button
                onClick={onSave}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                title="Save Annotation"
            >
                Save
            </button>

            <button
                onClick={onClear}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                title="Clear Annotations"
            >
                Clear
            </button>
        </div>
    );
};

export default AnnotationToolbar;
