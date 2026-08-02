import { FictionalRestaurantProvider, GooglePlacesProvider, type RestaurantProvider } from "@bitejoy/core";

/**
 * Shared, request-independent context every tool handler receives. Picks
 * the restaurant data provider once at startup so every tool sees the same
 * source - see @bitejoy/core/providers for what each one can and can't do.
 */
export interface AppContext {
  provider: RestaurantProvider;
}

export function createAppContext(): AppContext {
  const providerName = process.env.BITEJOY_PROVIDER ?? "fictional";

  if (providerName === "google_places") {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error(
        "[bitejoy] BITEJOY_PROVIDER=google_places but GOOGLE_PLACES_API_KEY is not set - falling back to fictional demo data.",
      );
      return { provider: new FictionalRestaurantProvider() };
    }
    return { provider: new GooglePlacesProvider({ apiKey }) };
  }

  return { provider: new FictionalRestaurantProvider() };
}
