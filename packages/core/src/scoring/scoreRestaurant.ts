import type { Restaurant } from "../types/restaurant.js";
import { isOfferActive } from "../types/restaurant.js";
import type { SearchCriteria } from "../types/search.js";
import type { RecommendationMode, RecommendationReason } from "../types/recommendation.js";
import { distanceKm } from "../utils/geo.js";
import { hoursSinceChecked } from "../utils/freshness.js";
import { clamp, overlapFraction } from "./math.js";
import { OCCASION_ATMOSPHERE_MAP } from "./occasionAtmosphere.js";
import { getWeightsForMode, totalWeight, type ScoringWeights } from "./weights.js";

export interface ScoredRestaurant {
  restaurant: Restaurant;
  score: number;
  subScores: ScoringWeights;
  reasons: RecommendationReason[];
}

function textMatchesTokens(restaurant: Restaurant, tokens: string[], category?: "food" | "drink"): number {
  if (tokens.length === 0) return 0.5;
  const haystacks = [
    restaurant.name,
    restaurant.description ?? "",
    ...restaurant.menuItems.filter((m) => !category || m.category === category).map((m) => `${m.name} ${m.description ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();
  const matched = tokens.filter((token) => haystacks.includes(token.toLowerCase()));
  return matched.length / tokens.length;
}

function scoreBudgetFit(restaurant: Restaurant, budgetPerPersonGbp?: number): number {
  if (!budgetPerPersonGbp) return 0.5;
  const ratio = restaurant.averagePricePerPersonGbp / budgetPerPersonGbp;
  if (ratio <= 1) return 1;
  return clamp(1 - (ratio - 1) / 0.4, 0, 1);
}

function computeSubScores(restaurant: Restaurant, criteria: SearchCriteria, at: Date): ScoringWeights {
  const distance = distanceKm(criteria.location, restaurant.location);
  const hasActiveOffer = restaurant.offers.some((offer) => isOfferActive(offer, at));
  const wantedAtmosphere = criteria.occasion
    ? Array.from(new Set([...criteria.atmosphere, ...OCCASION_ATMOSPHERE_MAP[criteria.occasion]]))
    : criteria.atmosphere;

  return {
    cuisineMatch: overlapFraction(criteria.cuisines, restaurant.cuisines),
    foodPreferenceMatch: textMatchesTokens(restaurant, criteria.foodPreferences, "food"),
    drinkPreferenceMatch: textMatchesTokens(restaurant, criteria.drinkPreferences, "drink"),
    atmosphereMatch: overlapFraction(wantedAtmosphere, restaurant.atmosphere),
    occasionMatch: criteria.occasion
      ? overlapFraction(OCCASION_ATMOSPHERE_MAP[criteria.occasion], restaurant.atmosphere)
      : 0.5,
    budgetFit: scoreBudgetFit(restaurant, criteria.budgetPerPersonGbp),
    rating: restaurant.reviewSummary ? restaurant.reviewSummary.averageRating / 5 : 0.5,
    reviewVolume: restaurant.reviewSummary
      ? clamp(Math.log10(restaurant.reviewSummary.reviewCount + 1) / 3, 0, 1)
      : 0.3,
    hasOffer: hasActiveOffer ? 1 : 0,
    independentBonus: restaurant.isIndependent ? 1 : 0.3,
    obscurity: restaurant.reviewSummary
      ? clamp(1 - Math.log10(restaurant.reviewSummary.reviewCount + 1) / 3, 0, 1)
      : 0.7,
    trend: restaurant.trendScore,
    proximity: clamp(1 - distance / criteria.radiusKm, 0, 1),
    freshness: clamp(1 - hoursSinceChecked(restaurant.meta, at) / (24 * 30), 0, 1),
  };
}

function buildReasons(restaurant: Restaurant, criteria: SearchCriteria, sub: ScoringWeights, at: Date): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];

  const matchedCuisines = restaurant.cuisines.filter((c) => criteria.cuisines.includes(c));
  if (matchedCuisines.length > 0) {
    reasons.push({ code: "matches_cuisine", detail: `Serves ${matchedCuisines.join(", ").replace(/_/g, " ")}` });
  }

  if (sub.foodPreferenceMatch >= 0.5 && criteria.foodPreferences.length > 0) {
    reasons.push({ code: "matches_food_preference", detail: `Menu matches what you're after: ${criteria.foodPreferences.join(", ")}` });
  }

  if (sub.drinkPreferenceMatch >= 0.5 && criteria.drinkPreferences.length > 0) {
    reasons.push({ code: "matches_drink_preference", detail: `Has drinks you'll like: ${criteria.drinkPreferences.join(", ")}` });
  }

  const matchedAtmosphere = restaurant.atmosphere.filter((a) => criteria.atmosphere.includes(a));
  if (matchedAtmosphere.length > 0) {
    reasons.push({ code: "matches_atmosphere", detail: `Has a ${matchedAtmosphere.join(", ").replace(/_/g, " ")} feel` });
  }

  if (criteria.occasion && sub.occasionMatch >= 0.5) {
    reasons.push({ code: "matches_occasion", detail: `A good fit for ${criteria.occasion.replace(/_/g, " ")}` });
  }

  if (criteria.dietaryNeeds.length > 0) {
    reasons.push({ code: "meets_dietary_needs", detail: `Covers ${criteria.dietaryNeeds.join(", ").replace(/_/g, " ")}` });
  }

  if (criteria.requiredFacilities.length > 0) {
    reasons.push({ code: "has_required_facilities", detail: `Has ${criteria.requiredFacilities.join(", ").replace(/_/g, " ")}` });
  }

  if (typeof criteria.budgetPerPersonGbp === "number" && restaurant.averagePricePerPersonGbp <= criteria.budgetPerPersonGbp) {
    reasons.push({
      code: "within_budget",
      detail: `About £${restaurant.averagePricePerPersonGbp} per person, within your £${criteria.budgetPerPersonGbp} budget`,
    });
  }

  if (restaurant.reviewSummary && restaurant.reviewSummary.averageRating >= 4.5 && restaurant.reviewSummary.reviewCount >= 20) {
    reasons.push({
      code: "highly_rated",
      detail: `Rated ${restaurant.reviewSummary.averageRating}/5 from ${restaurant.reviewSummary.reviewCount} reviews`,
    });
  } else if (restaurant.reviewSummary && restaurant.reviewSummary.reviewCount >= 200) {
    reasons.push({
      code: "well_reviewed",
      detail: `${restaurant.reviewSummary.reviewCount} reviews and counting`,
    });
  }

  const activeOffers = restaurant.offers.filter((o) => isOfferActive(o, at));
  if (activeOffers.length > 0) {
    reasons.push({ code: "has_active_offer", detail: activeOffers[0]?.title ?? "Current offer available" });
  }

  if (
    restaurant.isIndependent &&
    restaurant.reviewSummary &&
    restaurant.reviewSummary.reviewCount < 150 &&
    restaurant.reviewSummary.averageRating >= 4.4
  ) {
    reasons.push({ code: "hidden_gem", detail: "An independent spot that's loved by the people who've found it" });
  }

  if (restaurant.trendScore >= 0.6) {
    reasons.push({ code: "trending_now", detail: "Getting a lot of love from BiteJoy explorers right now" });
  }

  if (sub.proximity >= 0.7) {
    reasons.push({ code: "close_by", detail: "Close to where you're starting from" });
  }

  if (reasons.length === 0) {
    reasons.push({ code: "close_by", detail: "Within your search area" });
  }

  return reasons;
}

export function scoreRestaurant(
  restaurant: Restaurant,
  criteria: SearchCriteria,
  at: Date,
  mode: RecommendationMode = "search",
): ScoredRestaurant {
  const subScores = computeSubScores(restaurant, criteria, at);
  const weights = getWeightsForMode(mode);
  const weightSum = totalWeight(weights);

  const weightedSum = (Object.keys(weights) as Array<keyof ScoringWeights>).reduce(
    (sum, key) => sum + weights[key] * subScores[key],
    0,
  );

  return {
    restaurant,
    score: weightSum > 0 ? weightedSum / weightSum : 0,
    subScores,
    reasons: buildReasons(restaurant, criteria, subScores, at),
  };
}
