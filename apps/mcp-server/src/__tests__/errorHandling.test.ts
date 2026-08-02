import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "./testClient.js";

describe("MCP-level error handling", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("rejects a call to an unknown tool rather than crashing the server", async () => {
    harness = await createConnectedTestClient();
    await expect(harness.client.callTool({ name: "not_a_real_tool", arguments: {} })).rejects.toThrow();

    // The server must still be usable afterwards.
    const stillWorks = await harness.client.callTool({ name: "get_restaurant_details", arguments: { restaurantId: "r_flame_fork" } });
    expect(stillWorks.isError).toBeFalsy();
  });

  it("rejects arguments of the wrong type instead of silently coercing them", async () => {
    harness = await createConnectedTestClient();
    await expect(
      harness.client.callTool({ name: "search_restaurants", arguments: { location: "Croydon", partySize: "four" } }),
    ).rejects.toThrow();
  });

  it("never leaks a stack trace or internal file path in a business-logic error", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "get_restaurant_details", arguments: { restaurantId: "does_not_exist" } });
    expect(result.isError).toBe(true);
    const text = result.content?.[0];
    const message = text && text.type === "text" ? text.text : "";
    expect(message).not.toMatch(/node_modules|\.ts:\d+|\.js:\d+|at Object\.|at async/i);
  });

  it("lists all 8 registered tools", async () => {
    harness = await createConnectedTestClient();
    const { tools } = await harness.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "compare_restaurants",
        "find_current_offers",
        "find_hidden_gems",
        "find_new_openings",
        "get_restaurant_details",
        "search_restaurants",
        "surprise_me",
        "understand_food_request",
      ].sort(),
    );
  });
});
