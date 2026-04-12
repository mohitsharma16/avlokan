import React, { useState, useEffect, useRef, useCallback } from "react";
import type { AssetCardProps, PBUser } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useAnnotations } from "./useAnnotations";
import type { AnnotationTool } from "./useAnnotations";
import { useCommentEditor } from "./useCommentEditor";
import { useTaskAssignments } from "../../hooks/useTaskAssignments";
import { useVideoZoom } from "../../hooks/useVideoZoom";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import AnnotationToolbar from "./AnnotationToolbar";
import CommentsPanel from "./CommentsPanel";
import AIReviewPanel from "./AIReviewPanel";
import VideoTimeline from "./VideoTimeline";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import { generateShareLink } from "./utils";

const AssetCard: React.FC<AssetCardProps> = ({ revision }: any) => {
  const { user, pb } = useAuth();
  const videoUrl = revision.video
    ? pb.files.getURL(revision, revision.video)
    : "";
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);

  // Snap-to-grid state
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(16);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [shapeSize, setShapeSize] = useState<{ w: number; h: number } | null>(null);

  // Annotation hook
  const {
    isAnnotating,
    annotationTool,
    setAnnotationTool,
    currentAnnotation,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    annotationDuration,
    setAnnotationDuration,
    saveAnnotation,
    clearCurrentAnnotations,
    fetchAnnotations,
    toggleAnnotating,
    fabricCanvasRef,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteSelected,
    annotations,
  } = useAnnotations({
    pb,
    revision,
    user,
    videoRef,
    canvasRef,
    containerRef,
    showModal,
  });

  // Comment editor hook
  const {
    comments,
    commentText,
    timestampPills,
    showCommandPalette,
    filteredCommands,
    selectedCommandIndex,
    timeRangeDuration,
    setTimeRangeDuration,
    handleEditorChange,
    handleEditorMount,
    handleSubmit,
    executeCommand,
    removePill,
    seekToTimestamp,
    fetchComments,
    // @Mentions
    showMentionSuggestions,
    filteredUsers,
    selectedMentionIndex,
    selectMention,
    allUsers,
    // Threading
    replyingTo,
    setReplyingTo,
    cancelReply,
    // Task assignment
    showAssignDropdown,
    setShowAssignDropdown,
    assignFilteredUsers,
    selectedAssignIndex,
  } = useCommentEditor({
    pb,
    revision,
    user,
    videoRef,
    showModal,
  });

  // Task assignments hook
  const { tasks, createTask, updateTaskStatus } = useTaskAssignments({
    pb,
    revisionId: revision.id,
  });

  // Zoom hook
  const {
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    transformStyle,
    isZoomed,
  } = useVideoZoom({ containerRef });

  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    videoRef,
    isModalOpen: showModal,
    onCloseModal: () => setShowModal(false),
    onSubmitComment: handleSubmit,
    onToggleAnnotating: toggleAnnotating,
    onToggleHelp: () => setShowHelpOverlay((p) => !p),
  });

  // Handle assign task to user
  const handleAssignTask = useCallback(
    async (assignUser: PBUser) => {
      const assignerName = user?.name || user?.email?.split("@")[0] || "Unknown";
      const description = commentText.trim() || "Task from comment";
      try {
        await createTask(
          "", // commentId will be set after comment is created
          assignUser.name || assignUser.email.split("@")[0],
          assignerName,
          description
        );
        setShowAssignDropdown(false);
      } catch (err) {
        console.error("Failed to assign task:", err);
      }
    },
    [createTask, user, commentText, setShowAssignDropdown]
  );

  // Sidebar resize logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 280;
      const maxWidth = window.innerWidth * 0.6;

      setSidebarWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Fetch comments and annotations when modal opens
  useEffect(() => {
    if (showModal) {
      fetchComments();
      fetchAnnotations();
    }
  }, [showModal, revision.id, pb]);

  // Playback-synced comments: find the comment closest to current time
  useEffect(() => {
    if (!videoRef.current || !showModal) return;

    const video = videoRef.current;

    const parseTs = (ts: string): number => {
      if (!ts) return -1;
      const startTs = ts.includes("-") ? ts.split("-")[0] : ts;
      const parts = startTs.trim().split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return parts[0] || 0;
    };

    const onTimeUpdate = () => {
      const ct = video.currentTime;
      let bestId: string | null = null;
      let bestDist = Infinity;

      for (const c of comments) {
        if (!c.timestamp) continue;
        const ts = parseTs(c.timestamp);
        if (ts < 0) continue;
        const dist = Math.abs(ct - ts);
        if (dist < 2 && dist < bestDist) {
          bestDist = dist;
          bestId = c.id;
        }
      }

      setActiveCommentId(bestId);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [showModal, comments]);

  // Handle timeline marker click
  const handleMarkerClick = useCallback(
    (commentId: string, timestamp: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = timestamp;
      }
      setActiveCommentId(commentId);
    },
    [videoRef]
  );

  // Keyboard shortcuts for annotation tools
  useEffect(() => {
    if (!isAnnotating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when editing a Textbox on the canvas
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && (activeObj as any).isEditing) return;
      }

      // Don't intercept when typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        if (canvas) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
        return;
      }

      // Tool shortcuts (single letter, no modifiers)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const toolMap: Record<string, AnnotationTool> = {
        p: 'pen',
        r: 'rectangle',
        c: 'circle',
        a: 'arrow',
        h: 'highlight',
        t: 'text',
      };

      const tool = toolMap[e.key.toLowerCase()];
      if (tool) {
        setAnnotationTool(tool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnnotating, undo, redo, deleteSelected, setAnnotationTool, fabricCanvasRef]);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = generateShareLink(revision.id);
    navigator.clipboard.writeText(link);
    alert("Share link copied to clipboard!");
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
          cursor: "pointer",
          transition: "var(--transition)",
          fontFamily: "var(--font-apple)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-hover)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--bg)" }}>
          {videoUrl && (
            <video
              src={videoUrl}
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {revision.title || "Untitled Revision"}
          </h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {new Date(revision.created).toLocaleString()}
            </span>
            <span style={{
              background: "rgba(48,209,88,0.12)",
              color: "#30D158",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "var(--radius-pill)",
            }}>
              v{revision.versionNumber || 1}
            </span>
          </div>
          {!!revision.description && (
            <div
              style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: "1.5" }}
              dangerouslySetInnerHTML={{ __html: revision.description }}
            />
          )}
          <div style={{ paddingTop: 4 }}>
            <button
              onClick={handleShareClick}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--accent)",
                background: "rgba(0,113,227,0.08)",
                border: "none",
                borderRadius: "var(--radius-pill)",
                padding: "5px 14px",
                cursor: "pointer",
                transition: "var(--transition)",
                fontFamily: "var(--font-apple)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(0,113,227,0.15)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(0,113,227,0.08)")}
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "stretch" }}>
          <div style={{ position: "relative", background: "var(--bg-elevated)", width: "100%", height: "100%", display: "flex" }}>
            <div className="flex-1 bg-black relative" ref={containerRef}>
              {videoUrl && (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 10,
                      pointerEvents: isAnnotating ? 'auto' : 'none',
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                    />
                  </div>
                </>
              )}

              {/* Zoom Toolbar */}
              <div className="absolute bottom-10 left-4 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                <button onClick={zoomOut} className="text-white text-sm px-1.5 py-0.5 hover:bg-white/20 rounded" title="Zoom out">−</button>
                <span className="text-white text-xs font-mono min-w-[36px] text-center">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={zoomIn} className="text-white text-sm px-1.5 py-0.5 hover:bg-white/20 rounded" title="Zoom in">+</button>
                {isZoomed && (
                  <button onClick={resetZoom} className="text-white text-xs px-1.5 py-0.5 hover:bg-white/20 rounded ml-1" title="Reset zoom">⟲</button>
                )}
              </div>

              {/* Annotation Toolbar */}
              {isAnnotating && (
                <AnnotationToolbar
                  annotationTool={annotationTool}
                  setAnnotationTool={setAnnotationTool}
                  brushColor={brushColor}
                  setBrushColor={setBrushColor}
                  brushSize={brushSize}
                  setBrushSize={setBrushSize}
                  annotationDuration={annotationDuration}
                  setAnnotationDuration={setAnnotationDuration}
                  onSave={saveAnnotation}
                  onClear={clearCurrentAnnotations}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  snapToGrid={snapToGrid}
                  onToggleSnap={() => setSnapToGrid((p) => !p)}
                  gridSize={gridSize}
                  onGridSizeChange={setGridSize}
                  cursorPosition={cursorPosition}
                  shapeSize={shapeSize}
                />
              )}

              {/* Annotation Toggle Button */}
              <button
                onClick={toggleAnnotating}
                className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-medium transition-colors z-20 ${isAnnotating
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
              >
                {isAnnotating ? 'Exit Annotation' : 'Annotate'}
              </button>

              {/* Video Timeline with markers */}
              <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-1">
                <VideoTimeline
                  videoRef={videoRef}
                  comments={comments}
                  annotations={annotations}
                  activeCommentId={activeCommentId}
                  onMarkerClick={handleMarkerClick}
                />
              </div>
            </div>

            <div
              style={{
                width: `${sidebarWidth}px`,
                background: "var(--bg-elevated)",
                borderLeft: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <div style={{ flex: 1, overflowY: "auto" }}>
                <CommentsPanel
                  comments={comments}
                  isAnnotating={isAnnotating}
                  currentAnnotation={currentAnnotation}
                  showCommandPalette={showCommandPalette}
                  filteredCommands={filteredCommands}
                  selectedCommandIndex={selectedCommandIndex}
                  timestampPills={timestampPills}
                  commentText={commentText}
                  timeRangeDuration={timeRangeDuration}
                  onTimeRangeDurationChange={setTimeRangeDuration}
                  onClose={() => setShowModal(false)}
                  onResizeStart={handleResizeStart}
                  onSeekToTimestamp={seekToTimestamp}
                  onExecuteCommand={executeCommand}
                  onRemovePill={removePill}
                  onEditorChange={handleEditorChange}
                  onEditorMount={handleEditorMount}
                  onSubmit={handleSubmit}
                  activeCommentId={activeCommentId}
                  // @Mentions
                  showMentionSuggestions={showMentionSuggestions}
                  filteredUsers={filteredUsers}
                  selectedMentionIndex={selectedMentionIndex}
                  onSelectMention={selectMention}
                  // Threading
                  replyingTo={replyingTo}
                  onReply={setReplyingTo}
                  onCancelReply={cancelReply}
                  // Tasks
                  tasks={tasks}
                  onUpdateTaskStatus={updateTaskStatus}
                  // Assign dropdown
                  showAssignDropdown={showAssignDropdown}
                  assignFilteredUsers={assignFilteredUsers}
                  selectedAssignIndex={selectedAssignIndex}
                  onAssignTask={handleAssignTask}
                  onCloseAssignDropdown={() => setShowAssignDropdown(false)}
                />
                <div className="px-4 pb-4">
                  <AIReviewPanel videoRef={videoRef} />
                </div>
              </div>
            </div>
          </div>
        </div >
      )}

      {/* Keyboard Shortcuts Help Overlay */}
      <KeyboardShortcutsHelp
        isOpen={showHelpOverlay}
        onClose={() => setShowHelpOverlay(false)}
      />
    </>
  );
};

export default AssetCard;