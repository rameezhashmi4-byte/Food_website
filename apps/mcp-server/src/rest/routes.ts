import express, { type Router, type Request, type Response } from "express";
import { createAppContext } from "../context.js";
import { AuthError, extractBearerToken, verifyAccessToken, type VerifiedAuth } from "../auth/index.js";
import { performSearchRestaurants } from "../tools/searchRestaurants.js";
import { performSaveRestaurant } from "../tools/saveRestaurant.js";
import { performRemoveSavedRestaurant } from "../tools/removeSavedRestaurant.js";
import { performListSavedRestaurants } from "../tools/listSavedRestaurants.js";
import { performGetUserPreferences } from "../tools/getUserPreferences.js";
import { performUpdateUserPreferences } from "../tools/updateUserPreferences.js";
import { performCompareRestaurants } from "../tools/compareRestaurants.js";
import { performFindHiddenGems } from "../tools/findHiddenGems.js";
import { performFindCurrentOffers } from "../tools/findCurrentOffers.js";
import { performGetRestaurantDetails } from "../tools/getRestaurantDetails.js";
import { toToolResult } from "../lib/errors.js";
import { PreferencesPatchSchema } from "../repository/types.js";
import type { SearchCriteriaInput } from "../lib/schemas.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * A plain REST + OpenAPI surface over the same tool logic `server.ts`
 * registers as MCP tools (see the `perform*` functions each tool file now
 * exports) - built for ChatGPT's older "Custom GPT Actions" system, which
 * imports an OpenAPI schema rather than speaking MCP directly. Needed
 * because MCP connectors / Developer Mode aren't available on every
 * ChatGPT plan (confirmed live, not assumed, before this was built - see
 * docs/mcp-oauth.md). This is a second transport for identical behavior,
 * not a second implementation: every route below calls the exact same
 * `perform*` function the MCP tool does.
 */

async function resolveRestAuth(req: Request): Promise<VerifiedAuth | undefined> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return undefined;
  try {
    return await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof AuthError) return undefined;
    throw error;
  }
}

const SIGN_IN_REQUIRED = "This needs a connected BiteJoy account - please sign in and try again.";

/** REST is stricter than MCP here on purpose: a private endpoint with no/invalid token is a real 401, not a 200 with an in-band error message - that's what lets a GPT Action's OAuth flow actually trigger. */
async function requireRestAuth(req: Request, res: Response): Promise<VerifiedAuth | undefined> {
  const auth = await resolveRestAuth(req);
  if (!auth) {
    res.status(401).json({ error: SIGN_IN_REQUIRED });
    return undefined;
  }
  return auth;
}

/** Converts a tool's CallToolResult into a plain REST JSON response - 200 with structuredContent + a human-readable `message`, or 400 with `error` when the tool reported isError. */
function sendToolResult(res: Response, result: CallToolResult, okStatus = 200): void {
  const text = result.content.find((c): c is { type: "text"; text: string } => c.type === "text")?.text;
  if (result.isError) {
    res.status(400).json({ error: text ?? "Request failed." });
    return;
  }
  res.status(okStatus).json({ message: text, ...(result.structuredContent ?? {}) });
}

function sendUnexpectedError(res: Response, error: unknown, route: string): void {
  console.error(`[bitejoy] REST ${route} failed:`, error);
  res.status(500).json({ error: "Sorry, something went wrong on BiteJoy's side handling that request. Please try again." });
}

/** Shared by search/compare/hidden-gems/offers - the same SearchCriteriaInput fields, read from query params. */
// `location` is optional here on purpose - a GPS-based "near me" search
// gives lat/lng instead. performSearchRestaurants (via resolveCriteria)
// throws a clean ToolInputError if neither was given, which toToolResult
// turns into the right 400 - no need to duplicate that check here.
function parseCriteriaQuery(q: Request["query"]): SearchCriteriaInput {
  return {
    location: typeof q.location === "string" && q.location.length > 0 ? q.location : undefined,
    lat: q.lat !== undefined ? Number(q.lat) : undefined,
    lng: q.lng !== undefined ? Number(q.lng) : undefined,
    radiusKm: q.radiusKm ? Number(q.radiusKm) : undefined,
    dateTime: typeof q.dateTime === "string" ? q.dateTime : undefined,
    partySize: q.partySize ? Number(q.partySize) : undefined,
    budgetPerPersonGbp: q.budgetPerPersonGbp ? Number(q.budgetPerPersonGbp) : undefined,
    totalBudgetGbp: q.totalBudgetGbp ? Number(q.totalBudgetGbp) : undefined,
    wantsOffers: q.wantsOffers === "true" ? true : undefined,
    prioritiseIndependent: q.prioritiseIndependent === "true" ? true : undefined,
  };
}

