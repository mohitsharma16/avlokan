/**
 * gemmaWorker.ts — Vite-bundled Web Worker for on-device Gemma 4 E2B inference.
 *
 * Uses Gemma4ForConditionalGeneration + Gemma4Processor from @huggingface/transformers v4.
 * Runs entirely off the main thread — UI never freezes during inference.
 *
 * Messages IN:
 *   { type: 'load' }
 *   { type: 'analyze', imageData: string }  ← raw base64 JPEG (no data-URL prefix)
 *
 * Messages OUT:
 *   { type: 'progress', message: string, percent: number }
 *   { type: 'ready',    backend: 'webgpu'|'wasm' }
 *   { type: 'result',   text: string }
 *   { type: 'error',    message: string }
 */

import {
  Gemma4ForConditionalGeneration,
  Gemma4Processor,
  env,
  RawImage,
} from "@huggingface/transformers";

// ── Config ────────────────────────────────────────────────────────────────────
// Gemma 4 E2B — ~800 MB q4 quantized, multimodal (text + image)
const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";
env.allowRemoteModels = true;

// ── State ─────────────────────────────────────────────────────────────────────
let processor: InstanceType<typeof Gemma4Processor> | null = null;
let model: InstanceType<typeof Gemma4ForConditionalGeneration> | null = null;
let activeBackend: "webgpu" | "wasm" = "wasm";

// ── Helpers ───────────────────────────────────────────────────────────────────
function post(msg: Record<string, unknown>) {
  self.postMessage(msg);
}

function progressCallback(info: Record<string, unknown>) {
  const status = info.status as string;
  if (status === "downloading" || status === "progress") {
    const loaded = Number(info.loaded ?? 0);
    const total = Number(info.total ?? 0);
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
    const file = String(info.file ?? "").split("/").pop() ?? "";
    post({
      type: "progress",
      message: `Downloading${file ? ` ${file}` : ""}…`,
      percent: pct,
    });
  } else if (status === "loading") {
    post({ type: "progress", message: "Loading model into memory…", percent: 99 });
  }
}

// ── Detect WebGPU ─────────────────────────────────────────────────────────────
async function detectBackend(): Promise<"webgpu" | "wasm"> {
  try {
    if (typeof navigator !== "undefined" && (navigator as unknown as { gpu?: unknown }).gpu) {
      const gpu = (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }).gpu;
      const adapter = await gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    // fall through to wasm
  }
  return "wasm";
}

// ── Load model ────────────────────────────────────────────────────────────────
async function loadModel() {
  if (model) return;

  post({ type: "progress", message: "Detecting hardware…", percent: 0 });
  activeBackend = await detectBackend();

  try {
    processor = await Gemma4Processor.from_pretrained(MODEL_ID, {
      progress_callback: progressCallback,
    }) as InstanceType<typeof Gemma4Processor>;

    model = await Gemma4ForConditionalGeneration.from_pretrained(MODEL_ID, {
      device: activeBackend,
      // Use quantized dtypes to fit in browser memory
      dtype: activeBackend === "webgpu"
        ? {
            embed_tokens: "fp16",
            vision_encoder: "fp16",
            decoder_model_merged: "q4",
          }
        : "q4",
      progress_callback: progressCallback,
    }) as InstanceType<typeof Gemma4ForConditionalGeneration>;

    post({ type: "ready", backend: activeBackend });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    post({ type: "error", message: `Failed to load model: ${msg}` });
    processor = null;
    model = null;
  }
}

// ── Analyze frame ─────────────────────────────────────────────────────────────
async function analyzeFrame(imageBase64: string) {
  if (!processor || !model) {
    post({ type: "error", message: "Model not loaded yet." });
    return;
  }

  const PROMPT = `You are a professional UI/UX reviewer. Analyze this design screenshot and return ONLY a valid JSON object. No markdown, no prose, no code fences — just raw JSON.

Schema:
{
  "summary": "<one sentence overall assessment>",
  "findings": [
    {
      "id": "<unique string>",
      "category": "<typography | color_contrast | layout | accessibility>",
      "severity": "<info | warning | error>",
      "title": "<short title>",
      "description": "<what the issue is>",
      "suggestion": "<how to fix it>"
    }
  ]
}

Return at most 8 findings. Focus on the most impactful issues.`;

  try {
    // Load image from base64
    const image = await RawImage.fromURL(`data:image/jpeg;base64,${imageBase64}`);

    // Build chat messages in Gemma 4 format
    const messages = [
      {
        role: "user",
        content: [
          { type: "image" },           // placeholder — image is passed separately
          { type: "text", text: PROMPT },
        ],
      },
    ];

    // Apply chat template and process image together
    const inputs = await (processor as unknown as {
      apply_chat_template(
        messages: unknown[],
        opts: Record<string, unknown>
      ): Promise<Record<string, unknown>>;
    }).apply_chat_template(messages, {
      add_generation_prompt: true,
      images: [image],
      tokenize: true,
      return_dict: true,
      return_tensors: "pt",
    });

    const output = await (model as unknown as {
      generate(input: Record<string, unknown>): Promise<{ sequences: unknown }>;
    }).generate({
      ...inputs,
      max_new_tokens: 1024,
      do_sample: false,
    });

    // Decode — skip the input prompt tokens to get only the generated part
    const inputLen = (inputs.input_ids as unknown as { dims: number[] }).dims?.[1] ?? 0;
    const decoded: string[] = await (processor as unknown as {
      batch_decode(tokens: unknown, opts: Record<string, unknown>): Promise<string[]>;
    }).batch_decode(
      // Slice off the prompt from the output
      (output as unknown as { data: number[][]; dims: number[] }),
      {
        skip_special_tokens: true,
        // Pass input length so the processor strips the prompt echo
        skip_prompt: true,
        input_length: inputLen,
      }
    );

    const raw = decoded[0] ?? "";

    // Extract the JSON object from the response
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonText =
      jsonStart !== -1 && jsonEnd > jsonStart
        ? raw.slice(jsonStart, jsonEnd + 1)
        : raw;

    post({ type: "result", text: jsonText });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    post({ type: "error", message: `Analysis failed: ${msg}` });
  }
}

// ── Message router ────────────────────────────────────────────────────────────
self.addEventListener("message", (event: MessageEvent) => {
  const { type, imageData } = event.data as { type: string; imageData?: string };
  if (type === "load") {
    loadModel();
  } else if (type === "analyze" && imageData) {
    analyzeFrame(imageData);
  }
});
