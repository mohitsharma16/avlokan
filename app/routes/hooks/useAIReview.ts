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
  analyzeFrame: (base64: string) => Promise<void>;
  clearResult: () => void;
}

export function useAIReview(): UseAIReview {
  const [state, setState] = useState<AIReviewState>({
    status: "idle",
    result: null,
    error: null,
  });

  const analyzeFrame = useCallback(async (base64: string): Promise<void> => {
    setState((prev) => ({ ...prev, status: "analyzing", result: null, error: null }));
    try {
      const result = await requestAIReview(base64);
      setState({ status: "idle", result, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI analysis failed.";
      setState((prev) => ({ ...prev, status: "error", error: message }));
    }
  }, []);

  const clearResult = useCallback(() => {
    setState((prev) => ({ ...prev, result: null, error: null }));
  }, []);

  return { state, analyzeFrame, clearResult };
}
