import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAppContext } from "./context.js";
import { registerAllTools } from "./tools/index.js";
import { registerWidgetResources } from "./resources/widgets.js";

export const SERVER_NAME = "bitejoy";
export const SERVER_VERSION = "0.1.0";

/** Builds a fresh, fully-configured BiteJoy MCP server instance. */
export function createBiteJoyServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const ctx = createAppContext();

  registerAllTools(server, ctx);
  registerWidgetResources(server);

  return server;
}
