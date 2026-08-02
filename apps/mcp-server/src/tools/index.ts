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

export function registerAllTools(server: McpServer, ctx: AppContext): void {
  registerUnderstandFoodRequest(server);
  registerSearchRestaurants(server, ctx);
  registerGetRestaurantDetails(server, ctx);
  registerCompareRestaurants(server, ctx);
  registerSurpriseMe(server, ctx);
  registerFindHiddenGems(server, ctx);
  registerFindCurrentOffers(server, ctx);
  registerFindNewOpenings(server, ctx);
}
