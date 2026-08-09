import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AppContext } from "../context.js";
import { UserPreferencesSchema, type UserPreferences } from "../repository/types.js";
import { requireAuthedContext } from "../lib/authGuard.js";
import { toToolResult } from "../lib/errors.js";

const OutputShape = {
  preferences: UserPreferencesSchema,
  isDefault: z.boolean().describe("True if nothing has been saved yet and these are empty defaults, not a real saved record."),
};

/** Same logic the REST layer (rest/routes.ts) calls - see tools/searchRestaurants.ts's equivalent comment. */
export async function performGetUserPreferences(ctx: AppContext): Promise<CallToolResult> {
  const { userId, repository } = requireAuthedContext(ctx);
  const saved = await repository.getPreferences(userId);
  const preferences = saved ?? emptyPreferences(userId);

  return {
    content: [
      {
        type: "text",
        text: saved ? "Here are your saved preferences." : "You haven't saved any preferences yet - here are the defaults.",
      },
    ],
    structuredContent: { preferences, isDefault: !saved },
  };
}

export function registerGetUserPreferences(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "get_user_preferences",
    {
      title: "Get user preferences",
      description:
        "Returns the signed-in BiteJoy user's saved food preferences: budget, search radius, favourite/disliked cuisines, food and drink preferences, dietary needs, preferred atmosphere, favourite occasions, parking and accessibility needs. Requires a connected BiteJoy account. If nothing has been saved yet, returns sensible empty defaults rather than an error.",
      inputSchema: {},
      outputSchema: OutputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: {
        "openai/toolInvocation/invoking": "Checking your saved preferences…",
        "openai/toolInvocation/invoked": "Got your preferences.",
      },
    },
    async () => toToolResult(() => performGetUserPreferences(ctx)),
  );
}

function emptyPreferences(userId: string): UserPreferences {
  return {
    userId,
    favoriteCuisines: [],
    dislikedCuisines: [],
    foodPreferences: [],
    drinkPreferences: [],
    dietaryNeeds: [],
    preferredAtmosphere: [],
    favoriteOccasions: [],
    accessibilityNeeds: [],
    updatedAt: new Date().toISOString(),
  };
}
