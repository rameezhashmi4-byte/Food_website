import type { Restaurant } from "../types/restaurant.js";
import type { SearchCriteria } from "../types/search.js";
import type { RecommendationMode } from "../types/recommendation.js";
import { distanceKm } from "../utils/geo.js";
import { isOpenAt } from "../utils/hours.js";
import { isOfferActive } from "../types/restaurant.js";

/** A restaurant with this many reviews or more is mainstream by definition, never a "hidden gem". */
const HIDDEN_GEM_MAX_REVIEW_COUNT = 500;

export interface HardFilterResult {
  passes: boolean;
  failedReasons: string[];
}

/**
 * Non-negotiable constraints checked before any scoring happens. These
 * exist so BiteJoy never recommends somewhere that flatly cannot serve the
 * user - a closed kitchen, a place without a wheelchair ramp someone asked
 * for, or food that doesn't meet a stated dietary need. Budget gets some
 * flex (people round up for the right place); everything else here is firm.
 */
export function checkHardFilters(
  restaurant: Restaurant,
  criteria: SearchCriteria,
  at: Date,
  mode: RecommendationMode = "search",
): HardFilterResult {
  const failedReasons: string[] = [];

  if (restaurant.status !== "active") {
    failedReasons.push("not_active");
  }

  if (distanceKm(criteria.location, restaurant.location) > criteria.radiusKm) {
    failedReasons.push("outside_radius");
  }

  const missingDietary = criteria.dietaryNeeds.filter((need) => !restaurant.dietaryOptions.includes(need));
  if (missingDietary.length > 0) {
    failedReasons.push("missing_dietary_options");
  }

  const missingFacilities = criteria.requiredFacilities.filter(
    (facility) => !restaurant.facilities.includes(facility),
  );
  if (missingFacilities.length > 0) {
    failedReasons.push("missing_required_facilities");
  }

  if (restaurant.openingHours.intervals.length > 0 && !isOpenAt(restaurant.openingHours, at)) {
    failedReasons.push("closed_at_requested_time");
  }

  if (typeof criteria.budgetPerPersonGbp === "number") {
    const overBudgetCeiling = criteria.budgetPerPersonGbp * 1.4;
    if (restaurant.averagePricePerPersonGbp > overBudgetCeiling) {
      failedReasons.push("far_over_budget");
    }
  }

  if (mode === "offers_near_me") {
    const hasActiveOffer = restaurant.offers.some((offer) => isOfferActive(offer, at));
    if (!hasActiveOffer) failedReasons.push("no_active_offer");
  }

  // "Hidden gem" is a promise, not just a scoring lean: every result must
  // actually be independent, however thin the candidate pool is at the
  // requested time (e.g. late at night, when few places are even open) -
  // and a restaurant with hundreds of reviews is mainstream by definition,
  // however that stacks up against whatever else happens to be open right
  // now, so it's excluded outright rather than merely down-weighted.
  if (mode === "hidden_gem") {
    if (!restaurant.isIndependent) failedReasons.push("not_independent");
    if ((restaurant.reviewSummary?.reviewCount ?? 0) >= HIDDEN_GEM_MAX_REVIEW_COUNT) {
      failedReasons.push("too_mainstream");
    }
  }

  return { passes: failedReasons.length === 0, failedReasons };
}
