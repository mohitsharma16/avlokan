import React, { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import type { Comment, Annotation, PBUser, Task } from "../../types";
import { formatTime, type Command, type TimestampPill } from "./utils";
import MentionSuggestions from "./MentionSuggestions";

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
    activeCommentId?: string | null;
    onTimeRangeDurationChange: (duration: number) => void;
    onClose?: () => void;
    onResizeStart?: (e: React.MouseEvent) => void;
    onSeekToTimestamp: (ts: string) => void;
    onExecuteCommand: (command: Command) => void;
    onRemovePill: (pillId: string) => void;
    onEditorChange: (value: string | undefined) => void;
    onEditorMount: (editor: any, monaco: any) => void;
    onSubmit: () => void;
    // @Mentions
    showMentionSuggestions?: boolean;
    filteredUsers?: PBUser[];
    selectedMentionIndex?: number;
    onSelectMention?: (user: PBUser) => void;
    // Threading
    replyingTo?: Comment | null;
    onReply?: (comment: Comment) => void;
    onCancelReply?: () => void;
    // Task assignments
    tasks?: Task[];
    onUpdateTaskStatus?: (taskId: string, status: Task["status"]) => void;
    // Assign dropdown
    showAssignDropdown?: boolean;
    assignFilteredUsers?: PBUser[];
    selectedAssignIndex?: number;
    onAssignTask?: (user: PBUser) => void;
    onCloseAssignDropdown?: () => void;
}

// Helper: render comment text with @mentions highlighted
function renderCommentText(text: string): React.ReactNode {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1 && !/^@\d{1,2}:\d{2}/.test(part)) {
            return (
                <span
                    key={i}
                    className="inline-flex items-center bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-medium"
                >
                    {part}
                </span>
            );
        }
        return part;
    });
}

