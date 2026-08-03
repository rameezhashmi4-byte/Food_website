import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { createFakeUserRepository } from "../../repository/__tests__/fakeUserRepository.js";
import type { UserPreferences } from "../../repository/types.js";

describe("get_user_preferences tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("returns sensible empty defaults, not an error, when nothing has been saved yet", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const result = await harness.client.callTool({ name: "get_user_preferences", arguments: {} });
    expect(result.isError).toBeFalsy();

    const structured = result.structuredContent as { preferences: UserPreferences; isDefault: boolean };
    expect(structured.isDefault).toBe(true);
    expect(structured.preferences.userId).toBe("user-1");
    expect(structured.preferences.favoriteCuisines).toEqual([]);
    expect(structured.preferences.dietaryNeeds).toEqual([]);
  });

  it("returns the previously saved preferences once some exist", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    await harness.client.callTool({ name: "update_user_preferences", arguments: { favoriteCuisines: ["thai", "japanese"] } });
    const result = await harness.client.callTool({ name: "get_user_preferences", arguments: {} });

    const structured = result.structuredContent as { preferences: UserPreferences; isDefault: boolean };
    expect(structured.isDefault).toBe(false);
    expect(structured.preferences.favoriteCuisines).toEqual(["thai", "japanese"]);
  });
});
