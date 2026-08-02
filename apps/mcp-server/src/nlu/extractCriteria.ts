import { getEssentialFollowUp, type PartialSearchCriteria } from "@bitejoy/core";
import { isAiAvailable, refineCriteriaWithAI, type AiExtractableFields } from "../ai/openaiClient.js";
import { resolveLocationText } from "./gazetteer.js";
import { resolveRelativeDateTime } from "./relativeDateTime.js";
import {
  extractAtmosphere,
  extractBudget,
  extractCuisines,
  extractDietaryNeeds,
  extractDrinkPreferences,
  extractFacilities,
  extractFoodPreferences,
  extractOccasion,
  extractPartySize,
  extractPrioritiseIndependent,
  extractRadiusKm,
  extractWantsOffers,
} from "./extractionRules.js";

export interface ExtractionResult {
  criteria: PartialSearchCriteria;
  /** Short, human-readable notes on anything assumed (e.g. "Assuming tonight, 7pm") - kept transparent, never hidden. */
  assumptions: string[];
  /** The single essential follow-up question to ask, if anything critical is still missing. */
  essentialFollowUp?: string;
}

/**
 * Deterministic, zero-setup natural-language extraction: no OpenAI key
 * required. This is the *only* extraction path Stage 2 depends on; an
 * OpenAI-backed refinement layer (see ../ai/openaiClient.ts) can optionally
 * improve on it later, but every field it can plausibly fill in from
 * explicit wording, it does, so the tool is genuinely useful without any AI
 * model at all.
 */
export function extractCriteriaDeterministic(message: string, now: Date = new Date()): ExtractionResult {
  const assumptions: string[] = [];

  const location = resolveLocationText(message);
  const dateTime = resolveRelativeDateTime(message, now);
  if (dateTime) assumptions.push(`Assuming ${dateTime.assumption}`);

  const partySize = extractPartySize(message);
  const budget = extractBudget(message);
  const radiusKm = extractRadiusKm(message);
  const cuisines = extractCuisines(message);
  const foodPreferences = extractFoodPreferences(message);
  const drinkPreferences = extractDrinkPreferences(message);
  const dietaryNeeds = extractDietaryNeeds(message);
  const occasion = extractOccasion(message);
  const atmosphere = extractAtmosphere(message);
  const requiredFacilities = extractFacilities(message);
  const wantsOffers = extractWantsOffers(message);
  const prioritiseIndependent = extractPrioritiseIndependent(message);

  let budgetPerPersonGbp = budget.budgetPerPersonGbp;
  if (!budgetPerPersonGbp && budget.totalBudgetGbp && partySize) {
    budgetPerPersonGbp = Math.round((budget.totalBudgetGbp / partySize) * 100) / 100;
    assumptions.push(`Split your £${budget.totalBudgetGbp} total across ${partySize} people (~£${budgetPerPersonGbp} each)`);
  }

  const criteria: PartialSearchCriteria = {
    ...(location ? { location: location.coordinates, locationLabel: location.label } : {}),
    ...(radiusKm ? { radiusKm } : {}),
    ...(dateTime ? { dateTime: dateTime.iso } : {}),
    ...(partySize ? { partySize } : {}),
    ...(budgetPerPersonGbp ? { budgetPerPersonGbp } : {}),
    ...(cuisines.length > 0 ? { cuisines } : {}),
    ...(foodPreferences.length > 0 ? { foodPreferences } : {}),
    ...(drinkPreferences.length > 0 ? { drinkPreferences } : {}),
    ...(dietaryNeeds.length > 0 ? { dietaryNeeds } : {}),
    ...(occasion ? { occasion } : {}),
    ...(atmosphere.length > 0 ? { atmosphere } : {}),
    ...(requiredFacilities.length > 0 ? { requiredFacilities } : {}),
    ...(wantsOffers ? { wantsOffers } : {}),
    ...(prioritiseIndependent ? { prioritiseIndependent } : {}),
  };

  return {
    criteria,
    assumptions,
    essentialFollowUp: getEssentialFollowUp(criteria),
  };
}

/**
 * Same as `extractCriteriaDeterministic`, plus an optional AI refinement
 * pass for judgment-call fields the deterministic rules left blank
 * (location/dates are never touched by AI - see openaiClient.ts). No-op
 * when `OPENAI_API_KEY` isn't set. Deterministic hits always win: AI only
 * fills genuine gaps, never overrides a rule-based match.
 */
export async function extractCriteria(message: string, now: Date = new Date()): Promise<ExtractionResult> {
  const deterministic = extractCriteriaDeterministic(message, now);
  if (!isAiAvailable()) return deterministic;

  const aiFields = await refineCriteriaWithAI(message);
  if (!aiFields) return deterministic;

  const merged: PartialSearchCriteria = { ...deterministic.criteria };
  for (const [key, value] of Object.entries(aiFields) as Array<[keyof AiExtractableFields, unknown]>) {
    if (value === undefined) continue;
    const alreadySet = merged[key as keyof PartialSearchCriteria];
    const isEmpty = alreadySet === undefined || (Array.isArray(alreadySet) && alreadySet.length === 0);
    if (isEmpty) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return {
    criteria: merged,
    assumptions: deterministic.assumptions,
    essentialFollowUp: getEssentialFollowUp(merged),
  };
}
