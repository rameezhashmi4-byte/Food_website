import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseUserRepository } from "../supabaseRepository.js";

/**
 * Live, real-network test against the actual Supabase project - not a
 * mock. Requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY /
 * SUPABASE_ANON_KEY in the environment (never hardcoded, never read from
 * a specific file path - this file must stay portable) AND migrations
 * 0008-0010 already applied (see packages/db/migrations). Neither is true
 * in most dev/CI environments, so this whole suite no-ops rather than
 * failing when either precondition is missing - see the two guards below.
 *
 * This deliberately does NOT reuse `runUserRepositoryContract`
 * (userRepository.contract.ts): that helper's `makeUserId()` hands back
 * an arbitrary id and expects a single shared repo to write under any of
 * them, which is exactly what `InMemoryUserRepository` allows and exactly
 * what real Supabase RLS forbids - a client scoped to user A's access
 * token can only ever satisfy `auth.uid() = user_id` for user A. So
 * instead this file creates two REAL, separate Supabase Auth users, gives
 * each their own scoped client (anon key + that user's access token in
 * the Authorization header, exactly how apps/mcp-server and apps/web are
 * expected to build one per request - see SupabaseUserRepository's doc
 * comment), and: (1) runs a normal CRUD lifecycle for user A through
 * their own repo, then (2) proves user B's client genuinely cannot read
 * or write user A's rows - Postgres RLS rejects it, this suite doesn't
 * just trust the policy exists. Both test users (and everything that
 * cascades from their profile row) are deleted in `afterAll` regardless
 * of pass/fail.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const hasLiveEnv = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_ANON_KEY);

/** True once migrations 0008-0010 are applied - detected at runtime, never assumed. */
async function isSchemaMigrated(): Promise<boolean> {
  if (!hasLiveEnv) return false;
  const admin = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);
  const [prefs, activity] = await Promise.all([
    admin.from("user_preferences").select("search_radius_km").limit(1),
    admin.from("user_activity").select("user_id").limit(1),
  ]);
  return !prefs.error && !activity.error;
}

const schemaReady = await isSchemaMigrated();

if (hasLiveEnv && !schemaReady) {
  console.warn(
    "[supabaseRepository.live.test] SUPABASE_* env vars are present but migrations 0008-0010 " +
      "don't look applied yet (user_preferences.search_radius_km or user_activity is missing) - " +
      "skipping the live suite. Apply packages/db/migrations/0008-0010 via the Supabase SQL editor, " +
      "then re-run.",
  );
}
if (!hasLiveEnv) {
  console.warn(
    "[supabaseRepository.live.test] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY not set - skipping the live suite.",
  );
}

// Deliberately a plain `if`, not `describe.skip(...)`: Vitest still
// *executes* a `describe.skip` suite's factory function during collection
// (it only skips running the `it`s inside it), so anything eagerly
// evaluated in the body - like `createClient(undefined, undefined)` below
// when the live env isn't set - would throw at collection time even
// though the suite is meant to be a no-op. Not registering the suite at
// all when a precondition is missing avoids that entirely.
if (!hasLiveEnv || !schemaReady) {
  // Vitest treats a `.test.ts` file that registers zero suites/tests as a
  // collection error, so register one explicit skipped placeholder rather
  // than leaving the file empty - the console.warn above already explains
  // why.
  it.skip("SupabaseUserRepository (live) - skipped, see console warning above", () => {});
}

