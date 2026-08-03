import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./fetchWithTimeout";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Creates a Supabase client for use in Server Components, Server Actions
 * and Route Handlers - scoped to the current request's cookies, and so to
 * whichever user (if any) is signed in. This is the ONLY kind of Supabase
 * client this app ever constructs: always the `anon` key, never the
 * service-role key, and always request-scoped (a fresh client per call,
 * per `@supabase/ssr`'s own guidance - never share one across requests).
 *
 * In Server Components, cookies() is read-only, so `setAll` below will
 * throw if Supabase tries to write a refreshed session cookie there. That
 * write instead happens in `proxy.ts` (which runs before the Server
 * Component and can set cookies on the response), so we swallow that
 * specific failure here rather than let a routine token refresh crash page
 * rendering - see the comment inline.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component (cookies() is read-only there).
          // Session refresh is handled by proxy.ts on every request, so
          // this is safe to ignore rather than throw.
        }
      },
    },
    global: { fetch: fetchWithTimeout },
  });
}
