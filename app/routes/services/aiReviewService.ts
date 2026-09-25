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

const VALID_CATEGORIES = new Set([
    "typography",
    "color_contrast",
    "layout",
    "accessibility",
]);
const VALID_SEVERITIES = new Set(["info", "warning", "error"]);

function normalizeFindings(raw: unknown): AIFinding[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(
            (f): f is Record<string, unknown> =>
                !!f &&
                typeof f === "object" &&
                typeof (f as Record<string, unknown>).title === "string" &&
                VALID_CATEGORIES.has((f as Record<string, unknown>).category as string) &&
                VALID_SEVERITIES.has((f as Record<string, unknown>).severity as string)
        )
        .map((f, idx) => ({
            id: typeof f.id === "string" ? f.id : `finding-${idx}`,
            category: f.category as AIFinding["category"],
            severity: f.severity as AIFinding["severity"],
            title: f.title as string,
            description: typeof f.description === "string" ? f.description : "",
            suggestion: typeof f.suggestion === "string" ? f.suggestion : "",
            bounds: f.bounds as AIFinding["bounds"],
        }));
}

/**
 * Send a captured frame (raw base64 JPEG, no data-URL prefix) to the
 * server-side /api/ai-review route and return a normalized result.
 */
export async function requestAIReview(imageBase64: string): Promise<AIReviewResult> {
    const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data?.error || "AI analysis failed. Please try again.");
    }

    const findings = normalizeFindings(data.findings);
    return {
        summary:
            typeof data.summary === "string" && data.summary
                ? data.summary
                : `Found ${findings.length} potential issue${findings.length !== 1 ? "s" : ""}.`,
        findings,
    };
}
