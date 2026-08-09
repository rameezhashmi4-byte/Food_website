/**
 * OpenAPI 3.1 schema for the REST layer in ./routes.ts, shaped for import
 * into a ChatGPT Custom GPT Action. `baseUrl` should be this server's real
 * public origin (the same value MCP_PUBLIC_URL's origin resolves to).
 *
 * OAuth details (authorizationUrl/tokenUrl) point at Supabase's own OAuth
 * Authorization Server endpoints - confirmed live and PKCE(S256)-capable
 * (see docs/mcp-oauth.md), but Supabase has no Dynamic Client Registration,
 * so a client id/secret must be created manually in the Supabase dashboard
 * (Authentication -> the project's OAuth Apps/clients section) before this
 * can actually be wired into a GPT Action - see docs/chatgpt-app.md's
 * "Custom GPT Action (fallback)" section for the exact steps. The scope
 * name below ("email") is the best-documented default, not empirically
 * confirmed against this specific Supabase OAuth Server feature - worth
 * checking against whatever the dashboard's client-creation screen says
 * when that step actually happens.
 */
export function buildOpenApiSchema(baseUrl: string, supabaseUrl: string | undefined) {
  const authBase = supabaseUrl ? supabaseUrl.replace(/\/+$/, "") : "https://YOUR-PROJECT.supabase.co";

  return {
    openapi: "3.1.0",
    info: {
      title: "BiteJoy",
      description:
        "Find restaurant recommendations and manage a signed-in user's saved list. Search is public; saving, removing and listing saved restaurants require a connected BiteJoy account.",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/restaurants/search": {
        get: {
          operationId: "searchRestaurants",
          summary: "Find restaurant recommendations for a location, time and set of preferences",
          security: [],
          parameters: [
            { name: "location", in: "query", required: true, schema: { type: "string" }, description: 'Area, postcode or place name, e.g. "Croydon".' },
            { name: "dateTime", in: "query", required: false, schema: { type: "string" }, description: 'ISO datetime, or a natural phrase like "tonight", "Friday 7pm".' },
            { name: "partySize", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
            { name: "budgetPerPersonGbp", in: "query", required: false, schema: { type: "number" } },
            { name: "totalBudgetGbp", in: "query", required: false, schema: { type: "number" } },
            { name: "radiusKm", in: "query", required: false, schema: { type: "number" } },
            { name: "wantsOffers", in: "query", required: false, schema: { type: "boolean" } },
            { name: "prioritiseIndependent", in: "query", required: false, schema: { type: "boolean" } },
          ],
          responses: {
            "200": {
              description: "Recommendations found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      locationLabel: { type: "string" },
                      count: { type: "integer" },
                      recommendations: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
            "400": { description: "Invalid or unrecognised input", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
          },
        },
      },
      "/restaurants/{id}/save": {
        post: {
          operationId: "saveRestaurant",
          summary: "Save a restaurant to the signed-in user's list",
          security: [{ bitejoyOAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: 'Restaurant id, as returned by searchRestaurants (e.g. "r_flame_fork").' }],
          requestBody: {
            required: false,
            content: { "application/json": { schema: { type: "object", properties: { note: { type: "string", description: "Optional personal note." } } } } },
          },
          responses: {
            "200": { description: "Saved", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, saved: { type: "object" } } } } } },
            "401": { description: "No connected BiteJoy account" },
            "400": { description: "Unknown restaurant id" },
          },
        },
        delete: {
          operationId: "removeSavedRestaurant",
          summary: "Remove a restaurant from the signed-in user's saved list",
          security: [{ bitejoyOAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Removed", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, removed: { type: "boolean" } } } } } },
            "401": { description: "No connected BiteJoy account" },
          },
        },
      },
      "/account/saved": {
        get: {
          operationId: "getSavedRestaurants",
          summary: "List the signed-in user's saved restaurants",
          security: [{ bitejoyOAuth: [] }],
          parameters: [
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50 } },
            { name: "cursor", in: "query", required: false, schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Saved restaurants",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      items: { type: "array", items: { type: "object" } },
                      count: { type: "integer" },
                      nextCursor: { type: "string" },
                    },
                  },
                },
              },
            },
            "401": { description: "No connected BiteJoy account" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bitejoyOAuth: {
          type: "oauth2",
          flows: {
            authorizationCode: {
              authorizationUrl: `${authBase}/auth/v1/oauth/authorize`,
              tokenUrl: `${authBase}/auth/v1/oauth/token`,
              scopes: { email: "Read access to your BiteJoy account" },
            },
          },
        },
      },
    },
  };
}
