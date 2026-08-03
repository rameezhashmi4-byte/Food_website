import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppContext } from "../context.js";
import { registerUnderstandFoodRequest } from "./understandFoodRequest.js";
import { registerSearchRestaurants } from "./searchRestaurants.js";
import { registerGetRestaurantDetails } from "./getRestaurantDetails.js";
import { registerCompareRestaurants } from "./compareRestaurants.js";
import { registerSurpriseMe } from "./surpriseMe.js";
import { registerFindHiddenGems } from "./findHiddenGems.js";
import { registerFindCurrentOffers } from "./findCurrentOffers.js";
import { registerFindNewOpenings } from "./findNewOpenings.js";
import { registerGetUserPreferences } from "./getUserPreferences.js";
import { registerUpdateUserPreferences } from "./updateUserPreferences.js";
import { registerSaveRestaurant } from "./saveRestaurant.js";
import { registerRemoveSavedRestaurant } from "./removeSavedRestaurant.js";
import { registerListSavedRestaurants } from "./listSavedRestaurants.js";

export function registerAllTools(server: McpServer, ctx: AppContext): void {
  // Public tools - never require auth, must keep working for every caller.
  registerUnderstandFoodRequest(server);
  registerSearchRestaurants(server, ctx);
  registerGetRestaurantDetails(server, ctx);
  registerCompareRestaurants(server, ctx);
  registerSurpriseMe(server, ctx);
  registerFindHiddenGems(server, ctx);
  registerFindCurrentOffers(server, ctx);
  registerFindNewOpenings(server, ctx);

  // Stage 3: authenticated tools - each checks ctx.auth/ctx.repository
  // itself (via lib/authGuard.ts) and returns a clean isError result when
  // there's no signed-in user, rather than requiring anything special here.
  registerGetUserPreferences(server, ctx);
  registerUpdateUserPreferences(server, ctx);
  registerSaveRestaurant(server, ctx);
  registerRemoveSavedRestaurant(server, ctx);
  registerListSavedRestaurants(server, ctx);
}
