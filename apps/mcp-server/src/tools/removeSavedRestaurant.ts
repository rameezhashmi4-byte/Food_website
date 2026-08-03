import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context.js";
import { requireAuthedContext } from "../lib/authGuard.js";
import { toToolResult } from "../lib/errors.js";

const InputShape = {
  restaurantId: z.string().min(1).describe("The restaurant's id to remove from the signed-in user's saved list."),
};

const OutputShape = { removed: z.boolean() };

export function registerRemoveSavedRestaurant(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "remove_saved_restaurant",
    {
      title: "Remove saved restaurant",
      description:
        "Removes a restaurant from the signed-in BiteJoy user's saved list. Safe to call again for a restaurant that's already removed (or was never saved) - it just confirms rather than erroring. Requires a connected BiteJoy account.",
      inputSchema: InputShape,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      _meta: {
        "openai/toolInvocation/invoking": "Removing that…",
        "openai/toolInvocation/invoked": "Removed.",
      },
    },
    async ({ restaurantId }) =>
      toToolResult(async () => {
        const { userId, repository } = requireAuthedContext(ctx);

        await repository.removeSavedRestaurant(userId, restaurantId);
        await repository.recordActivity(userId, "restaurant_removed", { restaurantId });

        return {
          content: [{ type: "text", text: "Removed from your saved list." }],
          structuredContent: { removed: true },
        };
      }),
  );
}
