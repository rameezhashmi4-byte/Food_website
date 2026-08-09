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
  mode: z.literal("offers_near_me"),
  locationLabel: z.string(),
  recommendations: z.array(RestaurantCardViewSchema),
  count: z.number(),
};

/** Same logic the REST layer (rest/routes.ts) calls - see tools/searchRestaurants.ts's equivalent comment. */
export async function performFindCurrentOffers(ctx: AppContext, input: SearchCriteriaInput): Promise<CallToolResult> {
  const { criteria, locationLabel, assumptions } = await resolveCriteria(ctx.provider, { ...input, wantsOffers: true });
  const candidates = await ctx.provider.searchRestaurants({ criteria });
  const recommendations = rankRestaurants(candidates, criteria, { mode: "offers_near_me" });
  const cards = recommendations.map((rec) => toCardView(rec));

  const deterministicSummary = buildResultsSummary({ mode: "offers_near_me", cards, locationLabel, assumptions });
  const aiSummary = await explainRecommendationsWithAI(cards);

  return {
    content: [{ type: "text", text: aiSummary ?? deterministicSummary }],
    structuredContent: { mode: "offers_near_me" as const, locationLabel, recommendations: cards, count: cards.length },
  };
}

export function registerFindCurrentOffers(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "find_current_offers",
    {
      title: "Find current offers",
      description:
        "Finds restaurants matching the search area with a currently valid offer (flash discounts, happy hours, set menus, lunch/student/group deals). Every offer returned is checked against its validity window at call time - expired offers are automatically excluded - and its verification status is included.",
      inputSchema: SearchCriteriaInputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        ui: { resourceUri: RESULTS_WIDGET_URI },
        "openai/outputTemplate": RESULTS_WIDGET_URI,
        "openai/toolInvocation/invoking": "Checking current offers…",
        "openai/toolInvocation/invoked": "Here's what's on.",
      },
    },
    async (input) => toToolResult(() => performFindCurrentOffers(ctx, input)),
  );
}
