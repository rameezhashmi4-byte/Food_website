import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createBiteJoyServer, SERVER_NAME } from "./server.js";

const app = express();
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, server: SERVER_NAME });
});

app.post("/mcp", async (req, res) => {
  // Stateless: a fresh server + transport per request avoids cross-request
  // id collisions and keeps this simple to deploy horizontally. Fine for a
  // Stage 2 prototype; a session-aware transport can replace this later if
  // multi-turn server-side state (e.g. widget sessions) is needed.
  const server = createBiteJoyServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[bitejoy] Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

const port = Number(process.env.PORT ?? 3333);
app.listen(port, () => {
  console.error(`[${SERVER_NAME}] MCP server running on http://localhost:${port}/mcp`);
});
