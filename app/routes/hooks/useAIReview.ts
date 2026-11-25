import { captureVideoFrame } from "../utils/frameCapture";
import { useCallback, useState } from "react";
import { requestAIReview, type AIReviewResult } from "../services/aiReviewService";

export type ReviewStatus = "idle" | "analyzing" | "error";

export interface AIReviewState {
  status: ReviewStatus;
  result: AIReviewResult | null;
  error: string | null;
}

export interface UseAIReview {
  state: AIReviewState;
  analyzeFrame: (video: HTMLVideoElement | null) => Promise<void>;
}

export function useAIReview(): UseAIReview {
  const [state, setState] = useState<AIReviewState>({
    status: "idle",
    result: null,
    error: null,
  });

  const analyzeFrame = useCallback(async (video: HTMLVideoElement | null): Promise<void> => {
    setState((prev) => ({ ...prev, status: "analyzing", result: null, error: null }));
    try {
      if (!video) throw new Error("Wait for the video to load and try again.");
      const result = await requestAIReview(captureVideoFrame(video));
      setState({ status: "idle", result, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI analysis failed.";
      setState((prev) => ({ ...prev, status: "error", error: message }));
    }
  }, []);

  return { state, analyzeFrame };
}
