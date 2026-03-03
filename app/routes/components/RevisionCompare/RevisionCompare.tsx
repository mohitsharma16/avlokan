import React, { useRef, useState, useEffect, useCallback } from "react";
import type { AssetRevision } from "../../types";

interface RevisionCompareProps {
    revisionA: AssetRevision;
    revisionB: AssetRevision;
    videoUrlA: string;
    videoUrlB: string;
    onClose: () => void;
}

type CompareMode = "side-by-side" | "slider";

const RevisionCompare: React.FC<RevisionCompareProps> = ({
    revisionA,
    revisionB,
    videoUrlA,
    videoUrlB,
    onClose,
}) => {
    const videoARef = useRef<HTMLVideoElement>(null);
    const videoBRef = useRef<HTMLVideoElement>(null);
    const sliderContainerRef = useRef<HTMLDivElement>(null);

    const [mode, setMode] = useState<CompareMode>("side-by-side");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [sliderPos, setSliderPos] = useState(50); // percentage 0-100
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const isSyncingRef = useRef(false);

    // Sync play/pause
    const togglePlayPause = useCallback(() => {
        const vA = videoARef.current;
        const vB = videoBRef.current;
        if (!vA || !vB) return;

        if (isPlaying) {
            vA.pause();
            vB.pause();
        } else {
            vA.play();
            vB.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    // Sync seeking
    const handleSeek = useCallback((newTime: number) => {
        const vA = videoARef.current;
        const vB = videoBRef.current;
        if (!vA || !vB) return;

        isSyncingRef.current = true;
        vA.currentTime = newTime;
        vB.currentTime = newTime;
        setCurrentTime(newTime);
        setTimeout(() => { isSyncingRef.current = false; }, 100);
    }, []);

    // Time update listener
    useEffect(() => {
        const vA = videoARef.current;
        if (!vA) return;

        const onTimeUpdate = () => {
            if (!isSyncingRef.current) {
                setCurrentTime(vA.currentTime);
                // Keep B in sync
                const vB = videoBRef.current;
                if (vB && Math.abs(vB.currentTime - vA.currentTime) > 0.3) {
                    vB.currentTime = vA.currentTime;
                }
            }
        };

        const onLoadedMetadata = () => {
            setDuration(vA.duration || 0);
        };

        const onEnded = () => {
            setIsPlaying(false);
        };

        vA.addEventListener("timeupdate", onTimeUpdate);
        vA.addEventListener("loadedmetadata", onLoadedMetadata);
        vA.addEventListener("ended", onEnded);

        return () => {
            vA.removeEventListener("timeupdate", onTimeUpdate);
            vA.removeEventListener("loadedmetadata", onLoadedMetadata);
            vA.removeEventListener("ended", onEnded);
        };
    }, [mode]); // re-attach when mode changes

    // Slider dragging
    const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingSlider(true);
    }, []);

    useEffect(() => {
        if (!isDraggingSlider) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = sliderContainerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSliderPos(pct);
        };

        const handleMouseUp = () => {
            setIsDraggingSlider(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingSlider]);

    // Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === " ") {
                e.preventDefault();
                togglePlayPause();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, togglePlayPause]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <h2 className="text-white font-semibold text-lg">Revision Comparison</h2>
                    <div className="flex bg-gray-800 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setMode("side-by-side")}
                            className={`px-4 py-1.5 text-sm font-medium transition-colors ${mode === "side-by-side"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-300 hover:text-white"
                                }`}
                        >
                            Side by Side
                        </button>
                        <button
                            onClick={() => setMode("slider")}
                            className={`px-4 py-1.5 text-sm font-medium transition-colors ${mode === "slider"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-300 hover:text-white"
                                }`}
                        >
                            Slider
                        </button>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    aria-label="Close comparison"
                >
                    ✕
                </button>
            </div>

            {/* Video area */}
            <div className="flex-1 overflow-hidden">
                {mode === "side-by-side" ? (
                    /* Side-by-Side Mode */
                    <div className="flex h-full">
                        {/* Left */}
                        <div className="flex-1 flex flex-col border-r border-gray-700">
                            <div className="px-4 py-2 bg-gray-800 text-center">
                                <span className="text-white font-medium">{revisionA.title || "Untitled"}</span>
                                <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    v{revisionA.versionNumber || 1}
                                </span>
                            </div>
                            <div className="flex-1 flex items-center justify-center bg-black">
                                <video
                                    ref={videoARef}
                                    src={videoUrlA}
                                    className="max-w-full max-h-full object-contain"
                                    playsInline
                                    onClick={togglePlayPause}
                                />
                            </div>
                        </div>
                        {/* Right */}
                        <div className="flex-1 flex flex-col">
                            <div className="px-4 py-2 bg-gray-800 text-center">
                                <span className="text-white font-medium">{revisionB.title || "Untitled"}</span>
                                <span className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    v{revisionB.versionNumber || 1}
                                </span>
                            </div>
                            <div className="flex-1 flex items-center justify-center bg-black">
                                <video
                                    ref={videoBRef}
                                    src={videoUrlB}
                                    className="max-w-full max-h-full object-contain"
                                    playsInline
                                    onClick={togglePlayPause}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Slider Mode */
                    <div
                        ref={sliderContainerRef}
                        className="relative h-full bg-black flex items-center justify-center"
                    >
                        {/* Video B (underneath — full width) */}
                        <video
                            ref={videoBRef}
                            src={videoUrlB}
                            className="absolute inset-0 w-full h-full object-contain"
                            playsInline
                        />

                        {/* Video A (on top, clipped to left side) */}
                        <video
                            ref={videoARef}
                            src={videoUrlA}
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                            playsInline
                        />

                        {/* Slider divider line */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
                            style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
                            onMouseDown={handleSliderMouseDown}
                        >
                            {/* Handle grip */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-col-resize">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M5 3L5 13M11 3L11 13" stroke="#666" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded z-20">
                            {revisionA.title || "Untitled"} (v{revisionA.versionNumber || 1})
                        </div>
                        <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded z-20">
                            {revisionB.title || "Untitled"} (v{revisionB.versionNumber || 1})
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom controls */}
            <div className="px-6 py-3 bg-gray-900 border-t border-gray-700 flex items-center gap-4">
                {/* Play/Pause */}
                <button
                    onClick={togglePlayPause}
                    className="text-white hover:text-blue-400 transition-colors"
                    aria-label={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                {/* Time */}
                <span className="text-gray-400 text-sm min-w-[80px]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Seek bar */}
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="flex-1 h-1 accent-blue-500 cursor-pointer"
                />
            </div>
        </div>
    );
};

export default RevisionCompare;
