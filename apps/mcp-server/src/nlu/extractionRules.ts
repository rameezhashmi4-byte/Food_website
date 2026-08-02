import type { Atmosphere, Cuisine, DietaryTag, Facility, Occasion } from "@bitejoy/core";

function phraseRegex(phrase: string): RegExp {
  return new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "i");
}

function matchKeywordMap<T extends string>(text: string, map: Record<string, T>): T[] {
  const matched = new Set<T>();
  for (const [phrase, value] of Object.entries(map)) {
    if (phraseRegex(phrase).test(text)) matched.add(value);
  }
  return Array.from(matched);
}

function matchTriggeredPhrases(text: string, map: Record<string, string>): string[] {
  const matched = new Set<string>();
  for (const phrase of Object.keys(map)) {
    if (phraseRegex(phrase).test(text)) matched.add(phrase);
  }
  return Array.from(matched);
}

const CUISINE_KEYWORDS: Record<string, Cuisine> = {
  burger: "burgers",
  burgers: "burgers",
  grill: "bbq_grill",
  grilled: "bbq_grill",
  bbq: "bbq_grill",
  barbecue: "bbq_grill",
  indian: "indian",
  curry: "indian",
  italian: "italian",
  pasta: "italian",
  pizza: "pizza",
  chinese: "chinese",
  japanese: "japanese",
  sushi: "japanese",
  thai: "thai",
  vietnamese: "vietnamese",
  pho: "vietnamese",
  korean: "korean",
  mexican: "mexican",
  tacos: "mexican",
  spanish: "spanish",
  tapas: "tapas_small_plates",
  greek: "greek",
  turkish: "turkish",
  kebab: "turkish",
  lebanese: "lebanese",
  caribbean: "caribbean",
  ethiopian: "ethiopian",
  french: "french",
  american: "american",
  seafood: "seafood",
  steak: "steakhouse",
  steakhouse: "steakhouse",
  vegan: "vegetarian_vegan",
  vegetarian: "vegetarian_vegan",
  brunch: "brunch_cafe",
  cafe: "brunch_cafe",
  bakery: "bakery_dessert",
  dessert: "bakery_dessert",
  "street food": "street_food",
  fusion: "fusion",
};

/** Food-related words worth passing on as free-text menu-matching signals, beyond whatever also mapped to a cuisine. */
const EXTRA_FOOD_PREFERENCE_WORDS = [
  "wings",
  "ribs",
  "noodles",
  "dumplings",
  "sharing menu",
  "tasting menu",
  "small plates",
  "oysters",
  "roast",
  "fish and chips",
];

const DRINK_PREFERENCE_WORDS = [
  "drinks",
  "cocktails",
  "wine",
  "beer",
  "craft beer",
  "ale",
  "whisky",
  "whiskey",
  "bourbon",
  "sake",
  "soju",
  "margarita",
  "happy hour",
  "byob",
  "cider",
];

const DIETARY_KEYWORDS: Record<string, DietaryTag> = {
  vegetarian: "vegetarian",
  veggie: "vegetarian",
  vegan: "vegan",
  "gluten free": "gluten_free",
  "gluten-free": "gluten_free",
  coeliac: "gluten_free",
  celiac: "gluten_free",
  "dairy free": "dairy_free",
  "dairy-free": "dairy_free",
  lactose: "dairy_free",
  "nut free": "nut_free",
  "nut allergy": "nut_free",
  halal: "halal",
  kosher: "kosher",
  pescatarian: "pescatarian",
  "low carb": "low_carb",
  keto: "low_carb",
};

const OCCASION_KEYWORDS: Record<string, Occasion> = {
  "first date": "first_date",
  date: "first_date",
  birthday: "birthday",
  "family meal": "family_meal",
  family: "family_meal",
  "catch up": "catch_up_with_friends",
  catchup: "catch_up_with_friends",
  "quick lunch": "quick_lunch",
  celebration: "celebration",
  celebrating: "celebration",
  celebrate: "celebration",
  "late night": "late_night_food",
  business: "business_meal",
  "work meal": "business_meal",
  solo: "solo_treat",
  myself: "solo_treat",
  chill: "relaxed_evening",
};

const ATMOSPHERE_KEYWORDS: Record<string, Atmosphere> = {
  fun: "lively",
  lively: "lively",
  buzzy: "lively",
  romantic: "romantic",
  quiet: "quiet",
  chilled: "relaxed",
  relaxed: "relaxed",
  "family friendly": "family_friendly",
  "kid friendly": "family_friendly",
  trendy: "trendy",
  hip: "trendy",
  outdoor: "outdoor_seating",
  garden: "outdoor_seating",
  terrace: "outdoor_seating",
  "late night": "late_night",
  casual: "casual",
  upscale: "upscale",
  fancy: "upscale",
  smart: "upscale",
  quirky: "quirky",
  unique: "quirky",
  traditional: "traditional",
  classic: "traditional",
  intimate: "intimate",
};

