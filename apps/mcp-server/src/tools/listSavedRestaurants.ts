import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context.js";
import { requireAuthedContext } from "../lib/authGuard.js";
import { toToolResult } from "../lib/errors.js";
import { RestaurantDetailViewSchema, toDetailView } from "../lib/detailView.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const InputShape = {
  limit: z.number().int().positive().max(MAX_LIMIT).optional().describe(`Max saved restaurants to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`),
  cursor: z.string().optional().describe("Pagination cursor from a previous call's nextCursor, to fetch the next page."),
};

const SavedRestaurantEntrySchema = z.object({
  restaurantId: z.string(),
  note: z.string().optional(),
  savedAt: z.string().datetime(),
  restaurant: RestaurantDetailViewSchema,
});

const OutputShape = {
  items: z.array(SavedRestaurantEntrySchema),
  count: z.number(),
  nextCursor: z.string().optional(),
};

export function registerListSavedRestaurants(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "list_saved_restaurants",
    {
      title: "List saved restaurants",
      description:
        "Returns the signed-in BiteJoy user's saved restaurants, newest first, each with its full structured detail record (no distance/match score - those only make sense relative to a specific search, and there's no search origin for a saved list). Paginated via limit/cursor. Requires a connected BiteJoy account.",
      inputSchema: InputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: {
        "openai/toolInvocation/invoking": "Pulling up your saved restaurants…",
        "openai/toolInvocation/invoked": "Here's your list.",
      },
    },
    async ({ limit, cursor }) =>
      toToolResult(async () => {
        const { userId, repository } = requireAuthedContext(ctx);
        const page = await repository.listSavedRestaurants(userId, { limit: limit ?? DEFAULT_LIMIT, cursor });

        // A saved restaurant can, in principle, have since been removed
        // from the catalog - skip it rather than erroring the whole list,
        // same "never invent data" spirit as the rest of the tools.
        const items = (
          await Promise.all(
            page.items.map(async (saved) => {
              const restaurant = await ctx.provider.getRestaurantById(saved.restaurantId);
              if (!restaurant) return undefined;
              return {
                restaurantId: saved.restaurantId,
                note: saved.note,
                savedAt: saved.createdAt,
                restaurant: toDetailView(restaurant),
              };
            }),
          )
        ).filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

        const summary =
          items.length === 0
            ? "You haven't saved any restaurants yet."
            : `You have ${items.length} saved restaurant${items.length === 1 ? "" : "s"} on this page: ${items.map((i) => i.restaurant.name).join(", ")}.`;

        return {
          content: [{ type: "text", text: summary }],
          structuredContent: { items, count: items.length, nextCursor: page.nextCursor },
        };
      }),
  );
}
