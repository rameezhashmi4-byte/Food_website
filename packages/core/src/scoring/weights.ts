import type { RecommendationMode } from "../types/recommendation.js";

export interface ScoringWeights {
  cuisineMatch: number;
  foodPreferenceMatch: number;
  drinkPreferenceMatch: number;
  atmosphereMatch: number;
  occasionMatch: number;
  budgetFit: number;
  rating: number;
  reviewVolume: number;
  hasOffer: number;
  independentBonus: number;
  /** Inverse of review volume - low review count, i.e. "lesser-known". Only meaningfully weighted in hidden_gem mode. */
  obscurity: number;
  trend: number;
  proximity: number;
  freshness: number;
}

export const BASE_WEIGHTS: ScoringWeights = {
  cuisineMatch: 0.16,
  foodPreferenceMatch: 0.08,
  drinkPreferenceMatch: 0.04,
  atmosphereMatch: 0.1,
  occasionMatch: 0.08,
  budgetFit: 0.14,
  rating: 0.12,
  reviewVolume: 0.05,
  hasOffer: 0.06,
  independentBonus: 0.05,
  obscurity: 0.02,
  trend: 0.04,
  proximity: 0.1,
  freshness: 0.03,
};

/**
 * Each joyful mode (see product spec) leans on the same signals but cares
 * about different ones more. These are multipliers applied on top of
 * `BASE_WEIGHTS`, re-normalised in `getWeightsForMode`.
 *
 * hidden_gem in particular needs both a strong *positive* pull towards
 * independent, lesser-known places (`independentBonus`, `obscurity`) and a
 * strong *negative* pull away from sheer popularity (`reviewVolume`,
 * `trend` toned down) - otherwise a popular-but-independent restaurant like
 * Flame & Fork can out-score a genuinely obscure gem on rating/proximity
 * alone, which would make "hidden gem" meaningless.
 */
const MODE_MULTIPLIERS: Partial<Record<RecommendationMode, Partial<ScoringWeights>>> = {
  find_my_vibe: { atmosphereMatch: 2.2, occasionMatch: 2.2 },
  surprise_me: { trend: 1.6, rating: 1.3 },
  hidden_gem: { independentBonus: 3, obscurity: 9, trend: 1.1, reviewVolume: 0.1 },
  offers_near_me: { hasOffer: 4 },
  group_decision: { atmosphereMatch: 1.4, budgetFit: 1.3 },
  food_adventure: { independentBonus: 1.8, trend: 1.6, cuisineMatch: 0.7 },
  search: {},
};

export function getWeightsForMode(mode: RecommendationMode): ScoringWeights {
  const multipliers = MODE_MULTIPLIERS[mode] ?? {};
  const entries = Object.entries(BASE_WEIGHTS) as Array<[keyof ScoringWeights, number]>;
  const weighted = { ...BASE_WEIGHTS };
  for (const [key, value] of entries) {
    weighted[key] = value * (multipliers[key] ?? 1);
  }
  return weighted;
}

export function totalWeight(weights: ScoringWeights): number {
  return Object.values(weights).reduce((sum, w) => sum + w, 0);
}