const FACILITY_KEYWORDS: Record<string, Facility> = {
  parking: "parking",
  wheelchair: "wheelchair_accessible",
  accessible: "wheelchair_accessible",
  "outdoor seating": "outdoor_seating",
  "private dining": "private_dining",
  "private room": "private_dining",
  "large group": "large_groups",
  "big group": "large_groups",
  "live music": "live_music",
  sports: "sports_screens",
  screens: "sports_screens",
  wifi: "wifi",
  "dog friendly": "dog_friendly",
  dogs: "dog_friendly",
  "high chair": "high_chairs",
  byob: "byob",
};

const OFFER_TRIGGER = /\b(offer|deal|discount|happy hour|cheap|voucher|promo)\b/i;
const INDEPENDENT_TRIGGER = /\b(independent|indie|local place|hidden gem|not a chain|family run|family-run)\b/i;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

export function extractCuisines(text: string): Cuisine[] {
  return matchKeywordMap(text, CUISINE_KEYWORDS);
}

export function extractFoodPreferences(text: string): string[] {
  const cuisineWords = matchTriggeredPhrases(text, CUISINE_KEYWORDS);
  const extraWords = EXTRA_FOOD_PREFERENCE_WORDS.filter((word) => phraseRegex(word).test(text));
  return Array.from(new Set([...cuisineWords, ...extraWords]));
}

export function extractDrinkPreferences(text: string): string[] {
  return DRINK_PREFERENCE_WORDS.filter((word) => phraseRegex(word).test(text));
}

export function extractDietaryNeeds(text: string): DietaryTag[] {
  return matchKeywordMap(text, DIETARY_KEYWORDS);
}

export function extractOccasion(text: string): Occasion | undefined {
  return matchKeywordMap(text, OCCASION_KEYWORDS)[0];
}

export function extractAtmosphere(text: string): Atmosphere[] {
  return matchKeywordMap(text, ATMOSPHERE_KEYWORDS);
}

export function extractFacilities(text: string): Facility[] {
  return matchKeywordMap(text, FACILITY_KEYWORDS);
}

export function extractWantsOffers(text: string): boolean {
  return OFFER_TRIGGER.test(text);
}

export function extractPrioritiseIndependent(text: string): boolean {
  return INDEPENDENT_TRIGGER.test(text);
}

export function extractPartySize(text: string): number | undefined {
  const digitMatch = text.match(/\bfor\s+(\d{1,2})\b/i) ?? text.match(/\b(\d{1,2})\s+(?:of us|people|guests|friends)\b/i) ?? text.match(/\bparty of\s+(\d{1,2})\b/i);
  if (digitMatch?.[1]) return Number(digitMatch[1]);

  const wordPattern = Object.keys(NUMBER_WORDS).join("|");
  const wordMatch =
    text.match(new RegExp(`\\bfor\\s+(${wordPattern})\\b`, "i")) ??
    text.match(new RegExp(`\\b(${wordPattern})\\s+(?:of us|people|guests|friends)\\b`, "i"));
  if (wordMatch?.[1]) return NUMBER_WORDS[wordMatch[1].toLowerCase()];

  return undefined;
}

export interface ExtractedBudget {
  budgetPerPersonGbp?: number;
  totalBudgetGbp?: number;
}

export function extractBudget(text: string): ExtractedBudget {
  const perPerson = text.match(/£\s?(\d+(?:\.\d+)?)\s*(?:each|per person|pp\b|a head|per head)/i);
  if (perPerson?.[1]) return { budgetPerPersonGbp: Number(perPerson[1]) };

  const total = text.match(/£\s?(\d+(?:\.\d+)?)\s*(?:total|for the group|altogether|all in)/i);
  if (total?.[1]) return { totalBudgetGbp: Number(total[1]) };

  const bare = text.match(/£\s?(\d+(?:\.\d+)?)/);
  if (bare?.[1]) return { budgetPerPersonGbp: Number(bare[1]) };

  return {};
}

export function extractRadiusKm(text: string): number | undefined {
  const explicit = text.match(/within\s+(\d+(?:\.\d+)?)\s*(mile|miles|km|kilometre|kilometres|kilometer|kilometers)/i);
  if (explicit?.[1] && explicit[2]) {
    const value = Number(explicit[1]);
    return /mile/i.test(explicit[2]) ? Math.round(value * 1.60934 * 10) / 10 : value;
  }
  if (/walking distance/i.test(text)) return 1.5;
  return undefined;
}
