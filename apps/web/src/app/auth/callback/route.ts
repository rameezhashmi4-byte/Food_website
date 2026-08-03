import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile/ensureProfile";

/**
 * Completes both the OAuth (Google/Microsoft) and magic-link email flows.
 * `@supabase/ssr` defaults to the PKCE flow for both, which means both
 * arrive here the same way - a `?code=` query param to exchange for a
 * session via `exchangeCodeForSession` - so one handler covers both.
 *
 * Never logs the code, the exchanged session, or any token: only whether
 * the exchange succeeded.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback_failed", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=callback_failed", url.origin));
  }

  await ensureProfile(supabase, data.user);

  return NextResponse.redirect(new URL(next, url.origin));
}
