import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { createFakeUserRepository } from "../../repository/__tests__/fakeUserRepository.js";

const PRIVATE_TOOL_CALLS: Array<{ name: string; arguments: Record<string, unknown> }> = [
  { name: "get_user_preferences", arguments: {} },
  { name: "update_user_preferences", arguments: { favoriteCuisines: ["italian"] } },
  { name: "save_restaurant", arguments: { restaurantId: "r_flame_fork" } },
  { name: "remove_saved_restaurant", arguments: { restaurantId: "r_flame_fork" } },
  { name: "list_saved_restaurants", arguments: {} },
];

describe("authenticated tools require a signed-in user", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it.each(PRIVATE_TOOL_CALLS)("$name returns a clean sign-in-required error with no token, not a crash", async ({ name, arguments: args }) => {
    harness = await createConnectedTestClient(); // no auth option passed - same as an anonymous caller
    const result = await harness.client.callTool({ name, arguments: args });

    expect(result.isError).toBe(true);
    const first = result.content?.[0];
    const message = first && first.type === "text" ? first.text : "";
    expect(message).toMatch(/connected BiteJoy account|sign in/i);
    // Never a raw auth-library error leaking through.
    expect(message).not.toMatch(/jwt|jose|AuthError|ERR_JWT|node_modules/i);
  });

  it("public tools keep working with zero auth even on a server that also has the private tools registered", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "search_restaurants", arguments: { location: "Croydon" } });
    expect(result.isError).toBeFalsy();
  });

  it("a private tool succeeds once a verified auth context is present", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({
      auth: { userId: "user-1", accessToken: "irrelevant-for-the-fake-repository" },
      repository,
    });

    const result = await harness.client.callTool({ name: "get_user_preferences", arguments: {} });
    expect(result.isError).toBeFalsy();
  });
});
