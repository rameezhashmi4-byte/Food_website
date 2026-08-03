import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAppContext, type CreateAppContextOptions } from "./context.js";
import { registerAllTools } from "./tools/index.js";
import { registerWidgetResources } from "./resources/widgets.js";

export const SERVER_NAME = "bitejoy";
export const SERVER_VERSION = "0.1.0";

/**
 * Builds a fresh, fully-configured BiteJoy MCP server instance.
 *
 * `options.auth` carries this request's verified caller identity (or is
 * omitted entirely for an anonymous caller - every public tool must keep
 * working with it omitted). http.ts builds this per HTTP request from the
 * `Authorization` header; stdio.ts builds it once at startup from the
 * dev-only `MCP_DEV_ACCESS_TOKEN` env var; tests build it directly.
 */
export function createBiteJoyServer(options?: CreateAppContextOptions): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const ctx = createAppContext(options);

  registerAllTools(server, ctx);
  registerWidgetResources(server);

  return server;
}
