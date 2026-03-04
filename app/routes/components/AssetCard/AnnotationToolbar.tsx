import React, { useState } from "react";
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
    // Precision
    snapToGrid?: boolean;
    onToggleSnap?: () => void;
    gridSize?: number;
    onGridSizeChange?: (size: number) => void;
    cursorPosition?: { x: number; y: number } | null;
    shapeSize?: { w: number; h: number } | null;
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
    snapToGrid,
    onToggleSnap,
    gridSize,
    onGridSizeChange,
    cursorPosition,
    shapeSize,
}) => {
    return (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex items-center gap-2 z-20 flex-wrap">
            {/* Drawing tools */}
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setAnnotationTool(tool.id)}
                    className={`p-2 rounded transition-colors ${annotationTool === tool.id
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-200'
                        }`}
                    title={`${tool.label} Tool (${tool.shortcut})`}
                >
                    {tool.icon}
                </button>
            ))}

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Undo / Redo */}
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded transition-colors ${canUndo
                    ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                title="Undo (Ctrl+Z)"
            >
                ↩
            </button>
            <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded transition-colors ${canRedo
                    ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                title="Redo (Ctrl+Y)"
            >
                ↪
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Color & Size */}
            <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 rounded border dark:border-gray-600"
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

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Duration */}
            <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">⏱ {annotationDuration}s</span>
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

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Snap-to-Grid */}
            {onToggleSnap && (
                <>
                    <button
                        onClick={onToggleSnap}
                        className={`p-2 rounded text-xs font-medium transition-colors ${snapToGrid
                                ? "bg-purple-500 text-white shadow-md"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            }`}
                        title={`Snap to Grid (${snapToGrid ? "ON" : "OFF"})`}
                    >
                        ⊞
                    </button>
                    {snapToGrid && onGridSizeChange && (
                        <select
                            value={gridSize || 16}
                            onChange={(e) => onGridSizeChange(Number(e.target.value))}
                            className="text-xs px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200"
                            title="Grid size"
                        >
                            <option value={8}>8px</option>
                            <option value={16}>16px</option>
                            <option value={32}>32px</option>
                        </select>
                    )}
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                </>
            )}

            {/* Coordinate Readout */}
            {cursorPosition && (
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap" title="Cursor position">
                    {cursorPosition.x},{cursorPosition.y}
                    {shapeSize && (
                        <span className="ml-1 text-blue-500">
                            {shapeSize.w}×{shapeSize.h}
                        </span>
                    )}
                </div>
            )}

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
