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

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function validBounds(value: unknown): value is NonNullable<AIFinding["bounds"]> {
    return isRecord(value) && ["x", "y", "width", "height"].every(key => {
        const n = value[key];
        return typeof n === "number" && n >= 0 && n <= 1;
    });
}

export function parseReviewResult(raw: unknown): AIReviewResult {
    const invalid = "AI returned an incomplete or invalid review. Please try again.";
    if (!isRecord(raw) || !hasText(raw.summary) || !Array.isArray(raw.findings)) {
        throw new Error(invalid);
    }

    const findings = raw.findings.map((finding: unknown, index): AIFinding => {
        if (!isRecord(finding) || !VALID_CATEGORIES.has(finding.category as string) ||
            !VALID_SEVERITIES.has(finding.severity as string) || !hasText(finding.title) ||
            !hasText(finding.description) || !hasText(finding.suggestion) ||
            (finding.bounds !== undefined && !validBounds(finding.bounds))) {
            throw new Error(invalid);
        }
        return {
            id: `finding-${index}`,
            category: finding.category as AIFinding["category"],
            severity: finding.severity as AIFinding["severity"],
            title: finding.title,
            description: finding.description,
            suggestion: finding.suggestion,
            bounds: finding.bounds,
        };
    });
    return { summary: raw.summary, findings };
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

    return parseReviewResult(data);
}
