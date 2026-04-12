/**
 * gemmaWorker.js — Web Worker for on-device Gemma 4 vision inference
 *
 * This runs entirely off the main thread so the UI never freezes.
 * Model weights are cached in the browser's Cache API after first download.
 *
 * Messages IN  (from main thread):
 *   { type: 'load' }                     — pre-load the model
 *   { type: 'analyze', imageData: string } — base64 JPEG frame, no data-URL prefix
 *
 * Messages OUT (to main thread):
 *   { type: 'progress', message: string, percent: number }
 *   { type: 'ready',    backend: 'webgpu'|'wasm' }
 *   { type: 'result',   text: string }
 *   { type: 'error',    message: string }
 */

import {
  AutoProcessor,
  AutoModelForImageTextToText,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js";

// ── Configuration ────────────────────────────────────────────────────────────
const MODEL_ID = "onnx-community/gemma-3-4b-it-ONNX"; // ~1.4 GB q4 quantized multimodal
env.allowRemoteModels = true;
env.backends.onnx.logSeverity = 3; // suppress verbose ONNX logs

// ── State ────────────────────────────────────────────────────────────────────
let processor = null;
let model = null;
let activeBackend = "wasm";

// ── Helpers ──────────────────────────────────────────────────────────────────
function post(msg) {
  self.postMessage(msg);
}

function progressCallback(info) {
  if (info.status === "downloading" || info.status === "progress") {
    const pct =
      info.total > 0 ? Math.round((info.loaded / info.total) * 100) : 0;
    const filePart = info.file ? ` (${info.file.split("/").pop()})` : "";
    post({
      type: "progress",
      message: `Downloading model${filePart}…`,
      percent: pct,
    });
  } else if (info.status === "loading") {
    post({ type: "progress", message: "Loading model into memory…", percent: 99 });
  }
}

// ── Load model ───────────────────────────────────────────────────────────────
async function loadModel() {
  if (model) return; // already loaded

  post({ type: "progress", message: "Initializing…", percent: 0 });

  // Detect WebGPU support
  let device = "wasm";
  try {
    if (typeof navigator !== "undefined" && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) device = "webgpu";
    }
  } catch (_) {}

  activeBackend = device;

  try {
    processor = await AutoProcessor.from_pretrained(MODEL_ID, {
      progress_callback: progressCallback,
    });

    model = await AutoModelForImageTextToText.from_pretrained(MODEL_ID, {
      device,
      dtype: {
        embed_tokens: "fp16",
        vision_encoder: "fp16",
        decoder_model_merged: "q4",
      },
      progress_callback: progressCallback,
    });

    post({ type: "ready", backend: device });
  } catch (err) {
    post({ type: "error", message: `Failed to load model: ${err.message}` });
  }
}

// ── Analyze frame ─────────────────────────────────────────────────────────────
async function analyzeFrame(imageBase64) {
  if (!model || !processor) {
    post({ type: "error", message: "Model not loaded yet." });
    return;
  }

  const PROMPT = `You are a professional UI/UX reviewer. Analyze the provided design screenshot and return a JSON object ONLY — no markdown, no prose, just valid JSON.

The JSON must follow this exact schema:
{
  "summary": "<one sentence overall assessment>",
  "findings": [
    {
      "id": "<unique string>",
      "category": "<one of: typography | color_contrast | layout | accessibility>",
      "severity": "<one of: info | warning | error>",
      "title": "<short title>",
      "description": "<what the issue is>",
      "suggestion": "<how to fix it>"
    }
  ]
}

If no issues are found in a category, omit findings for that category. Return at most 8 findings total. Focus on the most impactful issues only.`;

  try {
    // Convert base64 to a blob URL the processor can read
    const byteChars = atob(imageBase64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArr[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArr], { type: "image/jpeg" });
    const imageUrl = URL.createObjectURL(blob);

    const inputs = await processor(imageUrl, PROMPT, {
      chat_template: "default",
    });

    URL.revokeObjectURL(imageUrl);

    const output = await model.generate({
      ...inputs,
      max_new_tokens: 1024,
      do_sample: false,
    });

    const decoded = processor.batch_decode(output, {
      skip_special_tokens: true,
    });

    // Strip the prompt echo that some models include
    const raw = decoded[0] || "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonText =
      jsonStart !== -1 && jsonEnd !== -1
        ? raw.slice(jsonStart, jsonEnd + 1)
        : raw;

    post({ type: "result", text: jsonText });
  } catch (err) {
    post({ type: "error", message: `Analysis failed: ${err.message}` });
  }
}

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  const { type, imageData } = event.data;
  if (type === "load") loadModel();
  else if (type === "analyze") analyzeFrame(imageData);
});
