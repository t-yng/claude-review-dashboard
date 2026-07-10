import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const alias = {
  "@": resolve(__dirname, "src"),
  "@shared": resolve(__dirname, "src/lib"),
};

export default defineConfig({
  main: {
    resolve: { alias },
    // Keep @anthropic-ai/claude-agent-sdk (and any other runtime deps) external;
    // bundle everything else (zod, our own code) into the main entry.
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(__dirname, "electron/main/index.ts") },
    },
  },
  preload: {
    resolve: { alias },
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(__dirname, "electron/preload/index.ts") },
    },
  },
  renderer: {
    root: resolve(__dirname),
    resolve: { alias },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
    server: {
      // Google Fonts are loaded at runtime; nothing else needs a proxy.
    },
  },
});
