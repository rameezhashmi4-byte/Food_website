import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityType,
  ListSavedRestaurantsOptions,
  PreferencesPatch,
  ProfilePatch,
  SavedRestaurant,
  SavedRestaurantPage,
  UserPreferences,
  UserProfile,
  UserRepository,
} from "./types.js";

/**
 * Row shapes as they actually come back from PostgREST (snake_case,
 * nullable instead of optional). Kept private to this file - everything
 * public on `UserRepository` speaks the camelCase, `undefined`-for-absent
 * shape from types.ts.
 */
interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  home_area: string | null;
  work_area: string | null;
  created_at: string;
  updated_at: string;
}

interface PreferencesRow {
  user_id: string;
  search_radius_km: number | null;
  max_travel_time_minutes: number | null;
  budget_per_person_gbp: number | null;
  favorite_cuisines: string[];
  disliked_cuisines: string[];
  food_preferences: string[];
  drink_preferences: string[];
  dietary_needs: string[];
  preferred_atmosphere: string[];
  favorite_occasions: string[];
  parking_important: boolean | null;
  accessibility_needs: string[];
  default_party_size: number | null;
  updated_at: string;
}

interface SavedRestaurantRow {
  user_id: string;
  restaurant_id: string;
  note: string | null;
  created_at: string;
}

const PROFILE_COLUMNS = "id, display_name, avatar_url, home_area, work_area, created_at, updated_at";
const PREFERENCES_COLUMNS =
  "user_id, search_radius_km, max_travel_time_minutes, budget_per_person_gbp, favorite_cuisines, " +
  "disliked_cuisines, food_preferences, drink_preferences, dietary_needs, preferred_atmosphere, " +
  "favorite_occasions, parking_important, accessibility_needs, default_party_size, updated_at";
const SAVED_RESTAURANT_COLUMNS = "user_id, restaurant_id, note, created_at";

function toProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    homeArea: row.home_area ?? undefined,
    workArea: row.work_area ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPreferences(row: PreferencesRow): UserPreferences {
  return {
    userId: row.user_id,
    searchRadiusKm: row.search_radius_km ?? undefined,
    maxTravelTimeMinutes: row.max_travel_time_minutes ?? undefined,
    budgetPerPersonGbp: row.budget_per_person_gbp ?? undefined,
    favoriteCuisines: (row.favorite_cuisines ?? []) as UserPreferences["favoriteCuisines"],
    dislikedCuisines: (row.disliked_cuisines ?? []) as UserPreferences["dislikedCuisines"],
    foodPreferences: row.food_preferences ?? [],
    drinkPreferences: row.drink_preferences ?? [],
    dietaryNeeds: (row.dietary_needs ?? []) as UserPreferences["dietaryNeeds"],
    preferredAtmosphere: (row.preferred_atmosphere ?? []) as UserPreferences["preferredAtmosphere"],
    favoriteOccasions: (row.favorite_occasions ?? []) as UserPreferences["favoriteOccasions"],
    parkingImportant: row.parking_important ?? undefined,
    accessibilityNeeds: (row.accessibility_needs ?? []) as UserPreferences["accessibilityNeeds"],
    defaultPartySize: row.default_party_size ?? undefined,
    updatedAt: row.updated_at,
  };
}

function toSavedRestaurant(row: SavedRestaurantRow): SavedRestaurant {
  return {
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

/** camelCase `PreferencesPatch` key -> `user_preferences` column name. Explicit, not a naive snake_case() conversion, so a rename on either side is a deliberate, visible edit here. */
const PREFERENCES_PATCH_COLUMNS: Record<keyof PreferencesPatch, string> = {
  searchRadiusKm: "search_radius_km",
  maxTravelTimeMinutes: "max_travel_time_minutes",
  budgetPerPersonGbp: "budget_per_person_gbp",
  favoriteCuisines: "favorite_cuisines",
  dislikedCuisines: "disliked_cuisines",
  foodPreferences: "food_preferences",
  drinkPreferences: "drink_preferences",
  dietaryNeeds: "dietary_needs",
  preferredAtmosphere: "preferred_atmosphere",
  favoriteOccasions: "favorite_occasions",
  parkingImportant: "parking_important",
  accessibilityNeeds: "accessibility_needs",
  defaultPartySize: "default_party_size",
};

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`SupabaseUserRepository: ${context}: ${error.message}`);
  }
}

