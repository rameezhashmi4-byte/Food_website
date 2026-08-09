import { completeSearchCriteria, type PartialSearchCriteria, type ResolvedLocation, type RestaurantProvider, type SearchCriteria } from "@bitejoy/core";
import { resolveLocationText } from "../nlu/gazetteer.js";
import { resolveRelativeDateTime } from "../nlu/relativeDateTime.js";
import { ToolInputError } from "./errors.js";
import type { SearchCriteriaInput } from "./schemas.js";

export interface ResolvedCriteria {
  criteria: SearchCriteria;
  locationLabel: string;
  assumptions: string[];
}

async function resolveInputLocation(provider: RestaurantProvider, input: SearchCriteriaInput): Promise<ResolvedLocation> {
  if (input.lat !== undefined && input.lng !== undefined) {
    // Real coordinates were handed to us directly (e.g. a device's GPS) -
    // used as-is, no geocoding round trip. `location`, if also given
    // alongside coordinates, is just a friendlier label than raw numbers.
    return { coordinates: { lat: input.lat, lng: input.lng }, label: input.location ?? "your current location" };
  }

  if ((input.lat !== undefined) !== (input.lng !== undefined)) {
    throw new ToolInputError("lat and lng must both be given together for a GPS-based search - a single coordinate on its own isn't enough.");
  }

  if (!input.location) {
    throw new ToolInputError('A location is required - either a place name/postcode, or lat and lng for a "near me" search.');
  }

  const resolved = provider.resolveLocation ? await provider.resolveLocation(input.location) : resolveLocationText(input.location);
  if (!resolved) {
    throw new ToolInputError(
      provider.resolveLocation
        ? `I couldn't find a place matching "${input.location}" - try a more specific place name, address or postcode.`
        : `I don't recognise "${input.location}" yet - BiteJoy's demo data currently covers Croydon and Streatham. Try an area like "Croydon" or "East Croydon".`,
    );
  }
  return resolved;
}

/**
 * Turns a tool's loose, model-friendly input (free-text location, natural
 * date phrases) into the strict `SearchCriteria` the core scoring engine
 * requires. Every search-family tool routes through this, so location and
 * date resolution behave identically everywhere.
 *
 * Location resolution has two paths, checked in order:
 *
 * 1. `lat`/`lng` given directly (e.g. from a device's real GPS, passed
 *    straight through by the caller) - used as-is, no geocoding at all.
 *    This is the accurate, fast path for a genuine "near me" search.
 * 2. Free-text `location` - deferred to the active `provider`: if it
 *    implements `resolveLocation` (genuine geocoding, e.g.
 *    `GooglePlacesProvider`), that's used and any worldwide location/
 *    postcode works. If not (the fixed-data `FictionalRestaurantProvider`),
 *    this falls back to the small Croydon/Streatham-only gazetteer that
 *    actually matches the demo dataset. This is what makes
 *    `BITEJOY_PROVIDER=google_places` alone enough to unlock international
 *    search - resolution is never hard-wired to the UK gazetteer.
 */
export async function resolveCriteria(
  provider: RestaurantProvider,
  input: SearchCriteriaInput,
  now: Date = new Date(),
): Promise<ResolvedCriteria> {
  const assumptions: string[] = [];

  const location = await resolveInputLocation(provider, input);

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
