const SUPABASE_FETCH_TIMEOUT_MS = 15_000;

/**
 * A live end-to-end run of the email magic-link flow (`npx playwright test`,
 * 2026-08-03) surfaced `supabase.auth.signInWithOtp()` hanging indefinitely
 * with no error and no timeout - the plain `fetch` the Supabase JS client
 * uses by default has no timeout of its own. This bounds every Supabase API
 * call this app makes (both here and in `proxy.ts`'s per-request session
 * refresh) so a slow/unreachable auth backend surfaces as a normal,
 * catchable error instead of an indefinite hang.
 */
export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS) });
}
