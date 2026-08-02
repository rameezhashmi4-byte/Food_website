import OpenAI from "openai";
import { z } from "zod";
import { AtmosphereSchema, CuisineSchema, DietaryTagSchema, FacilitySchema, OccasionSchema } from "@bitejoy/core";
import { EXTRACT_CRITERIA_SYSTEM_PROMPT, buildExtractCriteriaUserPrompt } from "./prompts/extractCriteria.js";
import { EXPLAIN_RECOMMENDATIONS_SYSTEM_PROMPT, buildExplainRecommendationsUserPrompt } from "./prompts/explainRecommendations.js";
import { COMPARE_RESTAURANTS_SYSTEM_PROMPT, buildCompareRestaurantsUserPrompt } from "./prompts/compareRestaurants.js";

/**
 * Optional OpenAI-backed enhancement layer. Every export here degrades to
 * `undefined` when `OPENAI_API_KEY` isn't set, on any API error, or when the
 * model's output fails Zod validation - callers always have a deterministic
 * fallback (see lib/personality.ts and nlu/extractCriteria.ts) and must use
 * it in that case. Nothing here ever touches restaurant facts directly:
 * extraction is scoped to the diner's own stated preferences, and the
 * explanation/comparison prompts are given only pre-computed, already-
 * verified data to rephrase - never asked to originate new facts.
 */

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let cachedClient: OpenAI | undefined;

export function isAiAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI | undefined {
  if (!process.env.OPENAI_API_KEY) return undefined;
  cachedClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return cachedClient;
}

/** Judgment-call fields only - deliberately excludes location/coordinates, which stay purely deterministic (gazetteer). */
const AiExtractableFieldsSchema = z
  .object({
    partySize: z.number().int().positive().max(50),
    budgetPerPersonGbp: z.number().positive(),
    radiusKm: z.number().positive().max(50),
    cuisines: z.array(CuisineSchema),
    foodPreferences: z.array(z.string()),
    drinkPreferences: z.array(z.string()),
    dietaryNeeds: z.array(DietaryTagSchema),
    occasion: OccasionSchema,
    atmosphere: z.array(AtmosphereSchema),
    requiredFacilities: z.array(FacilitySchema),
    wantsOffers: z.boolean(),
    prioritiseIndependent: z.boolean(),
  })
  .partial();
export type AiExtractableFields = z.infer<typeof AiExtractableFieldsSchema>;

export async function refineCriteriaWithAI(message: string): Promise<AiExtractableFields | undefined> {
  const openai = getClient();
  if (!openai) return undefined;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_CRITERIA_SYSTEM_PROMPT },
        { role: "user", content: buildExtractCriteriaUserPrompt(message) },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return undefined;

    const parsed = AiExtractableFieldsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export async function explainRecommendationsWithAI(cardsJson: unknown): Promise<string | undefined> {
  const openai = getClient();
  if (!openai) return undefined;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: EXPLAIN_RECOMMENDATIONS_SYSTEM_PROMPT },
        { role: "user", content: buildExplainRecommendationsUserPrompt(cardsJson) },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : undefined;
  } catch {
    return undefined;
  }
}

export async function compareRestaurantsWithAI(comparisonJson: unknown): Promise<string | undefined> {
  const openai = getClient();
  if (!openai) return undefined;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: COMPARE_RESTAURANTS_SYSTEM_PROMPT },
        { role: "user", content: buildCompareRestaurantsUserPrompt(comparisonJson) },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : undefined;
  } catch {
    return undefined;
  }
}
