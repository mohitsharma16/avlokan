import { useState, useRef, useCallback, useEffect } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { RecordModel } from "pocketbase";
import type { Comment } from "../../types";
import { formatTime, type Command, type TimestampPill } from "./utils";

interface UseCommentEditorProps {
    pb: any;
    revision: any;
    user: any;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    showModal: boolean;
}

export function useCommentEditor({
    pb,
    revision,
    user,
    videoRef,
    showModal,
}: UseCommentEditorProps) {
    const editorRef = useRef<any>(null);

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [timestampPills, setTimestampPills] = useState<TimestampPill[]>([]);
    const [monacoInstance, setMonacoInstance] = useState<any>(null);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [commandStartPos, setCommandStartPos] = useState(0);
    const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [timeRangeDuration, setTimeRangeDuration] = useState(30);

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
            const endTime = currentTime + timeRangeDuration;

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
            label: "⏱ Current Timestamp",
            description: "Insert the current video time as a clickable timestamp",
            action: insertCurrentTimeFrame,
        },
        {
            id: "time-range",
            label: "🔀 Time Range",
            description: `Insert a ${timeRangeDuration}-second range starting from current time`,
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

    const parseTimestamp = (timestamp: string): number => {
        const parts = timestamp.split(":").map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return parts[0] || 0;
    };

    const seekToTimestamp = (ts: string) => {
        // Handle range format like "00:07-00:37" — seek to start time
        const startTs = ts.includes("-") ? ts.split("-")[0] : ts;
        const seconds = parseTimestamp(startTs.trim());
        if (videoRef.current && !isNaN(seconds)) {
            videoRef.current.currentTime = seconds;
            videoRef.current.play();
        }
    };

    // Fetch comments from PocketBase when modal opens
    const fetchComments = useCallback(async () => {
        if (!revision.id) return;
        try {
            const res = await pb.collection("comments").getFullList({
                filter: `revisionId = "${revision.id}"`,
                sort: "created",
            });
            setComments(res);
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    }, [revision.id, pb]);

    // Reset command index when filtered commands change
    useEffect(() => {
        setSelectedCommandIndex(0);
    }, [filteredCommands]);

    // Keydown handler for command palette
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

    return {
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
        setComments,
    };
}
