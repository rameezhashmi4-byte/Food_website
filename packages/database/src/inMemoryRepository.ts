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

interface ActivityRecord {
  userId: string;
  type: ActivityType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Reference implementation used by every unit test in this repo (and by
 * any environment without Supabase configured). Behaviour - idempotency,
 * partial-patch semantics, isolation between users - must match
 * `SupabaseUserRepository` exactly; the shared contract test suite in
 * `__tests__/userRepository.contract.ts` runs against both.
 */
export class InMemoryUserRepository implements UserRepository {
  private profiles = new Map<string, UserProfile>();
  private preferences = new Map<string, UserPreferences>();
  private savedRestaurants = new Map<string, SavedRestaurant>();
  private activity: ActivityRecord[] = [];

  private savedKey(userId: string, restaurantId: string): string {
    return `${userId}::${restaurantId}`;
  }

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    return this.profiles.get(userId);
  }

  async upsertProfile(userId: string, patch: ProfilePatch): Promise<UserProfile> {
    const now = new Date().toISOString();
    const existing = this.profiles.get(userId);
    const next: UserProfile = {
      id: userId,
      displayName: patch.displayName ?? existing?.displayName ?? "BiteJoy explorer",
      avatarUrl: patch.avatarUrl ?? existing?.avatarUrl,
      homeArea: patch.homeArea ?? existing?.homeArea,
      workArea: patch.workArea ?? existing?.workArea,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.profiles.set(userId, next);
    return next;
  }

  async getPreferences(userId: string): Promise<UserPreferences | undefined> {
    return this.preferences.get(userId);
  }

  async updatePreferences(userId: string, patch: PreferencesPatch): Promise<UserPreferences> {
    const now = new Date().toISOString();
    const existing = this.preferences.get(userId);
    const next: UserPreferences = {
      userId,
      favoriteCuisines: existing?.favoriteCuisines ?? [],
      dislikedCuisines: existing?.dislikedCuisines ?? [],
      foodPreferences: existing?.foodPreferences ?? [],
      drinkPreferences: existing?.drinkPreferences ?? [],
      dietaryNeeds: existing?.dietaryNeeds ?? [],
      preferredAtmosphere: existing?.preferredAtmosphere ?? [],
      favoriteOccasions: existing?.favoriteOccasions ?? [],
      accessibilityNeeds: existing?.accessibilityNeeds ?? [],
      searchRadiusKm: existing?.searchRadiusKm,
      maxTravelTimeMinutes: existing?.maxTravelTimeMinutes,
      budgetPerPersonGbp: existing?.budgetPerPersonGbp,
      parkingImportant: existing?.parkingImportant,
      defaultPartySize: existing?.defaultPartySize,
      ...patch,
      updatedAt: now,
    };
    this.preferences.set(userId, next);
    return next;
  }

  async saveRestaurant(userId: string, restaurantId: string, note?: string): Promise<SavedRestaurant> {
    const key = this.savedKey(userId, restaurantId);
    const existing = this.savedRestaurants.get(key);
    const record: SavedRestaurant = {
      userId,
      restaurantId,
      note: note ?? existing?.note,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.savedRestaurants.set(key, record);
    return record;
  }

  async removeSavedRestaurant(userId: string, restaurantId: string): Promise<void> {
    this.savedRestaurants.delete(this.savedKey(userId, restaurantId));
  }

  async isRestaurantSaved(userId: string, restaurantId: string): Promise<boolean> {
    return this.savedRestaurants.has(this.savedKey(userId, restaurantId));
  }

  async listSavedRestaurants(userId: string, options: ListSavedRestaurantsOptions = {}): Promise<SavedRestaurantPage> {
    const limit = options.limit ?? 20;
    const all = Array.from(this.savedRestaurants.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const startIndex = options.cursor ? Number.parseInt(options.cursor, 10) : 0;
    const page = all.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + limit;
    return { items: page, nextCursor: nextIndex < all.length ? String(nextIndex) : undefined };
  }

  async recordActivity(userId: string, type: ActivityType, metadata?: Record<string, unknown>): Promise<void> {
    this.activity.push({ userId, type, metadata, createdAt: new Date().toISOString() });
  }

  /** Test-only accessor - not part of the `UserRepository` interface. */
  getActivityFor(userId: string): ActivityRecord[] {
    return this.activity.filter((a) => a.userId === userId);
  }

  async deleteAllUserData(userId: string): Promise<void> {
    this.profiles.delete(userId);
    this.preferences.delete(userId);
    for (const key of this.savedRestaurants.keys()) {
      if (key.startsWith(`${userId}::`)) this.savedRestaurants.delete(key);
    }
    this.activity = this.activity.filter((a) => a.userId !== userId);
  }
}
