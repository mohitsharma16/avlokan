import React, { useState, useCallback } from "react";
import { captureVideoFrame } from "../../utils/frameCapture";
import { analyzeFrame } from "../../services/aiReviewService";
import type { AIFinding, AIReviewResult } from "../../services/aiReviewService";

interface AIReviewPanelProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
    typography: { icon: "🔤", label: "Typography" },
    color_contrast: { icon: "🎨", label: "Color Contrast" },
    layout: { icon: "📐", label: "Layout" },
    accessibility: { icon: "♿", label: "Accessibility" },
};

const SEVERITY_CLASSES: Record<string, string> = {
    info: "bg-blue-100 text-blue-700 border-blue-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-red-100 text-red-700 border-red-200",
};

const AIReviewPanel: React.FC<AIReviewPanelProps> = ({ videoRef }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AIReviewResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(["typography", "color_contrast", "layout", "accessibility"])
    );

    const handleAnalyze = useCallback(async () => {
        if (!videoRef.current) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const frameBase64 = captureVideoFrame(videoRef.current);
            const aiResult = await analyzeFrame(frameBase64);
            setResult(aiResult);
        } catch (err: any) {
            console.error("AI analysis error:", err);
            setError(err.message || "Failed to analyze frame.");
        } finally {
            setIsAnalyzing(false);
        }
    }, [videoRef]);

    const toggleCategory = (cat: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const groupedFindings: Record<string, AIFinding[]> = {};
    if (result) {
        for (const f of result.findings) {
            if (!groupedFindings[f.category]) groupedFindings[f.category] = [];
            groupedFindings[f.category].push(f);
        }
    }

    return (
        <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <span>🤖</span>
                    <span>AI Review</span>
                </h3>
                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isAnalyzing
                            ? "bg-gray-200 text-gray-500 cursor-wait"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                        }`}
                >
                    {isAnalyzing ? (
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            Analyzing…
                        </span>
                    ) : (
                        "Analyze Frame"
                    )}
                </button>
            </div>

            {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-3">
                    {/* Summary */}
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
                        {result.summary}
                    </div>

                    {/* Findings count */}
                    {result.findings.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                            No issues found — looking good! ✨
                        </p>
                    ) : (
                        <p className="text-[10px] text-gray-500">
                            {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""} across{" "}
                            {Object.keys(groupedFindings).length} categor{Object.keys(groupedFindings).length !== 1 ? "ies" : "y"}
                        </p>
                    )}

                    {/* Categories */}
                    {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                        const findings = groupedFindings[catKey];
                        if (!findings || findings.length === 0) return null;

                        const isExpanded = expandedCategories.has(catKey);

                        return (
                            <div key={catKey} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleCategory(catKey)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                                        <span>{meta.icon}</span>
                                        <span>{meta.label}</span>
                                        <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                                            {findings.length}
                                        </span>
                                    </span>
                                    <span className="text-gray-400 text-xs">{isExpanded ? "▾" : "▸"}</span>
                                </button>

                                {isExpanded && (
                                    <div className="divide-y divide-gray-100">
                                        {findings.map((finding) => (
                                            <div key={finding.id} className="p-3 space-y-1.5">
                                                <div className="flex items-start gap-2">
                                                    <span
                                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${SEVERITY_CLASSES[finding.severity] || SEVERITY_CLASSES.info
                                                            }`}
                                                    >
                                                        {finding.severity}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-800">
                                                        {finding.title}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                                    {finding.description}
                                                </p>
                                                <div className="flex items-start gap-1.5">
                                                    <span className="text-[10px] text-green-700 font-medium flex-shrink-0">💡 Fix:</span>
                                                    <span className="text-[11px] text-green-700">{finding.suggestion}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AIReviewPanel;
