import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import type { RestaurantDetailView } from "../../lib/detailView.js";

describe("get_restaurant_details tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("returns the full structured record for a known restaurant", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "get_restaurant_details", arguments: { restaurantId: "r_flame_fork" } });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { restaurant: RestaurantDetailView };
    expect(structured.restaurant.name).toBe("Flame & Fork");
    expect(structured.restaurant.openingHours.length).toBeGreaterThan(0);
    expect(structured.restaurant.dataFreshness.source).toBe("fictional_demo");
    expect(structured.restaurant.dataFreshness.lastCheckedAt).toBeDefined();
  });

  it("returns a clear error (not a crash) for an unknown restaurant id", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "get_restaurant_details", arguments: { restaurantId: "r_does_not_exist" } });

    expect(result.isError).toBe(true);
    const text = result.content?.[0];
    const message = text && text.type === "text" ? text.text : "";
    expect(message).toMatch(/couldn't find/i);
    expect(message).not.toMatch(/at\s+\S+:\d+:\d+|TypeError|stack/i);
  });
});
