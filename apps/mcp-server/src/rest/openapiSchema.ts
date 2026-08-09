/**
 * OpenAPI 3.1 schema for the REST layer in ./routes.ts, shaped for import
 * into a ChatGPT Custom GPT Action. `baseUrl` should be this server's real
 * public origin (the same value MCP_PUBLIC_URL's origin resolves to).
 *
 * OAuth details (authorizationUrl/tokenUrl) point at THIS server's own
 * `/oauth/authorize` and `/oauth/token` - a thin reverse proxy
 * (./oauthProxy.ts) in front of Supabase's real OAuth Authorization
 * Server, not Supabase's URLs directly. Confirmed live: the GPT Builder
 * rejects an Action whose Authorization URL/Token URL don't share a root
 * domain with the API's own hostname ("Authorization URL, Token URL, and
 * API hostname must share a root domain"), and Supabase's OAuth server
 * (`*.supabase.co`) will never share a domain with wherever this API is
 * hosted - hence the proxy. A client id/secret still has to be created
 * manually in the Supabase dashboard (no Dynamic Client Registration) -
 * see docs/chatgpt-app.md's "Custom GPT Action" section for the exact
 * steps. The scope name below ("email") is the best-documented default,
 * not empirically confirmed against this specific Supabase OAuth Server
 * feature - worth checking against whatever the dashboard's
 * client-creation screen actually calls it.
 */
