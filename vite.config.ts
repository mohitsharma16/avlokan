import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    headers: {
      // Required for WebGPU and SharedArrayBuffer (used by ONNX multi-threaded WASM)
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  worker: {
    // Ensures the worker file is bundled as an ES module so imports work
    format: "es",
  },
  optimizeDeps: {
    // Exclude transformers from pre-bundling — it handles its own WASM loading
    exclude: ["@huggingface/transformers"],
  },
});

