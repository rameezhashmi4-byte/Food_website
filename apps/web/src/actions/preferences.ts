"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseUserRepository } from "@/lib/database";
import { diffPreferencesPatch, diffProfilePatch, parsePreferencesForm } from "@/lib/database/preferencesForm";

export interface PreferencesFormState {
  status: "idle" | "saved" | "error";
  message?: string;
}

export async function updatePreferencesAction(
  _prevState: PreferencesFormState,
  formData: FormData,
): Promise<PreferencesFormState> {
  const user = await requireUser("/account/preferences");
  const supabase = await createSupabaseServerClient();
  const repository = createSupabaseUserRepository(supabase);

  try {
    const [current, currentProfile] = await Promise.all([repository.getPreferences(user.id), repository.getProfile(user.id)]);
    const submitted = parsePreferencesForm(formData);
    const preferencesPatch = diffPreferencesPatch(current, submitted);
    const profilePatch = diffProfilePatch(currentProfile, submitted);

    if (Object.keys(preferencesPatch).length === 0 && Object.keys(profilePatch).length === 0) {
      return { status: "saved", message: "Nothing changed." };
    }

    if (Object.keys(preferencesPatch).length > 0) {
      await repository.updatePreferences(user.id, preferencesPatch);
      await repository.recordActivity(user.id, "preferences_updated", { fields: Object.keys(preferencesPatch) });
    }
    if (Object.keys(profilePatch).length > 0) {
      await repository.upsertProfile(user.id, profilePatch);
    }

    revalidatePath("/account/preferences");
    revalidatePath("/account");
    return { status: "saved", message: "Preferences saved." };
  } catch (error) {
    console.error("updatePreferencesAction failed:", error instanceof Error ? error.message : error);
    return {
      status: "error",
      message: "Couldn't save your preferences just now - please try again.",
    };
  }
}
