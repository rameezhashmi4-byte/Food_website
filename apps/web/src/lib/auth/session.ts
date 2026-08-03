import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | undefined;
}

/**
 * Reads the current user from their verified JWT claims (never from the
 * unverified `getSession()`), for Server Components, Server Actions and
 * Route Handlers. Returns `null` if nobody is signed in.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return { id: data.claims.sub, email: data.claims.email };
}

/**
 * Same as `getCurrentUser`, but redirects to `/login` instead of returning
 * `null`. `proxy.ts` already protects `/account/*` at the routing layer;
 * this is the second, independent check every Server Action and page under
 * `/account` also performs - see the comment in `proxy.ts` for why both
 * exist.
 */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    redirect(target);
  }
  return user;
}
