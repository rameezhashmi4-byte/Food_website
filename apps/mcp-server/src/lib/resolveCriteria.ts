import { completeSearchCriteria, type PartialSearchCriteria, type SearchCriteria } from "@bitejoy/core";
import { resolveLocationText } from "../nlu/gazetteer.js";
import { resolveRelativeDateTime } from "../nlu/relativeDateTime.js";
import { ToolInputError } from "./errors.js";
import type { SearchCriteriaInput } from "./schemas.js";

export interface ResolvedCriteria {
  criteria: SearchCriteria;
  locationLabel: string;
  assumptions: string[];
}

/**
 * Turns a tool's loose, model-friendly input (free-text location, natural
 * date phrases) into the strict `SearchCriteria` the core scoring engine
 * requires. Every search-family tool routes through this, so location and
 * date resolution behave identically everywhere.
 */
export function resolveCriteria(input: SearchCriteriaInput, now: Date = new Date()): ResolvedCriteria {
  const assumptions: string[] = [];

  const location = resolveLocationText(input.location);
  if (!location) {
    throw new ToolInputError(
      `I don't recognise "${input.location}" yet - BiteJoy's demo data currently covers Croydon and Streatham. Try an area like "Croydon" or "East Croydon".`,
    );
  }

  let dateTimeIso: string | undefined;
  if (input.dateTime) {
    if (/^\d{4}-\d{2}-\d{2}T/.test(input.dateTime)) {
      dateTimeIso = input.dateTime;
    } else {
      const resolved = resolveRelativeDateTime(input.dateTime, now);
      if (resolved) {
        dateTimeIso = resolved.iso;
        assumptions.push(`Assuming ${resolved.assumption}`);
      }
    }
  }

  let budgetPerPersonGbp = input.budgetPerPersonGbp;
  if (!budgetPerPersonGbp && input.totalBudgetGbp && input.partySize) {
    budgetPerPersonGbp = Math.round((input.totalBudgetGbp / input.partySize) * 100) / 100;
    assumptions.push(`Split the £${input.totalBudgetGbp} total across ${input.partySize} people (~£${budgetPerPersonGbp} each)`);
  }

  const partial: PartialSearchCriteria = {
    location: location.coordinates,
    locationLabel: location.label,
    ...(input.radiusKm ? { radiusKm: input.radiusKm } : {}),
    ...(dateTimeIso ? { dateTime: dateTimeIso } : {}),
    ...(input.partySize ? { partySize: input.partySize } : {}),
    ...(budgetPerPersonGbp ? { budgetPerPersonGbp } : {}),
    ...(input.cuisines ? { cuisines: input.cuisines } : {}),
    ...(input.foodPreferences ? { foodPreferences: input.foodPreferences } : {}),
    ...(input.drinkPreferences ? { drinkPreferences: input.drinkPreferences } : {}),
    ...(input.dietaryNeeds ? { dietaryNeeds: input.dietaryNeeds } : {}),
    ...(input.occasion ? { occasion: input.occasion } : {}),
    ...(input.atmosphere ? { atmosphere: input.atmosphere } : {}),
    ...(input.requiredFacilities ? { requiredFacilities: input.requiredFacilities } : {}),
    ...(input.wantsOffers !== undefined ? { wantsOffers: input.wantsOffers } : {}),
    ...(input.prioritiseIndependent !== undefined ? { prioritiseIndependent: input.prioritiseIndependent } : {}),
  };

  return { criteria: completeSearchCriteria(partial), locationLabel: location.label, assumptions };
}
