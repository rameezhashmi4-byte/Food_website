import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

// Builds each widget as a single, dependency-free HTML file (inline JS+CSS)
// so the MCP server can read it straight off disk and embed it as a `ui://`
// resource - see apps/mcp-server/src/resources/widgets.ts.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        results: resolve(__dirname, "results.html"),
        comparison: resolve(__dirname, "comparison.html"),
      },
    },
  },
});
