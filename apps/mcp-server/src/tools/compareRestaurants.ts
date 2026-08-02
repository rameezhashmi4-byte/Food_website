import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context.js";
import { SearchCriteriaInputShape } from "../lib/schemas.js";
import { resolveCriteria } from "../lib/resolveCriteria.js";
import { buildComparisonEntries, computeAwards, ComparisonEntrySchema } from "../lib/comparison.js";
import { compareRestaurantsWithAI } from "../ai/openaiClient.js";
import { toToolResult, ToolInputError } from "../lib/errors.js";
import { COMPARISON_WIDGET_URI } from "../resources/constants.js";

const InputShape = {
  restaurantIds: z
    .array(z.string().min(1))
    .min(2)
    .max(4)
    .describe("2 to 4 restaurant ids to compare, as returned by search_restaurants or similar."),
  ...SearchCriteriaInputShape,
};

const OutputShape = {
  locationLabel: z.string(),
  items: z.array(ComparisonEntrySchema),
  bestOverallMatch: z.string().optional(),
  bestValue: z.string().optional(),
  bestAtmosphere: z.string().optional(),
  bestForGroup: z.string().optional(),
};

export function registerCompareRestaurants(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "compare_restaurants",
    {
      title: "Compare restaurants",
      description:
        "Compares 2-4 specific restaurants against the same search requirements (pass the same location/budget/cuisine/etc used in the original search). Returns match score, distance, price, atmosphere, facilities, offers, ratings and dietary suitability for each, plus which one wins best overall match, best value, best atmosphere and best for the group - only when the data actually supports that category - along with honest trade-offs.",
      inputSchema: InputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        ui: { resourceUri: COMPARISON_WIDGET_URI },
        "openai/outputTemplate": COMPARISON_WIDGET_URI,
        "openai/toolInvocation/invoking": "Comparing your shortlist…",
        "openai/toolInvocation/invoked": "Here's the comparison.",
      },
    },
    async ({ restaurantIds, ...criteriaInput }) =>
      toToolResult(async () => {
        const uniqueIds = Array.from(new Set(restaurantIds));
        const { criteria, locationLabel } = resolveCriteria(criteriaInput);

        const restaurants = await Promise.all(uniqueIds.map((id) => ctx.provider.getRestaurantById(id)));
        const missing = uniqueIds.filter((_, i) => !restaurants[i]);
        if (missing.length > 0) {
          throw new ToolInputError(`I couldn't find ${missing.length > 1 ? "these restaurants" : "this restaurant"}: ${missing.join(", ")}.`);
        }

        const found = restaurants.filter((r): r is NonNullable<typeof r> => Boolean(r));
        const now = criteria.dateTime ? new Date(criteria.dateTime) : new Date();
        const entries = buildComparisonEntries(found, criteria, now);
        const awards = computeAwards(entries, criteria);

        const output = { locationLabel, items: entries, ...awards };
        const deterministicText = buildComparisonText(output);
        const aiText = await compareRestaurantsWithAI(output);

        return {
          content: [{ type: "text", text: aiText ?? deterministicText }],
          structuredContent: output,
        };
      }),
  );
}

function buildComparisonText(output: {
  items: Array<{ card: { id: string; name: string }; tradeOffs: string[] }>;
  bestOverallMatch?: string;
  bestValue?: string;
  bestAtmosphere?: string;
  bestForGroup?: string;
}): string {
  const byId = new Map(output.items.map((item) => [item.card.id, item]));
  const sentences: string[] = [];

  const overall = output.bestOverallMatch ? byId.get(output.bestOverallMatch) : undefined;
  if (overall) sentences.push(`${overall.card.name} is the strongest overall match for what you're after.`);

  const value = output.bestValue ? byId.get(output.bestValue) : undefined;
  if (value && value.card.id !== overall?.card.id) sentences.push(`${value.card.name} is the best value of the group.`);

  const atmosphere = output.bestAtmosphere ? byId.get(output.bestAtmosphere) : undefined;
  if (atmosphere) sentences.push(`${atmosphere.card.name} best matches the atmosphere you're after.`);

  const group = output.bestForGroup ? byId.get(output.bestForGroup) : undefined;
  if (group && group.card.id !== overall?.card.id) sentences.push(`${group.card.name} suits your group size best.`);

  const withTradeOffs = output.items.find((item) => item.tradeOffs.length > 0);
  if (withTradeOffs) {
    sentences.push(`Worth knowing: ${withTradeOffs.card.name} is ${withTradeOffs.tradeOffs[0]}.`);
  }

  return sentences.length > 0 ? sentences.join(" ") : "Here's how they stack up against each other.";
}
