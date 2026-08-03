import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseUserRepository, type UserProfile } from "@/lib/database";

function deriveDisplayName(user: User): string {
  const metadata = user.user_metadata ?? {};
  const fromMetadata = (metadata.full_name ?? metadata.name) as string | undefined;
  if (fromMetadata && fromMetadata.trim().length > 0) return fromMetadata.trim();
  if (user.email) return user.email.split("@")[0] ?? user.email;
  return "BiteJoy user";
}

function deriveAvatarUrl(user: User): string | undefined {
  const metadata = user.user_metadata ?? {};
  const url = (metadata.avatar_url ?? metadata.picture) as string | undefined;
  return url && /^https?:\/\//.test(url) ? url : undefined;
}

/**
 * Bootstraps a `profiles` row the first time someone signs in - there's no
 * database trigger that creates one automatically (unlike some Supabase
 * starter templates), so this app does it explicitly right after the
 * OAuth/magic-link callback completes. A no-op if the profile already
 * exists, so it's safe to call on every sign-in, not just the first.
 *
 * `email` and which provider was used aren't part of `@bitejoy/database`'s
 * `UserProfile` (they live on Supabase's own `auth.users` already - no
 * need to duplicate them here); only display name and avatar are derived
 * from the provider's metadata.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User): Promise<UserProfile> {
  const repository = createSupabaseUserRepository(supabase);

  const existing = await repository.getProfile(user.id);
  if (existing) return existing;

  return repository.upsertProfile(user.id, {
    displayName: deriveDisplayName(user),
    avatarUrl: deriveAvatarUrl(user),
  });
}
