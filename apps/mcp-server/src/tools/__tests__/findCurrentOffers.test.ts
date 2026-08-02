import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import type { RestaurantCardView } from "../../lib/cardView.js";

describe("find_current_offers tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("only returns restaurants with a currently valid, sourced offer", async () => {
    harness = await createConnectedTestClient();
    // Pinned to a time when the offer-bearing fixtures are open, regardless of what day/hour the suite actually runs at.
    const result = await harness.client.callTool({
      name: "find_current_offers",
      arguments: { location: "Croydon", radiusKm: 20, dateTime: "7pm" },
    });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { recommendations: RestaurantCardView[] };
    expect(structured.recommendations.length).toBeGreaterThan(0);
    for (const rec of structured.recommendations) {
      expect(rec.offers.length).toBeGreaterThan(0);
      for (const offer of rec.offers) {
        expect(offer.type).toBeDefined();
        expect(typeof offer.isVerified).toBe("boolean");
      }
    }

    // The Marmalade Cat's only seeded offer is expired - it must never appear here.
    expect(structured.recommendations.find((r) => r.id === "r_marmalade_cat")).toBeUndefined();
  });
});
