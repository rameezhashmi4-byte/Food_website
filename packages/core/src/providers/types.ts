import type { DataSourceName } from "../types/common.js";
import type { Restaurant } from "../types/restaurant.js";
import type { SearchCriteria } from "../types/search.js";

export interface ProviderSearchParams {
  criteria: SearchCriteria;
  /** Soft cap on candidates a provider should return before scoring narrows it down. */
  limit?: number;
}

/**
 * A `RestaurantProvider` is a replaceable source of restaurant data. The
 * scoring engine (see ../scoring) never talks to Google Places, Supabase or
 * anything else directly - it only ever consumes this interface, so sources
 * can be swapped or combined (fictional demo data today, Google Places +
 * owner/community submissions later) without touching ranking logic.
 *
 * Implementations must never invent data: if a fact isn't available from the
 * underlying source, omit it (or mark it unverified via `meta.isVerified`)
 * rather than guessing.
 */
export interface RestaurantProvider {
  readonly sourceName: DataSourceName;

  /** Broad recall: candidates near the requested location. Filtering/ranking happens downstream in scoring. */
  searchRestaurants(params: ProviderSearchParams): Promise<Restaurant[]>;

  getRestaurantById(id: string): Promise<Restaurant | undefined>;
}
