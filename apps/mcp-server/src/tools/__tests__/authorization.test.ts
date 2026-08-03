import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { createFakeUserRepository } from "../../repository/__tests__/fakeUserRepository.js";
import type { UserRepository } from "../../repository/types.js";

/**
 * Two different users, sharing one repository instance (exactly like two
 * real requests would share one Postgres database) - proves user A can
 * never read or modify user B's preferences or saved restaurants. Each
 * `callTool` goes through a server built with that user's own verified
 * `auth.userId`, never a userId taken from tool input (there's no such
 * input field on any of these tools in the first place).
 */
describe("authenticated tools isolate one user's data from another's", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  async function clientFor(userId: string, repository: UserRepository) {
    const client = await createConnectedTestClient({ auth: { userId, accessToken: `token-for-${userId}` }, repository });
    return client;
  }

  it("user A's saved restaurants are invisible to user B", async () => {
    const { repository } = createFakeUserRepository();

    const a = await clientFor("user-a", repository);
    try {
      await a.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    } finally {
      await a.close();
    }

    const b = await clientFor("user-b", repository);
    harness = b;
    const listResult = await b.client.callTool({ name: "list_saved_restaurants", arguments: {} });
    const structured = listResult.structuredContent as { items: Array<{ restaurantId: string }>; count: number };
    expect(structured.count).toBe(0);
    expect(structured.items).toHaveLength(0);
  });

  it("removing a restaurant as user B never affects user A's saved list", async () => {
    const { repository } = createFakeUserRepository();

    const a = await clientFor("user-a", repository);
    await a.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    await a.close();

    const b = await clientFor("user-b", repository);
    await b.client.callTool({ name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    await b.close();

    const aAgain = await clientFor("user-a", repository);
    harness = aAgain;
    const listResult = await aAgain.client.callTool({ name: "list_saved_restaurants", arguments: {} });
    const structured = listResult.structuredContent as { count: number };
    expect(structured.count).toBe(1);
  });

  it("user A's preference updates never leak into user B's preferences", async () => {
    const { repository } = createFakeUserRepository();

    const a = await clientFor("user-a", repository);
    await a.client.callTool({ name: "update_user_preferences", arguments: { favoriteCuisines: ["japanese"], budgetPerPersonGbp: 40 } });
    await a.close();

    const b = await clientFor("user-b", repository);
    harness = b;
    const bPrefs = await b.client.callTool({ name: "get_user_preferences", arguments: {} });
    const structured = bPrefs.structuredContent as { isDefault: boolean; preferences: { favoriteCuisines: string[] } };
    expect(structured.isDefault).toBe(true);
    expect(structured.preferences.favoriteCuisines).toEqual([]);
  });
});