/**
 * Production `UserRepository`, backed by Postgres tables managed under
 * `packages/db/migrations` (0001-0007 for the base schema, 0008-0010 for
 * the Stage 3 profile/preferences/activity additions).
 *
 * `supabaseClient` MUST already be scoped to the calling user - i.e.
 * constructed with the anon key plus that user's access token in the
 * `Authorization` header, e.g.
 *
 *   createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
 *     global: { headers: { Authorization: `Bearer ${userAccessToken}` } },
 *   })
 *
 * This class never constructs its own client and never touches the
 * service-role key: every table it reads/writes has row-level security
 * enabled with a policy of the shape `auth.uid() = user_id`, so a client
 * scoped to the wrong user genuinely cannot see or change another user's
 * rows - Postgres enforces it, not application code. The service role key
 * is reserved for migrations (see packages/db/migrations) and admin-only
 * flows like test user provisioning, never for a normal per-user
 * read/write path.
 */
export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * `user_preferences`, `saved_restaurants` and `user_activity` all carry
   * a foreign key to `profiles.id` (see 0003/0004/0010), so a row can't be
   * inserted into any of them before a profile exists. Rather than push
   * "make sure you've called upsertProfile first" onto every caller (the
   * in-memory reference implementation has no such requirement - see
   * inMemoryRepository.ts), each write path that isn't upsertProfile
   * itself ensures a minimal stub profile exists first. `ignoreDuplicates`
   * makes this an `ON CONFLICT (id) DO NOTHING`, so it never clobbers a
   * real profile that's already there.
   */
  private async ensureProfileStub(userId: string): Promise<void> {
    const { error } = await this.client
      .from("profiles")
      .upsert({ id: userId, display_name: "BiteJoy explorer" }, { onConflict: "id", ignoreDuplicates: true });
    assertNoError(error, "ensureProfileStub");
  }

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const { data, error } = await this.client.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
    assertNoError(error, "getProfile");
    return data ? toProfile(data as unknown as ProfileRow) : undefined;
  }

  async upsertProfile(userId: string, patch: ProfilePatch): Promise<UserProfile> {
    const existing = await this.getProfile(userId);
    const row = {
      id: userId,
      display_name: patch.displayName ?? existing?.displayName ?? "BiteJoy explorer",
      avatar_url: patch.avatarUrl ?? existing?.avatarUrl ?? null,
      home_area: patch.homeArea ?? existing?.homeArea ?? null,
      work_area: patch.workArea ?? existing?.workArea ?? null,
    };
    const { data, error } = await this.client
      .from("profiles")
      .upsert(row, { onConflict: "id" })
      .select(PROFILE_COLUMNS)
      .single();
    assertNoError(error, "upsertProfile");
    return toProfile(data as unknown as ProfileRow);
  }

  async getPreferences(userId: string): Promise<UserPreferences | undefined> {
    const { data, error } = await this.client
      .from("user_preferences")
      .select(PREFERENCES_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    assertNoError(error, "getPreferences");
    return data ? toPreferences(data as unknown as PreferencesRow) : undefined;
  }

  async updatePreferences(userId: string, patch: PreferencesPatch): Promise<UserPreferences> {
    await this.ensureProfileStub(userId);

    // Only include columns the caller actually specified. `.upsert()`
    // compiles to `INSERT ... ON CONFLICT (user_id) DO UPDATE SET <these
    // columns>` - omitted columns are left untouched on the conflict path
    // (and fall back to their table DEFAULT, e.g. '{}', on first insert),
    // which is exactly the "partial update preserves the rest" semantics
    // `InMemoryUserRepository.updatePreferences` implements by hand.
    const row: Record<string, unknown> = { user_id: userId };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      const column = PREFERENCES_PATCH_COLUMNS[key as keyof PreferencesPatch];
      row[column] = value;
    }

    const { data, error } = await this.client
      .from("user_preferences")
      .upsert(row, { onConflict: "user_id" })
      .select(PREFERENCES_COLUMNS)
      .single();
    assertNoError(error, "updatePreferences");
    return toPreferences(data as unknown as PreferencesRow);
  }

  async saveRestaurant(userId: string, restaurantId: string, note?: string): Promise<SavedRestaurant> {
    await this.ensureProfileStub(userId);

    const row: Record<string, unknown> = { user_id: userId, restaurant_id: restaurantId };
    // Same "omit means don't touch" trick as updatePreferences: only send
    // `note` when the caller actually gave one, so re-saving without a
    // note doesn't wipe out a note set earlier.
    if (note !== undefined) row.note = note;

    const { data, error } = await this.client
      .from("saved_restaurants")
      .upsert(row, { onConflict: "user_id,restaurant_id" })
      .select(SAVED_RESTAURANT_COLUMNS)
      .single();
    assertNoError(error, "saveRestaurant");
    return toSavedRestaurant(data as unknown as SavedRestaurantRow);
  }

  async removeSavedRestaurant(userId: string, restaurantId: string): Promise<void> {
    // No .select()/.single(): deleting zero matching rows is not an error,
    // which is what makes this idempotent.
    const { error } = await this.client
      .from("saved_restaurants")
      .delete()
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId);
    assertNoError(error, "removeSavedRestaurant");
  }

  async isRestaurantSaved(userId: string, restaurantId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("saved_restaurants")
      .select("user_id")
      .eq("user_id", userId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    assertNoError(error, "isRestaurantSaved");
    return data !== null;
  }

  async listSavedRestaurants(userId: string, options: ListSavedRestaurantsOptions = {}): Promise<SavedRestaurantPage> {
    const limit = options.limit ?? 20;
    const startIndex = options.cursor ? Number.parseInt(options.cursor, 10) : 0;

    const { data, error, count } = await this.client
      .from("saved_restaurants")
      .select(SAVED_RESTAURANT_COLUMNS, { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(startIndex, startIndex + limit - 1);
    assertNoError(error, "listSavedRestaurants");

    const items = ((data ?? []) as unknown as SavedRestaurantRow[]).map(toSavedRestaurant);
    const nextIndex = startIndex + limit;
    const total = count ?? nextIndex;
    return { items, nextCursor: nextIndex < total ? String(nextIndex) : undefined };
  }

  async recordActivity(userId: string, type: ActivityType, metadata?: Record<string, unknown>): Promise<void> {
    await this.ensureProfileStub(userId);
    const { error } = await this.client
      .from("user_activity")
      .insert({ user_id: userId, activity_type: type, metadata: metadata ?? {} });
    assertNoError(error, "recordActivity");
  }

  async deleteAllUserData(userId: string): Promise<void> {
    // `user_preferences`, `saved_restaurants` and `user_activity` all
    // reference `profiles.id` with `on delete cascade` (0003/0004/0010),
    // so deleting the profile row is enough to remove everything else.
    // Deleting a profile that doesn't exist (a user who never called
    // upsertProfile/updatePreferences/saveRestaurant) is a no-op, not an
    // error - there was nothing to delete either way.
    const { error } = await this.client.from("profiles").delete().eq("id", userId);
    assertNoError(error, "deleteAllUserData");
  }
}

/**
 * `supabaseClient` must already be scoped to the calling user's access
 * token (never the service-role key) - see the class doc comment above and
 * docs/authentication.md for how apps/mcp-server and apps/web are expected
 * to construct it per-request.
 */
export function createSupabaseUserRepository(supabaseClient: SupabaseClient): UserRepository {
  return new SupabaseUserRepository(supabaseClient);
}
