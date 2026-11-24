import React from "react";
import type { PBUser } from "../../types";

interface MentionSuggestionsProps {
    users: PBUser[];
    selectedIndex: number;
    onSelect: (user: PBUser) => void;
}

const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
    users,
    selectedIndex,
    onSelect,
}) => {
    if (users.length === 0) return null;

    return (
        <div className="mb-3 overflow-hidden" style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-strong)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-hover)", backdropFilter: "blur(8px)" }}>
            <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--color-border-strong)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Mention
                </div>
            </div>
            <div className="p-1 max-h-48 overflow-y-auto">
                {users.map((user, index) => {
                    const displayName = user.name || user.email.split("@")[0];
                    const isSel = index === selectedIndex;
                    return (
                        <div
                            key={user.id}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                            style={{
                                background: isSel ? "var(--accent)" : "transparent",
                                boxShadow: isSel ? "0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent)" : "none",
                            }}
                            onClick={() => onSelect(user)}
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
                                <div
                                    style={{ fontSize: 11, color: isSel ? "color-mix(in srgb, var(--color-accent-ink) 70%, transparent)" : "var(--color-text-tertiary)" }}
                                    className="truncate"
                                >
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    );
                })}
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
    );
};

export default MentionSuggestions;
