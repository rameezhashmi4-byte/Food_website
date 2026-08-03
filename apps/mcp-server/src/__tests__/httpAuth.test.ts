import { describe, expect, it, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpApp, protectedResourceMetadataUrl, resolveResourceUrl } from "../http.js";

/**
 * HTTP-layer tests: the RFC 9728 Protected Resource Metadata endpoint, the
 * `WWW-Authenticate` header on a genuine auth failure, and that a public
 * tool keeps working over a real `http.Server` (real headers, real
 * fetch/SSE) with no `Authorization` header at all - not just over the
 * in-memory transport the other tool tests use.
 */
// `createHttpApp()` bakes its resource URL from `process.env.PORT` at
// construction time (matching real deployments, where PORT is fixed and
// known up front) - so this test uses a fixed port rather than an
// OS-assigned ephemeral one (`listen(0)`), which `createHttpApp()` couldn't
// have known about in advance.
const TEST_PORT = 48213;

// `resolveResourceUrl` (http.ts) always advertises `http://localhost:<port>`
// regardless of which interface/hostname a client actually connects
// through - so every request in this file also targets `localhost`, to
// match what the server itself claims its resource URL is.
const baseUrl = `http://localhost:${TEST_PORT}`;
const mcpUrl = new URL(`${baseUrl}/mcp`);

describe("http.ts - Protected Resource Metadata + WWW-Authenticate", () => {
  let server: http.Server;

  beforeAll(async () => {
    process.env.PORT = String(TEST_PORT);
    // A syntactically valid but fake project URL: enough for
    // verifyAccessToken's default (env-driven) verifier to construct
    // itself. The malformed token used below fails compact-JWS format
    // validation before jose ever needs to fetch this URL's JWKS, so this
    // test never touches the network - see verifyAccessToken.live.test.ts
    // for the real-network, real-project check.
    process.env.SUPABASE_URL = "https://example-test-project.supabase.co";
    const app = createHttpApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it("serves a Protected Resource Metadata document at the RFC 9728 well-known path", async () => {
    const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resource: string; authorization_servers: string[] };
    expect(body.resource).toBe(`${baseUrl}/mcp`);
    expect(body.authorization_servers).toHaveLength(1);
    expect(body.authorization_servers[0]).toMatch(/\/auth\/v1$/);
  });

  it("resolveResourceUrl/protectedResourceMetadataUrl are the same pure functions the running endpoint relies on", async () => {
    const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
    const body = (await res.json()) as { resource: string };

    expect(resolveResourceUrl(TEST_PORT)).toBe(body.resource);
    expect(protectedResourceMetadataUrl(body.resource)).toBe(`${baseUrl}/.well-known/oauth-protected-resource`);
  });

  it("a public tool works over real HTTP with no Authorization header at all", async () => {
    const transport = new StreamableHTTPClientTransport(mcpUrl);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: "search_restaurants", arguments: { location: "Croydon" } });
      expect(result.isError).toBeFalsy();
    } finally {
      await client.close();
    }
  });

  it("does NOT set WWW-Authenticate on an ordinary request with no Authorization header (that's not a failure)", async () => {
    const res = await fetch(mcpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.headers.get("www-authenticate")).toBeNull();
  });

  it("sets WWW-Authenticate pointing at the metadata endpoint when a bearer token is present but invalid", async () => {
    const res = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: "Bearer this-is-not-a-real-token",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

    const header = res.headers.get("www-authenticate");
    expect(header).toBeTruthy();
    expect(header).toContain("Bearer");
    expect(header).toContain(`resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`);
  });

  it("an invalid bearer token still lets public tools work in the same request (tolerated, not a hard failure)", async () => {
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: { headers: { Authorization: "Bearer this-is-not-a-real-token" } },
    });
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: "search_restaurants", arguments: { location: "Croydon" } });
      expect(result.isError).toBeFalsy();
    } finally {
      await client.close();
    }
  });

  it("an invalid bearer token still produces the clean sign-in-required error for a private tool (not a crash)", async () => {
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: { headers: { Authorization: "Bearer this-is-not-a-real-token" } },
    });
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: "get_user_preferences", arguments: {} });
      expect(result.isError).toBe(true);
    } finally {
      await client.close();
    }
  });
});
