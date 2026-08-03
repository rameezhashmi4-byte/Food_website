import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import OAuthButtons from "@/components/OAuthButtons";
import EmailSignInForm from "@/components/EmailSignInForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sign up" };

/**
 * `/signup` is intentionally a thin wrapper around the exact same flow as
 * `/login`: OAuth (Google/Microsoft) never distinguishes "sign up" from
 * "log in" - Supabase creates the account on first OAuth consent - and
 * magic-link email is the same: `signInWithOtp` creates the user on first
 * use if they don't already exist. There is no separate signup form or
 * password to set, so duplicating the page is just a different heading on
 * the same components rather than a second implementation to keep in sync.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const next = params.next && params.next.startsWith("/") ? params.next : "/account";

  if (user) {
    redirect(next);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Create your BiteJoy account</h1>
        <p className="mt-2 text-muted">
          Pick whichever is easiest - there&rsquo;s nothing extra to fill in, and it&rsquo;s the same account
          you&rsquo;ll use from BiteJoy in ChatGPT.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-5">
          <OAuthButtons next={next} />
          <hr className="border-border" />
          <EmailSignInForm next={next} />
        </div>
      </Card>
    </div>
  );
}
