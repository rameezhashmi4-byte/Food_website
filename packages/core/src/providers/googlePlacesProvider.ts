import type { Cuisine, Facility, PriceLevel, Weekday } from "../types/common.js";
import type { OpeningHoursInterval, Restaurant } from "../types/restaurant.js";
import type { ProviderSearchParams, ResolvedLocation, RestaurantProvider } from "./types.js";

/**
 * Adapter for the Google Places API (New), intended to run only in a
 * secure backend context - the API key must never reach a browser or the
 * ChatGPT client.
 *
 * Verified against a live key on 2026-08-03 (Stage 2.5): `searchNearby`
 * with `includedTypes: ["restaurant"]` genuinely returns real, correctly
 * located restaurants near a given point - but Google's "restaurant" type
 * is looser than expected and also surfaces hotels, food courts and even a
 * grocery store (each carries "restaurant" as one of several secondary
 * types). `EXCLUDED_PRIMARY_TYPES` filters those out using `primaryType`,
 * which is a much more reliable signal than membership in `types`. Full
 * production hardening (pagination, richer category coverage, caching) is
 * still Stage 6 scope.
 *
 * Google Places has no concept of menus, prices-per-person, offers or
 * independent-vs-chain status, so those fields are either estimated from
 * `priceLevel` (clearly marked unverified) or left empty rather than
 * invented. Everything this adapter returns has `meta.isVerified = false`
 * until a human or a trusted second source confirms it.
 *
 * `resolveLocation` calls Google's Geocoding API directly - genuinely
 * worldwide, with no country/region restriction or bounding box baked in -
 * so free-text search location (any place name, address or postcode on
 * Earth) never depends on the small UK-only gazetteer that backs the
 * fictional demo provider. `searchRestaurants` itself only ever takes
 * coordinates (via `criteria.location`), so it was never UK-restricted
 * either; the caller (`resolveCriteria`) is what decides which resolver to
 * use based on the active provider.
 */

const PLACES_SEARCH_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PLACES_PHOTO_MEDIA_URL = "https://places.googleapis.com/v1";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.priceLevel",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
  "places.types",
  "places.primaryType",
  "places.photos",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.outdoorSeating",
  "places.parkingOptions",
  "places.accessibilityOptions",
].join(",");

/** Venues that legitimately carry "restaurant" as a secondary type but aren't what BiteJoy means by one - confirmed via a live nearby-search sample. */
const EXCLUDED_PRIMARY_TYPES = new Set([
  "hotel",
  "lodging",
  "inn",
  "bed_and_breakfast",
  "resort_hotel",
  "store",
  "grocery_store",
  "convenience_store",
  "asian_grocery_store",
  "food_store",
  "supermarket",
  "gas_station",
]);

const GOOGLE_PRICE_LEVEL_MAP: Record<string, PriceLevel> = {
  PRICE_LEVEL_FREE: "budget",
  PRICE_LEVEL_INEXPENSIVE: "budget",
  PRICE_LEVEL_MODERATE: "moderate",
  PRICE_LEVEL_EXPENSIVE: "elevated",
  PRICE_LEVEL_VERY_EXPENSIVE: "splurge",
};

/** Rough per-person GBP estimate used only when no real menu pricing is available - always flagged unverified. */
const ESTIMATED_PRICE_PER_PERSON_GBP: Record<PriceLevel, number> = {
  budget: 15,
  moderate: 25,
  elevated: 40,
  splurge: 70,
};

