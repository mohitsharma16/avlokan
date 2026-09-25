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
        <div className="mb-3 overflow-hidden" style={{ background: "#18181B", border: "1px solid #2E2E33", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-hover)", backdropFilter: "blur(8px)" }}>
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #2E2E33" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    👤 Mention User
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
                                boxShadow: isSel ? "0 2px 8px rgba(0,113,227,0.35)" : "none",
                            }}
                            onClick={() => onSelect(user)}
                        >
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0"
                                style={{
                                    background: isSel ? "rgba(255,255,255,0.25)" : "#27272A",
                                    color: isSel ? "#fff" : "#D1D5DB",
                                }}
                            >
                                {displayName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div style={{ fontWeight: 500, fontSize: 13, color: isSel ? "#fff" : "#D1D5DB" }} className="truncate">
                                    {displayName}
                                </div>
                                <div
                                    style={{ fontSize: 11, color: isSel ? "rgba(255,255,255,0.75)" : "#6B7280" }}
                                    className="truncate"
                                >
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="px-3 py-1.5 flex items-center gap-3" style={{ borderTop: "1px solid #2E2E33", fontSize: 10, color: "#6B7280" }}>
                <span>
                    <kbd style={{ padding: "1px 5px", background: "#27272A", border: "1px solid #3F3F46", borderRadius: 4, color: "#9CA3AF" }}>
                        ↑↓
                    </kbd>{" "}
                    navigate
                </span>
                <span>
                    <kbd style={{ padding: "1px 5px", background: "#27272A", border: "1px solid #3F3F46", borderRadius: 4, color: "#9CA3AF" }}>
                        ↵
                    </kbd>{" "}
                    select
                </span>
                <span>
                    <kbd style={{ padding: "1px 5px", background: "#27272A", border: "1px solid #3F3F46", borderRadius: 4, color: "#9CA3AF" }}>
                        esc
                    </kbd>{" "}
                    dismiss
                </span>
            </div>
        </div>
    );
};

export default MentionSuggestions;
