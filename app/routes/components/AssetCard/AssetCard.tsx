import React, { useState, useEffect, useRef, useCallback } from "react";
import type { RecordModel } from "pocketbase";
import type { AssetRevision, Comment, AssetCardProps } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Editor, type OnMount } from "@monaco-editor/react";
import { Canvas, FabricObject, Circle, Rect, Textbox, PencilBrush } from "fabric";

interface Command {
  id: string;
  label: string;
  description: string;
  action: () => void;
}

interface TimestampPill {
  id: string;
  text: string;
  timestamp: string;
}

interface Annotation {
  id: string;
  timestamp: number;
  canvasData: any;
  objects: any[];
}

function generateShareLink(revisionId: string): string {
  const expires = Date.now() + 60 * 60 * 1000;
  const token = crypto.randomUUID();
  return `http://localhost:5173/revision/${revisionId}?token=${token}&expires=${expires}`;
}

const AssetCard: React.FC<AssetCardProps> = ({ revision }: any) => {
  const { user, pb } = useAuth();
  const videoUrl = revision.video
    ? pb.files.getURL(revision, revision.video)
    : "";
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [timestampPills, setTimestampPills] = useState<TimestampPill[]>([]);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);

  // Annotation states
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<'pen' | 'rectangle' | 'circle' | 'text' | 'arrow'>('pen');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(3);
  const [showAnnotationTools, setShowAnnotationTools] = useState(false);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandStartPos, setCommandStartPos] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Initialize Fabric.js canvas
  const initializeFabricCanvas = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || fabricCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: false,
      selection: true,
      preserveObjectStacking: true,
    });

    // Set canvas size to match video
    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        const containerWidth = video.clientWidth;
        const containerHeight = video.clientHeight;

        canvas.setDimensions({
          width: containerWidth,
          height: containerHeight
        });
        canvas.renderAll();
      }
    };

    video.addEventListener('loadedmetadata', updateCanvasSize);
    video.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();

    fabricCanvasRef.current = canvas;

    // Set up drawing properties
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushSize;
    }

    return () => {
      video.removeEventListener('loadedmetadata', updateCanvasSize);
      video.removeEventListener('resize', updateCanvasSize);
      canvas.dispose();
    };
  }, [brushColor, brushSize]);

  // Save current annotation
  const saveAnnotation = useCallback(() => {
    if (!fabricCanvasRef.current || !videoRef.current) return;

    const canvas = fabricCanvasRef.current;
    const video = videoRef.current;
    const timestamp = video.currentTime;

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      timestamp,
      canvasData: canvas.toObject(),
      objects: canvas.getObjects(),
    };

    setAnnotations(prev => {
      const filtered = prev.filter(ann => Math.abs(ann.timestamp - timestamp) > 0.5);
      return [...filtered, annotation];
    });

    setCurrentAnnotation(annotation);
  }, []);

  // Load annotation for current timestamp
  const loadAnnotationForTime = useCallback((timestamp: number) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const annotation = annotations.find(ann =>
      Math.abs(ann.timestamp - timestamp) < 0.5
    );

    canvas.clear();

    if (annotation) {
      canvas.loadFromJSON(annotation.canvasData).then(() => {
        canvas.renderAll();
        setCurrentAnnotation(annotation);
      });
    } else {
      setCurrentAnnotation(null);
    }
  }, [annotations]);

  // Set up annotation tools
  const setupAnnotationTool = useCallback((tool: string) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    canvas.isDrawingMode = false;
    canvas.selection = true;

    switch (tool) {
      case 'pen':
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = brushColor;
          canvas.freeDrawingBrush.width = brushSize;
        }
        break;
      case 'rectangle':
        canvas.defaultCursor = 'crosshair';
        break;
      case 'circle':
        canvas.defaultCursor = 'crosshair';
        break;
      case 'text':
        canvas.defaultCursor = 'text';
        break;
      case 'arrow':
        canvas.defaultCursor = 'crosshair';
        break;
    }
  }, [brushColor, brushSize]);

  // Handle mouse events for shape drawing
  const handleMouseDown = useCallback((e: any) => {
    if (!fabricCanvasRef.current || annotationTool === 'pen') return;

    const canvas = fabricCanvasRef.current;
    const pointer = canvas.getPointer(e.e);

    let shape: FabricObject | null = null;

    switch (annotationTool) {
      case 'rectangle':
        shape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
        });
        break;
      case 'circle':
        shape = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
        });
        break;
      case 'text':
        const text = prompt('Enter text:');
        if (text) {
          shape = new Textbox(text, {
            left: pointer.x,
            top: pointer.y,
            fill: brushColor,
            fontSize: brushSize * 6,
          });
        }
        break;
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  }, [annotationTool, brushColor, brushSize]);

  // Clear all annotations on current timestamp
  const clearCurrentAnnotations = useCallback(() => {
    if (!fabricCanvasRef.current || !videoRef.current) return;

    const canvas = fabricCanvasRef.current;
    const timestamp = videoRef.current.currentTime;

    canvas.clear();
    setAnnotations(prev =>
      prev.filter(ann => Math.abs(ann.timestamp - timestamp) > 0.5)
    );
    setCurrentAnnotation(null);
  }, []);

  // Initialize fabric canvas when modal opens
  useEffect(() => {
    if (showModal && canvasRef.current && videoRef.current) {
      const cleanup = initializeFabricCanvas();
      return cleanup;
    }
  }, [showModal, initializeFabricCanvas]);

  // Set up annotation tool when it changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      setupAnnotationTool(annotationTool);
    }
  }, [annotationTool, setupAnnotationTool]);

  // Add mouse event listeners for shape drawing
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    canvas.on('mouse:down', handleMouseDown);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [handleMouseDown]);

  // Load annotations when video time changes
  useEffect(() => {
    if (!videoRef.current || !showModal) return;

    const video = videoRef.current;
    const handleTimeUpdate = () => {
      loadAnnotationForTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [showModal, loadAnnotationForTime]);

  // Existing useEffect hooks remain the same...
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

  useEffect(() => {
    const fetchComments = async () => {
      if (!revision.id) return;
      try {
        const res = await pb.collection("comments").getFullList<Comment>({
          filter: `revisionId = "${revision.id}"`,
          sort: "created",
        });
        setComments(res);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };
    if (showModal) {
      fetchComments();
    }
  }, [showModal, revision.id, pb]);

  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [filteredCommands]);

  useEffect(() => {
    if (!editorRef.current || !monacoInstance) return;

    const editor = editorRef.current;

    const keydownHandler = (e: any) => {
      if (!showCommandPalette) {
        if (e.key === "$") {
          const position = editor.getPosition();
          const model = editor.getModel();
          if (!position || !model) return;

          const line = model.getLineContent(position.lineNumber);
          const beforeCursor = line.substring(0, position.column - 1);
          const dollarMatch = beforeCursor.match(/\$([^$\s]*)$/);
          const startPos = beforeCursor.lastIndexOf("$");

          setCommandStartPos(startPos);
          const filtered =
            dollarMatch && dollarMatch[1] !== ""
              ? commands.filter(
                  (cmd) =>
                    cmd.label
                      .toLowerCase()
                      .includes(dollarMatch[1].toLowerCase()) ||
                    cmd.description
                      .toLowerCase()
                      .includes(dollarMatch[1].toLowerCase())
                )
              : commands;

          setFilteredCommands(filtered);

          if (filtered.length > 0) {
            setShowCommandPalette(true);
          }
        }
        return;
      }

      if (e.keyCode === monacoInstance.KeyCode.DownArrow) {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.keyCode === monacoInstance.KeyCode.UpArrow) {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.keyCode === monacoInstance.KeyCode.Enter) {
        e.preventDefault();
        if (filteredCommands[selectedCommandIndex]) {
          executeCommand(filteredCommands[selectedCommandIndex]);
        }
      } else if (e.keyCode === monacoInstance.KeyCode.Escape) {
        e.preventDefault();
        hideCommandPalette();
      }
    };

    const disposable = editor.onKeyDown(keydownHandler);

    return () => {
      disposable.dispose();
    };
  }, [
    showCommandPalette,
    filteredCommands,
    selectedCommandIndex,
    monacoInstance,
  ]);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(timeInSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const insertCurrentTimeFrame = () => {
    if (videoRef.current && editorRef.current && monacoInstance) {
      const editor = editorRef.current;
      const currentTime = videoRef.current.currentTime;
      const formattedTime = formatTime(currentTime);
      const timeTag = `@${formattedTime}`;

      const newPill: TimestampPill = {
        id: crypto.randomUUID(),
        text: timeTag,
        timestamp: formattedTime,
      };

      setTimestampPills((prev) => [...prev, newPill]);

      const position = editor.getPosition();
      if (!position) return;

      const range = new monacoInstance.Range(
        position.lineNumber,
        commandStartPos + 1,
        position.lineNumber,
        position.column
      );

      editor.executeEdits("remove-command", [{ range, text: "" }]);
      editor.focus();
    }
  };

  const insertTimeRange = () => {
    if (videoRef.current && editorRef.current && monacoInstance) {
      const currentTime = videoRef.current.currentTime;
      const startTime = Math.max(0, currentTime);
      const endTime = currentTime + 30;

      const startFormatted = formatTime(startTime);
      const endFormatted = formatTime(endTime);
      const timeRange = `@${startFormatted}-${endFormatted}`;
      const newPill: TimestampPill = {
        id: crypto.randomUUID(),
        text: timeRange,
        timestamp: `${startFormatted}-${endFormatted}`,
      };

      setTimestampPills((prev) => [...prev, newPill]);
      const editor = editorRef.current;
      const position = editor.getPosition();
      if (!position) return;

      const range = new monacoInstance.Range(
        position.lineNumber,
        commandStartPos + 1,
        position.lineNumber,
        position.column
      );

      editor.executeEdits("remove-command", [{ range, text: "" }]);
      editor.focus();
    }
  };

  const commands: Command[] = [
    {
      id: "current-time",
      label: "Current Time Frame",
      description: "Insert current video timestamp",
      action: insertCurrentTimeFrame,
    },
    {
      id: "time-range",
      label: "Time Range",
      description: "Insert time range (±30 seconds)",
      action: insertTimeRange,
    },
  ];

  const hideCommandPalette = () => {
    setShowCommandPalette(false);
    setFilteredCommands([]);
    setSelectedCommandIndex(0);
  };

  const executeCommand = (command: Command) => {
    command.action();
    hideCommandPalette();
  };

  const removePill = (pillId: string) => {
    setTimestampPills((prev) => prev.filter((pill) => pill.id !== pillId));
  };

  const handleEditorChange = (value: string | undefined) => {
    setCommentText(value || "");

    if (!editorRef.current || !monacoInstance) return;

    const editor = editorRef.current;
    const position = editor.getPosition();
    if (!position) return;

    const model = editor.getModel();
    if (!model) return;

    const line = model.getLineContent(position.lineNumber);
    const beforeCursor = line.substring(0, position.column - 1);
    const dollarMatch = beforeCursor.match(/\$([^$\s]*)$/);

    if (dollarMatch) {
      const commandText = dollarMatch[1];
      const startPos = beforeCursor.lastIndexOf("$");
      setCommandStartPos(startPos);

      const filtered =
        commandText === ""
          ? commands
          : commands.filter(
              (cmd) =>
                cmd.label.toLowerCase().includes(commandText.toLowerCase()) ||
                cmd.description
                  .toLowerCase()
                  .includes(commandText.toLowerCase())
            );

      setFilteredCommands(filtered);

      if (filtered.length > 0) {
        setShowCommandPalette(true);
      } else {
        hideCommandPalette();
      }
    } else {
      hideCommandPalette();
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setMonacoInstance(monaco);
  };

  const handleSubmit = async () => {
    const commenterName = user?.name || user?.email.split("@");

    if (!commenterName || !commentText.trim()) {
      alert(
        "Cannot post comment: User name is missing or comment text is empty."
      );
      return;
    }

    try {
      const capturedTimestamp =
        timestampPills.length > 0 ? timestampPills[0].timestamp : "";

      const newComment = {
        name: commenterName[0],
        timestamp: capturedTimestamp,
        text: commentText,
        revisionId: revision.id,
      };

      const created: RecordModel = await pb
        .collection("comments")
        .create(newComment);

      setComments((prev) => [...prev, created as unknown as Comment]);

      setCommentText("");
      setTimestampPills([]);
    } catch (error: any) {
      console.error("Error saving comment:", error);
      alert(`Failed to post comment. Error: ${error.message}`);
    }
  };

  const seekToTimestamp = (ts: string) => {
    const parts = ts.split(":").map(Number);
    const seconds =
      parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0];
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

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
        <div className="p-5 space-y-2">
          {revision.title && (
            <h3 className="text-xl font-bold text-gray-900">
              {revision.title}
            </h3>
          )}
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
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 pointer-events-auto"
                    style={{
                      pointerEvents: isAnnotating ? 'auto' : 'none',
                      zIndex: 10,
                    }}
                  />
                </>
              )}

              {/* Annotation Toolbar */}
              {isAnnotating && (
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

                  <button
                    onClick={saveAnnotation}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                    title="Save Annotation"
                  >
                    Save
                  </button>

                  <button
                    onClick={clearCurrentAnnotations}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                    title="Clear Annotations"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Annotation Toggle Button */}
              <button
                onClick={() => {
                  setIsAnnotating(!isAnnotating);
                  if (fabricCanvasRef.current) {
                    fabricCanvasRef.current.selection = !isAnnotating;
                  }
                }}
                className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-medium transition-colors z-20 ${
                  isAnnotating
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isAnnotating ? 'Exit Annotation' : 'Annotate'}
              </button>
            </div>

            <div
              className="bg-white border-l border-gray-200 p-4 flex flex-col min-h-0 relative"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize z-10 transition-colors"
                onMouseDown={handleResizeStart}
              />

              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold">
                  Comments ({comments.length})
                </h2>
                <button
                  className="text-sm text-red-500 hover:underline"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>

              {/* Annotation Info */}
              {currentAnnotation && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm text-blue-800">
                    📝 Annotation at {formatTime(currentAnnotation.timestamp)}
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
                                  seekToTimestamp(comment.timestamp)
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
                <div className="bg-white border border-gray-300 rounded-lg shadow-lg mb-2 min-w-64">
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-2 px-2">
                      COMMANDS
                    </div>
                    {filteredCommands.map((command, index) => (
                      <div
                        key={command.id}
                        className={`flex items-center px-3 py-2 rounded cursor-pointer transition-colors ${
                          index === selectedCommandIndex
                            ? "bg-blue-100 text-blue-900"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => executeCommand(command)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {command.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {command.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-400">
                    ↑↓ to navigate • Enter to select • Esc to dismiss
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
                          className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium border border-blue-200"
                        >
                          <span>{pill.text}</span>
                          <button
                            onClick={() => removePill(pill.id)}
                            className="text-blue-600 hover:text-blue-800 ml-1 focus:outline-none"
                            title="Remove timestamp"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Editor
                      className="w-full border rounded-md"
                      theme="light"
                      height="120px"
                      defaultLanguage="markdown"
                      value={commentText}
                      onChange={handleEditorChange}
                      onMount={handleEditorMount}
                      options={{
                        placeholder:
                          "Write Your comment... (Press $ to open commands)",
                        fontSize: 14,
                        minimap: { enabled: false },
                        contextMenu: false,
                        bracketPairGuides: {
                          indentation: false,
                          highlightActiveIndentation: false,
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
                    className="bg-green-600 text-white px-3 py-1 rounded w-full mt-2"
                    onClick={handleSubmit}
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssetCard;