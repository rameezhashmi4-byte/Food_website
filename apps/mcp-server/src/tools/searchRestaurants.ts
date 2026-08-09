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
  mode: z.literal("search"),
  locationLabel: z.string(),
  recommendations: z.array(RestaurantCardViewSchema),
  count: z.number(),
};

/**
 * The tool's real logic, factored out so the REST/OpenAPI layer
 * (rest/routes.ts - built for ChatGPT Custom GPT Actions, since Developer
 * Mode / MCP connectors aren't available on every ChatGPT plan) calls the
 * exact same code the MCP tool does, rather than a second implementation
 * that could drift from this one.
 */
export async function performSearchRestaurants(ctx: AppContext, input: SearchCriteriaInput): Promise<CallToolResult> {
  const { criteria, locationLabel, assumptions } = await resolveCriteria(ctx.provider, input);
  const candidates = await ctx.provider.searchRestaurants({ criteria });
  const recommendations = rankRestaurants(candidates, criteria, { mode: "search" });
  const cards = recommendations.map((rec) => toCardView(rec));

  const deterministicSummary = buildResultsSummary({ mode: "search", cards, locationLabel, assumptions });
  const aiSummary = await explainRecommendationsWithAI(cards);

  return {
    content: [{ type: "text", text: aiSummary ?? deterministicSummary }],
    structuredContent: { mode: "search" as const, locationLabel, recommendations: cards, count: cards.length },
  };
}

export function registerSearchRestaurants(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "search_restaurants",
    {
      title: "Search restaurants",
      description:
        "Finds 3-5 strong restaurant recommendations for structured search criteria (location, budget, cuisine, dietary needs, occasion, atmosphere, facilities). Applies hard filters (opening hours, dietary needs, required facilities, budget) then a weighted ranking - never invents a restaurant, price, offer or rating.",
      inputSchema: SearchCriteriaInputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        ui: { resourceUri: RESULTS_WIDGET_URI },
        "openai/outputTemplate": RESULTS_WIDGET_URI,
        "openai/toolInvocation/invoking": "Searching BiteJoy's spots…",
        "openai/toolInvocation/invoked": "Found some places.",
      },
    },
    async (input) => toToolResult(() => performSearchRestaurants(ctx, input)),
  );
}
