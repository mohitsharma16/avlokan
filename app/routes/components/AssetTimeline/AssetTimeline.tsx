import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Modal } from "../design";
import type { Asset, AssetRevision, Comment, Annotation } from "../../types";

interface AssetTimelineProps {
    asset: any;
    revisions: AssetRevision[];
    onClose: () => void;
}

interface TimelineEvent {
    id: string;
    type: "asset_created" | "revision_uploaded" | "comment_added" | "annotation_added";
    title: string;
    description?: string;
    timestamp: string;
    user?: string;
    metadata?: any;
}

const AssetTimeline: React.FC<AssetTimelineProps> = ({ asset, revisions, onClose }) => {
    const { pb } = useAuth();
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTimelineData = async () => {
            setLoading(true);
            try {
                const revIds = revisions.map((r) => r.id);
                if (revIds.length === 0) {
                    setEvents([]);
                    setLoading(false);
                    return;
                }

                // Build filter for multiple revision IDs: (revisionId='id1' || revisionId='id2' ...)
                const filterStr = revIds.map((id) => `revisionId="${id}"`).join(" || ");

                const [comments, annotations] = await Promise.all([
                    pb.collection("comments").getFullList<Comment>({ filter: filterStr }),
                    pb.collection("annotations").getFullList<Annotation>({ filter: filterStr }),
                ]);

                const allEvents: TimelineEvent[] = [];

                // 1. Asset Creation
                allEvents.push({
                    id: asset.id,
                    type: "asset_created",
                    title: "Asset Created",
                    description: `Asset "${asset.name}" was initialized.`,
                    timestamp: asset.created,
                });

                // 2. Revision Uploads
                revisions.forEach((rev) => {
                    allEvents.push({
                        id: rev.id,
                        type: "revision_uploaded",
                        title: `Revision v${rev.versionNumber || rev.version || "?"} Uploaded`,
                        description: rev.title,
                        timestamp: rev.created,
                    });
                });

                // 3. Comments
                comments.forEach((c) => {
                    allEvents.push({
                        id: c.id,
                        type: "comment_added",
                        title: "New Comment",
                        description: c.text,
                        timestamp: c.created,
                        user: c.name,
                        metadata: { revisionId: c.revisionId },
                    });
                });

                // 4. Annotations
                annotations.forEach((a) => {
                    allEvents.push({
                        id: a.id,
                        type: "annotation_added",
                        title: "Annotation Added",
                        description: "A new visual annotation was saved.",
                        timestamp: a.created || "",
                        user: a.createdBy,
                        metadata: { revisionId: a.revisionId },
                    });
                });

                // Sort: newest first
                allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setEvents(allEvents);
            } catch (err) {
                console.error("Error fetching timeline data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTimelineData();
    }, [asset, revisions, pb]);

    const iconProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

    const getIcon = (type: TimelineEvent["type"]) => {
        switch (type) {
            case "asset_created": return <svg {...iconProps}><path d="M12 5v14M5 12h14" /></svg>;
            case "revision_uploaded": return <svg {...iconProps}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 9.5v5l4.5-2.5z" /></svg>;
            case "comment_added": return <svg {...iconProps}><path d="M20 12a7.5 7.5 0 01-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1120 12z" /></svg>;
            case "annotation_added": return <svg {...iconProps}><path d="M4 20l4-1 10.5-10.5a2.1 2.1 0 00-3-3L5 16l-1 4z" /></svg>;
            default: return <svg {...iconProps}><circle cx="12" cy="12" r="3" /></svg>;
        }
    };

    /** Marker colour by event kind — monochrome by default, accent for the events that matter to a review. */
    const getColor = (type: TimelineEvent["type"]) => {
        switch (type) {
            case "revision_uploaded": return "var(--color-accent)";
            case "comment_added": return "var(--color-text-primary)";
            case "annotation_added": return "var(--color-accent-soft)";
            default: return "var(--color-text-tertiary)";
        }
    };

    const KIND_LABEL: Record<TimelineEvent["type"], string> = {
        asset_created: "Asset",
        revision_uploaded: "Revision",
        comment_added: "Comment",
        annotation_added: "Annotation",
    };

    return (
        <Modal open onClose={onClose} title="Asset timeline" maxWidth={680}>
            <div style={{ display: "flex", flexDirection: "column", height: "80vh", fontFamily: "var(--font-sans)" }}>
                <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                        <p className="av-eyebrow" style={{ margin: 0, fontSize: 11 }}>Asset timeline</p>
                        <h2 style={{ fontSize: 20, fontWeight: 650, letterSpacing: "-0.03em", margin: "6px 0 0" }}>{asset?.name}</h2>
                    </div>
                    <button onClick={onClose} className="av-btn av-btn-icon" aria-label="Close timeline" data-tip="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "var(--color-bg-secondary)" }}>
                    {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-busy="true" aria-label="Fetching history">
                            {[0, 1, 2, 3].map((i) => <div key={i} className="av-skeleton" style={{ height: 76 }} />)}
                        </div>
                    ) : events.length === 0 ? (
                        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
                            No activity on this asset yet.
                        </div>
                    ) : (
                        <ol style={{ position: "relative", listStyle: "none", margin: 0, padding: 0 }}>
                            {/* Playhead rail: subtle grid ticks with a warm line */}
                            <div aria-hidden style={{ position: "absolute", left: 13, top: 6, bottom: 6, width: 2, borderRadius: 2, background: "linear-gradient(var(--color-accent), color-mix(in srgb, var(--color-accent) 10%, transparent))" }} />
                            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                {events.map((event) => (
                                    <li key={event.id} style={{ position: "relative", paddingLeft: 44 }}>
                                        <span
                                            aria-hidden
                                            style={{ position: "absolute", left: 0, top: 6, width: 28, height: 28, borderRadius: "var(--av-radius-sm)", background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-strong)", color: getColor(event.type), display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}
                                        >
                                            {getIcon(event.type)}
                                        </span>

                                        <div className="av-surface" style={{ padding: "12px 16px", borderRadius: "var(--av-radius-md)" }}>
                                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                                                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>{event.title}</h3>
                                                <time className="av-mono" style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", flexShrink: 0 }}>
                                                    {new Date(event.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                                </time>
                                            </div>

                                            {event.user && (
                                                <p style={{ fontSize: 12, color: "var(--color-accent-text)", margin: "4px 0 0", fontWeight: 550 }}>{event.user}</p>
                                            )}

                                            {event.description && (
                                                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5, margin: "6px 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
                                                    {event.description}
                                                </p>
                                            )}

                                            <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                                                <span className="av-badge av-badge-plain">{KIND_LABEL[event.type]}</span>
                                                {event.metadata?.revisionId && (
                                                    <span className="av-badge av-badge-plain av-mono">rev {String(event.metadata.revisionId).slice(-6)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </div>
                        </ol>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AssetTimeline;
