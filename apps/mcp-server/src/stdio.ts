import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBiteJoyServer, SERVER_NAME } from "./server.js";

async function main() {
  const server = createBiteJoyServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${SERVER_NAME}] MCP server running on stdio`);
}

main().catch((error) => {
  console.error("[bitejoy] Fatal error starting stdio server:", error);
  process.exit(1);
});
