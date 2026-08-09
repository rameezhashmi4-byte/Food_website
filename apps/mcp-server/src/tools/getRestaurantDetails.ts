import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AppContext } from "../context.js";
import { RestaurantDetailViewSchema, toDetailView } from "../lib/detailView.js";
import { buildDetailSummary } from "../lib/personality.js";
import { toToolResult, ToolInputError } from "../lib/errors.js";

const InputShape = {
  restaurantId: z.string().min(1).describe("The restaurant's id, as returned by search_restaurants or similar (e.g. \"r_flame_fork\")."),
};

const OutputShape = {
  restaurant: RestaurantDetailViewSchema,
};

/** Same logic the REST layer (rest/routes.ts) calls - see tools/searchRestaurants.ts's equivalent comment. */
export async function performGetRestaurantDetails(ctx: AppContext, input: { restaurantId: string }): Promise<CallToolResult> {
  const restaurant = await ctx.provider.getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new ToolInputError(`I couldn't find a restaurant with id "${input.restaurantId}". Try searching first to get a valid id.`);
  }

  const detail = toDetailView(restaurant);
  return {
    content: [{ type: "text", text: buildDetailSummary(detail) }],
    structuredContent: { restaurant: detail },
  };
}

export function registerGetRestaurantDetails(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "get_restaurant_details",
    {
      title: "Get restaurant details",
      description:
        "Returns the complete structured record for one restaurant by id: opening hours, food and drink prices, offers, popular dishes, dietary information, facilities, atmosphere, ratings, and its data source and last-checked date.",
      inputSchema: InputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: {
        "openai/toolInvocation/invoking": "Pulling up the details…",
        "openai/toolInvocation/invoked": "Here you go.",
      },
    },
    async (input) => toToolResult(() => performGetRestaurantDetails(ctx, input)),
  );
}
