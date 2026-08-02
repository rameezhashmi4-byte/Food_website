import { z } from "zod";
import {
  AtmosphereSchema,
  CoordinatesSchema,
  CuisineSchema,
  DietaryTagSchema,
  FacilitySchema,
  OccasionSchema,
} from "./common.js";

/**
 * The structured shape a food request is parsed into. Every field is
 * optional at the type level because a real conversation fills these in
 * gradually - callers decide what's "essential" via `getEssentialFollowUp`.
 */
export const SearchCriteriaSchema = z.object({
  location: CoordinatesSchema,
  locationLabel: z.string().optional(),
  radiusKm: z.number().positive().max(50).default(8),
  /** When they want to eat. Defaults to "now" if omitted by the caller. */
  dateTime: z.string().datetime().optional(),
  partySize: z.number().int().positive().default(2),
  budgetPerPersonGbp: z.number().positive().optional(),
  cuisines: z.array(CuisineSchema).default([]),
  foodPreferences: z.array(z.string()).default([]),
  drinkPreferences: z.array(z.string()).default([]),
  occasion: OccasionSchema.optional(),
  atmosphere: z.array(AtmosphereSchema).default([]),
  dietaryNeeds: z.array(DietaryTagSchema).default([]),
  requiredFacilities: z.array(FacilitySchema).default([]),
  wantsOffers: z.boolean().default(false),
  prioritiseIndependent: z.boolean().default(false),
});
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;

/** Same shape, but nothing is required and nothing is defaulted - the raw slots gathered so far in a conversation. */
export const PartialSearchCriteriaSchema = SearchCriteriaSchema.partial();
export type PartialSearchCriteria = z.infer<typeof PartialSearchCriteriaSchema>;

export const GroupMemberPreferencesSchema = z.object({
  memberId: z.string(),
  displayName: z.string().optional(),
  cuisines: z.array(CuisineSchema).default([]),
  dietaryNeeds: z.array(DietaryTagSchema).default([]),
  budgetPerPersonGbp: z.number().positive().optional(),
  atmosphere: z.array(AtmosphereSchema).default([]),
  mustAvoid: z.array(z.string()).default([]),
});
export type GroupMemberPreferences = z.infer<typeof GroupMemberPreferencesSchema>;

export const GroupSearchCriteriaSchema = z.object({
  location: CoordinatesSchema,
  locationLabel: z.string().optional(),
  radiusKm: z.number().positive().max(50).default(8),
  dateTime: z.string().datetime().optional(),
  occasion: OccasionSchema.optional(),
  requiredFacilities: z.array(FacilitySchema).default([]),
  members: z.array(GroupMemberPreferencesSchema).min(1),
});
export type GroupSearchCriteria = z.infer<typeof GroupSearchCriteriaSchema>;

/**
 * Priority order for the single clarifying question BiteJoy is allowed to
 * ask. Location is the only field a search cannot run without; everything
 * else has a sensible default, so we only ever surface one gap at a time.
 */
const ESSENTIAL_FIELD_PROMPTS: Array<{
  field: keyof PartialSearchCriteria;
  isMissing: (c: PartialSearchCriteria) => boolean;
  question: string;
}> = [
  {
    field: "location",
    isMissing: (c) => !c.location,
    question: "Whereabouts should I look - what area or postcode?",
  },
  {
    field: "partySize",
    isMissing: (c) => !c.partySize,
    question: "How many of you are eating?",
  },
];

/**
 * Returns the single most important missing piece of information, or
 * `undefined` if BiteJoy has enough to search. Never returns more than one
 * question - a long intake form is explicitly against the product's design.
 */
export function getEssentialFollowUp(criteria: PartialSearchCriteria): string | undefined {
  for (const prompt of ESSENTIAL_FIELD_PROMPTS) {
    if (prompt.isMissing(criteria)) return prompt.question;
  }
  return undefined;
}

/** Fills in safe defaults for everything optional so a partial slot-set becomes a runnable search. */
export function completeSearchCriteria(criteria: PartialSearchCriteria): SearchCriteria {
  if (!criteria.location) {
    throw new Error("Cannot complete search criteria without a location");
  }
  return SearchCriteriaSchema.parse({
    ...criteria,
    location: criteria.location,
  });
}

/**
 * Combines each group member's individual preferences into one search that
 * respects hard constraints (dietary needs, budget ceiling) for everyone,
 * while treating cuisine/atmosphere as soft signals used by the scorer.
 */
export function mergeGroupPreferences(input: z.input<typeof GroupSearchCriteriaSchema>): SearchCriteria {
  const group = GroupSearchCriteriaSchema.parse(input);

  const dietaryNeeds = Array.from(new Set(group.members.flatMap((m) => m.dietaryNeeds)));
  const cuisines = Array.from(new Set(group.members.flatMap((m) => m.cuisines)));
  const atmosphere = Array.from(new Set(group.members.flatMap((m) => m.atmosphere)));
  const budgets = group.members
    .map((m) => m.budgetPerPersonGbp)
    .filter((b): b is number => typeof b === "number");
  const budgetPerPersonGbp = budgets.length > 0 ? Math.min(...budgets) : undefined;

  return SearchCriteriaSchema.parse({
    location: group.location,
    locationLabel: group.locationLabel,
    radiusKm: group.radiusKm,
    dateTime: group.dateTime,
    partySize: group.members.length,
    budgetPerPersonGbp,
    cuisines,
    atmosphere,
    dietaryNeeds,
    occasion: group.occasion,
    requiredFacilities: group.requiredFacilities,
  });
}
