import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AppContext } from "../context.js";
import { requireAuthedContext } from "../lib/authGuard.js";
import { toToolResult, ToolInputError } from "../lib/errors.js";
import { SavedRestaurantViewSchema, toSavedRestaurantView } from "../lib/savedRestaurantView.js";

const InputShape = {
  restaurantId: z.string().min(1).describe('The restaurant\'s id, as returned by search_restaurants or similar (e.g. "r_flame_fork").'),
  note: z.string().max(500).optional().describe("An optional personal note for why this was saved."),
};

const OutputShape = { saved: SavedRestaurantViewSchema };

/** Same logic the REST layer (rest/routes.ts) calls - see searchRestaurants.ts's equivalent comment. */
export async function performSaveRestaurant(
  ctx: AppContext,
  input: { restaurantId: string; note?: string },
): Promise<CallToolResult> {
  const { userId, repository } = requireAuthedContext(ctx);

  const restaurant = await ctx.provider.getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new ToolInputError(`I couldn't find a restaurant with id "${input.restaurantId}" - try searching first to get a valid id.`);
  }

  const record = await repository.saveRestaurant(userId, input.restaurantId, input.note);
  await repository.recordActivity(userId, "restaurant_saved", { restaurantId: input.restaurantId });

  return {
    content: [{ type: "text", text: `Saved ${restaurant.name} to your list.` }],
    structuredContent: { saved: toSavedRestaurantView(record) },
  };
}

export function registerSaveRestaurant(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "save_restaurant",
    {
      title: "Save restaurant",
      description:
        "Saves a restaurant to the signed-in BiteJoy user's list for later, with an optional note. Safe to call again for an already-saved restaurant - it just confirms the save rather than erroring. Requires a connected BiteJoy account.",
      inputSchema: InputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: {
        "openai/toolInvocation/invoking": "Saving that for you…",
        "openai/toolInvocation/invoked": "Saved.",
      },
    },
    async (input) => toToolResult(() => performSaveRestaurant(ctx, input)),
  );
}
