import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutsProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isModalOpen: boolean;
    onCloseModal?: () => void;
    onSubmitComment?: () => void;
    onToggleAnnotating?: () => void;
    onToggleHelp?: () => void;
    onFocusEditor?: () => void;
    editorRef?: React.MutableRefObject<any>;
}

export function useKeyboardShortcuts({
    videoRef,
    isModalOpen,
    onCloseModal,
    onSubmitComment,
    onToggleAnnotating,
    onToggleHelp,
    onFocusEditor,
    editorRef,
}: UseKeyboardShortcutsProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isModalOpen) return;

            const target = e.target as HTMLElement;
            const isInputActive =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable ||
                target.classList.contains("monaco-mouse-cursor-text");

            // Monaco editor check
            const isMonacoActive = !!target.closest(".monaco-editor");

            // Ctrl+Enter → submit comment (works inside editor too)
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                onSubmitComment?.();
                return;
            }

            // Don't intercept other shortcuts when typing in inputs
            if (isInputActive || isMonacoActive) return;

            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    onCloseModal?.();
                    break;

                case " ": // Space → play/pause
                    e.preventDefault();
                    if (videoRef.current) {
                        if (videoRef.current.paused) {
                            videoRef.current.play();
                        } else {
                            videoRef.current.pause();
                        }
                    }
                    break;

                case "ArrowLeft":
                    e.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.currentTime -= e.shiftKey ? 1 : 5;
                    }
                    break;

                case "ArrowRight":
                    e.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.currentTime += e.shiftKey ? 1 : 5;
                    }
                    break;

                case "?":
                    e.preventDefault();
                    onToggleHelp?.();
                    break;

                case "n":
                case "N":
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        onFocusEditor?.();
                    }
                    break;

                case "a":
                case "A":
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        onToggleAnnotating?.();
                    }
                    break;
            }
        },
        [
            isModalOpen,
            videoRef,
            onCloseModal,
            onSubmitComment,
            onToggleAnnotating,
            onToggleHelp,
            onFocusEditor,
        ]
    );

    useEffect(() => {
        if (!isModalOpen) return;
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModalOpen, handleKeyDown]);
}

export const SHORTCUTS = [
    { key: "Space", description: "Play / Pause video" },
    { key: "←", description: "Seek back 5s" },
    { key: "→", description: "Seek forward 5s" },
    { key: "Shift + ←", description: "Seek back 1s (frame step)" },
    { key: "Shift + →", description: "Seek forward 1s (frame step)" },
    { key: "Ctrl + Scroll", description: "Zoom in / out" },
    { key: "Shift + Drag", description: "Pan (when zoomed)" },
    { key: "N", description: "Focus comment editor" },
    { key: "Ctrl + Enter", description: "Submit comment" },
    { key: "A", description: "Toggle annotation mode" },
    { key: "Esc", description: "Close modal" },
    { key: "?", description: "Show / hide shortcuts" },
];
