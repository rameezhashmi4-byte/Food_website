import { createClient } from "@supabase/supabase-js";
import { createSupabaseUserRepository } from "@bitejoy/database";
import type { UserRepository } from "./types.js";

/**
 * Builds a `UserRepository` scoped to one already-verified user's access
 * token: a fresh, per-request Supabase client authenticated as that user
 * (the anon key + their bearer token, never the service-role key), backed
 * by `@bitejoy/database`'s canonical `SupabaseUserRepository`. Postgres
 * row-level security then confines every query to that user's own rows.
 */
export function createUserRepositoryForToken(accessToken: string): UserRepository {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return createSupabaseUserRepository(client);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to build a per-user Supabase client (see .env.example).`);
  }
  return value;
}
