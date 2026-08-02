import type { Cuisine, Facility, PriceLevel, Weekday } from "../types/common.js";
import type { OpeningHoursInterval, Restaurant } from "../types/restaurant.js";
import type { ProviderSearchParams, RestaurantProvider } from "./types.js";

/**
 * Adapter for the Google Places API (New), intended to run only in a
 * secure backend context - the API key must never reach a browser or the
 * ChatGPT client. This is a Stage 1 skeleton: it is structurally complete
 * and type-safe, but has not been exercised against a live key in this
 * environment, and Google's response shape should be re-verified against
 * current docs before it is switched on for real traffic (Stage 6).
 *
 * Google Places has no concept of menus, prices-per-person, offers or
 * independent-vs-chain status, so those fields are either estimated from
 * `priceLevel` (clearly marked unverified) or left empty rather than
 * invented. Everything this adapter returns has `meta.isVerified = false`
 * until a human or a trusted second source confirms it.
 */

const PLACES_SEARCH_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PLACES_PHOTO_MEDIA_URL = "https://places.googleapis.com/v1";

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
  "places.photos",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.outdoorSeating",
  "places.parkingOptions",
  "places.accessibilityOptions",
].join(",");

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
    return (data.places ?? []).map((place) => this.toRestaurant(place));
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
      images: (place.photos ?? []).map(
        (photo) => `${PLACES_PHOTO_MEDIA_URL}/${photo.name}/media?maxWidthPx=800&key=${this.apiKey}`,
      ),
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
