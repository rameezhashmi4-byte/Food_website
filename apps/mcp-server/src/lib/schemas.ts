import { z } from "zod";
import { AtmosphereSchema, CuisineSchema, DietaryTagSchema, FacilitySchema, OccasionSchema } from "@bitejoy/core";

/**
 * Shared input shape for every search-family tool (search_restaurants,
 * find_hidden_gems, find_current_offers, find_new_openings, surprise_me).
 * Deliberately loose at the boundary - `location` is free text and
 * `dateTime` accepts natural phrases - because that's what a model
 * naturally has on hand; `resolveCriteria` (lib/resolveCriteria.ts) turns
 * this into a strict `@bitejoy/core` `SearchCriteria` before it ever
 * reaches the scoring engine.
 */
export const SearchCriteriaInputShape = {
  location: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Area, postcode or place name, e.g. "Croydon", "SW1A 1AA", "Paris", "Shibuya, Tokyo" - any place on Earth. Either this or both lat/lng must be given.',
    ),
  lat: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe('Latitude for a "near me"/current-location search, e.g. from the user\'s device GPS. Must be paired with lng. Skips text geocoding entirely - use this instead of location when real coordinates are available.'),
  lng: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe("Longitude for a \"near me\"/current-location search. Must be paired with lat."),
  radiusKm: z.number().positive().max(50).optional().describe("Search radius in kilometres. Defaults to a sensible local radius."),
  dateTime: z
    .string()
    .optional()
    .describe('When they want to eat: an ISO datetime, or a natural phrase like "tonight", "tomorrow evening", "Friday 7pm". Defaults to now.'),
  partySize: z.number().int().positive().max(50).optional().describe("How many people are eating."),
  budgetPerPersonGbp: z.number().positive().optional().describe("Budget per person in GBP."),
  totalBudgetGbp: z.number().positive().optional().describe("Total budget for the whole group in GBP, if per-person wasn't given."),
  cuisines: z.array(CuisineSchema).optional(),
  foodPreferences: z.array(z.string()).optional().describe('Free-text food preferences, e.g. "burgers", "sharing plates".'),
  drinkPreferences: z.array(z.string()).optional().describe('Free-text drink preferences, e.g. "cocktails", "craft beer".'),
  dietaryNeeds: z.array(DietaryTagSchema).optional(),
  occasion: OccasionSchema.optional(),
  atmosphere: z.array(AtmosphereSchema).optional(),
  requiredFacilities: z.array(FacilitySchema).optional().describe("Facilities that are non-negotiable, e.g. parking."),
  wantsOffers: z.boolean().optional().describe("Whether current offers/deals matter to this search."),
  prioritiseIndependent: z.boolean().optional().describe("Whether to favour independent restaurants."),
};

export const SearchCriteriaInputSchema = z.object(SearchCriteriaInputShape);
export type SearchCriteriaInput = z.infer<typeof SearchCriteriaInputSchema>;
