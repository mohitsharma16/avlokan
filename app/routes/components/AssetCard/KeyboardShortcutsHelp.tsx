import React from "react";
import { SHORTCUTS } from "../../hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
    isOpen,
    onClose,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
        >
            <div
                className="animate-apple-scale-in"
                style={{
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-modal)",
                    border: "1px solid var(--border)",
                    padding: 24,
                    maxWidth: 420,
                    width: "100%",
                    margin: "0 16px",
                    fontFamily: "var(--font-apple)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}>
                        ⌨️ Keyboard Shortcuts
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ color: "var(--text-tertiary)", fontSize: 20, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-1">
                    {SHORTCUTS.map((shortcut, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-2 px-2 rounded-lg transition-colors"
                            style={{ borderRadius: "var(--radius-sm)" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--bg)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                        >
                            <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
                                {shortcut.description}
                            </span>
                            <kbd
                                style={{
                                    padding: "3px 8px",
                                    background: "var(--bg)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontFamily: "ui-monospace, monospace",
                                    color: "var(--text-secondary)",
                                    minWidth: 60,
                                    textAlign: "center",
                                }}
                            >
                                {shortcut.key}
                            </kbd>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)", textAlign: "center" }}>
                    <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
                        Press{" "}
                        <kbd style={{ padding: "2px 5px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", fontFamily: "ui-monospace, monospace" }}>
                            ?
                        </kbd>{" "}
                        to toggle
                    </span>
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsHelp;
