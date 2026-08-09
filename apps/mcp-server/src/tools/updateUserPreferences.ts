import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AppContext } from "../context.js";
import { PreferencesPatchSchema, UserPreferencesSchema, type PreferencesPatch } from "../repository/types.js";
import { requireAuthedContext } from "../lib/authGuard.js";
import { toToolResult } from "../lib/errors.js";

const OutputShape = { preferences: UserPreferencesSchema };

/** Same logic the REST layer (rest/routes.ts) calls - see tools/searchRestaurants.ts's equivalent comment. */
export async function performUpdateUserPreferences(ctx: AppContext, patch: PreferencesPatch): Promise<CallToolResult> {
  const { userId, repository } = requireAuthedContext(ctx);
  const preferences = await repository.updatePreferences(userId, patch);
  await repository.recordActivity(userId, "preferences_updated");

  return {
    content: [{ type: "text", text: "Your preferences are updated." }],
    structuredContent: { preferences },
  };
}

export function registerUpdateUserPreferences(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    "update_user_preferences",
    {
      title: "Update user preferences",
      description:
        "Updates one or more of the signed-in BiteJoy user's saved food preferences - favorite cuisines, dietary needs, budget per person (GBP), preferred atmosphere, favorite drinks, home location. Only the fields you provide are changed; anything omitted is left exactly as it was. Requires a connected BiteJoy account. Rejects unrecognised fields rather than silently ignoring typos.",
      // A full (already `.strict()`) Zod object, not a raw shape - passing
      // the schema itself through to the SDK preserves its strict-unknown-
      // keys behaviour, so an unrecognised field fails validation up front
      // as a clean tool error instead of the SDK's default "silently strip
      // unknown keys" behaviour for plain shapes.
      inputSchema: PreferencesPatchSchema,
      outputSchema: OutputShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: {
        "openai/toolInvocation/invoking": "Saving your preferences…",
        "openai/toolInvocation/invoked": "Preferences updated.",
      },
    },
    async (patch) => toToolResult(() => performUpdateUserPreferences(ctx, patch)),
  );
}
