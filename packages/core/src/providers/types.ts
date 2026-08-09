import type { Coordinates, DataSourceName } from "../types/common.js";
import type { Restaurant } from "../types/restaurant.js";
import type { SearchCriteria } from "../types/search.js";

export interface ProviderSearchParams {
  criteria: SearchCriteria;
  /** Soft cap on candidates a provider should return before scoring narrows it down. */
  limit?: number;
}

/** A free-text location resolved to real-world coordinates, plus a human-readable label for it. */
export interface ResolvedLocation {
  label: string;
  coordinates: Coordinates;
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

  /**
   * Resolve free-text location input (an area, address, postcode or place
   * name) into real-world coordinates, using this provider's own source of
   * truth. Optional: only providers backed by genuine geocoding (e.g.
   * `GooglePlacesProvider`) implement this, so they can support any
   * worldwide location. Providers backed by fixed/demo data (e.g.
   * `FictionalRestaurantProvider`) omit it entirely - callers must fall back
   * to a bounded local gazetteer that matches whatever the fixed dataset
   * actually covers, rather than pretending fixed demo data is a worldwide
   * search.
   */
  resolveLocation?(text: string): Promise<ResolvedLocation | undefined>;
}
