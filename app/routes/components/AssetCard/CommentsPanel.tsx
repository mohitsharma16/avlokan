import React from "react";
import { Editor } from "@monaco-editor/react";
import type { Comment, Annotation } from "../../types";
import { formatTime, type Command, type TimestampPill } from "./utils";

interface CommentsPanelProps {
    comments: Comment[];
    isAnnotating?: boolean;
    currentAnnotation?: Annotation | null;
    showCommandPalette: boolean;
    filteredCommands: Command[];
    selectedCommandIndex: number;
    timestampPills: TimestampPill[];
    commentText: string;
    sidebarWidth?: number;
    timeRangeDuration: number;
    onTimeRangeDurationChange: (duration: number) => void;
    onClose?: () => void;
    onResizeStart?: (e: React.MouseEvent) => void;
    onSeekToTimestamp: (ts: string) => void;
    onExecuteCommand: (command: Command) => void;
    onRemovePill: (pillId: string) => void;
    onEditorChange: (value: string | undefined) => void;
    onEditorMount: (editor: any, monaco: any) => void;
    onSubmit: () => void;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({
    comments,
    isAnnotating,
    currentAnnotation,
    showCommandPalette,
    filteredCommands,
    selectedCommandIndex,
    timestampPills,
    commentText,
    sidebarWidth,
    timeRangeDuration,
    onTimeRangeDurationChange,
    onClose,
    onResizeStart,
    onSeekToTimestamp,
    onExecuteCommand,
    onRemovePill,
    onEditorChange,
    onEditorMount,
    onSubmit,
}) => {
    return (
        <div
            className="bg-white border-l border-gray-200 p-4 flex flex-col min-h-0 relative"
            style={sidebarWidth ? { width: `${sidebarWidth}px` } : { width: '100%' }}
        >
            {onResizeStart && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize z-10 transition-colors"
                    onMouseDown={onResizeStart}
                />
            )}

            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold">
                    Comments ({comments.length})
                </h2>
                {onClose && (
                    <button
                        className="text-sm text-red-500 hover:underline"
                        onClick={onClose}
                    >
                        Close
                    </button>
                )}
            </div>

            {/* Annotation Info */}
            {isAnnotating && currentAnnotation && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-sm text-blue-800">
                        📝 Annotation at {formatTime(currentAnnotation.timestamp)}
                        {currentAnnotation.duration && (
                            <span className="ml-2 text-blue-600">
                                (visible for {currentAnnotation.duration}s)
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                {comments.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-gray-500">No comments yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div
                                key={comment.id}
                                className="border border-gray-200 p-3 rounded-md"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-gray-900 text-sm">
                                            {comment.name}
                                        </span>
                                        {comment.timestamp && (
                                            <button
                                                onClick={() =>
                                                    onSeekToTimestamp(comment.timestamp)
                                                }
                                                className="bg-white rounded-full border px-2 text-black hover:text-black hover:bg-green-300 font-normal text-sm"
                                            >
                                                {comment.timestamp}
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(comment.created).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap text-sm break-words overflow-wrap-anywhere">
                                    {comment.text}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showCommandPalette && filteredCommands.length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl mb-3 overflow-hidden backdrop-blur-sm">
                    <div className="px-3 py-2 border-b border-gray-700">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            ⚡ Commands
                        </div>
                    </div>
                    <div className="p-1">
                        {filteredCommands.map((command, index) => (
                            <div
                                key={command.id}
                                className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${index === selectedCommandIndex
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "text-gray-300 hover:bg-gray-800"
                                    }`}
                                onClick={() => onExecuteCommand(command)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {command.label}
                                    </div>
                                    <div className={`text-xs truncate ${index === selectedCommandIndex ? "text-blue-200" : "text-gray-500"}`}>
                                        {command.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-700 px-3 py-1.5 flex items-center gap-3 text-[10px] text-gray-500">
                        <span><kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">↑↓</kbd> navigate</span>
                        <span><kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">↵</kbd> select</span>
                        <span><kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">esc</kbd> dismiss</span>
                    </div>
                </div>
            )}

            <div className="space-y-2 relative">
                <div className="border-t pt-4">
                    {timestampPills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {timestampPills.map((pill) => (
                                <div
                                    key={pill.id}
                                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200 shadow-sm"
                                >
                                    <span className="text-blue-500">🕐</span>
                                    <span>{pill.text}</span>
                                    <button
                                        onClick={() => onRemovePill(pill.id)}
                                        className="text-blue-400 hover:text-red-500 ml-0.5 focus:outline-none transition-colors"
                                        title="Remove timestamp"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <div className="text-[10px] text-gray-400 mb-1 pl-1">
                            Type <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 font-mono">$</kbd> for commands
                        </div>

                        {/* Time Range Duration Selector */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Range:</span>
                            {[10, 30, 60, 120].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => onTimeRangeDurationChange(d)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all duration-150 ${timeRangeDuration === d
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                                        }`}
                                >
                                    {d}s
                                </button>
                            ))}
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={1}
                                    max={600}
                                    value={timeRangeDuration}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val >= 1 && val <= 600) {
                                            onTimeRangeDurationChange(val);
                                        }
                                    }}
                                    className="w-14 px-1.5 py-0.5 text-[10px] border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <span className="text-[10px] text-gray-400">sec</span>
                            </div>
                        </div>

                        <Editor
                            className="w-full border rounded-md"
                            theme="light"
                            height="120px"
                            defaultLanguage="markdown"
                            value={commentText}
                            onChange={onEditorChange}
                            onMount={onEditorMount}
                            options={{
                                placeholder:
                                    "Write your comment...",
                                fontSize: 14,
                                minimap: { enabled: false },
                                contextmenu: false,
                                guides: {
                                    indentation: false,
                                    bracketPairs: false,
                                },
                                lineDecorationsWidth: 0,
                                lineNumbersMinChars: 0,
                                lineNumbers: "off",
                                glyphMargin: false,
                                scrollbar: { vertical: "auto" },
                                wordWrap: "on",
                                folding: false,
                            }}
                        />
                    </div>

                    <button
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg w-full mt-2 font-medium text-sm transition-colors shadow-sm"
                        onClick={onSubmit}
                    >
                        Post Comment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentsPanel;
