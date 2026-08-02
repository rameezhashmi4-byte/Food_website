import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AtmosphereSchema, CuisineSchema, DietaryTagSchema, FacilitySchema, OccasionSchema } from "@bitejoy/core";
import { extractCriteria } from "../nlu/extractCriteria.js";
import { isAiAvailable } from "../ai/openaiClient.js";
import { describeCriteria } from "../lib/personality.js";
import { toToolResult } from "../lib/errors.js";

const InputShape = {
  message: z
    .string()
    .min(1)
    .max(2000)
    .describe('The diner\'s natural-language request, e.g. "Find somewhere fun near Croydon for four people tonight, around £30 each, good burgers, drinks and parking."'),
};

const StructuredCriteriaShape = {
  locationLabel: z.string().optional(),
  radiusKm: z.number().optional(),
  dateTime: z.string().optional(),
  partySize: z.number().optional(),
  budgetPerPersonGbp: z.number().optional(),
  cuisines: z.array(CuisineSchema).optional(),
  foodPreferences: z.array(z.string()).optional(),
  drinkPreferences: z.array(z.string()).optional(),
  dietaryNeeds: z.array(DietaryTagSchema).optional(),
  occasion: OccasionSchema.optional(),
  atmosphere: z.array(AtmosphereSchema).optional(),
  requiredFacilities: z.array(FacilitySchema).optional(),
  wantsOffers: z.boolean().optional(),
  prioritiseIndependent: z.boolean().optional(),
};
const StructuredCriteriaSchema = z.object(StructuredCriteriaShape);
export type StructuredCriteria = z.infer<typeof StructuredCriteriaSchema>;

const OutputShape = {
  criteria: StructuredCriteriaSchema,
  readyToSearch: z.boolean(),
  missingEssential: z.string().optional(),
  assumptions: z.array(z.string()),
  usedAi: z.boolean(),
};

export function registerUnderstandFoodRequest(server: McpServer): void {
  server.registerTool(
    "understand_food_request",
    {
      title: "Understand a food request",
      description:
        "Converts a natural-language dining request into structured search criteria (location, budget, group size, cuisine, dietary needs, occasion, atmosphere, required facilities). Works fully offline - no OpenAI key required - and asks at most one follow-up question when something essential (like location) is missing. Pass the result's criteria.locationLabel and other fields straight into search_restaurants or the other search-family tools.",
      inputSchema: InputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        "openai/toolInvocation/invoking": "Reading your request…",
        "openai/toolInvocation/invoked": "Got it.",
      },
    },
    async ({ message }) =>
      toToolResult(async () => {
        const result = await extractCriteria(message);
        const structured: StructuredCriteria = {
          locationLabel: result.criteria.locationLabel,
          radiusKm: result.criteria.radiusKm,
          dateTime: result.criteria.dateTime,
          partySize: result.criteria.partySize,
          budgetPerPersonGbp: result.criteria.budgetPerPersonGbp,
          cuisines: result.criteria.cuisines,
          foodPreferences: result.criteria.foodPreferences,
          drinkPreferences: result.criteria.drinkPreferences,
          dietaryNeeds: result.criteria.dietaryNeeds,
          occasion: result.criteria.occasion,
          atmosphere: result.criteria.atmosphere,
          requiredFacilities: result.criteria.requiredFacilities,
          wantsOffers: result.criteria.wantsOffers,
          prioritiseIndependent: result.criteria.prioritiseIndependent,
        };

        const output = {
          criteria: structured,
          readyToSearch: !result.essentialFollowUp,
          missingEssential: result.essentialFollowUp,
          assumptions: result.assumptions,
          usedAi: isAiAvailable(),
        };

        const text = result.essentialFollowUp ?? `Got it - ${describeCriteria(structured)}. Let's see what's out there.`;

        return { content: [{ type: "text", text }], structuredContent: output };
      }),
  );
}
