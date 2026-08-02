import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import type { RestaurantCardView } from "../../lib/cardView.js";

describe("surprise_me tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("respects budget and dietary requirements", async () => {
    harness = await createConnectedTestClient();

    for (let i = 0; i < 5; i += 1) {
      const result = await harness.client.callTool({
        name: "surprise_me",
        arguments: { location: "Croydon", radiusKm: 20, dietaryNeeds: ["vegan"], budgetPerPersonGbp: 20 },
      });
      expect(result.isError).toBeFalsy();
      const structured = result.structuredContent as { recommendation: RestaurantCardView };
      expect(structured.recommendation.dietaryOptions).toContain("vegan");
      expect(structured.recommendation.pricePerPersonGbp).toBeLessThanOrEqual(20 * 1.4);
    }
  });

  it("returns a clear error when nothing suitable exists", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({
      name: "surprise_me",
      arguments: { location: "Croydon", radiusKm: 20, budgetPerPersonGbp: 1 },
    });
    expect(result.isError).toBe(true);
  });
});
