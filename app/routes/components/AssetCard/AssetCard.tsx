import React, { useState, useEffect, useRef, useCallback } from "react";
import type { AssetCardProps } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useAnnotations } from "./useAnnotations";
import type { AnnotationTool } from "./useAnnotations";
import { useCommentEditor } from "./useCommentEditor";
import AnnotationToolbar from "./AnnotationToolbar";
import CommentsPanel from "./CommentsPanel";
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
  } = useCommentEditor({
    pb,
    revision,
    user,
    videoRef,
    showModal,
  });

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
        className="rounded-2xl shadow-lg overflow-hidden bg-white max-w-md mx-auto border border-gray-200 transition-transform hover:scale-[1.01] cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="w-full aspect-video bg-gray-100">
          {videoUrl && (
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-cover rounded-t-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {revision.title || "Untitled Revision"}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{new Date(revision.created).toLocaleString()}</span>
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
              v{revision.versionNumber || 1}
            </span>
          </div>
          {!!revision.description && (
            <div
              className="text-gray-700 text-sm leading-relaxed prose max-w-none break-words overflow-wrap-anywhere"
              dangerouslySetInnerHTML={{ __html: revision.description }}
            />
          )}
          <div className="pt-2">
            <button
              onClick={handleShareClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="relative bg-white w-full h-full flex">
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
            </div>

            <CommentsPanel
              comments={comments}
              isAnnotating={isAnnotating}
              currentAnnotation={currentAnnotation}
              showCommandPalette={showCommandPalette}
              filteredCommands={filteredCommands}
              selectedCommandIndex={selectedCommandIndex}
              timestampPills={timestampPills}
              commentText={commentText}
              sidebarWidth={sidebarWidth}
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
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AssetCard;