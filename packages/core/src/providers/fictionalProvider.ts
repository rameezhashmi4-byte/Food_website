import { FICTIONAL_RESTAURANTS, getFictionalRestaurantById } from "../data/fictionalRestaurants.js";
import { distanceKm } from "../utils/geo.js";
import type { Restaurant } from "../types/restaurant.js";
import type { ProviderSearchParams, RestaurantProvider } from "./types.js";

/**
 * Always-available demonstration provider. Backs local development, the
 * ChatGPT app sandbox and tests without needing Supabase or a Google Places
 * key configured. Every fact it returns is clearly sourced as
 * "fictional_demo" so it can never be mistaken for a real place.
 */
export class FictionalRestaurantProvider implements RestaurantProvider {
  readonly sourceName = "fictional_demo" as const;

  async searchRestaurants({ criteria, limit }: ProviderSearchParams): Promise<Restaurant[]> {
    const candidates = FICTIONAL_RESTAURANTS.filter(
      (restaurant) => distanceKm(criteria.location, restaurant.location) <= criteria.radiusKm,
    );
    return typeof limit === "number" ? candidates.slice(0, limit) : candidates;
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    return getFictionalRestaurantById(id);
  }
}
