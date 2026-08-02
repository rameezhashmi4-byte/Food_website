import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import type { RestaurantCardView } from "../../lib/cardView.js";

describe("search_restaurants tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("returns 3-5 ranked recommendations for the flagship example, topped by Flame & Fork", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({
      name: "search_restaurants",
      arguments: {
        location: "Croydon",
        partySize: 4,
        budgetPerPersonGbp: 30,
        cuisines: ["burgers"],
        requiredFacilities: ["parking"],
        dateTime: "tonight",
      },
    });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { recommendations: RestaurantCardView[]; count: number };
    expect(structured.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(structured.recommendations.length).toBeLessThanOrEqual(5);
    expect(structured.recommendations[0]?.id).toBe("r_flame_fork");
    for (const rec of structured.recommendations) {
      expect(rec.facilities).toContain("parking");
    }

    const text = result.content?.[0];
    expect(text && text.type === "text" ? text.text : "").not.toMatch(/database|query|records/i);
  });

  it("reports a request with no location as a clean tool error", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "search_restaurants", arguments: { partySize: 2 } });
    expect(result.isError).toBe(true);
  });

  it("returns a clear, non-crashing error for an unrecognised location", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "search_restaurants", arguments: { location: "Narnia" } });
    expect(result.isError).toBe(true);
    const text = result.content?.[0];
    expect(text && text.type === "text" ? text.text : "").not.toMatch(/at\s+\S+:\d+:\d+|stack/i);
  });
});
