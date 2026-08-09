import express, { type Router } from "express";

/**
 * A thin reverse proxy for Supabase's OAuth Authorization Server, mounted
 * on THIS server's own domain.
 *
 * Why this exists: ChatGPT's Custom GPT Actions require the API hostname,
 * Authorization URL and Token URL to all share the same root domain
 * (confirmed live: "Authorization URL, Token URL, and API hostname must
 * share a root domain" - a real error from the GPT Builder, not a
 * documented API constraint found any other way). Supabase's real OAuth
 * server lives at `${SUPABASE_URL}/auth/v1/oauth/*`, which is never going
 * to share a root domain with wherever this API is hosted - so this proxy
 * makes ChatGPT talk to OUR domain for both endpoints, and forwards the
 * actual OAuth exchange to Supabase behind the scenes. Supabase remains
 * the real authorization server and the real source of truth for tokens;
 * this never inspects, stores or mints anything itself, purely forwards.
 *
 * - `/oauth/authorize` is a browser-navigated redirect (the user's
 *   browser follows it to Supabase's real consent/login screen, which
 *   redirects straight back to ChatGPT's own callback URL - this proxy is
 *   only in the picture for the first hop), so a 302 with the same query
 *   string is enough - no need to touch the response body.
 * - `/oauth/token` is a server-to-server POST from ChatGPT's backend, so
 *   it needs a real proxy: forward the raw request body/content-type to
 *   Supabase's real token endpoint and return its response verbatim.
 */
export function createOAuthProxyRouter(): Router {
  const router = express.Router();

  router.get("/oauth/authorize", (req, res) => {
    const supabaseUrl = requireSupabaseUrl(res);
    if (!supabaseUrl) return;
    const target = new URL(`${supabaseUrl}/auth/v1/oauth/authorize`);
    // `req.originalUrl` (not `req.url`, which can be mount-point-relative)
    // always carries the full path + query string as the client sent it.
    target.search = new URL(req.originalUrl, "http://placeholder").search;
    res.redirect(302, target.toString());
  });

  // Raw body passthrough (not express.json()/urlencoded()) so the token
  // request is forwarded byte-for-byte - safest for PKCE's code_verifier
  // and avoids any re-serialization mismatch.
  router.post("/oauth/token", express.raw({ type: "*/*" }), async (req, res) => {
    const supabaseUrl = requireSupabaseUrl(res);
    if (!supabaseUrl) return;
    try {
      const upstream = await fetch(`${supabaseUrl}/auth/v1/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": req.headers["content-type"] ?? "application/x-www-form-urlencoded",
        },
        body: req.body,
      });
      const body = await upstream.text();
      res.status(upstream.status);
      const contentType = upstream.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      res.send(body);
    } catch (error) {
      console.error("[bitejoy] OAuth token proxy failed:", error);
      res.status(502).json({ error: "invalid_request", error_description: "Could not reach the authorization server." });
    }
  });

  return router;
}

function requireSupabaseUrl(res: express.Response): string | undefined {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    res.status(500).json({ error: "server_error", error_description: "SUPABASE_URL is not configured." });
    return undefined;
  }
  return url.replace(/\/+$/, "");
}
