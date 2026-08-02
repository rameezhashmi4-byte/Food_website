import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import type { ComparisonEntry } from "../../lib/comparison.js";

describe("compare_restaurants tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("compares 2-4 restaurants and picks a best overall match", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({
      name: "compare_restaurants",
      arguments: { restaurantIds: ["r_flame_fork", "r_wok_this_way", "r_croydon_smokehouse"], location: "Croydon" },
    });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { items: ComparisonEntry[]; bestOverallMatch?: string };
    expect(structured.items).toHaveLength(3);
    expect(structured.bestOverallMatch).toBeDefined();
  });

  it("reports fewer than 2 restaurant ids as a clean tool error", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({
      name: "compare_restaurants",
      arguments: { restaurantIds: ["r_flame_fork"], location: "Croydon" },
    });
    expect(result.isError).toBe(true);
  });

  it("returns a clear error for an unknown restaurant id among the requested ones", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({
      name: "compare_restaurants",
      arguments: { restaurantIds: ["r_flame_fork", "r_does_not_exist"], location: "Croydon" },
    });
    expect(result.isError).toBe(true);
  });
});
