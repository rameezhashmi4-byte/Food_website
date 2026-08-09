import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { rankRestaurants } from "@bitejoy/core";
import type { AppContext } from "../context.js";
import { SearchCriteriaInputShape, type SearchCriteriaInput } from "../lib/schemas.js";
import { resolveCriteria } from "../lib/resolveCriteria.js";
import { RestaurantCardViewSchema, toCardView } from "../lib/cardView.js";
import { buildResultsSummary } from "../lib/personality.js";
import { explainRecommendationsWithAI } from "../ai/openaiClient.js";
import { toToolResult } from "../lib/errors.js";
import { RESULTS_WIDGET_URI } from "../resources/constants.js";

const OutputShape = {
  mode: z.literal("hidden_gem"),
  locationLabel: z.string(),
  recommendations: z.array(RestaurantCardViewSchema),
  count: z.number(),
};

/** Same logic the REST layer (rest/routes.ts) calls - see tools/searchRestaurants.ts's equivalent comment. */
export async function performFindHiddenGems(ctx: AppContext, input: SearchCriteriaInput): Promise<CallToolResult> {
  const { criteria, locationLabel, assumptions } = resolveCriteria({ ...input, prioritiseIndependent: true });
  const candidates = await ctx.provider.searchRestaurants({ criteria });
  const recommendations = rankRestaurants(candidates, criteria, { mode: "hidden_gem" });
  const cards = recommendations.map((rec) => toCardView(rec));

  const deterministicSummary = buildResultsSummary({ mode: "hidden_gem", cards, locationLabel, assumptions });
  const aiSummary = await explainRecommendationsWithAI(cards);

  return {
    content: [{ type: "text", text: aiSummary ?? deterministicSummary }],
    structuredContent: { mode: "hidden_gem" as const, locationLabel, recommendations: cards, count: cards.length },
  };
}

export function registerFindHiddenGems(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "find_hidden_gems",
    {
      title: "Find hidden gems",
      description:
        "Finds lesser-known, independent restaurants that still meet the search requirements. Weighs obscurity and independence heavily, but never at the cost of rating - a hidden gem is never a poorly rated restaurant.",
      inputSchema: SearchCriteriaInputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        ui: { resourceUri: RESULTS_WIDGET_URI },
        "openai/outputTemplate": RESULTS_WIDGET_URI,
        "openai/toolInvocation/invoking": "Digging up hidden gems…",
        "openai/toolInvocation/invoked": "Found some gems.",
      },
    },
    async (input) => toToolResult(() => performFindHiddenGems(ctx, input)),
  );
}
