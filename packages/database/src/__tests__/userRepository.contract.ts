import { describe, expect, it } from "vitest";
import type { UserRepository } from "../types.js";

/**
 * Behavioural contract every `UserRepository` implementation must satisfy.
 * Call this from a `.test.ts` file with a factory that returns a fresh,
 * empty repository per test (e.g. `runUserRepositoryContract(() => new
 * InMemoryUserRepository())`, or a Supabase-backed factory that creates and
 * tears down a real test user). Two users must be genuinely different rows
 * with different ids for the isolation tests to mean anything.
 */
export function runUserRepositoryContract(makeRepo: () => UserRepository, makeUserId: () => string) {
  describe("UserRepository contract", () => {
    it("returns undefined for a profile that doesn't exist yet", async () => {
      const repo = makeRepo();
      expect(await repo.getProfile(makeUserId())).toBeUndefined();
    });

    it("upserts a profile and only changes the given fields on a second call", async () => {
      const repo = makeRepo();
      const userId = makeUserId();
      const first = await repo.upsertProfile(userId, { displayName: "Ada" });
      expect(first.displayName).toBe("Ada");

      const second = await repo.upsertProfile(userId, { homeArea: "Croydon" });
      expect(second.displayName).toBe("Ada");
      expect(second.homeArea).toBe("Croydon");
      expect(second.createdAt).toBe(first.createdAt);
    });

    it("returns undefined for preferences that don't exist yet", async () => {
      const repo = makeRepo();
      expect(await repo.getPreferences(makeUserId())).toBeUndefined();
    });

    it("partially updates preferences, preserving unspecified fields", async () => {
      const repo = makeRepo();
      const userId = makeUserId();
      await repo.updatePreferences(userId, { favoriteCuisines: ["burgers"], budgetPerPersonGbp: 30 });
      const updated = await repo.updatePreferences(userId, { dietaryNeeds: ["vegan"] });

      expect(updated.favoriteCuisines).toEqual(["burgers"]);
      expect(updated.budgetPerPersonGbp).toBe(30);
      expect(updated.dietaryNeeds).toEqual(["vegan"]);
    });

    it("rejects nothing at the repository layer for a well-typed patch (validation is the tool/route's job)", async () => {
      const repo = makeRepo();
      const userId = makeUserId();
      const updated = await repo.updatePreferences(userId, {});
      expect(updated.userId).toBe(userId);
    });

    it("is idempotent when saving the same restaurant twice", async () => {
      const repo = makeRepo();
      const userId = makeUserId();
      const first = await repo.saveRestaurant(userId, "r_flame_fork", "date night spot");
      const second = await repo.saveRestaurant(userId, "r_flame_fork", "date night spot");
      expect(second.createdAt).toBe(first.createdAt);

      const page = await repo.listSavedRestaurants(userId);
      expect(page.items).toHaveLength(1);
    });

    it("is idempotent when removing an already-removed restaurant", async () => {
      const repo = makeRepo();
      const userId = makeUserId();
      await repo.saveRestaurant(userId, "r_flame_fork");
      await repo.removeSavedRestaurant(userId, "r_flame_fork");
      await expect(repo.removeSavedRestaurant(userId, "r_flame_fork")).resolves.toBeUndefined();
      expect(await repo.isRestaurantSaved(userId, "r_flame_fork")).toBe(false);
    });

    it("keeps saved restaurants isolated between two different users", async () => {
      const repo = makeRepo();
      const userA = makeUserId();
      const userB = makeUserId();
      await repo.saveRestaurant(userA, "r_flame_fork");

      expect(await repo.isRestaurantSaved(userB, "r_flame_fork")).toBe(false);
      const pageB = await repo.listSavedRestaurants(userB);
      expect(pageB.items).toHaveLength(0);
    });

    it("deletes all data for a user without affecting another user", async () => {
      const repo = makeRepo();
      const userA = makeUserId();
      const userB = makeUserId();
      await repo.upsertProfile(userA, { displayName: "A" });
      await repo.saveRestaurant(userA, "r_flame_fork");
      await repo.upsertProfile(userB, { displayName: "B" });
      await repo.saveRestaurant(userB, "r_flame_fork");

      await repo.deleteAllUserData(userA);

      expect(await repo.getProfile(userA)).toBeUndefined();
      expect((await repo.listSavedRestaurants(userA)).items).toHaveLength(0);
      expect(await repo.getProfile(userB)).toBeDefined();
      expect((await repo.listSavedRestaurants(userB)).items).toHaveLength(1);
    });

    it("keeps preferences isolated between two different users", async () => {
      const repo = makeRepo();
      const userA = makeUserId();
      const userB = makeUserId();
      await repo.updatePreferences(userA, { favoriteCuisines: ["italian"] });

      const prefsB = await repo.getPreferences(userB);
      expect(prefsB).toBeUndefined();
    });

    it("records activity without leaking it to another user", async () => {
      const repo = makeRepo();
      const userA = makeUserId();
      const userB = makeUserId();
      await expect(repo.recordActivity(userA, "preferences_updated", { field: "budgetPerPersonGbp" })).resolves.toBeUndefined();
      // Not part of the interface's read surface, so we only assert it doesn't throw
      // and that it doesn't affect another user's data.
      expect(await repo.getPreferences(userB)).toBeUndefined();
    });
  });
}
