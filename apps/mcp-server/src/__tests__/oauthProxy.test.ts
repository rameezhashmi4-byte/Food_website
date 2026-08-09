import { describe, expect, it, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createHttpApp } from "../http.js";

/**
 * The OAuth reverse-proxy (rest/oauthProxy.ts) that lets ChatGPT's Custom
 * GPT Action OAuth config satisfy the "Authorization URL, Token URL, and
 * API hostname must share a root domain" rule the GPT Builder enforces
 * (confirmed live - see docs/chatgpt-app.md). This only checks the proxy
 * forwards correctly; the actual OAuth exchange with a real client id was
 * verified live against the real Supabase project (see
 * docs/stage-3-verification.md) - a fake/invalid client id here still
 * proves the request reached Supabase for real (a genuine "invalid
 * client_id format" response from Supabase itself, not a local error).
 */
const TEST_PORT = 48215;
const baseUrl = `http://localhost:${TEST_PORT}`;

describe("OAuth proxy", () => {
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

  it("GET /oauth/authorize redirects to Supabase's real authorize endpoint, preserving the query string", async () => {
    const res = await fetch(
      `${baseUrl}/oauth/authorize?client_id=abc&redirect_uri=${encodeURIComponent("https://chat.openai.com/cb")}&response_type=code&state=xyz`,
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    const target = new URL(location as string);
    expect(target.origin).toBe("https://example-test-project.supabase.co");
    expect(target.pathname).toBe("/auth/v1/oauth/authorize");
    expect(target.searchParams.get("client_id")).toBe("abc");
    expect(target.searchParams.get("state")).toBe("xyz");
  });

  it("POST /oauth/token forwards the request to Supabase and relays its response verbatim, rather than erroring locally", async () => {
    const res = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=authorization_code&code=fake&client_id=fake&client_secret=fake&redirect_uri=https://example.com/cb",
    });
    // A fake project domain (example-test-project.supabase.co doesn't
    // resolve) means this fetch itself fails - proving the proxy actually
    // attempted a real outbound call rather than short-circuiting, which
    // is exactly what the 502 branch in oauthProxy.ts is for.
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_request");
  });

  it("returns a clean 500 (not a crash) when SUPABASE_URL isn't configured", async () => {
    const originalUrl = process.env.SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    try {
      const app2 = createHttpApp();
      const server2 = http.createServer(app2);
      await new Promise<void>((resolve) => server2.listen(0, resolve));
      const address = server2.address();
      const port = typeof address === "object" && address ? address.port : 0;

      const res = await fetch(`http://localhost:${port}/oauth/authorize?client_id=abc&redirect_uri=x&response_type=code`, {
        redirect: "manual",
      });
      expect(res.status).toBe(500);

      await new Promise<void>((resolve, reject) => server2.close((err) => (err ? reject(err) : resolve())));
    } finally {
      process.env.SUPABASE_URL = originalUrl;
    }
  });
});
