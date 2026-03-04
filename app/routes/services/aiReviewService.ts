export interface AIFinding {
    id: string;
    category: "typography" | "color_contrast" | "layout" | "accessibility";
    severity: "info" | "warning" | "error";
    title: string;
    description: string;
    suggestion: string;
    /** Optional bounding box as fraction of image dimensions (0-1) */
    bounds?: { x: number; y: number; width: number; height: number };
}

export interface AIReviewResult {
    findings: AIFinding[];
    summary: string;
}

/**
 * Send a captured video frame to the server-side AI review endpoint.
 * The API key is kept server-side — this only talks to our own backend.
 */
export async function analyzeFrame(frameBase64: string): Promise<AIReviewResult> {
    const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frameBase64 }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AI review failed (${res.status}): ${errorText}`);
    }

    return res.json();
}
