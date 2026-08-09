import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { pickSurprise } from "@bitejoy/core";
import type { AppContext } from "../context.js";
import { SearchCriteriaInputShape } from "../lib/schemas.js";
import { resolveCriteria } from "../lib/resolveCriteria.js";
import { RestaurantCardViewSchema, toCardView } from "../lib/cardView.js";
import { buildSurpriseSummary } from "../lib/personality.js";
import { toToolResult, ToolInputError } from "../lib/errors.js";
import { RESULTS_WIDGET_URI } from "../resources/constants.js";

const OutputShape = {
  mode: z.literal("surprise_me"),
  locationLabel: z.string(),
  recommendation: RestaurantCardViewSchema,
};

export function registerSurpriseMe(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "surprise_me",
    {
      title: "Surprise me",
      description:
        "Returns exactly one exciting, strongly-matching restaurant recommendation, with a discovery boost toward independent/less obvious choices. Still respects dietary needs, budget and travel radius - a surprise is never an unsuitable one.",
      inputSchema: SearchCriteriaInputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        ui: { resourceUri: RESULTS_WIDGET_URI },
        "openai/outputTemplate": RESULTS_WIDGET_URI,
        "openai/toolInvocation/invoking": "Picking something exciting…",
        "openai/toolInvocation/invoked": "Here's your surprise.",
      },
    },
    async (input) =>
      toToolResult(async () => {
        const { criteria, locationLabel } = await resolveCriteria(ctx.provider, input);
        const candidates = await ctx.provider.searchRestaurants({ criteria });
        const pick = pickSurprise(candidates, criteria);

        if (!pick) {
          throw new ToolInputError(
            `I couldn't find a suitable surprise near ${locationLabel} with those requirements - want to loosen the budget or radius a little?`,
          );
        }

        const card = toCardView(pick);
        return {
          content: [{ type: "text", text: buildSurpriseSummary(card, locationLabel) }],
          structuredContent: { mode: "surprise_me" as const, locationLabel, recommendation: card },
        };
      }),
  );
}
