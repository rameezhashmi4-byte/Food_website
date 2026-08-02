import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// vite-plugin-singlefile only supports one HTML entry per build (it inlines
// everything into that one file), so each widget gets its own config -
// see package.json's "build" script for how these run together.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { input: "results.html" },
  },
});
