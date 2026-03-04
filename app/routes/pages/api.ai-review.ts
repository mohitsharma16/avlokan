import type { ActionFunctionArgs } from "react-router";

const GEMINI_MODEL = "gemini-2.0-flash";

const ANALYSIS_PROMPT = `You are a professional UI/UX design reviewer. Analyze the provided screenshot of a video frame and identify design issues.

Categorize your findings into these categories:
- typography: Font readability, size hierarchy, consistency, line spacing
- color_contrast: WCAG contrast compliance, foreground/background issues, color harmony
- layout: Alignment, spacing, visual weight distribution, grid consistency
- accessibility: Missing focus indicators, small touch targets, text over busy backgrounds

For each finding, provide:
- category: one of "typography", "color_contrast", "layout", "accessibility"
- severity: "info" (minor suggestion), "warning" (should fix), or "error" (critical issue)
- title: brief one-line title
- description: detailed explanation of the issue
- suggestion: actionable fix recommendation
- bounds: (optional) approximate bounding box as fractions of image dimensions {x, y, width, height} where values are 0-1

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief overall assessment of the design (1-2 sentences)",
  "findings": [
    {
      "category": "typography",
      "severity": "warning",
      "title": "...",
      "description": "...",
      "suggestion": "...",
      "bounds": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.1 }
    }
  ]
}

If the frame shows non-UI content (e.g. live action video, nature footage), respond with:
{
  "summary": "This frame does not appear to contain UI/design elements to review.",
  "findings": []
}`;

export async function action({ request }: ActionFunctionArgs) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const { image } = await request.json();

        if (!image || typeof image !== "string") {
            return new Response(
                JSON.stringify({ error: "Missing or invalid 'image' field. Expected base64 string." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: ANALYSIS_PROMPT },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: image,
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                    responseMimeType: "application/json",
                },
            }),
        });

        if (!geminiRes.ok) {
            const errBody = await geminiRes.text();
            console.error("Gemini API error:", geminiRes.status, errBody);
            return new Response(
                JSON.stringify({ error: "AI analysis failed. Please try again." }),
                { status: 502, headers: { "Content-Type": "application/json" } }
            );
        }

        const geminiData = await geminiRes.json();

        // Extract the text content from Gemini response
        const rawText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

        // Parse the JSON response
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            console.error("Failed to parse Gemini JSON response:", rawText);
            parsed = { summary: "AI returned an unparseable response.", findings: [] };
        }

        // Add IDs to findings
        const findings = (parsed.findings || []).map((f: any, i: number) => ({
            ...f,
            id: `ai-${Date.now()}-${i}`,
        }));

        return new Response(
            JSON.stringify({ summary: parsed.summary || "", findings }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("AI review action error:", err);
        return new Response(
            JSON.stringify({ error: "An unexpected error occurred during AI analysis." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
