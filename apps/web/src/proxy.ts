import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/updateSession";

/**
 * Route protection for everything under `/account`, plus the routine
 * Supabase session-cookie refresh every request needs (see
 * `updateSession.ts`).
 *
 * NOTE on the file name: Next.js 16 renamed the `middleware.ts` convention
 * to `proxy.ts` (same mechanism, same execution point - "before any
 * rendering logic" - just a rename to avoid the Express.js "middleware"
 * connotation). `middleware.ts` still works today but prints a deprecation
 * warning on every build, so this app uses the current convention.
 *
 * Per Next.js's own guidance, this is defense in depth, not the only
 * check: every Server Action and Server Component under `/account` also
 * calls `requireUser()` (see `src/lib/auth/session.ts`) independently,
 * since a proxy matcher change could otherwise silently stop covering a
 * route without anything else noticing.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, isAuthenticated } = await updateSession(request);

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/account") && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimisation
     * files, so the session cookie stays fresh app-wide without doing
     * unnecessary work on `/public` assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