export function createRestRouter(): Router {
  const router = express.Router();

  // Public - same as search_restaurants over MCP, no auth required.
  router.get("/restaurants/search", async (req, res) => {
    try {
      const input = parseCriteriaQuery(req.query);
      const ctx = createAppContext();
      // toToolResult here matters, not just style: performSearchRestaurants
      // throws ToolInputError directly (e.g. an unrecognised location) -
      // without this wrapper that exception falls through to the generic
      // catch below and becomes a misleading 500 instead of the intended
      // clean 400 with the actual helpful message. Confirmed live: this
      // was a real bug, not a hypothetical one - see git history.
      const result = await toToolResult(() => performSearchRestaurants(ctx, input));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /restaurants/search");
    }
  });

  router.get("/restaurants/hidden-gems", async (req, res) => {
    try {
      const input = parseCriteriaQuery(req.query);
      const ctx = createAppContext();
      const result = await toToolResult(() => performFindHiddenGems(ctx, input));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /restaurants/hidden-gems");
    }
  });

  router.get("/restaurants/offers", async (req, res) => {
    try {
      const input = parseCriteriaQuery(req.query);
      const ctx = createAppContext();
      const result = await toToolResult(() => performFindCurrentOffers(ctx, input));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /restaurants/offers");
    }
  });

  router.get("/restaurants/compare", async (req, res) => {
    try {
      const q = req.query;
      const idsRaw = typeof q.ids === "string" ? q.ids : "";
      const restaurantIds = idsRaw
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (restaurantIds.length < 2) {
        res.status(400).json({ error: 'Query parameter "ids" must list 2-4 comma-separated restaurant ids, e.g. "r_flame_fork,r_spice_junction".' });
        return;
      }
      const criteriaInput = parseCriteriaQuery(q);
      const ctx = createAppContext();
      const result = await toToolResult(() => performCompareRestaurants(ctx, { restaurantIds, ...criteriaInput }));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /restaurants/compare");
    }
  });

  // Public - full detail record for one restaurant by id.
  router.get("/restaurants/:id", async (req, res) => {
    try {
      const ctx = createAppContext();
      const result = await toToolResult(() => performGetRestaurantDetails(ctx, { restaurantId: req.params.id }));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /restaurants/:id");
    }
  });

  // Private - requires a connected BiteJoy account (Supabase-issued bearer token).
  router.post("/restaurants/:id/save", async (req, res) => {
    try {
      const auth = await requireRestAuth(req, res);
      if (!auth) return;
      const note = typeof req.body?.note === "string" ? req.body.note : undefined;
      const ctx = createAppContext({ auth });
      const result = await toToolResult(() => performSaveRestaurant(ctx, { restaurantId: req.params.id, note }));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "POST /restaurants/:id/save");
    }
  });

  router.delete("/restaurants/:id/save", async (req, res) => {
    try {
      const auth = await requireRestAuth(req, res);
      if (!auth) return;
      const ctx = createAppContext({ auth });
      const result = await toToolResult(() => performRemoveSavedRestaurant(ctx, { restaurantId: req.params.id }));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "DELETE /restaurants/:id/save");
    }
  });

  router.get("/account/saved", async (req, res) => {
    try {
      const auth = await requireRestAuth(req, res);
      if (!auth) return;
      const q = req.query;
      const ctx = createAppContext({ auth });
      const result = await toToolResult(() =>
        performListSavedRestaurants(ctx, {
          limit: q.limit ? Number(q.limit) : undefined,
          cursor: typeof q.cursor === "string" ? q.cursor : undefined,
        }),
      );
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /account/saved");
    }
  });

  router.get("/account/preferences", async (req, res) => {
    try {
      const auth = await requireRestAuth(req, res);
      if (!auth) return;
      const ctx = createAppContext({ auth });
      const result = await toToolResult(() => performGetUserPreferences(ctx));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /account/preferences");
    }
  });

  router.patch("/account/preferences", async (req, res) => {
    try {
      const auth = await requireRestAuth(req, res);
      if (!auth) return;
      // .strict() schema, same as the MCP tool - an unrecognised field is a
      // clean 400 instead of being silently ignored (typo-safety, not just
      // strictness for its own sake).
      const parsed = PreferencesPatchSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: `Invalid preferences update: ${parsed.error.issues[0]?.message ?? "invalid input"}.` });
        return;
      }
      const ctx = createAppContext({ auth });
      const result = await toToolResult(() => performUpdateUserPreferences(ctx, parsed.data));
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "PATCH /account/preferences");
    }
  });

  return router;
}
