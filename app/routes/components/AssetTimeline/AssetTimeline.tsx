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
            case "asset_created": return "bg-blue-500";
            case "revision_uploaded": return "bg-green-500";
            case "comment_added": return "bg-yellow-500";
            case "annotation_added": return "bg-purple-500";
            default: return "bg-gray-500";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#efe6d6] w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border-4 border-[#6B4F3A]">
                {/* Header */}
                <div className="px-8 py-6 bg-[#6B4F3A] text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Asset Timeline</h2>
                        <p className="text-[#efe6d6]/80 text-sm">{asset.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        <span className="text-2xl">×</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-10">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-[#6B4F3A] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#6B4F3A] font-medium italic">Fetching history...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[#6B4F3A] italic">
                            No activity found for this asset.
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Vertical Line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#6B4F3A]/20"></div>

                            <div className="space-y-10">
                                {events.map((event) => (
                                    <div key={event.id} className="relative pl-12 group">
                                        {/* Dot */}
                                        <div className={`absolute left-0 w-8 h-8 rounded-full ${getColor(event.type)} border-4 border-[#efe6d6] flex items-center justify-center shadow-md z-10 transition-transform group-hover:scale-110`}>
                                            <span className="text-sm">{getIcon(event.type)}</span>
                                        </div>

                                        {/* Card */}
                                        <div className="bg-white/80 p-5 rounded-2xl shadow-sm border border-[#6B4F3A]/10 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-bold text-[#2b1f18] text-lg">{event.title}</h3>
                                                <time className="text-xs font-semibold text-[#6B4F3A] uppercase tracking-wider bg-[#6B4F3A]/5 px-2 py-1 rounded">
                                                    {new Date(event.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </time>
                                            </div>

                                            {event.user && (
                                                <p className="text-xs font-bold text-[#8B5E3C] mb-2">By {event.user}</p>
                                            )}

                                            <p className="text-[#3b2f2b] text-sm leading-relaxed italic line-clamp-3">
                                                {event.description}
                                            </p>

                                            {event.metadata?.revisionId && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <span className="text-[10px] font-black bg-[#d4b785] text-[#2b1f18] px-2 py-0.5 rounded-full uppercase">
                                                        REV: {event.metadata.revisionId.slice(-6)}
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
        </div>
    );
};

export default AssetTimeline;
