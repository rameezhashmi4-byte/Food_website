import { pathToFileURL } from "node:url";
import express, { type Express, type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createBiteJoyServer, SERVER_NAME } from "./server.js";
import { AuthError, extractBearerToken, verifyAccessToken, type VerifiedAuth } from "./auth/index.js";
import { createRestRouter } from "./rest/routes.js";
import { buildOpenApiSchema } from "./rest/openapiSchema.js";

const DEFAULT_PORT = 3333;

export function resolvePort(): number {
  return Number(process.env.PORT ?? DEFAULT_PORT);
}

/**
 * This server's own public resource URL - what a client presents this MCP
 * server as in OAuth terms (RFC 9728's "protected resource"). `MCP_PUBLIC_URL`
 * should be the full public `/mcp` URL in any deployed environment; falls
 * back to the local dev address otherwise.
 */
export function resolveResourceUrl(port: number): string {
  return process.env.MCP_PUBLIC_URL ?? `http://localhost:${port}/mcp`;
}

/** The Protected Resource Metadata document's own URL, derived from the resource URL's origin (RFC 9728 ยง3). */
export function protectedResourceMetadataUrl(resourceUrl: string): string {
  try {
    const origin = new URL(resourceUrl);
    return `${origin.protocol}//${origin.host}/.well-known/oauth-protected-resource`;
  } catch {
    return "/.well-known/oauth-protected-resource";
  }
}

function authorizationServerIssuer(): string | undefined {
  const supabaseUrl = process.env.SUPABASE_URL;
  return supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/auth/v1` : undefined;
}

/**
 * Builds the Express app: `/healthz`, the RFC 9728 Protected Resource
 * Metadata document, and the stateless `/mcp` endpoint. Factored out from
 * the `app.listen(...)` bootstrap below so tests can exercise real HTTP
 * requests (headers included) against a real `http.Server` on an ephemeral
 * port, without this module binding a real port just by being imported.
 */
export function createHttpApp(): Express {
  const app = express();
  app.use(express.json());

  const port = resolvePort();
  const resourceUrl = resolveResourceUrl(port);
  const metadataUrl = protectedResourceMetadataUrl(resourceUrl);

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, server: SERVER_NAME });
  });

  // RFC 9728 Protected Resource Metadata: tells an MCP/OAuth client which
  // authorization server(s) can mint tokens this resource accepts, so it
  // can discover the right issuer instead of it being hardcoded client-side.
  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    const authorizationServer = authorizationServerIssuer();
    res.json({
      resource: resourceUrl,
      authorization_servers: authorizationServer ? [authorizationServer] : [],
    });
  });

  // OpenAPI schema for a ChatGPT Custom GPT Action - the fallback path when
  // MCP connectors / Developer Mode aren't available on a given ChatGPT
  // plan (see rest/openapiSchema.ts and docs/chatgpt-app.md). Same origin
  // as the MCP resource URL above, so both "servers" entries always agree.
  app.get("/openapi.json", (_req, res) => {
    const origin = new URL(resourceUrl).origin;
    res.json(buildOpenApiSchema(origin, process.env.SUPABASE_URL));
  });

  app.use(createRestRouter());

  app.post("/mcp", async (req, res) => {
    // Stateless: a fresh server + transport per request avoids cross-request
    // id collisions and keeps this simple to deploy horizontally. Fine for a
    // Stage 2 prototype; a session-aware transport can replace this later if
    // multi-turn server-side state (e.g. widget sessions) is needed.
    //
    // Stage 3: auth is resolved fresh per request too, for the same reason -
    // there's no persistent session to have attached it to earlier. A
    // missing bearer token is NOT an error here (most tools are public); an
    // invalid/expired one is - see resolveRequestAuth below. Both that
    // resolution and the actual MCP handling share one try/catch so a
    // genuinely unexpected failure (e.g. SUPABASE_URL missing entirely -
    // a deployment misconfiguration, not a per-caller auth failure) still
    // gets the same graceful JSON 500 instead of Express's default error
    // page.
    try {
      const auth = await resolveRequestAuth(req, res, metadataUrl);
      const server = createBiteJoyServer({ auth });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });

      res.on("close", () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[bitejoy] Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  return app;
}

/**
 * Extracts and verifies the request's bearer token, if any.
 *
 * No `Authorization` header at all -> returns `undefined` silently; this is
 * the normal case for anonymous discovery (search_restaurants etc.) and
 * must not be treated as a failure.
 *
 * An `Authorization` header that fails verification -> also returns
 * `undefined` (so public tools in the same request still work), but this
 * IS treated as an auth failure: a `WWW-Authenticate` response header is
 * set pointing at the Protected Resource Metadata document, per RFC 9728 /
 * RFC 6750, so a compliant client can discover how to obtain a valid token.
 * Any private tool called in this request will still fail cleanly with the
 * "please sign in" message (lib/authGuard.ts) - this header is an
 * additional, standards-compliant signal at the HTTP layer, not a
 * replacement for that per-tool check.
 *
 * Implementation note on the header itself: `StreamableHTTPServerTransport`
 * (see @modelcontextprotocol/sdk/server/streamableHttp.js) converts this
 * Express request/response into a Web Standard Request, builds its own
 * Response object internally (via @hono/node-server), and writes that
 * straight onto the underlying Node `res` via `res.writeHead(status,
 * headers)` - there's no hook to inject an extra header into that response
 * after the fact. But Node's `http.ServerResponse` documents that headers
 * set with `res.setHeader()` *before* `writeHead()` is called are merged
 * with (and only overridden by an explicit same-named entry in) whatever
 * `writeHead()` is later called with - so setting it here, before the
 * transport ever touches `res`, reliably survives into the final response.
 * This is verified directly in __tests__/httpAuth.test.ts against a real
 * `http.Server`, not asserted on faith.
 */
async function resolveRequestAuth(req: Request, res: Response, metadataUrl: string): Promise<VerifiedAuth | undefined> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return undefined;

  try {
    return await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      res.setHeader("WWW-Authenticate", `Bearer resource_metadata="${metadataUrl}"`);
      return undefined;
    }
    throw error;
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  const app = createHttpApp();
  const port = resolvePort();
  app.listen(port, () => {
    console.error(`[${SERVER_NAME}] MCP server running on http://localhost:${port}/mcp`);
  });
}
