import { useRef, useState, useCallback } from "react";
import {
  parseGemmaOutput,
  type AIReviewResult,
} from "../services/aiReviewService";

export type ModelStatus = "idle" | "loading" | "ready" | "analyzing" | "error";

export interface GemmaReviewState {
  modelStatus: ModelStatus;
  downloadProgress: number;
  progressMessage: string;
  backend: "webgpu" | "wasm" | null;
  result: AIReviewResult | null;
  error: string | null;
}

export interface UseGemmaReview {
  state: GemmaReviewState;
  initModel: () => void;
  analyzeFrame: (base64: string) => Promise<void>;
  clearResult: () => void;
}

export function useGemmaReview(): UseGemmaReview {
  const workerRef = useRef<Worker | null>(null);
  const pendingResolveRef = useRef<((result: AIReviewResult) => void) | null>(null);
  const pendingRejectRef = useRef<((err: Error) => void) | null>(null);

  const [state, setState] = useState<GemmaReviewState>({
    modelStatus: "idle",
    downloadProgress: 0,
    progressMessage: "",
    backend: null,
    result: null,
    error: null,
  });

  const getOrCreateWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL("/gemmaWorker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event) => {
      const { type, message, percent, backend, text } = event.data;

      if (type === "progress") {
        setState((prev) => ({
          ...prev,
          modelStatus: "loading",
          downloadProgress: percent ?? prev.downloadProgress,
          progressMessage: message ?? "",
        }));
      } else if (type === "ready") {
        setState((prev) => ({
          ...prev,
          modelStatus: "ready",
          downloadProgress: 100,
          progressMessage: "",
          backend: backend ?? null,
        }));
      } else if (type === "result") {
        const parsed = parseGemmaOutput(text);
        setState((prev) => ({
          ...prev,
          modelStatus: "ready",
          result: parsed,
          error: null,
        }));
        pendingResolveRef.current?.(parsed);
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
      } else if (type === "error") {
        const errMsg: string = message ?? "Unknown error";
        setState((prev) => ({
          ...prev,
          modelStatus: prev.modelStatus === "analyzing" ? "ready" : "error",
          error: errMsg,
        }));
        pendingRejectRef.current?.(new Error(errMsg));
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
      }
    };

    worker.onerror = (e) => {
      const msg = e.message ?? "Worker crashed";
      setState((prev) => ({ ...prev, modelStatus: "error", error: msg }));
      pendingRejectRef.current?.(new Error(msg));
      pendingResolveRef.current = null;
      pendingRejectRef.current = null;
    };

    workerRef.current = worker;
    return worker;
  }, []);

  const initModel = useCallback(() => {
    setState((prev) => {
      if (prev.modelStatus !== "idle") return prev;
      return { ...prev, modelStatus: "loading", progressMessage: "Starting…" };
    });
    const worker = getOrCreateWorker();
    worker.postMessage({ type: "load" });
  }, [getOrCreateWorker]);

  const analyzeFrame = useCallback(
    (base64: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        const wrappedResolve = (_result: AIReviewResult) => resolve();
        pendingResolveRef.current = wrappedResolve;
        pendingRejectRef.current = reject;

        setState((prev) => ({
          ...prev,
          modelStatus: "analyzing",
          result: null,
          error: null,
        }));

        const worker = getOrCreateWorker();
        worker.postMessage({ type: "analyze", imageData: base64 });
      });
    },
    [getOrCreateWorker]
  );

  const clearResult = useCallback(() => {
    setState((prev) => ({ ...prev, result: null, error: null }));
  }, []);

  return { state, initModel, analyzeFrame, clearResult };
}
