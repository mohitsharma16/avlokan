import React, { useState, useEffect, useRef } from "react";
import type { RecordModel } from "pocketbase";
import type { AssetRevision, Comment, AssetCardProps } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Editor, type OnMount } from "@monaco-editor/react";

interface Command {
  id: string;
  label: string;
  description: string;
  action: () => void;
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
  const editorRef = useRef<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [capturedTimestamp, setCapturedTimestamp] = useState<string | null>(
    null
  );
  const [monacoInstance, setMonacoInstance] = useState<any>(null);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPalettePosition, setCommandPalettePosition] = useState({
    x: 0,
    y: 0,
  });
  const [commandStartPos, setCommandStartPos] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

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
            const editorElement = editor.getDomNode();
            if (!editorElement) return;
            const rect = editorElement.getBoundingClientRect();
            setCommandPalettePosition({ x: rect.left + 10, y: rect.top - 10 });
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

      setCapturedTimestamp(formattedTime);

      const position = editor.getPosition();
      if (!position) return;

      const range = new monacoInstance.Range(
        position.lineNumber,
        commandStartPos + 1,
        position.lineNumber,
        position.column
      );

      editor.executeEdits("insert-timestamp", [{ range, text: timeTag }]);
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

      const editor = editorRef.current;
      const position = editor.getPosition();
      if (!position) return;

      const range = new monacoInstance.Range(
        position.lineNumber,
        commandStartPos + 1,
        position.lineNumber,
        position.column
      );

      editor.executeEdits("insert-time-range", [{ range, text: timeRange }]);
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
        const editorElement = editor.getDomNode();
        if (!editorElement) return;
        const rect = editorElement.getBoundingClientRect();
        setCommandPalettePosition({ x: rect.left + 10, y: rect.top - 10 });
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
      const newComment = {
        name: commenterName[0],
        timestamp: capturedTimestamp || "",
        text: commentText,
        revisionId: revision.id,
      };

      const created: RecordModel = await pb
        .collection("comments")
        .create(newComment);

      setComments((prev) => [...prev, created as unknown as Comment]);

      setCommentText("");
      setCapturedTimestamp(null);
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
              className="text-gray-700 text-sm leading-relaxed prose max-w-none"
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
            <div className="flex-1 bg-black">
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className=" bg-white border-l border-gray-200 p-4 flex flex-col">
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

              <div className="flex-1 overflow-y-auto  pr-1">
                {comments.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No comments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[90vh] overflow-y-auto pr-2">
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
                                className="  bg-white rounded-full border px-2 text-black hover:text-black hover:bg-green-300 font-normal text-sm"
                              >
                                {comment.timestamp}
                              </button>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showCommandPalette && filteredCommands.length > 0 && (
                <div
                  className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-[60] min-w-64"
                  style={{
                    left: `${commandPalettePosition.x}px`,
                    top: `${commandPalettePosition.y}px`,
                  }}
                >
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

              <div className="mt-4 space-y-2 border-t pt-4 relative">
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
                  className="bg-green-600 text-white px-3 py-1 rounded w-full"
                  onClick={handleSubmit}
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssetCard;
