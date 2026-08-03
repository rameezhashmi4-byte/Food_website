import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Refreshes the Supabase session cookie (if needed) and reports whether the
 * request is authenticated. Called from `proxy.ts` on every request under
 * `/account/*`.
 *
 * This is the one place in the app with full read/write access to both the
 * request and the eventual response before any page renders, which is why
 * `@supabase/ssr` requires a middleware/proxy step at all: a token refresh
 * that happens later (e.g. in a Server Component, where `cookies()` is
 * read-only) has nowhere to write the refreshed cookie back to.
 *
 * Uses `getClaims()` rather than `getSession()` to decide auth state -
 * `getSession()` reads whatever is in the cookie without verifying it,
 * which is not safe to trust for an authorization decision (see the
 * `@supabase/ssr` docs). `getClaims()` verifies the JWT.
 */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; isAuthenticated: boolean }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  return { response, isAuthenticated: !error && data !== null };
}
