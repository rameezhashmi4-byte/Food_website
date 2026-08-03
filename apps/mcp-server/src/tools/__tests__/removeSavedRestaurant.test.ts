import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { createFakeUserRepository } from "../../repository/__tests__/fakeUserRepository.js";

describe("remove_saved_restaurant tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("removes a previously saved restaurant", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    const result = await harness.client.callTool({ name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } });

    expect(result.isError).toBeFalsy();
    expect((result.structuredContent as { removed: boolean }).removed).toBe(true);

    const list = await harness.client.callTool({ name: "list_saved_restaurants", arguments: {} });
    expect((list.structuredContent as { count: number }).count).toBe(0);
  });

  it("is idempotent - removing a restaurant that was never saved (or already removed) still succeeds", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const first = await harness.client.callTool({ name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    expect(first.isError).toBeFalsy();
    expect((first.structuredContent as { removed: boolean }).removed).toBe(true);

    await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    await harness.client.callTool({ name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    const secondRemove = await harness.client.callTool({ name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    expect(secondRemove.isError).toBeFalsy();
    expect((secondRemove.structuredContent as { removed: boolean }).removed).toBe(true);
  });

  it("records a structured restaurant_removed activity entry, never raw text", async () => {
    const { repository, activity } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    await harness.client.callTool({ name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } });

    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ userId: "user-1", type: "restaurant_removed", meta: { restaurantId: "r_flame_fork" } });
  });

  it("requires a signed-in user", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    expect(result.isError).toBe(true);
  });
});
