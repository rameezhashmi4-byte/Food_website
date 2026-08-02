import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import type { RestaurantCardView } from "../../lib/cardView.js";

describe("find_hidden_gems tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("only returns well-rated, independent restaurants and excludes the most mainstream one", async () => {
    harness = await createConnectedTestClient();
    // Pinned to a time when plenty of independent fixtures are open, regardless of what day/hour the suite actually runs at.
    const result = await harness.client.callTool({
      name: "find_hidden_gems",
      arguments: { location: "Croydon", radiusKm: 20, dateTime: "7pm" },
    });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { recommendations: RestaurantCardView[] };
    expect(structured.recommendations.length).toBeGreaterThan(0);
    for (const rec of structured.recommendations) {
      expect(rec.isIndependent).toBe(true);
      expect(rec.rating ?? 0).toBeGreaterThanOrEqual(4);
    }
    expect(structured.recommendations.find((r) => r.id === "r_flame_fork")).toBeUndefined();
  });
});
