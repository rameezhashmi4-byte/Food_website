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

  it("serves a plain, publicly-crawlable privacy policy page with no noindex/X-Robots-Tag header", async () => {
    const res = await fetch(`${baseUrl}/privacy`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toBeNull();
    const body = await res.text();
    expect(body).toContain("Privacy Policy");
    expect(body).toContain("mega_671@hotmail.co.uk");
    expect(body).toContain("23. Contact");
  });

  it("serves an OpenAPI 3.1 document describing all nine routes", async () => {
    const res = await fetch(`${baseUrl}/openapi.json`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      openapi: string;
      servers: { url: string }[];
      paths: Record<string, unknown>;
      components: { schemas: unknown; securitySchemes: unknown };
    };
    expect(body.openapi).toBe("3.1.0");
    expect(body.servers[0]?.url).toBe(baseUrl);
    expect(Object.keys(body.paths).sort()).toEqual([
      "/account/preferences",
      "/account/saved",
      "/restaurants/compare",
      "/restaurants/hidden-gems",
      "/restaurants/offers",
      "/restaurants/search",
      "/restaurants/{id}",
      "/restaurants/{id}/save",
    ]);
    // Regression check: the GPT Builder's real import validator rejected
    // this schema live with "In components section, schemas subsection is
    // not an object" when this key was missing entirely.
    expect(typeof body.components.schemas).toBe("object");
    expect(body.components.schemas).not.toBeNull();
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

  it("GET /restaurants/search works with lat/lng instead of location - real GPS coordinates, no text geocoding", async () => {
    const res = await fetch(`${baseUrl}/restaurants/search?lat=51.3762&lng=-0.0982`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { locationLabel: string; recommendations: unknown[] };
    expect(body.locationLabel).toBe("your current location");
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  it("GET /restaurants/search with a location the fictional dataset doesn't cover is a clean 400 with a helpful message, not a 500 (regression: performSearchRestaurants's thrown ToolInputError wasn't being caught by this route)", async () => {
    const res = await fetch(`${baseUrl}/restaurants/search?location=SM5%201NL`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("SM5 1NL");
    expect(body.error).not.toContain("something went wrong");
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

  it("GET /restaurants/hidden-gems works publicly and returns real recommendations", async () => {
    const res = await fetch(`${baseUrl}/restaurants/hidden-gems?location=Croydon`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recommendations: unknown[] };
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  it("GET /restaurants/offers works publicly and returns real recommendations", async () => {
    const res = await fetch(`${baseUrl}/restaurants/offers?location=Croydon`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recommendations: unknown[] };
    expect(Array.isArray(body.recommendations)).toBe(true);
  });

  it("GET /restaurants/compare requires at least 2 ids", async () => {
    const res = await fetch(`${baseUrl}/restaurants/compare?location=Croydon&ids=r_flame_fork`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("2-4");
  });

  it("GET /restaurants/compare works publicly with 2+ real ids", async () => {
    const res = await fetch(`${baseUrl}/restaurants/compare?location=Croydon&ids=r_flame_fork,r_spice_junction`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(2);
  });

  it("GET /restaurants/{id} works publicly for a real id", async () => {
    const res = await fetch(`${baseUrl}/restaurants/r_flame_fork`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { restaurant: { name: string } };
    expect(body.restaurant.name).toBeTruthy();
  });

  it("GET /restaurants/{id} for an unknown id is a clean 400, not a crash", async () => {
    const res = await fetch(`${baseUrl}/restaurants/does-not-exist`);
    expect(res.status).toBe(400);
  });

  it("GET /account/preferences with no Authorization header is a real 401", async () => {
    const res = await fetch(`${baseUrl}/account/preferences`);
    expect(res.status).toBe(401);
  });

  it("PATCH /account/preferences with no Authorization header is a real 401", async () => {
    const res = await fetch(`${baseUrl}/account/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetPerPersonGbp: 30 }),
    });
    expect(res.status).toBe(401);
  });
});
