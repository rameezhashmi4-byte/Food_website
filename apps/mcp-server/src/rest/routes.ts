import express, { type Router, type Request, type Response } from "express";
import { createAppContext } from "../context.js";
import { AuthError, extractBearerToken, verifyAccessToken, type VerifiedAuth } from "../auth/index.js";
import { performSearchRestaurants } from "../tools/searchRestaurants.js";
import { performSaveRestaurant } from "../tools/saveRestaurant.js";
import { performRemoveSavedRestaurant } from "../tools/removeSavedRestaurant.js";
import { performListSavedRestaurants } from "../tools/listSavedRestaurants.js";
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

export function createRestRouter(): Router {
  const router = express.Router();

  // Public - same as search_restaurants over MCP, no auth required.
  router.get("/restaurants/search", async (req, res) => {
    try {
      const q = req.query;
      const input = {
        location: typeof q.location === "string" ? q.location : "",
        radiusKm: q.radiusKm ? Number(q.radiusKm) : undefined,
        dateTime: typeof q.dateTime === "string" ? q.dateTime : undefined,
        partySize: q.partySize ? Number(q.partySize) : undefined,
        budgetPerPersonGbp: q.budgetPerPersonGbp ? Number(q.budgetPerPersonGbp) : undefined,
        totalBudgetGbp: q.totalBudgetGbp ? Number(q.totalBudgetGbp) : undefined,
        wantsOffers: q.wantsOffers === "true" ? true : undefined,
        prioritiseIndependent: q.prioritiseIndependent === "true" ? true : undefined,
      };
      if (!input.location) {
        res.status(400).json({ error: 'Query parameter "location" is required, e.g. "Croydon".' });
        return;
      }
      const ctx = createAppContext();
      const result = await performSearchRestaurants(ctx, input);
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /restaurants/search");
    }
  });

  // Private - requires a connected BiteJoy account (Supabase-issued bearer token).
  router.post("/restaurants/:id/save", async (req, res) => {
    try {
      const auth = await requireRestAuth(req, res);
      if (!auth) return;
      const note = typeof req.body?.note === "string" ? req.body.note : undefined;
      const ctx = createAppContext({ auth });
      const result = await performSaveRestaurant(ctx, { restaurantId: req.params.id, note });
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
      const result = await performRemoveSavedRestaurant(ctx, { restaurantId: req.params.id });
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
      const result = await performListSavedRestaurants(ctx, {
        limit: q.limit ? Number(q.limit) : undefined,
        cursor: typeof q.cursor === "string" ? q.cursor : undefined,
      });
      sendToolResult(res, result);
    } catch (error) {
      sendUnexpectedError(res, error, "GET /account/saved");
    }
  });

  return router;
}