const CUISINE_TYPE_MAP: Record<string, Cuisine> = {
  italian_restaurant: "italian",
  chinese_restaurant: "chinese",
  japanese_restaurant: "japanese",
  sushi_restaurant: "japanese",
  indian_restaurant: "indian",
  korean_restaurant: "korean",
  mexican_restaurant: "mexican",
  thai_restaurant: "thai",
  vietnamese_restaurant: "vietnamese",
  turkish_restaurant: "turkish",
  greek_restaurant: "greek",
  spanish_restaurant: "spanish",
  french_restaurant: "french",
  american_restaurant: "american",
  hamburger_restaurant: "burgers",
  pizza_restaurant: "pizza",
  seafood_restaurant: "seafood",
  steak_house: "steakhouse",
  vegetarian_restaurant: "vegetarian_vegan",
  vegan_restaurant: "vegetarian_vegan",
  cafe: "brunch_cafe",
  brunch_restaurant: "brunch_cafe",
  bakery: "bakery_dessert",
  dessert_shop: "bakery_dessert",
  barbecue_restaurant: "bbq_grill",
  lebanese_restaurant: "lebanese",
  caribbean_restaurant: "caribbean",
  african_restaurant: "west_african",
  ethiopian_restaurant: "ethiopian",
  fusion_restaurant: "fusion",
  tapas_restaurant: "tapas_small_plates",
  // Observed on a live sample but not in Stage 1's original map - generic
  // categories, so the mapping is a best-effort convention, not a fact.
  fast_food_restaurant: "american",
  buffet_restaurant: "fusion",
};

const GOOGLE_DAY_TO_WEEKDAY: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

interface GooglePlaceTime {
  day: number;
  hour: number;
  minute: number;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { periods?: Array<{ open: GooglePlaceTime; close?: GooglePlaceTime }> };
  types?: string[];
  primaryType?: string;
  photos?: Array<{ name: string }>;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  outdoorSeating?: boolean;
  parkingOptions?: { freeParkingLot?: boolean; paidParkingLot?: boolean; freeStreetParking?: boolean };
  accessibilityOptions?: { wheelchairAccessibleEntrance?: boolean };
}

interface GoogleSearchNearbyResponse {
  places?: GooglePlace[];
}

interface GoogleGeocodeResult {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
}

interface GoogleGeocodeResponse {
  status: string;
  results?: GoogleGeocodeResult[];
}

