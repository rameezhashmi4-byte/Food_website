import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { createFakeUserRepository } from "../../repository/__tests__/fakeUserRepository.js";
import type { UserPreferences } from "../../repository/types.js";

describe("update_user_preferences tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("saves the provided fields and echoes them back", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const result = await harness.client.callTool({
      name: "update_user_preferences",
      arguments: { favoriteCuisines: ["italian", "burgers"], budgetPerPersonGbp: 25 },
    });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { preferences: UserPreferences };
    expect(structured.preferences.favoriteCuisines).toEqual(["italian", "burgers"]);
    expect(structured.preferences.budgetPerPersonGbp).toBe(25);
  });

  it("a partial update preserves fields it didn't mention", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    await harness.client.callTool({
      name: "update_user_preferences",
      arguments: { favoriteCuisines: ["italian"], budgetPerPersonGbp: 25, drinkPreferences: ["negroni"] },
    });

    const second = await harness.client.callTool({
      name: "update_user_preferences",
      arguments: { budgetPerPersonGbp: 40 },
    });

    const structured = second.structuredContent as { preferences: UserPreferences };
    expect(structured.preferences.budgetPerPersonGbp).toBe(40);
    // Untouched by the second call - still there from the first.
    expect(structured.preferences.favoriteCuisines).toEqual(["italian"]);
    expect(structured.preferences.drinkPreferences).toEqual(["negroni"]);
  });

  it("records a structured preferences_updated activity entry, never raw text", async () => {
    const { repository, activity } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    await harness.client.callTool({ name: "update_user_preferences", arguments: { favoriteCuisines: ["thai"] } });

    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ userId: "user-1", type: "preferences_updated" });
  });

  it("rejects an unrecognised field instead of silently ignoring the typo", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const result = await harness.client.callTool({
      name: "update_user_preferences",
      arguments: { favoriteCuisines: ["italian"], favoriteCusine: ["typo"] },
    });

    expect(result.isError).toBe(true);
  });

  it("requires a signed-in user", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "update_user_preferences", arguments: { favoriteCuisines: ["thai"] } });
    expect(result.isError).toBe(true);
  });
});
