import { InMemoryUserRepository } from "@bitejoy/database";
import type { ActivityType, UserRepository } from "../types.js";

export interface RecordedActivity {
  userId: string;
  type: ActivityType;
  meta?: Record<string, unknown>;
}

/**
 * Thin wrapper around `@bitejoy/database`'s `InMemoryUserRepository` (the
 * same reference implementation its own contract test suite runs against)
 * exposing the `{ repository, activity }` shape this package's tool tests
 * already expect - so tests can prove cross-user isolation without a live
 * Supabase project, using the exact same in-memory behaviour apps/web's
 * tests do.
 */
export function createFakeUserRepository(): { repository: UserRepository; activity: RecordedActivity[] } {
  const repo = new InMemoryUserRepository();
  const activity: RecordedActivity[] = [];

  const repository: UserRepository = {
    getProfile: (userId) => repo.getProfile(userId),
    upsertProfile: (userId, patch) => repo.upsertProfile(userId, patch),
    getPreferences: (userId) => repo.getPreferences(userId),
    updatePreferences: (userId, patch) => repo.updatePreferences(userId, patch),
    saveRestaurant: (userId, restaurantId, note) => repo.saveRestaurant(userId, restaurantId, note),
    removeSavedRestaurant: (userId, restaurantId) => repo.removeSavedRestaurant(userId, restaurantId),
    listSavedRestaurants: (userId, options) => repo.listSavedRestaurants(userId, options),
    isRestaurantSaved: (userId, restaurantId) => repo.isRestaurantSaved(userId, restaurantId),
    recordActivity: async (userId, type, meta) => {
      activity.push({ userId, type, meta });
      await repo.recordActivity(userId, type, meta);
    },
    deleteAllUserData: (userId) => repo.deleteAllUserData(userId),
  };

  return { repository, activity };
}
