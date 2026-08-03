import { signInWithGoogleAction, signInWithMicrosoftAction } from "@/actions/auth";
import { getOAuthProviderAvailability } from "@/lib/auth/providers";
import { Button } from "@/components/ui/Button";

/** Google/Microsoft sign-in buttons. Plain `<form action={...}>`s posting straight to a Server Action - no client-side Supabase call involved. */
export default function OAuthButtons({ next }: { next: string }) {
  const availability = getOAuthProviderAvailability();

  return (
    <div className="flex flex-col gap-3">
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="secondary" className="w-full" disabled={!availability.google}>
          {availability.google ? "Continue with Google" : "Google sign-in (not configured)"}
        </Button>
      </form>
      <form action={signInWithMicrosoftAction}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="secondary" className="w-full" disabled={!availability.microsoft}>
          {availability.microsoft ? "Continue with Microsoft" : "Microsoft sign-in (not configured)"}
        </Button>
      </form>
    </div>
  );
}
