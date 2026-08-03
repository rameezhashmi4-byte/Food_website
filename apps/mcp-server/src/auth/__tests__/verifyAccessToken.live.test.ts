import { describe, expect, it, afterAll, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyAccessToken } from "../verifyAccessToken.js";

/**
 * A genuine end-to-end check against the REAL, live Supabase project (not a
 * self-signed fixture): creates one throwaway user via the Admin API,
 * signs in to get a real ES256-signed access token, verifies it with the
 * production `verifyAccessToken` (real `createRemoteJWKSet` fetching the
 * real JWKS over the network, real issuer check), then deletes the test
 * user in a `finally`. Proves the JWKS/issuer verification approach
 * genuinely works against production, not just against a local test key
 * pair (see verifyAccessToken.test.ts for the offline coverage of every
 * error path).
 *
 * Skips itself cleanly (not a failure) if `SUPABASE_URL` /
 * `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` aren't available - it
 * tries to load them from the repo-root `.env` first (same file every other
 * BiteJoy script reads them from) since vitest doesn't load `.env` itself.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRootEnvPath = path.resolve(here, "../../../../../.env");

try {
  // Node 20.6+ (stable in this repo's Node >=20 range). Never overrides
  // already-set env vars, so an environment/CI-provided value still wins.
  process.loadEnvFile(repoRootEnvPath);
} catch {
  // No .env file at the repo root - the credential check below decides whether to skip.
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const hasLiveCredentials = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

describe.skipIf(!hasLiveCredentials)("verifyAccessToken against the real, live Supabase project", () => {
  let admin: SupabaseClient;
  let testUserId: string | undefined;

  const email = `bitejoy-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@bitejoy-test.invalid`;
  const password = `Bitejoy-test-${Math.random().toString(36).slice(2, 10)}-1!`;

  beforeAll(() => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  });

  afterAll(async () => {
    if (testUserId) {
      await admin.auth.admin.deleteUser(testUserId);
    }
  });

  it(
    "verifies a real access token issued by Supabase for a throwaway test user",
    async () => {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(createError).toBeNull();
      expect(created.user).toBeTruthy();
      testUserId = created.user!.id;

      const anon = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } });
      const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
      expect(signInError).toBeNull();
      const accessToken = signedIn.session?.access_token;
      expect(accessToken).toBeTruthy();

      const result = await verifyAccessToken(accessToken!);
      expect(result.userId).toBe(testUserId);
    },
    20_000,
  );
});

if (!hasLiveCredentials) {
  // Not a real test - a visible note (rather than a silent skip) explaining
  // why the live check above didn't run, for anyone scanning test output.
  describe("verifyAccessToken against the real, live Supabase project", () => {
    it.skip("skipped: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY not available", () => {});
  });
}
