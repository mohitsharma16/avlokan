import React, { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import type { Comment, Annotation, PBUser, Task } from "../../types";
import { formatTime, type Command, type TimestampPill } from "./utils";
import MentionSuggestions from "./MentionSuggestions";
import { useTheme } from "../../contexts/ThemeContext";

/** Monaco themes that match the Avlokan surfaces (transparent so the composer card shows through). */
const defineMonacoThemes = (monaco: any) => {
    monaco.editor.defineTheme("avlokan-dark", { base: "vs-dark", inherit: true, rules: [], colors: { "editor.background": "#17171C", "editorCursor.foreground": "#FF6B4A", "editor.selectionBackground": "#FF6B4A44", "editor.lineHighlightBackground": "#00000000" } });
    monaco.editor.defineTheme("avlokan-light", { base: "vs", inherit: true, rules: [], colors: { "editor.background": "#FFFFFF", "editorCursor.foreground": "#FF6B4A", "editor.selectionBackground": "#FF6B4A33", "editor.lineHighlightBackground": "#00000000" } });
};

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
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                        color: "var(--color-accent-text)",
                        padding: "1px 7px",
                        borderRadius: "999px",
                        fontSize: 12,
                        fontWeight: 500,
                    }}
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
        open: { bg: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--color-accent-text)", label: "Open" },
        in_progress: { bg: "color-mix(in srgb, var(--warning) 12%, transparent)", color: "var(--warning)", label: "In Progress" },
        done: { bg: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)", label: "Done" },
    };

    const config = statusConfig[task.status];

    return (
        <div className="relative inline-block">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                }}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontSize: 10,
                    fontWeight: 500,
                    border: "1px solid transparent",
                    background: config.bg,
                    color: config.color,
                    transition: "var(--transition)",
                }}
            >
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                <span>{config.label}</span>
                <span style={{ color: "var(--text-tertiary)", marginLeft: 2 }}>→ {task.assignedTo}</span>
            </button>
            {showDropdown && onUpdateStatus && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "100%",
                        marginBottom: 4,
                        left: 0,
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-hover)",
                        zIndex: 20,
                        overflow: "hidden",
                        minWidth: 130,
                    }}
                >
                    {(["open", "in_progress", "done"] as Task["status"][]).map(
                        (s) => (
                            <button
                                key={s}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(task.id, s);
                                    setShowDropdown(false);
                                }}
                                style={{
                                    width: "100%",
                                    padding: "6px 12px",
                                    textAlign: "left",
                                    fontSize: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    background: task.status === s ? "var(--bg)" : "transparent",
                                    fontWeight: task.status === s ? 500 : 400,
                                    color: "var(--text-primary)",
                                    border: "none",
                                }}
                            >
                                <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
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
            style={{
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                background: isActive ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent",
                boxShadow: isActive ? "0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)" : "none",
                padding: 12,
                borderRadius: "var(--radius-md)",
                transition: "var(--transition)",
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                        {comment.name}
                    </span>
                    {comment.timestamp && (
                        <button
                            onClick={() => onSeekToTimestamp(comment.timestamp)}
                            style={{
                                background: "var(--bg)",
                                borderRadius: "999px",
                                border: "1px solid var(--border)",
                                padding: "1px 9px",
                                color: "var(--text-secondary)",
                                fontWeight: 400,
                                fontSize: 12,
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--success) 15%, transparent)";
                                (e.currentTarget as HTMLButtonElement).style.color = "var(--success)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)";
                                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                            }}
                        >
                            {comment.timestamp}
                        </button>
                    )}
                </div>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {new Date(comment.created).toLocaleString()}
                </span>
            </div>
            <p style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap", fontSize: 13, margin: 0, wordBreak: "break-word" }}>
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
                        style={{ fontSize: 11, color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}
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
    const { isDark } = useTheme();
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
            className="flex flex-col min-h-0 relative"
            style={{
                background: "transparent",
                padding: 16,
                fontFamily: "var(--font-sans)",
                transition: "var(--transition)",
                ...(sidebarWidth ? { width: `${sidebarWidth}px` } : { width: "100%" }),
            }}
        >
            {onResizeStart && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 transition-colors"
                    style={{ background: "var(--border)" }}
                    onMouseDown={onResizeStart}
                />
            )}

            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--color-border)" }}>
                <h2 className="av-eyebrow" style={{ margin: 0, fontSize: 11, color: "var(--color-text-primary)" }}>Comments</h2>
                <span className="av-mono" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{comments.length}</span>
            </div>

            {/* Annotation Info */}
            {isAnnotating && currentAnnotation && (
                <div
                    className="mb-4"
                    style={{
                        padding: 10,
                        background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                        borderRadius: "var(--radius-md)",
                    }}
                >
                    <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                        Annotation at{" "}
                        {formatTime(currentAnnotation.timestamp)}
                        {currentAnnotation.duration && (
                            <span style={{ marginLeft: 8, color: "var(--color-accent-text)" }}>
                                (visible for {currentAnnotation.duration}s)
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                {comments.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No comments yet.</p>
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
                                        <div
                                            className="ml-4 mt-1 pl-3 space-y-2"
                                            style={{ borderLeft: "2px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
                                        >
                                            {/* Collapse/Expand toggle */}
                                            {replies.length > 2 && (
                                                <button
                                                    onClick={() =>
                                                        toggleThread(
                                                            comment.id
                                                        )
                                                    }
                                                    style={{
                                                        fontSize: 10,
                                                        color: "var(--color-accent-text)",
                                                        fontWeight: 500,
                                                        padding: "2px 0",
                                                        background: "none",
                                                        border: "none",
                                                    }}
                                                >
                                                    {isCollapsed
                                                        ? `Show ${replies.length} replies`
                                                        : `Hide replies`}
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
                <div className="mb-3 overflow-hidden" style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-strong)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-hover)", backdropFilter: "blur(8px)" }}>
                    <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--color-border-strong)" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Commands
                        </div>
                    </div>
                    <div className="p-1">
                        {filteredCommands.map((command, index) => (
                            <div
                                key={command.id}
                                className="flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                                style={{
                                    background: index === selectedCommandIndex ? "var(--accent)" : "transparent",
                                    boxShadow: index === selectedCommandIndex ? "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" : "none",
                                }}
                                onClick={() => onExecuteCommand(command)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div style={{ fontWeight: 500, fontSize: 13, color: index === selectedCommandIndex ? "var(--color-accent-ink)" : "var(--color-text-primary)" }} className="truncate">
                                        {command.label}
                                    </div>
                                    <div
                                        style={{ fontSize: 11, color: index === selectedCommandIndex ? "color-mix(in srgb, var(--color-accent-ink) 70%, transparent)" : "var(--color-text-tertiary)" }}
                                        className="truncate"
                                    >
                                        {command.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-3 py-1.5 flex items-center gap-3" style={{ borderTop: "1px solid var(--color-border-strong)", fontSize: 10, color: "var(--color-text-tertiary)" }}>
                        <span>
                            <kbd style={{ padding: "1px 5px", background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border-strong)", borderRadius: 4, color: "var(--color-text-secondary)" }}>
                                ↑↓
                            </kbd>{" "}
                            navigate
                        </span>
                        <span>
                            <kbd style={{ padding: "1px 5px", background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border-strong)", borderRadius: 4, color: "var(--color-text-secondary)" }}>
                                ↵
                            </kbd>{" "}
                            select
                        </span>
                        <span>
                            <kbd style={{ padding: "1px 5px", background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border-strong)", borderRadius: 4, color: "var(--color-text-secondary)" }}>
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
                    <div className="mb-3 overflow-hidden" style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-strong)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-hover)", backdropFilter: "blur(8px)" }}>
                        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border-strong)" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Assign task to
                            </div>
                            {onCloseAssignDropdown && (
                                <button
                                    onClick={onCloseAssignDropdown}
                                    style={{ color: "var(--color-text-tertiary)", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="p-1 max-h-48 overflow-y-auto">
                            {assignFilteredUsers.map((user, index) => {
                                const displayName =
                                    user.name || user.email.split("@")[0];
                                const isSel = index === (selectedAssignIndex || 0);
                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                                        style={{
                                            background: isSel ? "var(--accent)" : "transparent",
                                            boxShadow: isSel ? "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" : "none",
                                        }}
                                        onClick={() =>
                                            onAssignTask && onAssignTask(user)
                                        }
                                    >
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0"
                                            style={{
                                                background: isSel ? "color-mix(in srgb, var(--color-accent-ink) 22%, transparent)" : "var(--color-bg-tertiary)",
                                                color: isSel ? "var(--color-accent-ink)" : "var(--color-text-primary)",
                                            }}
                                        >
                                            {displayName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div style={{ fontWeight: 500, fontSize: 13, color: isSel ? "var(--color-accent-ink)" : "var(--color-text-primary)" }} className="truncate">
                                                {displayName}
                                            </div>
                                            <div style={{ fontSize: 11, color: isSel ? "color-mix(in srgb, var(--color-accent-ink) 70%, transparent)" : "var(--color-text-tertiary)" }} className="truncate">
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
                <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Replying indicator */}
                    {replyingTo && (
                        <div
                            className="flex items-center justify-between mb-2 px-2 py-1.5"
                            style={{
                                background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                                border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                                borderRadius: "var(--radius-md)",
                            }}
                        >
                            <span style={{ fontSize: 12, color: "var(--color-accent-text)" }}>
                                ↩ Replying to{" "}
                                <span style={{ fontWeight: 600 }}>
                                    @{replyingTo.name}
                                </span>
                            </span>
                            {onCancelReply && (
                                <button
                                    onClick={onCancelReply}
                                    style={{ fontSize: 12, color: "var(--danger)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
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
                                    className="inline-flex items-center gap-1.5"
                                    style={{
                                        background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                                        color: "var(--color-accent-text)",
                                        padding: "4px 10px",
                                        borderRadius: "999px",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                                    }}
                                >
                                    <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                    <span>{pill.text}</span>
                                    <button
                                        onClick={() => onRemovePill(pill.id)}
                                        style={{ marginLeft: 2, color: "var(--color-accent-text)", opacity: 0.6, background: "none", border: "none", cursor: "pointer" }}
                                        title="Remove timestamp"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Composer ── */}
                    <div
                        style={{
                            border: "1px solid var(--color-border-strong)",
                            borderRadius: "var(--av-radius-md)",
                            background: "var(--color-surface)",
                            overflow: "hidden",
                            transition: "border-color var(--av-motion-fast) ease, box-shadow var(--av-motion-fast) ease",
                        }}
                        onFocusCapture={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent)"; }}
                        onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                        <div style={{ position: "relative" }}>
                            <Editor
                                className="w-full"
                                theme={isDark ? "avlokan-dark" : "avlokan-light"}
                                beforeMount={defineMonacoThemes}
                                height="104px"
                                defaultLanguage="markdown"
                                value={commentText}
                                onChange={onEditorChange}
                                onMount={onEditorMount}
                                options={{
                                    fontSize: 13.5,
                                    fontFamily: "Inter Tight, Inter, system-ui, sans-serif",
                                    minimap: { enabled: false },
                                    contextmenu: false,
                                    guides: { indentation: false, bracketPairs: false },
                                    lineDecorationsWidth: 0,
                                    lineNumbersMinChars: 0,
                                    lineNumbers: "off",
                                    glyphMargin: false,
                                    scrollbar: { vertical: "auto", useShadows: false },
                                    scrollBeyondLastLine: false,
                                    renderLineHighlight: "none",
                                    overviewRulerLanes: 0,
                                    hideCursorInOverviewRuler: true,
                                    padding: { top: 10, bottom: 10 },
                                    wordWrap: "on",
                                    folding: false,
                                }}
                            />
                            {!commentText && (
                                <div aria-hidden style={{ position: "absolute", top: 10, left: 14, pointerEvents: "none", fontSize: 13.5, color: "var(--color-text-tertiary)" }}>
                                    {replyingTo ? `Reply to ${replyingTo.name}…` : "Leave feedback on this moment…"}
                                </div>
                            )}
                        </div>

                        {/* Footer: hints + range + submit */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 10px", borderTop: "1px solid var(--color-border)", background: "var(--color-bg-secondary)" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                                <kbd className="av-kbd">$</kbd> commands
                                <kbd className="av-kbd" style={{ marginLeft: 6 }}>@</kbd> mention
                            </span>
                            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }} role="group" aria-label="Timestamp range">
                                <span className="av-eyebrow" style={{ fontSize: 9.5, marginRight: 2 }}>Range</span>
                                {[10, 30, 60, 120].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => onTimeRangeDurationChange(d)}
                                        aria-pressed={timeRangeDuration === d}
                                        className="av-mono"
                                        style={{
                                            height: 22, padding: "0 7px", borderRadius: 6, fontSize: 10.5, cursor: "pointer",
                                            border: `1px solid ${timeRangeDuration === d ? "var(--color-accent)" : "var(--color-border)"}`,
                                            background: timeRangeDuration === d ? "color-mix(in srgb, var(--color-accent) 14%, transparent)" : "transparent",
                                            color: timeRangeDuration === d ? "var(--color-accent-text)" : "var(--color-text-secondary)",
                                        }}
                                    >
                                        {d}s
                                    </button>
                                ))}
                                <input
                                    type="number" min={1} max={600} value={timeRangeDuration} aria-label="Custom range in seconds"
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val >= 1 && val <= 600) onTimeRangeDurationChange(val);
                                    }}
                                    className="av-mono"
                                    style={{ width: 46, height: 22, padding: "0 4px", fontSize: 10.5, textAlign: "center", border: "1px solid var(--color-border)", borderRadius: 6, background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                                />
                            </span>
                        </div>
                    </div>

                    <button className="av-btn av-btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={onSubmit}>
                        {replyingTo ? "Post reply" : "Post comment"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentsPanel;
