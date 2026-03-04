import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Comment, Annotation } from "../../types";

interface VideoTimelineProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    comments: Comment[];
    annotations: Annotation[];
    activeCommentId: string | null;
    onMarkerClick: (commentId: string, timestamp: number) => void;
}

function parseTimestamp(ts: string): number {
    if (!ts) return -1;
    const startTs = ts.includes("-") ? ts.split("-")[0] : ts;
    const parts = startTs.trim().split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
}

const VideoTimeline: React.FC<VideoTimelineProps> = ({
    videoRef,
    comments,
    annotations,
    activeCommentId,
    onMarkerClick,
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [hoveredMarker, setHoveredMarker] = useState<{
        type: "comment" | "annotation";
        id: string;
        label: string;
        x: number;
    } | null>(null);

    // Update duration once video metadata loads
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onMeta = () => setDuration(video.duration || 0);
        const onTime = () => setCurrentTime(video.currentTime);

        video.addEventListener("loadedmetadata", onMeta);
        video.addEventListener("timeupdate", onTime);
        if (video.duration) setDuration(video.duration);

        return () => {
            video.removeEventListener("loadedmetadata", onMeta);
            video.removeEventListener("timeupdate", onTime);
        };
    }, [videoRef]);

    // Click on the track to seek
    const handleTrackClick = useCallback(
        (e: React.MouseEvent) => {
            if (!trackRef.current || !videoRef.current || duration === 0) return;
            const rect = trackRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            videoRef.current.currentTime = ratio * duration;
        },
        [duration, videoRef]
    );

    if (duration === 0) return null;

    const commentMarkers = comments
        .filter((c) => c.timestamp)
        .map((c) => ({
            type: "comment" as const,
            id: c.id,
            time: parseTimestamp(c.timestamp),
            label: `${c.name}: ${(c.text || "").slice(0, 40)}${(c.text || "").length > 40 ? "…" : ""}`,
        }))
        .filter((m) => m.time >= 0);

    const annotationMarkers = annotations.map((a) => ({
        type: "annotation" as const,
        id: a.id,
        time: a.timestamp,
        label: `Annotation by ${a.createdBy || "unknown"}`,
    }));

    return (
        <div className="relative w-full select-none" style={{ height: 32 }}>
            {/* Track background */}
            <div
                ref={trackRef}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-gray-700 rounded-full cursor-pointer overflow-visible"
                onClick={handleTrackClick}
            >
                {/* Progress fill */}
                <div
                    className="absolute left-0 top-0 h-full bg-blue-500 rounded-full pointer-events-none"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                />
            </div>

            {/* Comment markers */}
            {commentMarkers.map((m) => {
                const leftPct = (m.time / duration) * 100;
                const isActive = m.id === activeCommentId;
                return (
                    <div
                        key={`c-${m.id}`}
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-transform z-10 ${isActive ? "scale-150" : "hover:scale-125"
                            }`}
                        style={{ left: `${leftPct}%` }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkerClick(m.id, m.time);
                        }}
                        onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setHoveredMarker({ type: "comment", id: m.id, label: m.label, x: rect.left });
                        }}
                        onMouseLeave={() => setHoveredMarker(null)}
                    >
                        <div
                            className={`w-3 h-3 rounded-full border-2 ${isActive
                                    ? "bg-blue-400 border-blue-300 shadow-lg shadow-blue-400/50"
                                    : "bg-blue-500 border-blue-400"
                                }`}
                        />
                    </div>
                );
            })}

            {/* Annotation markers */}
            {annotationMarkers.map((m) => {
                const leftPct = (m.time / duration) * 100;
                return (
                    <div
                        key={`a-${m.id}`}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform z-10"
                        style={{ left: `${leftPct}%` }}
                        onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setHoveredMarker({ type: "annotation", id: m.id, label: m.label, x: rect.left });
                        }}
                        onMouseLeave={() => setHoveredMarker(null)}
                    >
                        <div className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-300 rotate-45" />
                    </div>
                );
            })}

            {/* Tooltip */}
            {hoveredMarker && (
                <div
                    className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap pointer-events-none z-20 max-w-xs truncate"
                    style={{
                        left: `${((hoveredMarker.x - (trackRef.current?.getBoundingClientRect().left || 0)) / (trackRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
                        transform: "translateX(-50%)",
                    }}
                >
                    <span className="mr-1">
                        {hoveredMarker.type === "comment" ? "💬" : "🖊"}
                    </span>
                    {hoveredMarker.label}
                </div>
            )}
        </div>
    );
};

export default VideoTimeline;
