import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import type { RestaurantCardView } from "../../lib/cardView.js";

describe("find_new_openings tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("only returns restaurants marked as recently opened", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "find_new_openings", arguments: { location: "Croydon", radiusKm: 20 } });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { recommendations: RestaurantCardView[] };
    expect(structured.recommendations.length).toBeGreaterThan(0);
    for (const rec of structured.recommendations) {
      expect(rec.isNewOpening).toBe(true);
    }
    const ids = structured.recommendations.map((r) => r.id);
    expect(ids.some((id) => id === "r_ember_vine" || id === "r_crumb_co")).toBe(true);
    // Flame & Fork has no openedAt seeded - it's not a "new opening".
    expect(ids).not.toContain("r_flame_fork");
  });
});
