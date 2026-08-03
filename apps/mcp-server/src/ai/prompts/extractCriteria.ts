/**
 * Prompt for the OPTIONAL AI-assisted refinement pass over food request
 * extraction. Deliberately scoped to judgment-call fields only (cuisine,
 * dietary, occasion, atmosphere, facilities, budget, party size) - it is
 * never asked to resolve a location to coordinates, so it can't hallucinate
 * geocoding. That stays the deterministic gazetteer's job alone.
 */
export interface ExtractCriteriaValidValues {
  cuisines: string[];
  dietaryNeeds: string[];
  occasions: string[];
  atmosphere: string[];
  facilities: string[];
}

/**
 * The enum fields are listed explicitly (not just "snake_case tag") because
 * a live test against the real model showed it otherwise guesses plausible
 * but invalid values (e.g. "date" instead of "first_date") - one bad enum
 * value used to silently discard the whole response; see openaiClient.ts's
 * per-field validation for the other half of that fix.
 */
export function buildExtractCriteriaSystemPrompt(valid: ExtractCriteriaValidValues): string {
  return `You are a request-structuring assistant for BiteJoy, a restaurant discovery app.

Given a diner's free-text message, extract ONLY the search parameters they actually expressed. You are structuring their own request - you are not recommending or describing any restaurant, and you must never invent, assume or guess a fact about any place.

Respond with a single strict JSON object using ONLY these optional keys (omit any key that wasn't expressed):
- partySize (integer)
- budgetPerPersonGbp (number, GBP)
- radiusKm (number)
- cuisines (array, each value must be exactly one of: ${valid.cuisines.join(", ")})
- foodPreferences (array of short free-text phrases)
- drinkPreferences (array of short free-text phrases)
- dietaryNeeds (array, each value must be exactly one of: ${valid.dietaryNeeds.join(", ")})
- occasion (single value, must be exactly one of: ${valid.occasions.join(", ")})
- atmosphere (array, each value must be exactly one of: ${valid.atmosphere.join(", ")})
- requiredFacilities (array, each value must be exactly one of: ${valid.facilities.join(", ")})
- wantsOffers (boolean)
- prioritiseIndependent (boolean)

If nothing in the message clearly maps to one of the exact allowed values for an enum field, omit that field entirely rather than guessing the closest one.
Do not include a "location" field under any circumstances - location resolution is handled separately.
Return only the JSON object, no prose.`;
}

export function buildExtractCriteriaUserPrompt(message: string): string {
  return `Diner's message: """${message}"""`;
}
