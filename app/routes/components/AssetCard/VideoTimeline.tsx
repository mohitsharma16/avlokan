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

    // Drag-to-scrub: pointer capture keeps the drag going even when the cursor leaves the track.
    const [scrubbing, setScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);
    const wasPlaying = useRef(false);

    const timeFromX = useCallback(
        (clientX: number) => {
            if (!trackRef.current) return 0;
            const rect = trackRef.current.getBoundingClientRect();
            return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
        },
        [duration]
    );

    const seek = useCallback(
        (t: number) => {
            setScrubTime(t);
            if (videoRef.current) videoRef.current.currentTime = t;
        },
        [videoRef]
    );

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 || !videoRef.current || duration === 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        wasPlaying.current = !videoRef.current.paused;
        videoRef.current.pause();
        setScrubbing(true);
        seek(timeFromX(e.clientX));
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (scrubbing) seek(timeFromX(e.clientX));
    };
    const endScrub = () => {
        if (!scrubbing) return;
        setScrubbing(false);
        if (wasPlaying.current) videoRef.current?.play().catch(() => {});
    };
    const onKeyDown = (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            const t = Math.max(0, Math.min(duration, (videoRef.current?.currentTime ?? 0) + (e.key === "ArrowRight" ? step : -step)));
            seek(t);
        }
    };

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

    const shown = scrubbing ? scrubTime : currentTime;
    const shownPct = `${(shown / duration) * 100}%`;

    const fmt = (t: number) => {
        const m = Math.floor(t / 60);
        const sec = Math.floor(t % 60);
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
                <span className="av-eyebrow" style={{ fontSize: 10 }}>Timeline</span>
                <span className="av-mono" style={{ fontSize: 12, color: "var(--color-text-primary)" }}>
                    {fmt(shown)} <span style={{ color: "var(--color-text-tertiary)" }}>/ {fmt(duration)}</span>
                </span>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 14, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)" }} />{commentMarkers.length} comment{commentMarkers.length !== 1 ? "s" : ""}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i aria-hidden style={{ width: 7, height: 7, transform: "rotate(45deg)", borderRadius: 1, background: "var(--color-accent-soft)" }} />{annotationMarkers.length} annotation{annotationMarkers.length !== 1 ? "s" : ""}</span>
                </span>
            </div>
        <div
            className="relative w-full select-none"
            style={{ height: 40, cursor: scrubbing ? "grabbing" : "pointer", touchAction: "none" }}
            role="slider" tabIndex={0} aria-label="Video timeline" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(shown)} aria-valuetext={`${fmt(shown)} of ${fmt(duration)}`}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endScrub} onPointerCancel={endScrub} onKeyDown={onKeyDown}
        >
            {/* Track background — grows while scrubbing */}
            <div
                ref={trackRef}
                className="absolute inset-x-0 top-1/2 rounded-full overflow-visible"
                style={{
                    height: scrubbing ? 16 : 10,
                    transform: "translateY(-50%)",
                    background: "var(--color-bg-tertiary)",
                    border: `1px solid ${scrubbing ? "var(--color-accent)" : "var(--color-border)"}`,
                    backgroundImage: "repeating-linear-gradient(90deg, var(--color-border-strong) 0 1px, transparent 1px 24px)",
                    transition: "height 180ms var(--av-ease), border-color 180ms ease",
                }}
            >
                {/* Progress fill */}
                <div
                    className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
                    style={{ width: shownPct, background: "var(--accent)", transition: scrubbing ? "none" : "width 250ms linear" }}
                />
            </div>

            {/* Playhead: grows a handle and time bubble while scrubbing */}
            <div aria-hidden className="absolute pointer-events-none" style={{ left: shownPct, top: scrubbing ? 0 : 6, bottom: scrubbing ? 0 : 6, width: 2, marginLeft: -1, background: "var(--color-accent)", borderRadius: 2, zIndex: 5, transition: scrubbing ? "top 180ms var(--av-ease), bottom 180ms var(--av-ease)" : "left 250ms linear, top 180ms var(--av-ease), bottom 180ms var(--av-ease)" }}>
                <span style={{ position: "absolute", top: -4, left: "50%", width: scrubbing ? 14 : 9, height: scrubbing ? 14 : 9, transform: "translateX(-50%) rotate(45deg)", background: "var(--color-accent)", borderRadius: 3, boxShadow: scrubbing ? "0 0 0 4px color-mix(in srgb, var(--color-accent) 25%, transparent)" : "none", transition: "all 180ms var(--av-ease)" }} />
                {scrubbing && (
                    <span className="av-mono" style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", padding: "3px 8px", borderRadius: 6, background: "var(--color-accent)", color: "var(--color-accent-ink)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {fmt(shown)}
                    </span>
                )}
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
                        onPointerDown={(e) => e.stopPropagation()}
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
                            className="w-3 h-3 rounded-full border-2"
                            style={{
                                background: "var(--accent)",
                                borderColor: isActive ? "var(--color-text-primary)" : "var(--accent-hover)",
                                boxShadow: isActive ? "0 0 0 4px color-mix(in srgb, var(--accent) 35%, transparent)" : "none",
                            }}
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
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setHoveredMarker({ type: "annotation", id: m.id, label: m.label, x: rect.left });
                        }}
                        onMouseLeave={() => setHoveredMarker(null)}
                    >
                        <div className="w-2.5 h-2.5 rounded-sm rotate-45" style={{ background: "var(--color-accent-soft)", border: "1px solid var(--color-accent)" }} />
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
                        {hoveredMarker.type === "comment" ? "Comment" : "Annotation"} ·
                    </span>
                    {hoveredMarker.label}
                </div>
            )}
        </div>
        </div>
    );
};

export default VideoTimeline;
