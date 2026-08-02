import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { COMPARISON_WIDGET_URI, RESULTS_WIDGET_URI } from "./constants.js";

/**
 * MCP Apps / OpenAI Apps SDK widget resources. Registered separately from
 * the tools that point to them (see each tool's `_meta["openai/outputTemplate"]`).
 *
 * The MIME type below (`text/html+skybridge`) matches OpenAI's currently
 * documented ChatGPT Apps SDK convention as of this build; that convention
 * has been evolving alongside the emerging "MCP Apps" spec
 * (`text/html;profile=mcp-app`), so it's worth re-checking
 * developers.openai.com/apps-sdk before shipping against a live ChatGPT
 * connection - this hasn't been tested against one (see docs/chatgpt-app.md).
 */
const WIDGET_MIME_TYPE = "text/html+skybridge";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Built by @bitejoy/chatgpt-app - see apps/chatgpt-app (vite-plugin-singlefile output).
const WIDGET_DIST_DIR = path.resolve(__dirname, "../../../chatgpt-app/dist");

function loadWidgetHtml(fileName: string, fallbackTitle: string): string {
  const filePath = path.join(WIDGET_DIST_DIR, fileName);
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf8");
  }
  return [
    "<!doctype html><html><body style=\"font-family: system-ui, sans-serif; padding: 16px; color: #555;\">",
    `<p><strong>${fallbackTitle}</strong> widget hasn't been built yet.</p>`,
    "<p>Run <code>npm run build -w @bitejoy/chatgpt-app</code> to generate the interactive card UI, then restart the MCP server.</p>",
    "</body></html>",
  ].join("");
}

export function registerWidgetResources(server: McpServer): void {
  server.registerResource(
    "restaurant-results-widget",
    RESULTS_WIDGET_URI,
    {
      title: "BiteJoy restaurant results",
      mimeType: WIDGET_MIME_TYPE,
      _meta: {
        "openai/widgetDescription": "A joyful, scannable grid of restaurant recommendation cards with match reasons and actions.",
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: WIDGET_MIME_TYPE, text: loadWidgetHtml("results.html", "Restaurant results") }],
    }),
  );

  server.registerResource(
    "restaurant-comparison-widget",
    COMPARISON_WIDGET_URI,
    {
      title: "BiteJoy restaurant comparison",
      mimeType: WIDGET_MIME_TYPE,
      _meta: {
        "openai/widgetDescription": "A side-by-side comparison of a short list of restaurants, with category winners and trade-offs.",
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: WIDGET_MIME_TYPE, text: loadWidgetHtml("comparison.html", "Restaurant comparison") }],
    }),
  );
}
