import type { Restaurant } from "../types/restaurant.js";
import { isOfferActive } from "../types/restaurant.js";
import type { SearchCriteria } from "../types/search.js";
import type { Recommendation, RecommendationMode } from "../types/recommendation.js";
import { distanceKm, getDistanceInfo } from "../utils/geo.js";
import { getOpeningStatus } from "../utils/hours.js";
import { checkHardFilters } from "./filters.js";
import { scoreRestaurant } from "./scoreRestaurant.js";
import type { TravelMode } from "../types/recommendation.js";

export interface RankOptions {
  mode?: RecommendationMode;
  /** Point in time the search is for; defaults to `criteria.dateTime` or now. */
  at?: Date;
  /** Never returns more than 5 - matches the product's "3 to 5 strong recommendations" rule. */
  limit?: number;
  /** Recommendations scoring below this are dropped rather than padded in - quality over quantity. */
  minScore?: number;
}

const MAX_RECOMMENDATIONS = 5;
const DEFAULT_MIN_SCORE = 0.2;
const WALKING_DISTANCE_KM = 1.5;

function resolveAt(criteria: SearchCriteria, override?: Date): Date {
  if (override) return override;
  if (criteria.dateTime) return new Date(criteria.dateTime);
  return new Date();
}

function chooseTravelMode(distanceKm: number): TravelMode {
  return distanceKm <= WALKING_DISTANCE_KM ? "walking" : "driving";
}

function popularDishesFor(restaurant: Restaurant): string[] {
  const popular = restaurant.menuItems.filter((item) => item.isPopular).map((item) => item.name);
  if (popular.length > 0) return popular;
  return restaurant.menuItems
    .filter((item) => item.category === "food")
    .slice(0, 2)
    .map((item) => item.name);
}

/**
 * Builds a full `Recommendation` (score, distance, opening status, reasons,
 * ...) for one restaurant, regardless of whether it would actually pass
 * `checkHardFilters`. `rankRestaurants` uses this internally after
 * filtering; callers that need to show a restaurant's fit even when it
 * fails a constraint (e.g. comparing specific restaurants a user picked)
 * can call this directly instead of duplicating the scoring/distance glue.
 */
export function buildRecommendation(restaurant: Restaurant, criteria: SearchCriteria, at: Date, mode: RecommendationMode = "search"): Recommendation {
  const scored = scoreRestaurant(restaurant, criteria, at, mode);
  const km = distanceKm(criteria.location, restaurant.location);
  const distance = getDistanceInfo(criteria.location, restaurant.location, chooseTravelMode(km));

  return {
    restaurant,
    distance,
    openingStatus: getOpeningStatus(restaurant.openingHours, at),
    expectedPricePerPersonGbp: restaurant.averagePricePerPersonGbp,
    popularDishes: popularDishesFor(restaurant),
    activeOffers: restaurant.offers.filter((offer) => isOfferActive(offer, at)),
    score: scored.score,
    reasons: scored.reasons,
    dataFreshness: restaurant.meta,
  };
}

/**
 * The core recommendation pipeline: hard-filter candidates down to what's
 * actually viable, score what's left, and return the strongest 3-5. This is
 * pure, deterministic and has no AI model in the loop - the model only ever
 * explains or rephrases what comes out of here (see the MCP tool layer).
 */
export function rankRestaurants(
  candidates: Restaurant[],
  criteria: SearchCriteria,
  options: RankOptions = {},
): Recommendation[] {
  const mode = options.mode ?? "search";
  const at = resolveAt(criteria, options.at);
  const limit = Math.min(options.limit ?? MAX_RECOMMENDATIONS, MAX_RECOMMENDATIONS);
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  const viable = candidates.filter((restaurant) => checkHardFilters(restaurant, criteria, at, mode).passes);
  const recommendations = viable
    .map((restaurant) => buildRecommendation(restaurant, criteria, at, mode))
    .filter((rec) => rec.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return recommendations.slice(0, limit);
}

/**
 * "Surprise me": one exciting, strongly-matching pick. Sampled (weighted by
 * score) from the top of the ranked list rather than always returning #1,
 * so asking twice doesn't feel robotic - but never from outside the strong
 * matches, so it's still always a real fit.
 */
export function pickSurprise(
  candidates: Restaurant[],
  criteria: SearchCriteria,
  options: Omit<RankOptions, "mode" | "limit"> = {},
): Recommendation | undefined {
  const pool = rankRestaurants(candidates, criteria, { ...options, mode: "surprise_me", limit: 5 });
  if (pool.length === 0) return undefined;

  const totalScore = pool.reduce((sum, rec) => sum + rec.score, 0);
  if (totalScore <= 0) return pool[0];

  let roll = Math.random() * totalScore;
  for (const rec of pool) {
    roll -= rec.score;
    if (roll <= 0) return rec;
  }
  return pool[0];
}
