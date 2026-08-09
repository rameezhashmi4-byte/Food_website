import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isNewOpening, rankRestaurants } from "@bitejoy/core";
import type { AppContext } from "../context.js";
import { SearchCriteriaInputShape } from "../lib/schemas.js";
import { resolveCriteria } from "../lib/resolveCriteria.js";
import { RestaurantCardViewSchema, toCardView } from "../lib/cardView.js";
import { buildResultsSummary } from "../lib/personality.js";
import { explainRecommendationsWithAI } from "../ai/openaiClient.js";
import { toToolResult } from "../lib/errors.js";
import { RESULTS_WIDGET_URI } from "../resources/constants.js";

const OutputShape = {
  mode: z.literal("new_openings"),
  locationLabel: z.string(),
  recommendations: z.array(RestaurantCardViewSchema),
  count: z.number(),
};

export function registerFindNewOpenings(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "find_new_openings",
    {
      title: "Find new openings",
      description:
        "Finds restaurants marked as newly opened (within the last couple of months) in the search area, that still meet the search requirements. Great for food-adventure-minded requests.",
      inputSchema: SearchCriteriaInputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        ui: { resourceUri: RESULTS_WIDGET_URI },
        "openai/outputTemplate": RESULTS_WIDGET_URI,
        "openai/toolInvocation/invoking": "Looking for new openings…",
        "openai/toolInvocation/invoked": "Here's what's new.",
      },
    },
    async (input) =>
      toToolResult(async () => {
        const { criteria, locationLabel, assumptions } = await resolveCriteria(ctx.provider, input);
        const candidates = await ctx.provider.searchRestaurants({ criteria });
        const newOpenings = candidates.filter((restaurant) => isNewOpening(restaurant));
        const recommendations = rankRestaurants(newOpenings, criteria, { mode: "food_adventure" });
        const cards = recommendations.map((rec) => toCardView(rec));

        const deterministicSummary = buildResultsSummary({ mode: "food_adventure", cards, locationLabel, assumptions });
        const aiSummary = await explainRecommendationsWithAI(cards);

        return {
          content: [{ type: "text", text: aiSummary ?? deterministicSummary }],
          structuredContent: { mode: "new_openings" as const, locationLabel, recommendations: cards, count: cards.length },
        };
      }),
  );
}
