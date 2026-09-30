import React, { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { captureVideoFrame } from "../../utils/frameCapture";
import { useAIReview } from "../../hooks/useAIReview";
import type { AIFinding } from "../../services/aiReviewService";
import { EASE } from "../motion/motionVariants";

interface AIReviewPanelProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

const CATEGORY_LABEL: Record<string, string> = {
    typography: "Typography",
    color_contrast: "Contrast",
    layout: "Layout",
    accessibility: "Accessibility",
};

const SEVERITY_COLOR: Record<string, string> = {
    info: "var(--color-accent)",
    warning: "var(--color-warning)",
    error: "var(--color-danger)",
};

const chevron = (open: boolean) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform var(--av-motion-base) var(--av-ease)" }}>
        <path d="M9 6l6 6-6 6" />
    </svg>
);

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
        <section aria-label="AI review" style={{ borderTop: "1px solid var(--color-border)", marginTop: 16, paddingTop: 16, fontFamily: "var(--font-sans)" }}>
            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 className="av-eyebrow" style={{ margin: 0, fontSize: 11, color: "var(--color-accent-text)" }}>AI review</h3>
                <button onClick={handleAnalyze} disabled={isAnalyzing} className="av-btn av-btn-secondary av-btn-sm" aria-busy={isAnalyzing}>
                    {isAnalyzing ? (<><span className="av-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />Reviewing frame…</>) : "Review this frame"}
                </button>
            </div>

            {isAnalyzing && (
                <div role="status" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[0, 1, 2].map((i) => <div key={i} className="av-skeleton" style={{ height: 34 }} />)}
                </div>
            )}

            {/* ── Error State ── */}
            {error && (
                <div role="alert" style={{ padding: 10, background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 28%, transparent)", borderRadius: "var(--av-radius-md)", fontSize: 12.5, color: "var(--color-danger)", marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {/* ── Results ── */}
            {result && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Summary */}
                    <div style={{ padding: "10px 12px", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderLeft: "2px solid var(--color-accent)", borderRadius: "var(--av-radius-sm)", fontSize: 12.5, lineHeight: 1.5 }}>
                        {result.summary}
                    </div>

                    {result.findings.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", textAlign: "center", padding: "8px 0", margin: 0 }}>
                            No issues found in this frame.
                        </p>
                    ) : (
                        <p className="av-mono" style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", margin: 0 }}>
                            {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""} · {Object.keys(groupedFindings).length} categor{Object.keys(groupedFindings).length !== 1 ? "ies" : "y"}
                        </p>
                    )}

                    {/* Category groups */}
                    {Object.entries(CATEGORY_LABEL).map(([catKey, label]) => {
                        const findings = groupedFindings[catKey];
                        if (!findings || findings.length === 0) return null;
                        const isExpanded = expandedCategories.has(catKey);

                        return (
                            <div key={catKey} className="av-surface" style={{ overflow: "hidden", borderRadius: "var(--av-radius-md)" }}>
                                <button
                                    onClick={() => toggleCategory(catKey)} aria-expanded={isExpanded}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--color-text-primary)", font: "inherit" }}
                                >
                                    <span style={{ color: "var(--color-text-tertiary)", display: "inline-flex" }}>{chevron(isExpanded)}</span>
                                    <span style={{ fontSize: 13, fontWeight: 550 }}>{label}</span>
                                    <span className="av-badge av-badge-plain av-mono" style={{ marginLeft: "auto", height: 18 }}>{findings.length}</span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: EASE }} style={{ overflow: "hidden", borderTop: "1px solid var(--color-border)" }}>
                                            {findings.map((finding, idx) => {
                                                const tone = SEVERITY_COLOR[finding.severity] || SEVERITY_COLOR.info;
                                                return (
                                                    <div key={finding.id} style={{ padding: 12, borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", borderLeft: `2px solid ${tone}` }}>
                                                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                                            <span className="av-mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: tone, flexShrink: 0, paddingTop: 2 }}>{finding.severity}</span>
                                                            <span style={{ fontSize: 13, fontWeight: 550 }}>{finding.title}</span>
                                                        </div>
                                                        <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>{finding.description}</p>
                                                        {finding.suggestion && (
                                                            <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-text-primary)", margin: "6px 0 0" }}>
                                                                <span style={{ color: "var(--color-success)", fontWeight: 550 }}>Fix · </span>{finding.suggestion}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </motion.div>
            )}
        </section>
    );
};

export default AIReviewPanel;
