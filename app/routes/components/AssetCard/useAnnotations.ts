import { useState, useRef, useCallback, useEffect } from "react";
import { Canvas, FabricObject, Circle, Rect, Textbox, PencilBrush } from "fabric";
import type { Annotation } from "../../types";

type AnnotationTool = 'pen' | 'rectangle' | 'circle' | 'text' | 'arrow';

interface UseAnnotationsProps {
    pb: any;
    revision: any;
    user: any;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    showModal: boolean;
}

export function useAnnotations({
    pb,
    revision,
    user,
    videoRef,
    canvasRef,
    containerRef,
    showModal,
}: UseAnnotationsProps) {
    const fabricCanvasRef = useRef<Canvas | null>(null);
    const drawingShapeRef = useRef<FabricObject | null>(null);
    const drawingOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isDrawingRef = useRef(false);

    const [isAnnotating, setIsAnnotating] = useState(false);
    const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pen');
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
    const [brushColor, setBrushColor] = useState('#ff0000');
    const [brushSize, setBrushSize] = useState(3);
    const [annotationDuration, setAnnotationDuration] = useState(5);
    const [annotationsLoading, setAnnotationsLoading] = useState(false);

    // Initialize Fabric.js canvas
    const initializeFabricCanvas = useCallback(() => {
        if (!canvasRef.current || !videoRef.current) return;
        if (fabricCanvasRef.current) {
            const containerEl = containerRef.current;
            if (containerEl) {
                const containerRect = containerEl.getBoundingClientRect();
                fabricCanvasRef.current.setDimensions({
                    width: containerRect.width,
                    height: containerRect.height,
                });
                fabricCanvasRef.current.renderAll();
            }
            return;
        }

        const video = videoRef.current;
        const canvas = new Canvas(canvasRef.current, {
            isDrawingMode: false,
            selection: true,
            preserveObjectStacking: true,
        });

        const updateCanvasSize = () => {
            const containerEl = containerRef.current;
            if (!containerEl) return;
            const containerRect = containerEl.getBoundingClientRect();
            if (containerRect.width && containerRect.height) {
                canvas.setDimensions({
                    width: containerRect.width,
                    height: containerRect.height,
                });
                // Style the Fabric.js generated wrapper
                const wrapperEl = canvasRef.current?.parentElement?.querySelector('.canvas-container') as HTMLElement
                    || canvasRef.current?.parentElement as HTMLElement;
                if (wrapperEl && wrapperEl.classList.contains('canvas-container')) {
                    wrapperEl.style.width = '100%';
                    wrapperEl.style.height = '100%';
                }
                canvas.renderAll();
            }
        };

        video.addEventListener('loadedmetadata', updateCanvasSize);
        video.addEventListener('play', updateCanvasSize);
        window.addEventListener('resize', updateCanvasSize);
        setTimeout(updateCanvasSize, 100);
        setTimeout(updateCanvasSize, 500);

        fabricCanvasRef.current = canvas;

        const brush = new PencilBrush(canvas);
        brush.color = brushColor;
        brush.width = brushSize;
        canvas.freeDrawingBrush = brush;

        return () => {
            video.removeEventListener('loadedmetadata', updateCanvasSize);
            video.removeEventListener('play', updateCanvasSize);
            window.removeEventListener('resize', updateCanvasSize);
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [brushColor, brushSize]);

    // Save current annotation to PocketBase
    const saveAnnotation = useCallback(async () => {
        if (!fabricCanvasRef.current || !videoRef.current) return;

        const canvas = fabricCanvasRef.current;
        const video = videoRef.current;
        const timestamp = video.currentTime;
        const canvasData = canvas.toJSON();

        try {
            const existing = annotations.find(ann => Math.abs(ann.timestamp - timestamp) < 0.5);

            if (existing) {
                await pb.collection("annotations").update(existing.id, {
                    canvasData,
                    timestamp,
                    duration: annotationDuration,
                });
                setAnnotations(prev =>
                    prev.map(ann => ann.id === existing.id ? { ...ann, canvasData, timestamp, duration: annotationDuration } : ann)
                );
                setCurrentAnnotation({ ...existing, canvasData, timestamp, duration: annotationDuration });
            } else {
                const newRecord = await pb.collection("annotations").create({
                    revisionId: revision.id,
                    timestamp,
                    duration: annotationDuration,
                    canvasData,
                    createdBy: user?.email || user?.name || "unknown",
                });

                const newAnnotation: Annotation = {
                    id: newRecord.id,
                    revisionId: revision.id,
                    timestamp,
                    duration: annotationDuration,
                    canvasData,
                    createdBy: user?.email || user?.name || "unknown",
                };

                setAnnotations(prev => [...prev, newAnnotation]);
                setCurrentAnnotation(newAnnotation);
            }
        } catch (error) {
            console.error("Error saving annotation:", error);
            alert("Failed to save annotation. Please try again.");
        }
    }, [annotations, pb, revision.id, user, annotationDuration]);

    // Load annotation for current timestamp — uses duration range
    const loadAnnotationForTime = useCallback((currentTime: number) => {
        if (!fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;

        const annotation = annotations.find(ann => {
            const dur = ann.duration || 5;
            return currentTime >= ann.timestamp && currentTime <= ann.timestamp + dur;
        });

        if (annotation && currentAnnotation?.id === annotation.id) return;

        canvas.clear();

        if (annotation) {
            canvas.loadFromJSON(annotation.canvasData).then(() => {
                canvas.renderAll();
                setCurrentAnnotation(annotation);
            });
        } else {
            setCurrentAnnotation(null);
        }
    }, [annotations, currentAnnotation]);

    // Set up annotation tools
    const setupAnnotationTool = useCallback((tool: string) => {
        if (!fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;

        canvas.isDrawingMode = false;
        canvas.selection = false;

        switch (tool) {
            case 'pen':
                canvas.isDrawingMode = true;
                canvas.selection = false;
                if (canvas.freeDrawingBrush) {
                    canvas.freeDrawingBrush.color = brushColor;
                    canvas.freeDrawingBrush.width = brushSize;
                }
                break;
            case 'rectangle':
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                break;
            case 'circle':
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                break;
            case 'text':
                canvas.defaultCursor = 'text';
                canvas.hoverCursor = 'text';
                break;
            case 'arrow':
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
                break;
        }
    }, [brushColor, brushSize]);

    // Handle mouse events for shape drawing — drag-to-draw
    const handleMouseDown = useCallback((e: any) => {
        if (!fabricCanvasRef.current || annotationTool === 'pen') return;
        if (isDrawingRef.current) return;

        // If user clicked on an existing object, let Fabric.js handle move/resize
        if (e.target) return;

        const canvas = fabricCanvasRef.current;
        const pointer = canvas.getScenePoint(e.e);

        switch (annotationTool) {
            case 'rectangle': {
                const rect = new Rect({
                    left: pointer.x,
                    top: pointer.y,
                    width: 1,
                    height: 1,
                    fill: 'transparent',
                    stroke: brushColor,
                    strokeWidth: brushSize,
                    selectable: false,
                    evented: false,
                    objectCaching: false,
                });
                canvas.add(rect);
                drawingShapeRef.current = rect;
                drawingOriginRef.current = { x: pointer.x, y: pointer.y };
                isDrawingRef.current = true;
                canvas.selection = false;
                canvas.renderAll();
                break;
            }
            case 'circle': {
                const circle = new Circle({
                    left: pointer.x,
                    top: pointer.y,
                    radius: 1,
                    fill: 'transparent',
                    stroke: brushColor,
                    strokeWidth: brushSize,
                    selectable: false,
                    evented: false,
                    objectCaching: false,
                });
                canvas.add(circle);
                drawingShapeRef.current = circle;
                drawingOriginRef.current = { x: pointer.x, y: pointer.y };
                isDrawingRef.current = true;
                canvas.selection = false;
                canvas.renderAll();
                break;
            }
            case 'text': {
                const textbox = new Textbox('Type here', {
                    left: pointer.x,
                    top: pointer.y,
                    fill: brushColor,
                    fontSize: Math.max(16, brushSize * 6),
                    width: 200,
                    editable: true,
                });
                canvas.add(textbox);
                canvas.setActiveObject(textbox);
                textbox.enterEditing();
                canvas.renderAll();
                break;
            }
        }
    }, [annotationTool, brushColor, brushSize]);

    // Handle mouse move for drag-to-draw shapes
    const handleMouseMove = useCallback((e: any) => {
        if (!fabricCanvasRef.current || !drawingShapeRef.current || !isDrawingRef.current) return;

        const canvas = fabricCanvasRef.current;
        const pointer = canvas.getScenePoint(e.e);
        const origin = drawingOriginRef.current;
        const shape = drawingShapeRef.current;

        if (shape instanceof Rect) {
            const left = Math.min(origin.x, pointer.x);
            const top = Math.min(origin.y, pointer.y);
            shape.set({
                left,
                top,
                width: Math.abs(pointer.x - origin.x),
                height: Math.abs(pointer.y - origin.y),
            });
            shape.setCoords();
        } else if (shape instanceof Circle) {
            const radius = Math.sqrt(
                Math.pow(pointer.x - origin.x, 2) + Math.pow(pointer.y - origin.y, 2)
            ) / 2;
            const cx = (origin.x + pointer.x) / 2;
            const cy = (origin.y + pointer.y) / 2;
            shape.set({
                radius,
                left: cx - radius,
                top: cy - radius,
            });
            shape.setCoords();
        }

        canvas.requestRenderAll();
    }, []);

    // Handle mouse up — finish drawing shape
    const handleMouseUp = useCallback(() => {
        if (!fabricCanvasRef.current || !drawingShapeRef.current || !isDrawingRef.current) return;

        const shape = drawingShapeRef.current;
        shape.set({ selectable: true, evented: true });
        shape.setCoords();
        fabricCanvasRef.current.setActiveObject(shape);
        fabricCanvasRef.current.selection = true;
        fabricCanvasRef.current.requestRenderAll();
        drawingShapeRef.current = null;
        isDrawingRef.current = false;
    }, []);

    // Clear all annotations on current timestamp and delete from PocketBase
    const clearCurrentAnnotations = useCallback(async () => {
        if (!fabricCanvasRef.current || !videoRef.current) return;

        const canvas = fabricCanvasRef.current;
        const timestamp = videoRef.current.currentTime;

        const toDelete = annotations.filter(ann => Math.abs(ann.timestamp - timestamp) < 0.5);

        canvas.clear();

        for (const ann of toDelete) {
            try {
                await pb.collection("annotations").delete(ann.id);
            } catch (error) {
                console.error("Error deleting annotation:", error);
            }
        }

        setAnnotations(prev =>
            prev.filter(ann => Math.abs(ann.timestamp - timestamp) > 0.5)
        );
        setCurrentAnnotation(null);
    }, [annotations, pb]);

    // Initialize fabric canvas when modal opens
    useEffect(() => {
        if (showModal && canvasRef.current && videoRef.current) {
            const cleanup = initializeFabricCanvas();
            return cleanup;
        }
    }, [showModal, initializeFabricCanvas]);

    // Set up annotation tool when it changes
    useEffect(() => {
        if (fabricCanvasRef.current) {
            setupAnnotationTool(annotationTool);
        }
    }, [annotationTool, setupAnnotationTool]);

    // Add mouse event listeners for shape drawing
    useEffect(() => {
        if (!fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;

        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);

        return () => {
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('mouse:move', handleMouseMove);
            canvas.off('mouse:up', handleMouseUp);
        };
    }, [handleMouseDown, handleMouseMove, handleMouseUp]);

    // Load annotations when video time changes
    useEffect(() => {
        if (!videoRef.current || !showModal) return;

        const video = videoRef.current;
        const handleTimeUpdate = () => {
            loadAnnotationForTime(video.currentTime);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [showModal, loadAnnotationForTime]);

    // Fetch annotations from PocketBase when modal opens
    const fetchAnnotations = useCallback(async () => {
        if (!revision.id) return;
        setAnnotationsLoading(true);
        try {
            const res = await pb.collection("annotations").getFullList({
                filter: `revisionId = "${revision.id}"`,
                sort: "timestamp",
            });
            setAnnotations(res);
        } catch (error) {
            console.error("Error fetching annotations:", error);
        } finally {
            setAnnotationsLoading(false);
        }
    }, [revision.id, pb]);

    // Toggle annotation mode
    const toggleAnnotating = useCallback(() => {
        const entering = !isAnnotating;
        setIsAnnotating(entering);
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.selection = entering;
        }
        if (videoRef.current) {
            if (entering) {
                videoRef.current.pause();
            }
        }
        if (entering) {
            setTimeout(() => initializeFabricCanvas(), 50);
        }
    }, [isAnnotating, initializeFabricCanvas]);

    return {
        isAnnotating,
        setIsAnnotating,
        annotationTool,
        setAnnotationTool,
        annotations,
        currentAnnotation,
        brushColor,
        setBrushColor,
        brushSize,
        setBrushSize,
        annotationDuration,
        setAnnotationDuration,
        annotationsLoading,
        saveAnnotation,
        clearCurrentAnnotations,
        fetchAnnotations,
        toggleAnnotating,
        fabricCanvasRef,
    };
}
