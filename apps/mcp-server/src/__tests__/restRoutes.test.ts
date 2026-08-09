import { describe, expect, it, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createHttpApp } from "../http.js";

/**
 * REST/OpenAPI layer tests (see rest/routes.ts, rest/openapiSchema.ts) -
 * the ChatGPT Custom GPT Action fallback for accounts without MCP
 * connector/Developer Mode access. Mirrors httpAuth.test.ts's pattern: a
 * real http.Server, real fetch requests. The authenticated save/list/
 * remove round trip itself was verified live against the real Supabase
 * project (see docs/stage-3-verification.md) rather than re-mocked here -
 * what this file covers is the parts that don't need live credentials:
 * public search working, and every private route rejecting cleanly with a
 * real 401 (not a 200-with-error-text, which is what the MCP transport
 * does - REST needs a real 401 for a GPT Action's OAuth flow to trigger).
 */
const TEST_PORT = 48214;
const baseUrl = `http://localhost:${TEST_PORT}`;

describe("REST/OpenAPI layer", () => {
  let server: http.Server;

  beforeAll(async () => {
    process.env.PORT = String(TEST_PORT);
    process.env.SUPABASE_URL = "https://example-test-project.supabase.co";
    const app = createHttpApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it("serves an OpenAPI 3.1 document describing all four routes", async () => {
    const res = await fetch(`${baseUrl}/openapi.json`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { openapi: string; servers: { url: string }[]; paths: Record<string, unknown> };
    expect(body.openapi).toBe("3.1.0");
    expect(body.servers[0]?.url).toBe(baseUrl);
    expect(Object.keys(body.paths).sort()).toEqual(["/account/saved", "/restaurants/search", "/restaurants/{id}/save"]);
  });

  it("GET /restaurants/search works with no Authorization header at all (public)", async () => {
    const res = await fetch(`${baseUrl}/restaurants/search?location=Croydon`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { locationLabel: string; recommendations: unknown[] };
    expect(body.locationLabel).toBeTruthy();
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  it("GET /restaurants/search without a location query param is a clean 400, not a crash", async () => {
    const res = await fetch(`${baseUrl}/restaurants/search`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("location");
  });

  it("POST /restaurants/:id/save with no Authorization header is a real 401", async () => {
    const res = await fetch(`${baseUrl}/restaurants/r_flame_fork/save`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("POST /restaurants/:id/save with an invalid bearer token is a real 401, not a 200-with-error-text", async () => {
    const res = await fetch(`${baseUrl}/restaurants/r_flame_fork/save`, {
      method: "POST",
      headers: { Authorization: "Bearer this-is-not-a-real-token" },
    });
    expect(res.status).toBe(401);
  });

  it("DELETE /restaurants/:id/save with no Authorization header is a real 401", async () => {
    const res = await fetch(`${baseUrl}/restaurants/r_flame_fork/save`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("GET /account/saved with no Authorization header is a real 401", async () => {
    const res = await fetch(`${baseUrl}/account/saved`);
    expect(res.status).toBe(401);
  });
});
