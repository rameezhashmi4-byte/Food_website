import { test as base, expect, type Page } from "@playwright/test";

/**
 * Stage 3 test-auth strategy
 * ==========================
 * There's no real Supabase project, no real Google/Microsoft/OpenAI OAuth
 * credentials, and no way to click a real magic-link email in this
 * environment - so this is a best-effort bypass targeting the most common
 * supabase-js pattern, not a verified-working substitute for a real login.
 *
 * Two complementary mechanisms, since `apps/web` could end up relying on
 * either one:
 *
 *  1. Network interception: any request to Supabase's `/auth/v1/*` REST
 *     endpoints (`getUser`, token refresh, etc.) resolves with a
 *     fake-but-well-formed session/user, without needing a real Supabase
 *     project or credentials.
 *  2. localStorage seeding: supabase-js primarily restores its session
 *     from localStorage on boot (under the conventional key
 *     `sb-<project-ref>-auth-token`) rather than a network round trip, so
 *     this also seeds that key directly via `page.addInitScript`, before
 *     any app code runs. The project ref is derived from
 *     `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `VITE_SUPABASE_URL` if
 *     one is set in the test environment; otherwise a placeholder ref is
 *     used.
 *
 * `apps/web` uses `@supabase/ssr` (cookie-based sessions read server-side
 * in Server Components/Actions), not the browser client reading its own
 * localStorage - so this bypass is NOT expected to produce a real signed-in
 * server-rendered session by itself. It's kept (rather than deleted) as a
 * documented, working starting point for whoever wires up real
 * cookie-based test auth next - see `skipIfBypassDidNotSignIn` in
 * `account.spec.ts`, which turns "the bypass didn't work" into an honest
 * skip instead of a confusing failure.
 */

const FAKE_USER_ID = "00000000-0000-4000-8000-000000000001";
export const FAKE_USER_EMAIL = "e2e-test-user@bitejoy.test";

function projectRefFromSupabaseUrl(url: string | undefined): string {
  if (!url) return "test-project";
  try {
    // Supabase project URLs look like https://<ref>.supabase.co
    const host = new URL(url).hostname;
    return host.split(".")[0] || "test-project";
  } catch {
    return "test-project";
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const PROJECT_REF = projectRefFromSupabaseUrl(SUPABASE_URL);

/** The localStorage key supabase-js conventionally stores its session under. */
export const SUPABASE_AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export function fakeSupabaseSession() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const user = {
    id: FAKE_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: FAKE_USER_EMAIL,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  return {
    access_token: "e2e-fake-access-token",
    refresh_token: "e2e-fake-refresh-token",
    expires_at: nowSeconds + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user,
  };
}

async function interceptSupabaseAuthNetwork(page: Page): Promise<void> {
  await page.route("**/auth/v1/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeSupabaseSession().user),
    });
  });
  await page.route("**/auth/v1/token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeSupabaseSession()),
    });
  });
}

async function seedSupabaseSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    { key: SUPABASE_AUTH_STORAGE_KEY, session: fakeSupabaseSession() },
  );
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await interceptSupabaseAuthNetwork(page);
    await seedSupabaseSession(page);
    await use(page);
  },
});

export { expect };
