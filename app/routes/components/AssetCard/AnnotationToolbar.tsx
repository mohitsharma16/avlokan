import React, { useRef } from "react";
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

// ── Icons (inline, Apple/Heroicons-style outline glyphs — no icon library) ────

const iconProps = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

const PenIcon = () => (
    <svg {...iconProps}><path d="M4 20l4-1 10-10a2.121 2.121 0 00-3-3L5 16l-1 4z" /></svg>
);
const RectIcon = () => (
    <svg {...iconProps}><rect x="5" y="7" width="14" height="10" rx="1.5" /></svg>
);
const CircleIcon = () => (
    <svg {...iconProps}><circle cx="12" cy="12" r="7" /></svg>
);
const ArrowIcon = () => (
    <svg {...iconProps}><path d="M6 18L18 6M18 6H9M18 6v9" /></svg>
);
const HighlightIcon = () => (
    <svg {...iconProps}>
        <rect x="4" y="8.5" width="16" height="6" rx="2" fill="currentColor" fillOpacity="0.35" stroke="none" />
        <line x1="4" y1="17.5" x2="20" y2="17.5" opacity="0.55" />
    </svg>
);
const UndoIcon = () => (
    <svg {...iconProps}><path d="M8 7L4 11L8 15M4 11H14a5 5 0 015 5v2" /></svg>
);
const RedoIcon = () => (
    <svg {...iconProps}><path d="M16 7L20 11L16 15M20 11H10a5 5 0 00-5 5v2" /></svg>
);
const GridIcon = () => (
    <svg {...iconProps}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 12h16M12 4v16" /></svg>
);
const CheckIcon = () => (
    <svg {...{ ...iconProps, width: 15, height: 15 }}><path d="M4 12.5l4.5 4.5L20 6" /></svg>
);
const TrashIcon = () => (
    <svg {...{ ...iconProps, width: 15, height: 15 }}>
        <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M7 7v12a2 2 0 002 2h6a2 2 0 002-2V7" />
    </svg>
);

const TOOLS: { id: AnnotationTool; label: string; shortcut: string; Icon: React.FC }[] = [
    { id: "pen", label: "Pen", shortcut: "P", Icon: PenIcon },
    { id: "rectangle", label: "Rectangle", shortcut: "R", Icon: RectIcon },
    { id: "circle", label: "Circle", shortcut: "C", Icon: CircleIcon },
    { id: "arrow", label: "Arrow", shortcut: "A", Icon: ArrowIcon },
    { id: "highlight", label: "Highlight", shortcut: "H", Icon: HighlightIcon },
];

const SWATCHES = [
    "#FF3B30", // red
    "#FF9500", // orange
    "#FFCC00", // yellow
    "#34C759", // green
    "#0071E3", // accent blue
    "#5856D6", // purple
    "#FF2D55", // pink
    "#1D1D1F", // near-black
];

const SIZE_PRESETS = [
    { value: 2, dot: 5 },
    { value: 4, dot: 8 },
    { value: 6, dot: 11 },
    { value: 9, dot: 14 },
];

// ── Small building blocks ─────────────────────────────────────────────────────

const Divider = () => (
    <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 2px", flexShrink: 0 }} />
);

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span
        style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginRight: 2,
            whiteSpace: "nowrap",
        }}
    >
        {children}
    </span>
);

interface IconBtnProps {
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}