if (hasLiveEnv && schemaReady) {
  describe("SupabaseUserRepository (live)", () => {
  const admin = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);
  const createdUserIds: string[] = [];

  /** Creates a disposable, pre-confirmed test user and returns a client scoped to their access token - exactly how a real backend builds one from a user's session. */
  async function createTestUserClient(): Promise<{ userId: string; client: SupabaseClient }> {
    const email = `bitejoy-test-${crypto.randomUUID()}@bitejoy-test.invalid`;
    const password = `Aa1!${crypto.randomUUID()}`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw new Error(`Failed to create test user: ${createError?.message}`);
    }
    createdUserIds.push(created.user.id);

    const anonClient = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
    const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
    if (signInError || !session.session) {
      throw new Error(`Failed to sign in test user: ${signInError?.message}`);
    }

    const scopedClient = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { userId: created.user.id, client: scopedClient };
  }

  afterAll(async () => {
    // Deleting the auth user cascades (profiles.id -> auth.users.id ON
    // DELETE CASCADE, then everything else cascades from profiles) so
    // this alone is enough to remove every row these tests created.
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  });

  describe("CRUD lifecycle for a single real user", () => {
    let userA: { userId: string; client: SupabaseClient };

    beforeAll(async () => {
      userA = await createTestUserClient();
    });

    it("upserts a profile and only changes the given fields on a second call", async () => {
      const repo = createSupabaseUserRepository(userA.client);
      const first = await repo.upsertProfile(userA.userId, { displayName: "Ada", homeArea: "Shoreditch" });
      expect(first.displayName).toBe("Ada");
      expect(first.homeArea).toBe("Shoreditch");

      const second = await repo.upsertProfile(userA.userId, { workArea: "Canary Wharf" });
      expect(second.displayName).toBe("Ada"); // untouched field preserved
      expect(second.homeArea).toBe("Shoreditch"); // untouched field preserved
      expect(second.workArea).toBe("Canary Wharf");
      expect(second.createdAt).toBe(first.createdAt);
    });

    it("partially updates preferences, preserving unspecified fields", async () => {
      const repo = createSupabaseUserRepository(userA.client);
      await repo.updatePreferences(userA.userId, { favoriteCuisines: ["japanese"], budgetPerPersonGbp: 40 });
      const updated = await repo.updatePreferences(userA.userId, { dietaryNeeds: ["vegan"] });

      expect(updated.favoriteCuisines).toEqual(["japanese"]); // preserved from the first call
      expect(updated.budgetPerPersonGbp).toBe(40); // preserved from the first call
      expect(updated.dietaryNeeds).toEqual(["vegan"]);
    });

    it("is idempotent when saving the same restaurant twice, and lists/removes it", async () => {
      const repo = createSupabaseUserRepository(userA.client);
      const { data: someRestaurant } = await admin.from("restaurants").select("id").limit(1).maybeSingle();
      if (!someRestaurant) {
        // Fictional demo dataset not seeded in this environment - nothing to save against a real FK.
        return;
      }
      const restaurantId = (someRestaurant as { id: string }).id;

      const first = await repo.saveRestaurant(userA.userId, restaurantId, "date night spot");
      const second = await repo.saveRestaurant(userA.userId, restaurantId, "date night spot");
      expect(second.createdAt).toBe(first.createdAt);
      expect(await repo.isRestaurantSaved(userA.userId, restaurantId)).toBe(true);

      const page = await repo.listSavedRestaurants(userA.userId);
      expect(page.items.some((item) => item.restaurantId === restaurantId)).toBe(true);

      await repo.removeSavedRestaurant(userA.userId, restaurantId);
      await expect(repo.removeSavedRestaurant(userA.userId, restaurantId)).resolves.toBeUndefined(); // idempotent
      expect(await repo.isRestaurantSaved(userA.userId, restaurantId)).toBe(false);
    });

    it("records activity without throwing", async () => {
      const repo = createSupabaseUserRepository(userA.client);
      await expect(
        repo.recordActivity(userA.userId, "preferences_updated", { field: "budgetPerPersonGbp" }),
      ).resolves.toBeUndefined();
    });

    it("deletes all data for the user", async () => {
      const repo = createSupabaseUserRepository(userA.client);
      await repo.deleteAllUserData(userA.userId);
      expect(await repo.getProfile(userA.userId)).toBeUndefined();
      expect(await repo.getPreferences(userA.userId)).toBeUndefined();
    });
  });

  describe("row-level security: cross-user isolation", () => {
    let userA: { userId: string; client: SupabaseClient };
    let userB: { userId: string; client: SupabaseClient };

    beforeAll(async () => {
      userA = await createTestUserClient();
      userB = await createTestUserClient();
      const repoA = createSupabaseUserRepository(userA.client);
      await repoA.upsertProfile(userA.userId, { displayName: "User A", homeArea: "Shoreditch" });
      await repoA.updatePreferences(userA.userId, { favoriteCuisines: ["italian"], budgetPerPersonGbp: 25 });
    });

    it("does not let user B read user A's profile through B's own scoped client", async () => {
      const repoB = createSupabaseUserRepository(userB.client);
      expect(await repoB.getProfile(userA.userId)).toBeUndefined();
    });

    it("does not let user B read user A's preferences through B's own scoped client", async () => {
      const repoB = createSupabaseUserRepository(userB.client);
      expect(await repoB.getPreferences(userA.userId)).toBeUndefined();
    });

    it("does not let user B overwrite user A's profile by targeting A's id directly", async () => {
      // Go straight at PostgREST with B's scoped client (bypassing the
      // repository's own userId plumbing) to prove this is Postgres RLS
      // rejecting it, not just the repository being polite.
      const { data, error } = await userB.client.from("profiles").update({ display_name: "Hijacked by B" }).eq("id", userA.userId).select();
      expect(error).toBeNull();
      expect(data).toEqual([]); // RLS filters the target row out entirely - zero rows updated

      const repoA = createSupabaseUserRepository(userA.client);
      const stillA = await repoA.getProfile(userA.userId);
      expect(stillA?.displayName).toBe("User A");
    });

    it("does not let user B insert a saved_restaurants row owned by user A", async () => {
      const { data: someRestaurant } = await admin.from("restaurants").select("id").limit(1).maybeSingle();
      if (!someRestaurant) return; // no fictional data seeded in this environment
      const restaurantId = (someRestaurant as { id: string }).id;

      const { error } = await userB.client.from("saved_restaurants").insert({ user_id: userA.userId, restaurant_id: restaurantId });
      expect(error).not.toBeNull(); // RLS with-check rejects the insert outright

      const repoB = createSupabaseUserRepository(userB.client);
      const bSeesA = await repoB.listSavedRestaurants(userA.userId);
      expect(bSeesA.items).toHaveLength(0);
    });

    it("does not let user B delete user A's profile", async () => {
      const { data, error } = await userB.client.from("profiles").delete().eq("id", userA.userId).select();
      expect(error).toBeNull();
      expect(data).toEqual([]); // zero rows deleted

      const repoA = createSupabaseUserRepository(userA.client);
      expect(await repoA.getProfile(userA.userId)).toBeDefined(); // A's profile survived B's attempt
    });
  });
  });
}
