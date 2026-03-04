import { useState, useCallback, useRef, useEffect } from "react";

interface UseVideoZoomProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useVideoZoom({ containerRef }: UseVideoZoomProps) {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const lastPanOffsetRef = useRef({ x: 0, y: 0 });

    const MIN_ZOOM = 1;
    const MAX_ZOOM = 5;
    const ZOOM_STEP = 0.25;

    const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

    const zoomIn = useCallback(() => {
        setZoomLevel((prev) => clampZoom(prev + ZOOM_STEP));
    }, []);

    const zoomOut = useCallback(() => {
        setZoomLevel((prev) => {
            const next = clampZoom(prev - ZOOM_STEP);
            if (next <= 1) setPanOffset({ x: 0, y: 0 });
            return next;
        });
    }, []);

    const resetZoom = useCallback(() => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    const fitToWindow = useCallback(() => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    // Scroll-wheel zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();

            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            setZoomLevel((prev) => {
                const next = clampZoom(prev + delta);
                if (next <= 1) setPanOffset({ x: 0, y: 0 });
                return next;
            });
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => container.removeEventListener("wheel", handleWheel);
    }, [containerRef]);

    // Pan with middle mouse or shift+left mouse
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseDown = (e: MouseEvent) => {
            if (zoomLevel <= 1) return;
            // Middle mouse or shift+left
            if (e.button === 1 || (e.shiftKey && e.button === 0)) {
                e.preventDefault();
                isPanningRef.current = true;
                panStartRef.current = { x: e.clientX, y: e.clientY };
                lastPanOffsetRef.current = { ...panOffset };
                container.style.cursor = "grabbing";
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanningRef.current) return;
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPanOffset({
                x: lastPanOffsetRef.current.x + dx,
                y: lastPanOffsetRef.current.y + dy,
            });
        };

        const handleMouseUp = () => {
            if (isPanningRef.current) {
                isPanningRef.current = false;
                container.style.cursor = "";
            }
        };

        container.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            container.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [containerRef, zoomLevel, panOffset]);

    const transformStyle: React.CSSProperties = {
        transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
        transformOrigin: "center center",
        transition: isPanningRef.current ? "none" : "transform 0.15s ease-out",
    };

    return {
        zoomLevel,
        panOffset,
        zoomIn,
        zoomOut,
        resetZoom,
        fitToWindow,
        transformStyle,
        isZoomed: zoomLevel > 1,
    };
}
