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

/**
 * Parse raw text output from Gemma into a structured AIReviewResult.
 * Handles noisy output by extracting the first valid JSON object found.
 */
export function parseGemmaOutput(rawText: string): AIReviewResult {
    let jsonText = rawText.trim();

    // Strip markdown code fences if present
    jsonText = jsonText.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();

    // Extract the outermost { ... } block
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
        jsonText = jsonText.slice(start, end + 1);
    }

    let parsed: any;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        // Return a graceful fallback instead of throwing
        return {
            summary: "The model returned an unexpected response. Please try again.",
            findings: [],
        };
    }

    const findings: AIFinding[] = (Array.isArray(parsed.findings) ? parsed.findings : [])
        .filter(
            (f: any) =>
                f &&
                typeof f.title === "string" &&
                VALID_CATEGORIES.has(f.category) &&
                VALID_SEVERITIES.has(f.severity)
        )
        .map((f: any, idx: number) => ({
            id: f.id ?? `finding-${idx}`,
            category: f.category,
            severity: f.severity,
            title: f.title,
            description: typeof f.description === "string" ? f.description : "",
            suggestion: typeof f.suggestion === "string" ? f.suggestion : "",
            bounds: f.bounds,
        }));

    return {
        summary:
            typeof parsed.summary === "string" && parsed.summary
                ? parsed.summary
                : `Found ${findings.length} potential issue${findings.length !== 1 ? "s" : ""}.`,
        findings,
    };
}
