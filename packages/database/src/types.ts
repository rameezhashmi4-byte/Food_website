import { z } from "zod";
import { AtmosphereSchema, CuisineSchema, DietaryTagSchema, FacilitySchema, OccasionSchema } from "@bitejoy/core";

/**
 * The persistence contract shared by apps/mcp-server and apps/web. Neither
 * app talks to Supabase (or any other store) directly for user data - both
 * go through a `UserRepository`, so there is exactly one place persistence
 * logic lives. `@bitejoy/core` never imports this package: scoring stays
 * pure and storage-agnostic (see `blendPreferences` in
 * @bitejoy/core/scoring, which accepts plain preference data as input).
 */

export const UserProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
  homeArea: z.string().optional(),
  workArea: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ProfilePatchSchema = z
  .object({
    displayName: z.string().min(1).max(80),
    avatarUrl: z.string().url(),
    homeArea: z.string().max(120),
    workArea: z.string().max(120),
  })
  .partial()
  .strict();
export type ProfilePatch = z.infer<typeof ProfilePatchSchema>;

export const UserPreferencesSchema = z.object({
  userId: z.string(),
  searchRadiusKm: z.number().positive().max(50).optional(),
  maxTravelTimeMinutes: z.number().positive().max(180).optional(),
  budgetPerPersonGbp: z.number().positive().max(1000).optional(),
  favoriteCuisines: z.array(CuisineSchema).default([]),
  dislikedCuisines: z.array(CuisineSchema).default([]),
  foodPreferences: z.array(z.string()).default([]),
  drinkPreferences: z.array(z.string()).default([]),
  dietaryNeeds: z.array(DietaryTagSchema).default([]),
  preferredAtmosphere: z.array(AtmosphereSchema).default([]),
  favoriteOccasions: z.array(OccasionSchema).default([]),
  parkingImportant: z.boolean().optional(),
  accessibilityNeeds: z.array(FacilitySchema).default([]),
  defaultPartySize: z.number().int().positive().max(50).optional(),
  updatedAt: z.string().datetime(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/**
 * What a client may send to `update_user_preferences` / the website
 * preferences form. Every field optional (skippable), `.strict()` so
 * unsupported fields are rejected rather than silently ignored, and a
 * partial update only ever touches the keys actually present - see
 * `UserRepository.updatePreferences`.
 */
export const PreferencesPatchSchema = z
  .object({
    searchRadiusKm: z.number().positive().max(50),
    maxTravelTimeMinutes: z.number().positive().max(180),
    budgetPerPersonGbp: z.number().positive().max(1000),
    favoriteCuisines: z.array(CuisineSchema),
    dislikedCuisines: z.array(CuisineSchema),
    foodPreferences: z.array(z.string()),
    drinkPreferences: z.array(z.string()),
    dietaryNeeds: z.array(DietaryTagSchema),
    preferredAtmosphere: z.array(AtmosphereSchema),
    favoriteOccasions: z.array(OccasionSchema),
    parkingImportant: z.boolean(),
    accessibilityNeeds: z.array(FacilitySchema),
    defaultPartySize: z.number().int().positive().max(50),
  })
  .partial()
  .strict();
export type PreferencesPatch = z.infer<typeof PreferencesPatchSchema>;

export const SavedRestaurantSchema = z.object({
  userId: z.string(),
  restaurantId: z.string(),
  note: z.string().max(280).optional(),
  createdAt: z.string().datetime(),
});
export type SavedRestaurant = z.infer<typeof SavedRestaurantSchema>;

export const SavedRestaurantPageSchema = z.object({
  items: z.array(SavedRestaurantSchema),
  nextCursor: z.string().optional(),
});
export type SavedRestaurantPage = z.infer<typeof SavedRestaurantPageSchema>;

export const ActivityTypeSchema = z.enum(["restaurant_saved", "restaurant_removed", "preferences_updated"]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export interface ListSavedRestaurantsOptions {
  limit?: number;
  cursor?: string;
}

/**
 * The one persistence seam in the whole app. `apps/mcp-server`'s
 * authenticated tools and `apps/web`'s server actions both call this -
 * never Supabase directly, never each other. `packages/database` ships two
 * implementations: `InMemoryUserRepository` (tests, and any environment
 * without Supabase configured) and `SupabaseUserRepository` (production,
 * one row per user per table, RLS-enforced under a user-scoped client -
 * see supabaseRepository.ts for exactly which key it expects).
 */
export interface UserRepository {
  getProfile(userId: string): Promise<UserProfile | undefined>;
  upsertProfile(userId: string, patch: ProfilePatch): Promise<UserProfile>;

  getPreferences(userId: string): Promise<UserPreferences | undefined>;
  /** Only the keys present in `patch` are changed; everything else on the existing record is preserved untouched. */
  updatePreferences(userId: string, patch: PreferencesPatch): Promise<UserPreferences>;

  /** Idempotent: saving an already-saved restaurant just updates the note (if given) and returns the existing row. */
  saveRestaurant(userId: string, restaurantId: string, note?: string): Promise<SavedRestaurant>;
  /** Idempotent: removing an already-absent save is a no-op, not an error. */
  removeSavedRestaurant(userId: string, restaurantId: string): Promise<void>;
  listSavedRestaurants(userId: string, options?: ListSavedRestaurantsOptions): Promise<SavedRestaurantPage>;
  isRestaurantSaved(userId: string, restaurantId: string): Promise<boolean>;

  /** Minimal, structured, audit-friendly - never raw conversation text (see product rule in docs/authentication.md). */
  recordActivity(userId: string, type: ActivityType, metadata?: Record<string, unknown>): Promise<void>;

  /** Account deletion: removes profile, preferences, saved restaurants and activity for this user. Irreversible. */
  deleteAllUserData(userId: string): Promise<void>;
}