/** Shared by searchRestaurants/findHiddenGems/findCurrentOffers/compareRestaurants - same underlying SearchCriteriaInput fields. */
const CRITERIA_PARAMETERS = [
  { name: "location", in: "query", required: true, schema: { type: "string" }, description: 'Area, postcode or place name, e.g. "Croydon".' },
  { name: "dateTime", in: "query", required: false, schema: { type: "string" }, description: 'ISO datetime, or a natural phrase like "tonight", "Friday 7pm".' },
  { name: "partySize", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
  { name: "budgetPerPersonGbp", in: "query", required: false, schema: { type: "number" } },
  { name: "totalBudgetGbp", in: "query", required: false, schema: { type: "number" } },
  { name: "radiusKm", in: "query", required: false, schema: { type: "number" } },
  { name: "wantsOffers", in: "query", required: false, schema: { type: "boolean" } },
  { name: "prioritiseIndependent", in: "query", required: false, schema: { type: "boolean" } },
] as const;

export function buildOpenApiSchema(baseUrl: string, _supabaseUrl: string | undefined) {
  return {
    openapi: "3.1.0",
    info: {
      title: "BiteJoy",
      description: `Find restaurant recommendations and manage a signed-in user's saved list. Search is public; saving, removing and listing saved restaurants require a connected BiteJoy account.

GROUNDING RULES - apply to every operation below, not just searchRestaurants:
1. Restaurant facts (name, address, opening status, closing time, price, distance, cuisine, offers, rating, availability) MUST come only from a successful response from these operations. Never invent, infer, recall, or supplement a restaurant or a fact about one from your own training knowledge.
2. Before mentioning any restaurant, confirm its id/name is actually present in the current successful response for THIS search. If it isn't there, don't mention it.
3. If a call to any of these operations errors, times out, or returns a non-2xx status, tell the user the restaurant search/action failed and ask them to try again. Do not fall back to recommending restaurants from your own knowledge, and do not imply the call succeeded.
4. If searchRestaurants returns zero results, say plainly that nothing matched - don't substitute alternatives you know about from elsewhere.
5. Never state a restaurant is "open now", has a particular closing time, or has an available offer unless that exact response explicitly says so - don't infer it from a place's general reputation or typical hours.`,
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/restaurants/search": {
        get: {
          operationId: "searchRestaurants",
          summary: "Find restaurant recommendations for a location, time and set of preferences",
          description:
            "Returns the ONLY restaurants you may recommend for this request - a curated, already-scored list, not a generic listing. Every fact in the response (price, rating, opening status, offers, distance) is verified as of the response's own data-freshness fields. Do not add, substitute, or supplement with restaurants from your own knowledge, even ones you're confident are real and nearby - if it's not in this response, don't mention it. On any error or empty result, see this schema's top-level description for exactly what to tell the user.",
          security: [],
          parameters: CRITERIA_PARAMETERS,
          responses: {
            "200": {
              description:
                "Recommendations found. `recommendations` (possibly empty) is the complete, exhaustive set of restaurants you may mention for this search - if it's empty, tell the user no matches were found rather than suggesting anything else.",
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
            "400": {
              description:
                "The search failed (e.g. an unrecognised location). Tell the user the search couldn't run and ask them to rephrase or try again - do not recommend any restaurant in this response.",
              content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } },
            },
            "5XX": {
              description:
                "The search failed on the server side. Tell the user the restaurant search is temporarily unavailable and ask them to retry shortly - do not recommend any restaurant from your own knowledge as a substitute.",
            },
          },
        },
      },
      "/restaurants/hidden-gems": {
        get: {
          operationId: "findHiddenGems",
          summary: "Find lesser-known, independent restaurants matching the same search criteria as searchRestaurants",
          description:
            "Same grounding rules as searchRestaurants apply: the response is the complete set of restaurants you may mention. Weighs independence/obscurity but never recommends a poorly-rated place just because it's obscure.",
          security: [],
          parameters: CRITERIA_PARAMETERS,
          responses: {
            "200": {
              description: "Hidden gems found - the complete set you may mention.",
              content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, locationLabel: { type: "string" }, count: { type: "integer" }, recommendations: { type: "array", items: { type: "object" } } } } } },
            },
            "400": { description: "The search failed. Tell the user and ask them to retry - do not suggest a fallback from your own knowledge.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
            "5XX": { description: "Failed server-side. Tell the user and ask them to retry - do not suggest a fallback from your own knowledge." },
          },
        },
      },
      "/restaurants/offers": {
        get: {
          operationId: "findCurrentOffers",
          summary: "Find restaurants with a currently valid offer, matching the same search criteria as searchRestaurants",
          description:
            "Every offer in the response has already been checked against its validity window - expired offers are excluded automatically. Never state an offer exists, or describe its terms, unless it's present in this response.",
          security: [],
          parameters: CRITERIA_PARAMETERS,
          responses: {
            "200": {
              description: "Restaurants with a current offer - the complete set you may mention.",
              content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, locationLabel: { type: "string" }, count: { type: "integer" }, recommendations: { type: "array", items: { type: "object" } } } } } },
            },
            "400": { description: "The search failed. Tell the user and ask them to retry - do not suggest a fallback from your own knowledge.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
            "5XX": { description: "Failed server-side. Tell the user and ask them to retry - do not suggest a fallback from your own knowledge." },
          },
        },
      },
      "/restaurants/compare": {
        get: {
          operationId: "compareRestaurants",
          summary: "Compare 2-4 specific restaurants side by side, using the same search criteria used to find them",
          description:
            "Every fact in the comparison (score, price, distance, atmosphere, offers, dietary suitability, and which one wins each category) comes only from this response - never state a comparison winner or trade-off that isn't explicitly returned here.",
          security: [],
          parameters: [
            { name: "ids", in: "query", required: true, schema: { type: "string" }, description: 'Comma-separated list of 2-4 restaurant ids from a prior searchRestaurants/findHiddenGems/findCurrentOffers response, e.g. "r_flame_fork,r_spice_junction".' },
            ...CRITERIA_PARAMETERS,
          ],
          responses: {
            "200": {
              description: "The comparison - the only facts and category winners you may state.",
              content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, locationLabel: { type: "string" }, items: { type: "array", items: { type: "object" } }, bestOverallMatch: { type: "string" }, bestValue: { type: "string" }, bestAtmosphere: { type: "string" }, bestForGroup: { type: "string" } } } } },
            },
            "400": { description: "The comparison failed (e.g. an unknown restaurant id). Tell the user and ask them to retry - do not compare from your own knowledge.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
            "5XX": { description: "Failed server-side. Tell the user and ask them to retry - do not compare from your own knowledge." },
          },
        },
      },
      "/restaurants/{id}": {
        get: {
          operationId: "getRestaurantDetails",
          summary: "Get the complete detail record for one specific restaurant by id",
          description:
            "Full detail (opening hours, menu prices, offers, popular dishes, dietary info, facilities, rating, and each fact's own data-freshness/source) for one restaurant already found via searchRestaurants or similar. Every field must come from this response - never supplement with assumed details.",
          security: [],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: 'Restaurant id, as returned by searchRestaurants (e.g. "r_flame_fork").' }],
          responses: {
            "200": { description: "The restaurant's complete, verified detail record.", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, restaurant: { type: "object" } } } } } },
            "400": { description: "Unknown restaurant id. Tell the user rather than describing a restaurant from your own knowledge.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
            "5XX": { description: "Failed server-side. Tell the user and ask them to retry - do not describe the restaurant from your own knowledge." },
          },
        },
      },
      "/restaurants/{id}/save": {
        post: {
          operationId: "saveRestaurant",
          summary: "Save a restaurant to the signed-in user's list",
          description:
            "The id MUST be one that came from a searchRestaurants response earlier in this conversation - never a restaurant id/name you're inferring or recalling from your own knowledge. Only report success if this call itself returns 200.",
          security: [{ bitejoyOAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: 'Restaurant id, as returned by searchRestaurants (e.g. "r_flame_fork").' }],
          requestBody: {
            required: false,
            content: { "application/json": { schema: { type: "object", properties: { note: { type: "string", description: "Optional personal note." } } } } },
          },
          responses: {
            "200": { description: "Saved", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, saved: { type: "object" } } } } } },
            "401": { description: "No connected BiteJoy account - ask the user to sign in; do not claim it was saved." },
            "400": { description: "Unknown restaurant id - tell the user the save failed rather than claiming success." },
            "5XX": { description: "The save failed on the server side. Tell the user it didn't save and to try again - do not claim success." },
          },
        },
        delete: {
          operationId: "removeSavedRestaurant",
          summary: "Remove a restaurant from the signed-in user's saved list",
          security: [{ bitejoyOAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Removed", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, removed: { type: "boolean" } } } } } },
            "401": { description: "No connected BiteJoy account - ask the user to sign in; do not claim it was removed." },
            "5XX": { description: "The removal failed on the server side. Tell the user it didn't work and to try again - do not claim success." },
          },
        },
      },
      "/account/saved": {
        get: {
          operationId: "getSavedRestaurants",
          summary: "List the signed-in user's saved restaurants",
          description:
            "Returns the user's real, current saved list - the complete set you may describe as \"saved\". Never supplement it with a restaurant you merely recall discussing earlier in the conversation; if it isn't in this response, it isn't currently saved.",
          security: [{ bitejoyOAuth: [] }],
          parameters: [
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50 } },
            { name: "cursor", in: "query", required: false, schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description:
                "The complete, exhaustive list of saved restaurants for this page - if `items` is empty, tell the user they have nothing saved rather than guessing.",
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
            "401": { description: "No connected BiteJoy account - ask the user to sign in; do not guess at what might be saved." },
            "5XX": { description: "The list failed to load on the server side. Tell the user and ask them to retry - do not guess at what might be saved." },
          },
        },
      },
      "/account/preferences": {
        get: {
          operationId: "getUserPreferences",
          summary: "Get the signed-in user's saved food preferences (budget, cuisines, dietary needs, atmosphere, etc.)",
          description:
            "Use this at the start of a planning conversation to personalize suggestions without asking the user to repeat themselves every time. If isDefault is true, nothing has been saved yet - don't state a preference as if it were saved.",
          security: [{ bitejoyOAuth: [] }],
          responses: {
            "200": {
              description: "The user's real saved preferences (or empty defaults if isDefault is true).",
              content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, preferences: { type: "object" }, isDefault: { type: "boolean" } } } } },
            },
            "401": { description: "No connected BiteJoy account - ask the user to sign in." },
            "5XX": { description: "Failed server-side. Tell the user and ask them to retry." },
          },
        },
        patch: {
          operationId: "updateUserPreferences",
          summary: "Update one or more of the signed-in user's saved food preferences",
          description:
            "Only send fields the user actually expressed a preference about - anything omitted is left exactly as it was. Useful mid-conversation: if someone mentions they're vegetarian or has a usual budget, save it here so future searches/comparisons can reflect it. Only report success if this call itself returns 200.",
          security: [{ bitejoyOAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Any subset of fields to change - e.g. { \"dietaryNeeds\": [\"vegetarian\"], \"budgetPerPersonGbp\": 25 }.",
                  properties: {
                    budgetPerPersonGbp: { type: "number" },
                    searchRadiusKm: { type: "number" },
                    favoriteCuisines: { type: "array", items: { type: "string" } },
                    dislikedCuisines: { type: "array", items: { type: "string" } },
                    dietaryNeeds: { type: "array", items: { type: "string" } },
                    preferredAtmosphere: { type: "array", items: { type: "string" } },
                    favoriteOccasions: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Preferences updated - reflects the full, current saved record.", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, preferences: { type: "object" } } } } } },
            "400": { description: "Invalid update (e.g. an unrecognised field/value). Tell the user it didn't save rather than claiming success.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
            "401": { description: "No connected BiteJoy account - ask the user to sign in; do not claim it was saved." },
            "5XX": { description: "Failed server-side. Tell the user it didn't save and to try again - do not claim success." },
          },
        },
      },
    },
    components: {
      // ChatGPT's GPT Builder validator expects `components.schemas` to
      // exist as an object even when nothing uses named/reusable schemas
      // (every schema here is defined inline instead) - confirmed live: a
      // real "In components section, schemas subsection is not an object"
      // rejection from the actual import UI when this key was missing.
      schemas: {},
      securitySchemes: {
        bitejoyOAuth: {
          type: "oauth2",
          flows: {
            authorizationCode: {
              // Same root domain as `servers[0].url` above, on purpose -
              // see this file's header comment. These paths are a proxy
              // (rest/oauthProxy.ts) in front of Supabase's real OAuth
              // server, not Supabase's URLs directly.
              authorizationUrl: `${baseUrl}/oauth/authorize`,
              tokenUrl: `${baseUrl}/oauth/token`,
              scopes: { email: "Read access to your BiteJoy account" },
            },
          },
        },
      },
    },
  };
}
