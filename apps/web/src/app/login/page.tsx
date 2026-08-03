import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import OAuthButtons from "@/components/OAuthButtons";
import EmailSignInForm from "@/components/EmailSignInForm";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Log in" };

const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up on this deploy yet.",
  microsoft_not_configured: "Microsoft sign-in isn't set up on this deploy yet.",
  oauth_start_failed: "Something went wrong starting that sign-in - please try again.",
  callback_failed: "That sign-in link didn't work - it may have expired. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const next = params.next && params.next.startsWith("/") ? params.next : "/account";

  if (user) {
    redirect(next);
  }

  const errorMessage = params.error ? (ERROR_MESSAGES[params.error] ?? "Something went wrong - please try again.") : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">Log in</h1>
        <p className="mt-2 text-muted">Same account either way - BiteJoy doesn&rsquo;t distinguish signing up from logging in.</p>
      </div>

      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

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
