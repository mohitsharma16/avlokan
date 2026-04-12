import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
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

    const getIcon = (type: TimelineEvent["type"]) => {
        switch (type) {
            case "asset_created": return "📄";
            case "revision_uploaded": return "🎬";
            case "comment_added": return "💬";
            case "annotation_added": return "✏️";
            default: return "●";
        }
    };

    const getColor = (type: TimelineEvent["type"]) => {
        switch (type) {
            case "asset_created": return "var(--accent)";
            case "revision_uploaded": return "#30D158";
            case "comment_added": return "#FF9F0A";
            case "annotation_added": return "#BF5AF2";
            default: return "var(--text-tertiary)";
        }
    };

    return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: 24,
            fontFamily: "var(--font-apple)",
          }}
        >
            <div
              className="animate-apple-scale-in"
              style={{
                background: "var(--bg-elevated)",
                width: "100%",
                maxWidth: 640,
                height: "80vh",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-modal)",
                border: "1px solid var(--border)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
                {/* Header */}
                <div style={{
                  padding: "24px 28px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>Asset Timeline</h2>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{asset.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          border: "none",
                          background: "var(--bg)",
                          color: "var(--text-secondary)",
                          fontSize: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px" }}>
                    {loading ? (
                        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              border: "2.5px solid var(--border)",
                              borderTopColor: "var(--accent)",
                              animation: "spin 0.7s linear infinite",
                            }} />
                            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Fetching history…</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 14 }}>
                            No activity found for this asset.
                        </div>
                    ) : (
                        <div style={{ position: "relative" }}>
                            {/* Vertical line */}
                            <div style={{ position: "absolute", left: 14, top: 0, bottom: 0, width: 1, background: "var(--border)" }} />

                            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                                {events.map((event) => (
                                    <div key={event.id} style={{ position: "relative", paddingLeft: 44 }}>
                                        {/* Dot */}
                                        <div style={{
                                          position: "absolute",
                                          left: 0,
                                          width: 28,
                                          height: 28,
                                          borderRadius: "50%",
                                          background: getColor(event.type),
                                          border: "3px solid var(--bg-elevated)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: 13,
                                          zIndex: 1,
                                          top: 4,
                                        }}>
                                            {getIcon(event.type)}
                                        </div>

                                        {/* Card */}
                                        <div style={{
                                          background: "var(--bg)",
                                          border: "1px solid var(--border)",
                                          borderRadius: "var(--radius-md)",
                                          padding: "14px 16px",
                                          transition: "var(--transition)",
                                        }}>
                                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                                                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{event.title}</h3>
                                                <time style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0, marginLeft: 12 }}>
                                                    {new Date(event.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                                </time>
                                            </div>

                                            {event.user && (
                                                <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 4, fontWeight: 500 }}>By {event.user}</p>
                                            )}

                                            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: "1.5", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
                                                {event.description}
                                            </p>

                                            {event.metadata?.revisionId && (
                                                <div style={{ marginTop: 8 }}>
                                                    <span style={{
                                                      fontSize: 10,
                                                      fontWeight: 700,
                                                      background: "rgba(0,113,227,0.08)",
                                                      color: "var(--accent)",
                                                      padding: "2px 8px",
                                                      borderRadius: 99,
                                                      textTransform: "uppercase",
                                                      letterSpacing: "0.05em",
                                                    }}>
                                                        Rev: {event.metadata.revisionId.slice(-6)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AssetTimeline;