// Task status badge component
function TaskBadge({
    task,
    onUpdateStatus,
}: {
    task: Task;
    onUpdateStatus?: (taskId: string, status: Task["status"]) => void;
}) {
    const [showDropdown, setShowDropdown] = useState(false);

    const statusConfig = {
        open: {
            bg: "bg-blue-100",
            text: "text-blue-700",
            border: "border-blue-300",
            label: "Open",
            icon: "📋",
        },
        in_progress: {
            bg: "bg-yellow-100",
            text: "text-yellow-700",
            border: "border-yellow-300",
            label: "In Progress",
            icon: "🔄",
        },
        done: {
            bg: "bg-green-100",
            text: "text-green-700",
            border: "border-green-300",
            label: "Done",
            icon: "✅",
        },
    };

    const config = statusConfig[task.status];

    return (
        <div className="relative inline-block">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${config.bg} ${config.text} ${config.border} hover:shadow-sm`}
            >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className="text-gray-400 ml-0.5">→ {task.assignedTo}</span>
            </button>
            {showDropdown && onUpdateStatus && (
                <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden min-w-[120px]">
                    {(["open", "in_progress", "done"] as Task["status"][]).map(
                        (s) => (
                            <button
                                key={s}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(task.id, s);
                                    setShowDropdown(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-1.5 ${task.status === s
                                    ? "bg-gray-50 font-medium"
                                    : ""
                                    }`}
                            >
                                <span>{statusConfig[s].icon}</span>
                                <span>{statusConfig[s].label}</span>
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

// Single comment component
function CommentItem({
    comment,
    isActive,
    activeCommentRef,
    onSeekToTimestamp,
    onReply,
    tasks,
    onUpdateTaskStatus,
}: {
    comment: Comment;
    isActive: boolean;
    activeCommentRef: React.RefObject<HTMLDivElement | null>;
    onSeekToTimestamp: (ts: string) => void;
    onReply?: (comment: Comment) => void;
    tasks?: Task[];
    onUpdateTaskStatus?: (taskId: string, status: Task["status"]) => void;
}) {
    const commentTasks = tasks?.filter((t) => t.commentId === comment.id) || [];

    return (
        <div
            id={`comment-${comment.id}`}
            ref={isActive ? activeCommentRef : undefined}
            className={`border p-3 rounded-md transition-all duration-300 ${isActive
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-2 ring-blue-300/50"
                    : "border-gray-200 dark:border-gray-700"
                }`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
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
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(comment.created).toLocaleString()}
                </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm break-words overflow-wrap-anywhere">
                {renderCommentText(comment.text)}
            </p>

            {/* Task badges */}
            {commentTasks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {commentTasks.map((task) => (
                        <TaskBadge
                            key={task.id}
                            task={task}
                            onUpdateStatus={onUpdateTaskStatus}
                        />
                    ))}
                </div>
            )}

            {/* Reply button */}
            {onReply && (
                <div className="mt-2">
                    <button
                        onClick={() => onReply(comment)}
                        className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    >
                        ↩ Reply
                    </button>
                </div>
            )}
        </div>
    );
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
    activeCommentId,
    onTimeRangeDurationChange,
    onClose,
    onResizeStart,
    onSeekToTimestamp,
    onExecuteCommand,
    onRemovePill,
    onEditorChange,
    onEditorMount,
    onSubmit,
    // @Mentions
    showMentionSuggestions,
    filteredUsers,
    selectedMentionIndex,
    onSelectMention,
    // Threading
    replyingTo,
    onReply,
    onCancelReply,
    // Tasks
    tasks,
    onUpdateTaskStatus,
    // Assign dropdown
    showAssignDropdown,
    assignFilteredUsers,
    selectedAssignIndex,
    onAssignTask,
    onCloseAssignDropdown,
}) => {
    const activeCommentRef = useRef<HTMLDivElement>(null);
    const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(
        new Set()
    );

    // Auto-scroll to active comment
    useEffect(() => {
        if (activeCommentId && activeCommentRef.current) {
            activeCommentRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    }, [activeCommentId]);

    // Group comments into threads
    const topLevelComments = comments.filter((c) => !c.parentId);
    const repliesByParent = comments.reduce(
        (acc, c) => {
            if (c.parentId) {
                if (!acc[c.parentId]) acc[c.parentId] = [];
                acc[c.parentId].push(c);
            }
            return acc;
        },
        {} as Record<string, Comment[]>
    );

    const toggleThread = (commentId: string) => {
        setCollapsedThreads((prev) => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    };

    return (
        <div
            className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-0 relative transition-colors"
            style={
                sidebarWidth
                    ? { width: `${sidebarWidth}px` }
                    : { width: "100%" }
            }
        >
            {onResizeStart && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 cursor-col-resize z-10 transition-colors"
                    onMouseDown={onResizeStart}
                />
            )}

            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                <h2 className="text-lg font-semibold dark:text-gray-100">
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
                        📝 Annotation at{" "}
                        {formatTime(currentAnnotation.timestamp)}
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
                        {topLevelComments.map((comment) => {
                            const isActive = comment.id === activeCommentId;
                            const replies = repliesByParent[comment.id] || [];
                            const isCollapsed = collapsedThreads.has(
                                comment.id
                            );
                            const hasReplies = replies.length > 0;

                            return (
                                <div key={comment.id}>
                                    <CommentItem
                                        comment={comment}
                                        isActive={isActive}
                                        activeCommentRef={activeCommentRef}
                                        onSeekToTimestamp={onSeekToTimestamp}
                                        onReply={onReply}
                                        tasks={tasks}
                                        onUpdateTaskStatus={onUpdateTaskStatus}
                                    />

                                    {/* Thread replies */}
                                    {hasReplies && (
                                        <div className="ml-4 mt-1 border-l-2 border-blue-200 pl-3 space-y-2">
                                            {/* Collapse/Expand toggle */}
                                            {replies.length > 2 && (
                                                <button
                                                    onClick={() =>
                                                        toggleThread(
                                                            comment.id
                                                        )
                                                    }
                                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-medium py-0.5"
                                                >
                                                    {isCollapsed
                                                        ? `▸ Show ${replies.length} replies`
                                                        : `▾ Hide replies`}
                                                </button>
                                            )}

                                            {!isCollapsed &&
                                                replies.map((reply) => {
                                                    const isReplyActive =
                                                        reply.id ===
                                                        activeCommentId;
                                                    return (
                                                        <CommentItem
                                                            key={reply.id}
                                                            comment={reply}
                                                            isActive={
                                                                isReplyActive
                                                            }
                                                            activeCommentRef={
                                                                activeCommentRef
                                                            }
                                                            onSeekToTimestamp={
                                                                onSeekToTimestamp
                                                            }
                                                            onReply={onReply}
                                                            tasks={tasks}
                                                            onUpdateTaskStatus={
                                                                onUpdateTaskStatus
                                                            }
                                                        />
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* @Mention Suggestions */}
            {showMentionSuggestions &&
                filteredUsers &&
                filteredUsers.length > 0 &&
                onSelectMention && (
                    <MentionSuggestions
                        users={filteredUsers}
                        selectedIndex={selectedMentionIndex || 0}
                        onSelect={onSelectMention}
                    />
                )}

            {/* Command Palette */}
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
                                    <div
                                        className={`text-xs truncate ${index === selectedCommandIndex
                                            ? "text-blue-200"
                                            : "text-gray-500"
                                            }`}
                                    >
                                        {command.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-700 px-3 py-1.5 flex items-center gap-3 text-[10px] text-gray-500">
                        <span>
                            <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">
                                ↑↓
                            </kbd>{" "}
                            navigate
                        </span>
                        <span>
                            <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">
                                ↵
                            </kbd>{" "}
                            select
                        </span>
                        <span>
                            <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">
                                esc
                            </kbd>{" "}
                            dismiss
                        </span>
                    </div>
                </div>
            )}

            {/* Assign Task Dropdown */}
            {showAssignDropdown &&
                assignFilteredUsers &&
                assignFilteredUsers.length > 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl mb-3 overflow-hidden backdrop-blur-sm">
                        <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                📋 Assign Task To
                            </div>
                            {onCloseAssignDropdown && (
                                <button
                                    onClick={onCloseAssignDropdown}
                                    className="text-gray-500 hover:text-gray-300 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="p-1 max-h-48 overflow-y-auto">
                            {assignFilteredUsers.map((user, index) => {
                                const displayName =
                                    user.name || user.email.split("@")[0];
                                return (
                                    <div
                                        key={user.id}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${index === (selectedAssignIndex || 0)
                                            ? "bg-blue-600 text-white shadow-md"
                                            : "text-gray-300 hover:bg-gray-800"
                                            }`}
                                        onClick={() =>
                                            onAssignTask && onAssignTask(user)
                                        }
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase ${index ===
                                                (selectedAssignIndex || 0)
                                                ? "bg-blue-400 text-blue-900"
                                                : "bg-gray-700 text-gray-300"
                                                }`}
                                        >
                                            {displayName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {displayName}
                                            </div>
                                            <div
                                                className={`text-xs truncate ${index ===
                                                    (selectedAssignIndex || 0)
                                                    ? "text-blue-200"
                                                    : "text-gray-500"
                                                    }`}
                                            >
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            <div className="space-y-2 relative">
                <div className="border-t pt-4">
                    {/* Replying indicator */}
                    {replyingTo && (
                        <div className="flex items-center justify-between mb-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <span className="text-xs text-blue-700 dark:text-blue-300">
                                ↩ Replying to{" "}
                                <span className="font-semibold">
                                    @{replyingTo.name}
                                </span>
                            </span>
                            {onCancelReply && (
                                <button
                                    onClick={onCancelReply}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    )}

                    {timestampPills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {timestampPills.map((pill) => (
                                <div
                                    key={pill.id}
                                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800 shadow-sm"
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
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 pl-1">
                            Type{" "}
                            <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 font-mono">
                                $
                            </kbd>{" "}
                            for commands ·{" "}
                            <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-gray-600 font-mono">
                                @
                            </kbd>{" "}
                            to mention
                        </div>

                        {/* Time Range Duration Selector */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                Range:
                            </span>
                            {[10, 30, 60, 120].map((d) => (
                                <button
                                    key={d}
                                    onClick={() =>
                                        onTimeRangeDurationChange(d)
                                    }
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
                                        const val = parseInt(
                                            e.target.value,
                                            10
                                        );
                                        if (
                                            !isNaN(val) &&
                                            val >= 1 &&
                                            val <= 600
                                        ) {
                                            onTimeRangeDurationChange(val);
                                        }
                                    }}
                                    className="w-14 px-1.5 py-0.5 text-[10px] border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <span className="text-[10px] text-gray-400">
                                    sec
                                </span>
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
                                placeholder: "Write your comment...",
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
                        {replyingTo ? "Post Reply" : "Post Comment"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentsPanel;
