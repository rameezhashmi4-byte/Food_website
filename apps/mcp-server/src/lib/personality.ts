import type { RecommendationMode } from "@bitejoy/core";
import type { RestaurantCardView } from "./cardView.js";
import type { RestaurantDetailView } from "./detailView.js";

/**
 * Deterministic, always-on generation of BiteJoy's warm "food-loving
 * friend" voice - works identically with or without OPENAI_API_KEY. Every
 * sentence here is built only from facts already present on the card/view
 * objects (which themselves trace back to the scoring engine's data-grounded
 * `reasons`), so there is nothing here for a model to invent even if this
 * text is later handed off for AI rephrasing.
 */

const MODE_OPENERS: Record<RecommendationMode, string> = {
  search: "Love this plan.",
  find_my_vibe: "Got it - here's what matches that mood.",
  surprise_me: "Here's my pick for you.",
  hidden_gem: "Found some lesser-known favourites.",
  offers_near_me: "Here's what's currently on offer nearby.",
  group_decision: "Here's a shortlist the whole group should be happy with.",
  food_adventure: "Time to explore something new.",
};

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"];

function countPhrase(count: number): string {
  const word = NUMBER_WORDS[count] ?? String(count);
  return count === 1 ? `${word} place` : `${word} places`;
}

export interface ResultsSummaryParams {
  mode: RecommendationMode;
  cards: RestaurantCardView[];
  locationLabel: string;
  assumptions: string[];
}

export function buildResultsSummary({ mode, cards, locationLabel, assumptions }: ResultsSummaryParams): string {
  if (cards.length === 0) {
    return `I couldn't find a strong match near ${locationLabel} for that yet. Want to try a wider radius, a different budget, or fewer must-haves?`;
  }

  const opener = MODE_OPENERS[mode] ?? MODE_OPENERS.search;
  const top = cards[0];
  const sentences = [`${opener} I found ${countPhrase(cards.length)} near ${locationLabel} worth a look.`];

  if (top) {
    const topReasons = top.reasons.slice(0, 2).map(lowerFirst).join(" and ");
    sentences.push(topReasons ? `${top.name} is the strongest match - ${topReasons}.` : `${top.name} stood out most.`);
  }

  if (assumptions.length > 0) {
    sentences.push(`${assumptions[0]}.`);
  }

  return sentences.join(" ");
}

export function buildSurpriseSummary(card: RestaurantCardView, locationLabel: string): string {
  const reasons = card.reasons.slice(0, 3).join(", ");
  return `Here's my pick near ${locationLabel}: ${card.name}. ${reasons ? capitalize(reasons) + "." : ""}`.trim();
}

export function buildDetailSummary(detail: RestaurantDetailView): string {
  const cuisineText = detail.cuisines.join(", ").replace(/_/g, " ");
  const ratingText =
    detail.rating && detail.reviewCount
      ? ` Rated ${detail.rating}/5 from ${detail.reviewCount} reviews.`
      : "";
  const offerText = detail.offers.length > 0 ? ` There's a current offer: ${detail.offers[0]?.title}.` : "";
  return `${detail.name} is a ${cuisineText} spot in ${detail.area}, around £${detail.pricePerPersonGbp} per person.${ratingText}${offerText}`;
}

export interface DescribableCriteria {
  locationLabel?: string;
  partySize?: number;
  budgetPerPersonGbp?: number;
  cuisines?: string[];
  dietaryNeeds?: string[];
  requiredFacilities?: string[];
  occasion?: string;
}

/** Short, comma-joined recap of what was understood, e.g. "Croydon, 4 people, ~£30pp, burgers, needs parking". */
export function describeCriteria(criteria: DescribableCriteria): string {
  const parts: string[] = [];
  if (criteria.locationLabel) parts.push(criteria.locationLabel);
  if (criteria.partySize) parts.push(`${criteria.partySize} ${criteria.partySize === 1 ? "person" : "people"}`);
  if (criteria.budgetPerPersonGbp) parts.push(`~£${criteria.budgetPerPersonGbp}pp`);
  if (criteria.cuisines && criteria.cuisines.length > 0) parts.push(criteria.cuisines.join("/").replace(/_/g, " "));
  if (criteria.occasion) parts.push(criteria.occasion.replace(/_/g, " "));
  if (criteria.dietaryNeeds && criteria.dietaryNeeds.length > 0) {
    parts.push(`${criteria.dietaryNeeds.join(", ").replace(/_/g, " ")}`);
  }
  if (criteria.requiredFacilities && criteria.requiredFacilities.length > 0) {
    parts.push(`needs ${criteria.requiredFacilities.join(", ").replace(/_/g, " ")}`);
  }
  return parts.length > 0 ? parts.join(", ") : "no specific preferences yet";
}

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0]!.toLowerCase() + text.slice(1) : text;
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}