export interface GooglePlacesProviderConfig {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class GooglePlacesProvider implements RestaurantProvider {
  readonly sourceName = "google_places" as const;

  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: GooglePlacesProviderConfig) {
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async searchRestaurants({ criteria, limit }: ProviderSearchParams): Promise<Restaurant[]> {
    if (!this.apiKey) {
      throw new Error("GooglePlacesProvider requires an API key (set GOOGLE_PLACES_API_KEY)");
    }

    const response = await this.fetchImpl(PLACES_SEARCH_NEARBY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: ["restaurant"],
        maxResultCount: Math.min(limit ?? 20, 20),
        locationRestriction: {
          circle: {
            center: { latitude: criteria.location.lat, longitude: criteria.location.lng },
            radius: Math.min(criteria.radiusKm * 1000, 50000),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Places search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GoogleSearchNearbyResponse;
    return (data.places ?? [])
      .filter((place) => !place.primaryType || !EXCLUDED_PRIMARY_TYPES.has(place.primaryType))
      .map((place) => this.toRestaurant(place));
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    if (!this.apiKey) {
      throw new Error("GooglePlacesProvider requires an API key (set GOOGLE_PLACES_API_KEY)");
    }
    const placeId = id.startsWith("gp_") ? id.slice(3) : id;
    const response = await this.fetchImpl(`${PLACES_PHOTO_MEDIA_URL}/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK.replace(/places\./g, ""),
      },
    });
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`Google Places details failed: ${response.status} ${response.statusText}`);
    }
    const place = (await response.json()) as GooglePlace;
    return this.toRestaurant(place);
  }

  /**
   * Resolves any free-text location - a place name, address or postcode,
   * anywhere in the world - to coordinates via Google's Geocoding API.
   * Deliberately passes no `region` or `components` country restriction: an
   * unrestricted call is what makes this genuinely worldwide rather than
   * biased toward wherever BiteJoy's demo data happens to live. Returns
   * `undefined` (never throws) when Google simply has no match, so callers
   * can turn that into a normal "I don't recognise that place" response.
   */
  async resolveLocation(text: string): Promise<ResolvedLocation | undefined> {
    if (!this.apiKey) {
      throw new Error("GooglePlacesProvider requires an API key (set GOOGLE_PLACES_API_KEY)");
    }

    const url = new URL(GEOCODE_URL);
    url.searchParams.set("address", text);
    url.searchParams.set("key", this.apiKey);

    const response = await this.fetchImpl(url.toString());
    if (!response.ok) {
      throw new Error(`Google geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GoogleGeocodeResponse;
    if (data.status === "ZERO_RESULTS") return undefined;
    if (data.status !== "OK") {
      throw new Error(`Google geocoding failed: ${data.status}`);
    }

    const result = data.results?.[0];
    if (!result) return undefined;

    return {
      label: result.formatted_address,
      coordinates: { lat: result.geometry.location.lat, lng: result.geometry.location.lng },
    };
  }

  private toRestaurant(place: GooglePlace): Restaurant {
    const priceLevel = (place.priceLevel && GOOGLE_PRICE_LEVEL_MAP[place.priceLevel]) || "moderate";
    const cuisines = Array.from(
      new Set((place.types ?? []).map((t) => CUISINE_TYPE_MAP[t]).filter((c): c is Cuisine => Boolean(c))),
    );
    const facilities: Facility[] = [];
    if (place.outdoorSeating) facilities.push("outdoor_seating");
    if (place.parkingOptions?.freeParkingLot || place.parkingOptions?.paidParkingLot || place.parkingOptions?.freeStreetParking) {
      facilities.push("parking");
    }
    if (place.accessibilityOptions?.wheelchairAccessibleEntrance) facilities.push("wheelchair_accessible");

    const lastCheckedAt = new Date().toISOString();
    const placeId = place.id;
    const name = place.displayName?.text ?? "Unnamed restaurant";
    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${placeId.slice(-6)}`;

    return {
      id: `gp_${placeId}`,
      slug,
      name,
      cuisines: cuisines.length > 0 ? cuisines : ["fusion"],
      location: {
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
      },
      address: place.formattedAddress ?? "",
      area: "",
      city: "",
      priceLevel,
      averagePricePerPersonGbp: ESTIMATED_PRICE_PER_PERSON_GBP[priceLevel],
      atmosphere: [],
      facilities,
      dietaryOptions: [],
      isIndependent: false,
      status: "active",
      // Photo media requests require the server-side API key. Do not return
      // key-bearing URLs to clients; expose them later through a backend proxy.
      images: [],
      website: place.websiteUri,
      phone: place.internationalPhoneNumber,
      externalIds: { googlePlaceId: placeId },
      openingHours: {
        intervals: this.toOpeningIntervals(place),
        meta: { source: "google_places", lastCheckedAt, isVerified: false },
      },
      reviewSummary:
        typeof place.rating === "number"
          ? {
              restaurantId: `gp_${placeId}`,
              averageRating: place.rating,
              reviewCount: place.userRatingCount ?? 0,
              themes: [],
              meta: { source: "google_places", lastCheckedAt, isVerified: false },
            }
          : undefined,
      menuItems: [],
      offers: [],
      trendScore: 0,
      meta: { source: "google_places", lastCheckedAt, isVerified: false },
    };
  }

  private toOpeningIntervals(place: GooglePlace): OpeningHoursInterval[] {
    const periods = place.regularOpeningHours?.periods ?? [];
    return periods
      .filter((p): p is { open: GooglePlaceTime; close: GooglePlaceTime } => Boolean(p.open && p.close))
      .map((p) => ({
        day: GOOGLE_DAY_TO_WEEKDAY[p.open.day] ?? "monday",
        opensAt: `${String(p.open.hour).padStart(2, "0")}:${String(p.open.minute).padStart(2, "0")}`,
        closesAt: `${String(p.close.hour).padStart(2, "0")}:${String(p.close.minute).padStart(2, "0")}`,
      }));
  }
}
