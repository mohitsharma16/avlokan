import React, { useState, useCallback } from "react";
import { captureVideoFrame } from "../../utils/frameCapture";
import { useAIReview } from "../../hooks/useAIReview";
import type { AIFinding } from "../../services/aiReviewService";

interface AIReviewPanelProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
    typography: { icon: "🔤", label: "Typography" },
    color_contrast: { icon: "🎨", label: "Color Contrast" },
    layout: { icon: "📐", label: "Layout" },
    accessibility: { icon: "♿", label: "Accessibility" },
};

const SEVERITY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
    info: { bg: "rgba(0, 113, 227, 0.1)", color: "var(--accent)", border: "rgba(0, 113, 227, 0.25)" },
    warning: { bg: "rgba(255, 159, 10, 0.12)", color: "var(--warning)", border: "rgba(255, 159, 10, 0.3)" },
    error: { bg: "rgba(255, 69, 58, 0.1)", color: "var(--danger)", border: "rgba(255, 69, 58, 0.25)" },
};

// ── Main Panel ────────────────────────────────────────────────────────────────

const AIReviewPanel: React.FC<AIReviewPanelProps> = ({ videoRef }) => {
    const { state, analyzeFrame, clearResult } = useAIReview();
    const { status, result, error } = state;

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(["typography", "color_contrast", "layout", "accessibility"])
    );

    const handleAnalyze = useCallback(async (): Promise<void> => {
        if (!videoRef.current || status === "analyzing") return;
        clearResult();
        const frameBase64 = captureVideoFrame(videoRef.current);
        await analyzeFrame(frameBase64);
    }, [videoRef, status, analyzeFrame, clearResult]);

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

    const isAnalyzing = status === "analyzing";

    return (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16, fontFamily: "var(--font-apple)" }}>
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                    <span>🤖</span>
                    <span>AI Review</span>
                </h3>

                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    style={{
                        padding: "6px 12px",
                        borderRadius: "var(--radius-md)",
                        fontSize: 12,
                        fontWeight: 500,
                        border: "none",
                        transition: "var(--transition)",
                        cursor: isAnalyzing ? "wait" : "pointer",
                        background: isAnalyzing ? "var(--border)" : "var(--accent)",
                        color: isAnalyzing ? "var(--text-tertiary)" : "#fff",
                    }}
                >
                    {isAnalyzing ? (
                        <span className="flex items-center gap-1.5">
                            <span style={{ display: "inline-block", width: 11, height: 11, border: "2px solid var(--text-tertiary)", borderTopColor: "transparent", borderRadius: "999px" }} className="animate-spin" />
                            Analyzing…
                        </span>
                    ) : (
                        "Analyze Frame"
                    )}
                </button>
            </div>

            {/* ── Error State ── */}
            {error && (
                <div style={{ padding: 10, background: "rgba(255, 69, 58, 0.1)", border: "1px solid rgba(255, 69, 58, 0.25)", borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>Error: </span>
                    {error}
                </div>
            )}

            {/* ── Results ── */}
            {result && (
                <div className="space-y-3">
                    {/* Summary */}
                    <div style={{ padding: 10, background: "rgba(0, 113, 227, 0.08)", border: "1px solid rgba(0, 113, 227, 0.2)", borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--text-primary)" }}>
                        {result.summary}
                    </div>

                    {/* Findings count */}
                    {result.findings.length === 0 ? (
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", padding: "8px 0" }}>
                            No issues found — looking good! ✨
                        </p>
                    ) : (
                        <p style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>
                            {result.findings.length} finding
                            {result.findings.length !== 1 ? "s" : ""} across{" "}
                            {Object.keys(groupedFindings).length} categor
                            {Object.keys(groupedFindings).length !== 1 ? "ies" : "y"}
                        </p>
                    )}

                    {/* Category Cards */}
                    {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                        const findings = groupedFindings[catKey];
                        if (!findings || findings.length === 0) return null;

                        const isExpanded = expandedCategories.has(catKey);

                        return (
                            <div key={catKey} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                                <button
                                    onClick={() => toggleCategory(catKey)}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "8px 12px",
                                        background: "var(--bg)",
                                        border: "none",
                                        cursor: "pointer",
                                        textAlign: "left",
                                    }}
                                >
                                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>{meta.icon}</span>
                                        <span>{meta.label}</span>
                                        <span style={{ background: "var(--border)", color: "var(--text-secondary)", padding: "1px 6px", borderRadius: "999px", fontSize: 10 }}>
                                            {findings.length}
                                        </span>
                                    </span>
                                    <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                                        {isExpanded ? "▾" : "▸"}
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div style={{ borderTop: "1px solid var(--border)" }}>
                                        {findings.map((finding, idx) => {
                                            const sev = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.info;
                                            return (
                                                <div
                                                    key={finding.id}
                                                    style={{
                                                        padding: 12,
                                                        borderTop: idx > 0 ? "1px solid var(--border)" : "none",
                                                    }}
                                                    className="space-y-1.5"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span
                                                            style={{
                                                                display: "inline-block",
                                                                padding: "1px 6px",
                                                                borderRadius: 6,
                                                                fontSize: 10,
                                                                fontWeight: 500,
                                                                border: `1px solid ${sev.border}`,
                                                                background: sev.bg,
                                                                color: sev.color,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {finding.severity}
                                                        </span>
                                                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
                                                            {finding.title}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
                                                        {finding.description}
                                                    </p>
                                                    <div className="flex items-start gap-1.5">
                                                        <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 500, flexShrink: 0 }}>
                                                            💡 Fix:
                                                        </span>
                                                        <span style={{ fontSize: 11, color: "var(--success)" }}>
                                                            {finding.suggestion}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
