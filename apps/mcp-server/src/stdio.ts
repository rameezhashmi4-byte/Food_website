import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBiteJoyServer, SERVER_NAME } from "./server.js";
import { AuthError, verifyAccessToken, type VerifiedAuth } from "./auth/index.js";

async function main() {
  const auth = await resolveDevAuth();
  const server = createBiteJoyServer({ auth });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${SERVER_NAME}] MCP server running on stdio${auth ? ` (dev auth: user ${auth.userId})` : ""}`);
}

/**
 * Dev-only convenience: the stdio transport (used for local development,
 * e.g. via an MCP Inspector or a local ChatGPT dev config) has no HTTP
 * request and therefore no `Authorization` header to read per-call the way
 * http.ts does. `MCP_DEV_ACCESS_TOKEN` lets a developer paste in a real
 * Supabase access token once at process startup to exercise the
 * authenticated tools locally.
 *
 * This is deliberately NOT how production auth works (that's http.ts's
 * per-request bearer token) and must never be set in a deployed
 * environment - the token would apply to every tool call for the whole
 * process lifetime, which is fine for one developer's local shell and
 * wrong for anything else.
 */
async function resolveDevAuth(): Promise<VerifiedAuth | undefined> {
  const token = process.env.MCP_DEV_ACCESS_TOKEN;
  if (!token) return undefined;

  try {
    const auth = await verifyAccessToken(token);
    console.error(`[bitejoy] MCP_DEV_ACCESS_TOKEN verified for user ${auth.userId} (local dev only - do not set this in production).`);
    return auth;
  } catch (error) {
    const code = error instanceof AuthError ? error.code : "unknown_error";
    console.error(`[bitejoy] MCP_DEV_ACCESS_TOKEN was set but failed verification (${code}) - continuing without auth.`);
    return undefined;
  }
}

main().catch((error) => {
  console.error("[bitejoy] Fatal error starting stdio server:", error);
  process.exit(1);
});
