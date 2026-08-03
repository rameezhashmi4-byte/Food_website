// Everything downstream of this app only ever imports from "@/lib/database"
// (this file) - it re-exports the canonical, shared persistence contract
// from @bitejoy/database (also used by apps/mcp-server), so there is
// exactly one real `UserRepository` implementation in the whole product.
export {
  UserProfileSchema,
  UserPreferencesSchema,
  ProfilePatchSchema,
  PreferencesPatchSchema,
  SavedRestaurantSchema,
  ActivityTypeSchema,
  createSupabaseUserRepository,
  type UserProfile,
  type UserPreferences,
  type ProfilePatch,
  type PreferencesPatch,
  type SavedRestaurant,
  type ActivityType,
  type ListSavedRestaurantsOptions,
  type SavedRestaurantPage,
  type UserRepository,
} from "@bitejoy/database";
