import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseUserRepository } from "@/lib/database";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const repository = createSupabaseUserRepository(supabase);

  const profile = await repository.getProfile(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-text">My account</h1>

      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            {profile?.avatarUrl ? (
              // Plain <img>, not next/image: an external, provider-hosted
              // avatar URL of unknown origin - not worth a remotePatterns
              // config entry for a single small image.
              <img
                src={profile.avatarUrl}
                alt=""
                width={56}
                height={56}
                className="rounded-full object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-lg font-bold text-accent-strong"
              >
                {(profile?.displayName ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-text">{profile?.displayName ?? "BiteJoy user"}</p>
              {user.email && <p className="text-muted">{user.email}</p>}
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Home area</dt>
              <dd className="mt-0.5 text-text">{profile?.homeArea ?? <span className="text-muted">Not set</span>}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Work area</dt>
              <dd className="mt-0.5 text-text">{profile?.workArea ?? <span className="text-muted">Not set</span>}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-muted">
            Home and work area come from your{" "}
            <a className="text-accent hover:underline" href="/account/preferences">
              preferences
            </a>
            .
          </p>

          <div className="mt-6">
            <Button href="/account/preferences" variant="secondary">
              Edit preferences
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
