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
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        ⌨️ Keyboard Shortcuts
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-1">
                    {SHORTCUTS.map((shortcut, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {shortcut.description}
                            </span>
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                                {shortcut.key}
                            </kbd>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
                    <span className="text-xs text-gray-400">
                        Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-500 font-mono">?</kbd> to toggle
                    </span>
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsHelp;
