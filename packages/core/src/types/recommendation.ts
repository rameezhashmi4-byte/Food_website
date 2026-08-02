import { z } from "zod";
import { OfferSchema, RestaurantSchema } from "./restaurant.js";
import { SourceMetaSchema } from "./common.js";

export const OpeningStatusSchema = z.enum([
  "open_now",
  "closing_soon",
  "closed",
  "opens_later_today",
  "unknown",
]);
export type OpeningStatus = z.infer<typeof OpeningStatusSchema>;

export const TravelModeSchema = z.enum(["walking", "driving", "transit"]);
export type TravelMode = z.infer<typeof TravelModeSchema>;

export const DistanceInfoSchema = z.object({
  distanceKm: z.number().nonnegative(),
  travelTimeMinutes: z.number().nonnegative(),
  mode: TravelModeSchema,
});
export type DistanceInfo = z.infer<typeof DistanceInfoSchema>;

/**
 * Every reason code maps to a factual, data-grounded detail string. The AI
 * model is only ever allowed to *phrase* these warmly - never invent new
 * ones - which is how we guarantee recommendations stay explainable and
 * hallucination-free.
 */
export const RecommendationReasonCodeSchema = z.enum([
  "matches_cuisine",
  "matches_food_preference",
  "matches_drink_preference",
  "within_budget",
  "matches_atmosphere",
  "matches_occasion",
  "meets_dietary_needs",
  "has_required_facilities",
  "highly_rated",
  "well_reviewed",
  "has_active_offer",
  "hidden_gem",
  "trending_now",
  "close_by",
  "fresh_data",
]);
export type RecommendationReasonCode = z.infer<typeof RecommendationReasonCodeSchema>;

export const RecommendationReasonSchema = z.object({
  code: RecommendationReasonCodeSchema,
  detail: z.string(),
});
export type RecommendationReason = z.infer<typeof RecommendationReasonSchema>;

export const RecommendationModeSchema = z.enum([
  "search",
  "find_my_vibe",
  "surprise_me",
  "hidden_gem",
  "offers_near_me",
  "group_decision",
  "food_adventure",
]);
export type RecommendationMode = z.infer<typeof RecommendationModeSchema>;

export const RecommendationSchema = z.object({
  restaurant: RestaurantSchema,
  distance: DistanceInfoSchema,
  openingStatus: OpeningStatusSchema,
  expectedPricePerPersonGbp: z.number().positive(),
  popularDishes: z.array(z.string()).default([]),
  activeOffers: z.array(OfferSchema).default([]),
  /** Internal ranking score (0..1). Not shown to the user directly. */
  score: z.number(),
  reasons: z.array(RecommendationReasonSchema).min(1),
  dataFreshness: SourceMetaSchema,
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const RecommendationSetSchema = z.object({
  mode: RecommendationModeSchema,
  generatedAt: z.string().datetime(),
  recommendations: z.array(RecommendationSchema).min(1).max(5),
});
export type RecommendationSet = z.infer<typeof RecommendationSetSchema>;
