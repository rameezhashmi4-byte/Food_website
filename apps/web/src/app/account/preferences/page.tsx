import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseUserRepository } from "@/lib/database";
import PreferencesForm from "@/components/PreferencesForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Preferences" };

export default async function PreferencesPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const repository = createSupabaseUserRepository(supabase);
  const [preferences, profile] = await Promise.all([repository.getPreferences(user.id), repository.getProfile(user.id)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Preferences</h1>
        <p className="mt-1 text-muted">
          A few quick things that help BiteJoy recommend better - in ChatGPT and here. Nothing is required; skip
          anything that doesn&rsquo;t apply and come back whenever.
        </p>
      </div>
      <Card>
        <PreferencesForm current={preferences} profile={profile} />
      </Card>
    </div>
  );
}
