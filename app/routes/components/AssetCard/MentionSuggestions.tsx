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
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl mb-3 overflow-hidden backdrop-blur-sm">
            <div className="px-3 py-2 border-b border-gray-700">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    👤 Mention User
                </div>
            </div>
            <div className="p-1 max-h-48 overflow-y-auto">
                {users.map((user, index) => {
                    const displayName = user.name || user.email.split("@")[0];
                    return (
                        <div
                            key={user.id}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${index === selectedIndex
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "text-gray-300 hover:bg-gray-800"
                                }`}
                            onClick={() => onSelect(user)}
                        >
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase ${index === selectedIndex
                                        ? "bg-blue-400 text-blue-900"
                                        : "bg-gray-700 text-gray-300"
                                    }`}
                            >
                                {displayName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                    {displayName}
                                </div>
                                <div
                                    className={`text-xs truncate ${index === selectedIndex
                                            ? "text-blue-200"
                                            : "text-gray-500"
                                        }`}
                                >
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="border-t border-gray-700 px-3 py-1.5 flex items-center gap-3 text-[10px] text-gray-500">
                <span>
                    <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">
                        ↑↓
                    </kbd>{" "}
                    navigate
                </span>
                <span>
                    <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">
                        ↵
                    </kbd>{" "}
                    select
                </span>
                <span>
                    <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-400">
                        esc
                    </kbd>{" "}
                    dismiss
                </span>
            </div>
        </div>
    );
};

export default MentionSuggestions;