const IconBtn: React.FC<IconBtnProps> = ({ onClick, active, disabled, title, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "var(--radius-sm)",
            border: "none",
            flexShrink: 0,
            background: active ? "var(--accent)" : "transparent",
            color: disabled
                ? "var(--text-tertiary)"
                : active
                    ? "#fff"
                    : "var(--text-secondary)",
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: active ? "0 2px 8px rgba(0, 113, 227, 0.35)" : "none",
            transition: "var(--transition)",
        }}
        onMouseEnter={(e) => {
            if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.background = "var(--border)";
        }}
        onMouseLeave={(e) => {
            if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
    >
        {children}
    </button>
);

// ── Main Toolbar ──────────────────────────────────────────────────────────────

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
    const colorInputRef = useRef<HTMLInputElement>(null);
    const isCustomColor = !SWATCHES.some((c) => c.toLowerCase() === brushColor.toLowerCase());

    return (
        <div
            className="animate-apple-scale-in"
            style={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                maxWidth: "calc(100% - 32px)",
                padding: "8px 10px",
                background: "var(--surface)",
                backdropFilter: "blur(20px) saturate(1.8)",
                WebkitBackdropFilter: "blur(20px) saturate(1.8)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-hover)",
                fontFamily: "var(--font-apple)",
            }}
        >
            {/* Drawing tools */}
            {TOOLS.map((tool) => (
                <div key={tool.id} style={{ position: "relative" }}>
                    <IconBtn
                        active={annotationTool === tool.id}
                        onClick={() => setAnnotationTool(tool.id)}
                        title={`${tool.label} (${tool.shortcut})`}
                    >
                        <tool.Icon />
                    </IconBtn>
                </div>
            ))}
            {/* Text tool — literal glyph reads more clearly than an icon */}
            <IconBtn
                active={annotationTool === "text"}
                onClick={() => setAnnotationTool("text")}
                title="Text (T)"
            >
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-apple)" }}>T</span>
            </IconBtn>

            <Divider />

            <IconBtn onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"><UndoIcon /></IconBtn>
            <IconBtn onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"><RedoIcon /></IconBtn>

            <Divider />

            {/* Color swatches */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {SWATCHES.map((color) => (
                    <button
                        key={color}
                        onClick={() => setBrushColor(color)}
                        title={color}
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: "999px",
                            background: color,
                            border: brushColor.toLowerCase() === color.toLowerCase()
                                ? "2px solid var(--accent)"
                                : "2px solid transparent",
                            boxShadow: brushColor.toLowerCase() === color.toLowerCase()
                                ? "0 0 0 2px var(--bg-elevated), 0 2px 6px rgba(0,0,0,0.25)"
                                : "0 1px 2px rgba(0,0,0,0.15)",
                            cursor: "pointer",
                            padding: 0,
                            flexShrink: 0,
                            transition: "var(--transition)",
                        }}
                    />
                ))}
                {/* Custom color trigger */}
                <button
                    onClick={() => colorInputRef.current?.click()}
                    title="Custom color"
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: "999px",
                        border: isCustomColor ? "2px solid var(--accent)" : "1.5px dashed var(--text-tertiary)",
                        background: isCustomColor
                            ? brushColor
                            : "conic-gradient(from 0deg, #FF3B30, #FFCC00, #34C759, #0071E3, #5856D6, #FF2D55, #FF3B30)",
                        cursor: "pointer",
                        padding: 0,
                        flexShrink: 0,
                    }}
                />
                <input
                    ref={colorInputRef}
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
                    tabIndex={-1}
                />
            </div>

            <Divider />

            {/* Brush size presets */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }} title="Brush size">
                {SIZE_PRESETS.map((preset) => (
                    <button
                        key={preset.value}
                        onClick={() => setBrushSize(preset.value)}
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: "var(--radius-sm)",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: brushSize === preset.value ? "var(--border)" : "transparent",
                            cursor: "pointer",
                            flexShrink: 0,
                        }}
                    >
                        <span
                            style={{
                                width: preset.dot,
                                height: preset.dot,
                                borderRadius: "999px",
                                background: brushSize === preset.value ? "var(--accent)" : "var(--text-tertiary)",
                            }}
                        />
                    </button>
                ))}
            </div>

            <Divider />

            {/* Duration */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <GroupLabel>Shows {annotationDuration}s</GroupLabel>
                <input
                    type="range"
                    min="1"
                    max="30"
                    value={annotationDuration}
                    onChange={(e) => setAnnotationDuration(Number(e.target.value))}
                    style={{ width: 64, accentColor: "var(--accent)" }}
                    title={`Duration: ${annotationDuration}s`}
                />
            </div>

            {/* Snap-to-Grid */}
            {onToggleSnap && (
                <>
                    <Divider />
                    <IconBtn active={!!snapToGrid} onClick={onToggleSnap} title={`Snap to grid (${snapToGrid ? "on" : "off"})`}>
                        <GridIcon />
                    </IconBtn>
                    {snapToGrid && onGridSizeChange && (
                        <select
                            value={gridSize || 16}
                            onChange={(e) => onGridSizeChange(Number(e.target.value))}
                            style={{
                                fontSize: 11,
                                padding: "4px 6px",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--border)",
                                background: "var(--bg-elevated)",
                                color: "var(--text-secondary)",
                            }}
                            title="Grid size"
                        >
                            <option value={8}>8px</option>
                            <option value={16}>16px</option>
                            <option value={32}>32px</option>
                        </select>
                    )}
                </>
            )}

            {/* Coordinate Readout */}
            {cursorPosition && (
                <span
                    style={{
                        fontSize: 10,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        color: "var(--text-tertiary)",
                        whiteSpace: "nowrap",
                        padding: "0 4px",
                    }}
                >
                    {cursorPosition.x},{cursorPosition.y}
                    {shapeSize && (
                        <span style={{ marginLeft: 4, color: "var(--accent)" }}>
                            {shapeSize.w}×{shapeSize.h}
                        </span>
                    )}
                </span>
            )}

            <Divider />

            {/* Save & Clear */}
            <button
                onClick={onSave}
                title="Save annotation"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-pill)",
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "var(--transition)",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
            >
                <CheckIcon />
                Save
            </button>

            <button
                onClick={onClear}
                title="Clear annotations on this frame"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    background: "transparent",
                    color: "var(--danger)",
                    border: "1.5px solid transparent",
                    borderRadius: "var(--radius-pill)",
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "var(--transition)",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 69, 58, 0.1)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--danger)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                }}
            >
                <TrashIcon />
                Clear
            </button>
        </div>
    );
};

export default AnnotationToolbar;
