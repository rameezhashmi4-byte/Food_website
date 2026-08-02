import { z } from "zod";

/** WGS84 coordinates. */
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

/** Relative price banding, independent of currency, used for filtering. */
export const PriceLevelSchema = z.enum(["budget", "moderate", "elevated", "splurge"]);
export type PriceLevel = z.infer<typeof PriceLevelSchema>;

export const CuisineSchema = z.enum([
  "british",
  "italian",
  "indian",
  "chinese",
  "japanese",
  "thai",
  "vietnamese",
  "korean",
  "mexican",
  "spanish",
  "greek",
  "turkish",
  "lebanese",
  "caribbean",
  "west_african",
  "ethiopian",
  "french",
  "american",
  "burgers",
  "pizza",
  "seafood",
  "steakhouse",
  "vegetarian_vegan",
  "brunch_cafe",
  "bakery_dessert",
  "street_food",
  "fusion",
  "tapas_small_plates",
  "bbq_grill",
]);
export type Cuisine = z.infer<typeof CuisineSchema>;

export const DietaryTagSchema = z.enum([
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "halal",
  "kosher",
  "pescatarian",
  "low_carb",
]);
export type DietaryTag = z.infer<typeof DietaryTagSchema>;

export const AtmosphereSchema = z.enum([
  "relaxed",
  "romantic",
  "lively",
  "intimate",
  "family_friendly",
  "trendy",
  "quiet",
  "outdoor_seating",
  "late_night",
  "casual",
  "upscale",
  "quirky",
  "traditional",
]);
export type Atmosphere = z.infer<typeof AtmosphereSchema>;

export const FacilitySchema = z.enum([
  "parking",
  "wheelchair_accessible",
  "outdoor_seating",
  "private_dining",
  "large_groups",
  "live_music",
  "sports_screens",
  "wifi",
  "dog_friendly",
  "high_chairs",
  "byob",
  "wheelchair_accessible_toilet",
]);
export type Facility = z.infer<typeof FacilitySchema>;

export const OccasionSchema = z.enum([
  "relaxed_evening",
  "first_date",
  "birthday",
  "family_meal",
  "catch_up_with_friends",
  "quick_lunch",
  "celebration",
  "late_night_food",
  "business_meal",
  "solo_treat",
]);
export type Occasion = z.infer<typeof OccasionSchema>;

/**
 * Every important fact BiteJoy surfaces must carry where it came from and how
 * fresh it is, so the UI can show "data freshness" and never let stale offers
 * or hours pass as current.
 */
export const DataSourceNameSchema = z.enum([
  "fictional_demo",
  "google_places",
  "restaurant_owner_submission",
  "community_submission",
  "restaurant_website",
  "booking_provider",
  "ordering_provider",
  "review_provider",
]);
export type DataSourceName = z.infer<typeof DataSourceNameSchema>;

export const SourceMetaSchema = z.object({
  source: DataSourceNameSchema,
  lastCheckedAt: z.string().datetime(),
  isVerified: z.boolean().default(false),
});
export type SourceMeta = z.infer<typeof SourceMetaSchema>;

export const WeekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export type Weekday = z.infer<typeof WeekdaySchema>;
