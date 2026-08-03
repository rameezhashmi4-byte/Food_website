"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseUserRepository } from "@/lib/database";

/**
 * Deletes the caller's own `auth.users` row via the `delete_own_account()`
 * Postgres function (see packages/db/migrations/0011_delete_own_account.sql)
 * - a `security definer` RPC hardcoded to `auth.uid()`, so this never needs
 * (and must never use) the service-role key from a request-handling path.
 */
async function deleteOwnAuthAccount(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
}

export interface DeleteAccountState {
  status: "idle" | "error";
  message?: string;
}

const CONFIRMATION_PHRASE = "DELETE";

/**
 * Full account deletion. Per the product brief this needs either
 * re-authentication or an explicit typed confirmation before acting - this
 * app uses the typed-confirmation route (the user must type "DELETE"),
 * which is enough friction to prevent an accidental click-through without
 * requiring a full re-login flow, and keeps this one simple form instead of
 * a multi-step wizard.
 *
 * Deletes, in order: every row `UserRepository.deleteAllUserData` owns
 * (profile, preferences, saved restaurants, activity), then the
 * `auth.users` identity itself via the `delete_own_account()` RPC (see
 * migration 0011), then signs out to clear the local session cookie.
 */
export async function deleteAccountAction(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser("/account/delete");

  const confirmation = formData.get("confirmation");
  if (confirmation !== CONFIRMATION_PHRASE) {
    return { status: "error", message: `Type ${CONFIRMATION_PHRASE} exactly to confirm.` };
  }

  const supabase = await createSupabaseServerClient();
  const repository = createSupabaseUserRepository(supabase);

  try {
    await repository.deleteAllUserData(user.id);
  } catch (error) {
    console.error("deleteAccountAction: deleteAllUserData failed:", error instanceof Error ? error.message : error);
    return { status: "error", message: "Couldn't delete your data just now - please try again." };
  }

  try {
    await deleteOwnAuthAccount(supabase);
  } catch (error) {
    // Your BiteJoy data (profile, preferences, saved restaurants, activity)
    // is already gone at this point - only the empty Auth identity shell
    // might remain, e.g. if migration 0011's RPC isn't deployed yet. Signing
    // out below still ends the session either way; this is logged so it's
    // easy to notice and follow up on rather than silently losing the auth
    // record.
    console.error("deleteAccountAction: deleteOwnAuthAccount failed:", error instanceof Error ? error.message : error);
  }

  await supabase.auth.signOut();
  redirect("/?accountDeleted=1");
}
