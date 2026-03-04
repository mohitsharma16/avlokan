import { useState, useRef, useCallback, useEffect } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { RecordModel } from "pocketbase";
import type { Comment, PBUser } from "../../types";
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

    // --- @Mentions state ---
    const [allUsers, setAllUsers] = useState<PBUser[]>([]);
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [filteredUsers, setFilteredUsers] = useState<PBUser[]>([]);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const [mentionStartPos, setMentionStartPos] = useState(0);
    const [pendingMentions, setPendingMentions] = useState<string[]>([]);

    // --- Threading state ---
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

    // --- Task assignment state ---
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignFilteredUsers, setAssignFilteredUsers] = useState<PBUser[]>([]);
    const [selectedAssignIndex, setSelectedAssignIndex] = useState(0);
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);

    // Fetch all users for @mentions
    const fetchUsers = useCallback(async () => {
        try {
            const res = await pb.collection("users").getFullList({
                requestKey: null,
            });
            setAllUsers(
                res.map((u: any) => ({
                    id: u.id,
                    email: u.email,
                    name: u.name || u.email.split("@")[0],
                    avatar: u.avatar,
                }))
            );
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }, [pb]);

    useEffect(() => {
        if (showModal) {
            fetchUsers();
        }
    }, [showModal, fetchUsers]);

    const cancelReply = () => {
        setReplyingTo(null);
    };

    const hideMentionSuggestions = () => {
        setShowMentionSuggestions(false);
        setFilteredUsers([]);
        setSelectedMentionIndex(0);
    };

    const selectMention = (mentionUser: PBUser) => {
        if (!editorRef.current || !monacoInstance) return;

        const editor = editorRef.current;
        const position = editor.getPosition();
        if (!position) return;

        const displayName = mentionUser.name || mentionUser.email.split("@")[0];

        // Replace @partial with @username
        const range = new monacoInstance.Range(
            position.lineNumber,
            mentionStartPos + 1,
            position.lineNumber,
            position.column
        );
        editor.executeEdits("insert-mention", [
            { range, text: `@${displayName} ` },
        ]);

        // Track this mention
        setPendingMentions((prev) => {
            if (prev.includes(mentionUser.id)) return prev;
            return [...prev, mentionUser.id];
        });

        hideMentionSuggestions();
        editor.focus();
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

    const openAssignDropdown = () => {
        setAssignFilteredUsers(allUsers);
        setSelectedAssignIndex(0);
        setShowAssignDropdown(true);

        // Remove $assign text from editor
        if (editorRef.current && monacoInstance) {
            const editor = editorRef.current;
            const position = editor.getPosition();
            if (position) {
                const range = new monacoInstance.Range(
                    position.lineNumber,
                    commandStartPos + 1,
                    position.lineNumber,
                    position.column
                );
                editor.executeEdits("remove-command", [{ range, text: "" }]);
            }
        }
        hideCommandPalette();
    };

    const commands: Command[] = [
        {
            id: "current-time",
            label: "⏱ Current Timestamp",
            description:
                "Insert the current video time as a clickable timestamp",
            action: insertCurrentTimeFrame,
        },
        {
            id: "time-range",
            label: "🔀 Time Range",
            description: `Insert a ${timeRangeDuration}-second range starting from current time`,
            action: insertTimeRange,
        },
        {
            id: "assign-task",
            label: "📋 Assign Task",
            description: "Assign a task to a team member",
            action: openAssignDropdown,
        },
    ];

    const hideCommandPalette = () => {
        setShowCommandPalette(false);
        setFilteredCommands([]);
        setSelectedCommandIndex(0);
    };

    const executeCommand = (command: Command) => {
        command.action();
        if (command.id !== "assign-task") {
            hideCommandPalette();
        }
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

        // Check for @mention trigger
        const atMatch = beforeCursor.match(/@([^\s@$]*)$/);
        if (atMatch) {
            const mentionQuery = atMatch[1];
            const startPos = beforeCursor.lastIndexOf("@");
            setMentionStartPos(startPos);

            // Filter out timestamp-like patterns (e.g., @00:15)
            if (/^\d{1,2}:\d{2}/.test(mentionQuery)) {
                hideMentionSuggestions();
            } else {
                const filtered =
                    mentionQuery === ""
                        ? allUsers
                        : allUsers.filter(
                            (u) =>
                                (u.name || "")
                                    .toLowerCase()
                                    .includes(mentionQuery.toLowerCase()) ||
                                u.email
                                    .toLowerCase()
                                    .includes(mentionQuery.toLowerCase())
                        );

                setFilteredUsers(filtered);
                if (filtered.length > 0) {
                    setShowMentionSuggestions(true);
                    // Hide command palette if it was showing
                    hideCommandPalette();
                } else {
                    hideMentionSuggestions();
                }
            }
            return;
        } else {
            hideMentionSuggestions();
        }

        // Check for $ command trigger
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
                            cmd.label
                                .toLowerCase()
                                .includes(commandText.toLowerCase()) ||
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

            const newComment: any = {
                name: commenterName[0],
                timestamp: capturedTimestamp,
                text: commentText,
                revisionId: revision.id,
            };

            // Threading: set parentId if replying
            if (replyingTo) {
                newComment.parentId = replyingTo.id;
            }

            // @Mentions: include mentioned user IDs
            if (pendingMentions.length > 0) {
                newComment.mentions = JSON.stringify(pendingMentions);
            }

            const created: RecordModel = await pb
                .collection("comments")
                .create(newComment);

            setComments((prev) => {
                // Deduplicate: the realtime subscription may have already added this
                if (prev.some((c) => c.id === (created as any).id)) return prev;
                return [...prev, created as unknown as Comment];
            });

            // Create notification for comment
            try {
                await pb.collection("notifications").create(
                    {
                        userId: "",
                        type: "comment_added",
                        message: `${commenterName[0]} commented on "${revision.title || "a revision"}"`,
                        revisionId: revision.id,
                        sourceUser: commenterName[0],
                        read: false,
                    },
                    { requestKey: null }
                );
            } catch (notifErr) {
                console.warn("Could not create notification:", notifErr);
            }

            // Create notifications for each mentioned user
            for (const mentionedUserId of pendingMentions) {
                try {
                    await pb.collection("notifications").create(
                        {
                            userId: mentionedUserId,
                            type: "mention",
                            message: `${commenterName[0]} mentioned you in a comment on "${revision.title || "a revision"}"`,
                            revisionId: revision.id,
                            sourceUser: commenterName[0],
                            read: false,
                        },
                        { requestKey: null }
                    );
                } catch (notifErr) {
                    console.warn(
                        "Could not create mention notification:",
                        notifErr
                    );
                }
            }

            setCommentText("");
            setTimestampPills([]);
            setPendingMentions([]);
            setReplyingTo(null);
        } catch (error: any) {
            console.error("Error saving comment:", error);
            alert(`Failed to post comment. Error: ${error.message}`);
        }
    };

    const parseTimestamp = (timestamp: string): number => {
        const parts = timestamp.split(":").map(Number);
        if (parts.length === 3)
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
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

    // Realtime subscription for comments
    useEffect(() => {
        if (!revision.id || !showModal) return;

        let unsubscribe: (() => Promise<void>) | null = null;

        pb.collection("comments")
            .subscribe("*", (data: any) => {
                const record = data.record;
                // Only process events for this revision
                if (record.revisionId !== revision.id) return;

                switch (data.action) {
                    case "create":
                        setComments((prev) => {
                            // Deduplicate: skip if already in state (from local submit)
                            if (prev.some((c) => c.id === record.id))
                                return prev;
                            return [
                                ...prev,
                                record as unknown as Comment,
                            ];
                        });
                        break;
                    case "update":
                        setComments((prev) =>
                            prev.map((c) =>
                                c.id === record.id
                                    ? (record as unknown as Comment)
                                    : c
                            )
                        );
                        break;
                    case "delete":
                        setComments((prev) =>
                            prev.filter((c) => c.id !== record.id)
                        );
                        break;
                }
            })
            .then((unsub: () => Promise<void>) => {
                unsubscribe = unsub;
            })
            .catch((err: any) => {
                console.error("Error subscribing to comments:", err);
            });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [revision.id, showModal, pb]);

    // Reset command index when filtered commands change
    useEffect(() => {
        setSelectedCommandIndex(0);
    }, [filteredCommands]);

    // Reset mention index when filtered users change
    useEffect(() => {
        setSelectedMentionIndex(0);
    }, [filteredUsers]);

    // Keydown handler for command palette AND @mentions
    useEffect(() => {
        if (!editorRef.current || !monacoInstance) return;

        const editor = editorRef.current;

        const keydownHandler = (e: any) => {
            // Handle @mentions keyboard navigation
            if (showMentionSuggestions) {
                if (e.keyCode === monacoInstance.KeyCode.DownArrow) {
                    e.preventDefault();
                    setSelectedMentionIndex((prev) =>
                        prev < filteredUsers.length - 1 ? prev + 1 : 0
                    );
                    return;
                } else if (e.keyCode === monacoInstance.KeyCode.UpArrow) {
                    e.preventDefault();
                    setSelectedMentionIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredUsers.length - 1
                    );
                    return;
                } else if (e.keyCode === monacoInstance.KeyCode.Enter) {
                    e.preventDefault();
                    if (filteredUsers[selectedMentionIndex]) {
                        selectMention(filteredUsers[selectedMentionIndex]);
                    }
                    return;
                } else if (e.keyCode === monacoInstance.KeyCode.Escape) {
                    e.preventDefault();
                    hideMentionSuggestions();
                    return;
                }
            }

            // Handle assign dropdown keyboard navigation
            if (showAssignDropdown) {
                if (e.keyCode === monacoInstance.KeyCode.DownArrow) {
                    e.preventDefault();
                    setSelectedAssignIndex((prev) =>
                        prev < assignFilteredUsers.length - 1 ? prev + 1 : 0
                    );
                    return;
                } else if (e.keyCode === monacoInstance.KeyCode.UpArrow) {
                    e.preventDefault();
                    setSelectedAssignIndex((prev) =>
                        prev > 0 ? prev - 1 : assignFilteredUsers.length - 1
                    );
                    return;
                } else if (e.keyCode === monacoInstance.KeyCode.Enter) {
                    e.preventDefault();
                    // Selection handled externally
                    return;
                } else if (e.keyCode === monacoInstance.KeyCode.Escape) {
                    e.preventDefault();
                    setShowAssignDropdown(false);
                    return;
                }
            }

            // Existing command palette handling
            if (!showCommandPalette) {
                if (e.key === "$") {
                    const position = editor.getPosition();
                    const model = editor.getModel();
                    if (!position || !model) return;

                    const line = model.getLineContent(position.lineNumber);
                    const beforeCursor = line.substring(
                        0,
                        position.column - 1
                    );
                    const dollarMatch = beforeCursor.match(/\$([^$\s]*)$/);
                    const startPos = beforeCursor.lastIndexOf("$");

                    setCommandStartPos(startPos);
                    const filtered =
                        dollarMatch && dollarMatch[1] !== ""
                            ? commands.filter(
                                (cmd) =>
                                    cmd.label
                                        .toLowerCase()
                                        .includes(
                                            dollarMatch[1].toLowerCase()
                                        ) ||
                                    cmd.description
                                        .toLowerCase()
                                        .includes(
                                            dollarMatch[1].toLowerCase()
                                        )
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
        showMentionSuggestions,
        filteredUsers,
        selectedMentionIndex,
        showAssignDropdown,
        assignFilteredUsers,
        selectedAssignIndex,
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
    };
}
