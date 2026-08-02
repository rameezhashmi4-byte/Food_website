import { z } from "zod";
import { buildRecommendation, checkHardFilters, type Restaurant, type SearchCriteria } from "@bitejoy/core";
import { RestaurantCardViewSchema, toCardView } from "./cardView.js";

export const ComparisonEntrySchema = z.object({
  card: RestaurantCardViewSchema,
  meetsAllRequirements: z.boolean(),
  tradeOffs: z.array(z.string()),
});
export type ComparisonEntry = z.infer<typeof ComparisonEntrySchema>;

export interface ComparisonAwards {
  bestOverallMatch?: string;
  bestValue?: string;
  bestAtmosphere?: string;
  bestForGroup?: string;
}

const FAILED_REASON_LABELS: Record<string, string> = {
  not_active: "currently marked closed for business",
  outside_radius: "outside the search radius",
  missing_dietary_options: "doesn't cover one of the dietary needs you asked for",
  missing_required_facilities: "missing one of the facilities you asked for",
  closed_at_requested_time: "closed at the time you're after",
  far_over_budget: "well over your budget",
  no_active_offer: "has no current offer",
};

export function buildComparisonEntries(restaurants: Restaurant[], criteria: SearchCriteria, at: Date): ComparisonEntry[] {
  return restaurants.map((restaurant) => {
    const recommendation = buildRecommendation(restaurant, criteria, at, "search");
    const hardFilter = checkHardFilters(restaurant, criteria, at, "search");
    const card = toCardView(recommendation, at);

    const tradeOffs = hardFilter.failedReasons.map((reason) => FAILED_REASON_LABELS[reason] ?? reason);
    if (criteria.budgetPerPersonGbp && card.pricePerPersonGbp > criteria.budgetPerPersonGbp && hardFilter.passes) {
      tradeOffs.push(`a little over your £${criteria.budgetPerPersonGbp}pp budget`);
    }
    if (card.reviewCount !== undefined && card.reviewCount < 30) {
      tradeOffs.push("fewer reviews than the others, so less proven");
    }

    return { card, meetsAllRequirements: hardFilter.passes, tradeOffs };
  });
}

/**
 * "Only include a comparison category when supported by the data" - each
 * award is computed only when the underlying signal actually discriminates
 * between the compared restaurants; otherwise it's left undefined rather
 * than forcing a tie-break that doesn't mean anything.
 */
export function computeAwards(entries: ComparisonEntry[], criteria: SearchCriteria): ComparisonAwards {
  const awards: ComparisonAwards = {};
  if (entries.length === 0) return awards;

  const byScore = [...entries].sort((a, b) => b.card.matchScorePercent - a.card.matchScorePercent);
  awards.bestOverallMatch = byScore[0]?.card.id;

  const withRating = entries.filter((e) => e.card.rating !== undefined);
  if (withRating.length > 0) {
    const byValue = [...withRating].sort((a, b) => {
      const valueA = (a.card.rating ?? 0) / a.card.pricePerPersonGbp;
      const valueB = (b.card.rating ?? 0) / b.card.pricePerPersonGbp;
      return valueB - valueA;
    });
    const distinctPrices = new Set(entries.map((e) => e.card.pricePerPersonGbp)).size > 1;
    if (distinctPrices) awards.bestValue = byValue[0]?.card.id;
  }

  if (criteria.atmosphere.length > 0 || criteria.occasion) {
    const wanted = new Set(criteria.atmosphere);
    const byAtmosphere = [...entries].sort(
      (a, b) => b.card.atmosphere.filter((x) => wanted.has(x)).length - a.card.atmosphere.filter((x) => wanted.has(x)).length,
    );
    const topCount = byAtmosphere[0]?.card.atmosphere.filter((x) => wanted.has(x)).length ?? 0;
    if (topCount > 0) awards.bestAtmosphere = byAtmosphere[0]?.card.id;
  }

  if (criteria.partySize >= 3) {
    const groupFriendly = entries.filter((e) => e.card.facilities.includes("large_groups"));
    const pool = groupFriendly.length > 0 ? groupFriendly : entries;
    const bestForGroup = [...pool].sort((a, b) => b.card.matchScorePercent - a.card.matchScorePercent)[0];
    awards.bestForGroup = bestForGroup?.card.id;
  }

  return awards;
}
