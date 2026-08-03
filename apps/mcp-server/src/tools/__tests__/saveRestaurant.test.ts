import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { createFakeUserRepository } from "../../repository/__tests__/fakeUserRepository.js";

describe("save_restaurant tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("saves a known restaurant and returns a safe view (no userId, no internal ids beyond restaurantId)", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const result = await harness.client.callTool({
      name: "save_restaurant",
      arguments: { restaurantId: "r_flame_fork", note: "great for birthdays" },
    });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { saved: { restaurantId: string; note?: string; savedAt: string } };
    expect(structured.saved.restaurantId).toBe("r_flame_fork");
    expect(structured.saved.note).toBe("great for birthdays");
    expect(structured.saved.savedAt).toBeTruthy();
    expect(structured.saved).not.toHaveProperty("userId");
  });

  it("is idempotent - saving the same restaurant twice succeeds both times without duplicating it", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const first = await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    const second = await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    expect(first.isError).toBeFalsy();
    expect(second.isError).toBeFalsy();

    const list = await harness.client.callTool({ name: "list_saved_restaurants", arguments: {} });
    const structured = list.structuredContent as { count: number };
    expect(structured.count).toBe(1);
  });

  it("rejects an unknown restaurant id instead of saving a phantom entry", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const result = await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_does_not_exist" } });
    expect(result.isError).toBe(true);
    const first = result.content?.[0];
    const message = first && first.type === "text" ? first.text : "";
    expect(message).toMatch(/couldn't find/i);

    const list = await harness.client.callTool({ name: "list_saved_restaurants", arguments: {} });
    const structured = list.structuredContent as { count: number };
    expect(structured.count).toBe(0);
  });

  it("records a structured restaurant_saved activity entry with the restaurantId, never raw text", async () => {
    const { repository, activity } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });

    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ userId: "user-1", type: "restaurant_saved", meta: { restaurantId: "r_flame_fork" } });
  });

  it("requires a signed-in user", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } });
    expect(result.isError).toBe(true);
  });
});
