import { headers } from "next/headers";

/**
 * The absolute origin this app is being served from, used to build the
 * `redirectTo` / `emailRedirectTo` URLs Supabase sends OAuth and
 * magic-link users back to. Prefers `NEXT_PUBLIC_SITE_URL` (reliable in
 * production, especially behind a proxy/load balancer); falls back to the
 * incoming request's Host header, which is good enough for local dev.
 *
 * Whatever this resolves to must also be added to the Supabase project's
 * allow-listed Redirect URLs, or the provider will reject the sign-in.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
