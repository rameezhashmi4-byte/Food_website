"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/siteUrl";
import { getOAuthProviderAvailability } from "@/lib/auth/providers";

function safeNextPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  // Only ever redirect back into this app - never follow an absolute/external "next" value.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

async function callbackUrl(nextPath: string): Promise<string> {
  const site = await getSiteUrl();
  return `${site}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  if (!getOAuthProviderAvailability().google) {
    redirect("/login?error=google_not_configured");
  }
  const nextPath = safeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(nextPath), skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth_start_failed");
  }
  redirect(data.url);
}

export async function signInWithMicrosoftAction(formData: FormData): Promise<void> {
  if (!getOAuthProviderAvailability().microsoft) {
    redirect("/login?error=microsoft_not_configured");
  }
  const nextPath = safeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure", // Supabase's provider id for Microsoft/Entra ID.
    options: { redirectTo: await callbackUrl(nextPath), skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    redirect("/login?error=oauth_start_failed");
  }
  redirect(data.url);
}

export interface EmailSignInState {
  status: "idle" | "sent" | "error";
  message?: string;
}

const EmailSchema = z.string().trim().email();

/**
 * Sends a magic link (`signInWithOtp`) rather than a password - see the
 * top-level project notes: password signup would need an email-confirmation
 * flow since this Supabase project has `mailer_autoconfirm: false`, and
 * magic link is a simpler, secure MVP that needs no password storage or
 * confirmation UI at all. Works for both new and returning users - Supabase
 * creates the account on first use, so there's no separate "sign up" call.
 */
export async function signInWithEmailAction(
  _prevState: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const parsed = EmailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "That doesn't look like a valid email address." };
  }
  const nextPath = safeNextPath(formData.get("next"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: await callbackUrl(nextPath) },
  });

  if (error) {
    return { status: "error", message: "Couldn't send that link right now - please try again shortly." };
  }
  return { status: "sent", message: `Check ${parsed.data} for a sign-in link.` };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
