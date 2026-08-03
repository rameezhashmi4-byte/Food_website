import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "./testClient.js";
import type { RestaurantCardView } from "../lib/cardView.js";

/**
 * End-to-end: a natural-language request flows through understand_food_request
 * (structured extraction) and then search_restaurants (filtering + ranking),
 * exactly as a ChatGPT conversation would chain these two tool calls. Flame &
 * Fork is expected to come out on top given Stage 1's scoring engine - but
 * this test doesn't hard-code that anywhere upstream, it falls out of the
 * pipeline the same way it would for a real conversation.
 */
describe("integration: natural language request -> structured search -> ranked recommendations", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("handles the flagship Croydon request end to end", async () => {
    harness = await createConnectedTestClient();

    const understood = await harness.client.callTool({
      name: "understand_food_request",
      arguments: {
        message:
          "Find somewhere fun near Croydon for four people tonight. Around £30 each, good burgers, drinks and somewhere with parking.",
      },
    });
    expect(understood.isError).toBeFalsy();

    const criteria = (understood.structuredContent as { criteria: Record<string, unknown>; readyToSearch: boolean }).criteria;
    expect((understood.structuredContent as { readyToSearch: boolean }).readyToSearch).toBe(true);

    const searched = await harness.client.callTool({
      name: "search_restaurants",
      arguments: { location: criteria.locationLabel, ...criteria },
    });
    expect(searched.isError).toBeFalsy();

    const structured = searched.structuredContent as { recommendations: RestaurantCardView[]; count: number };
    expect(structured.recommendations.length).toBeGreaterThanOrEqual(3);
    expect(structured.recommendations.length).toBeLessThanOrEqual(5);

    for (const rec of structured.recommendations) {
      expect(rec.facilities).toContain("parking");
      expect(rec.matchScorePercent).toBeGreaterThan(0);
      expect(rec.reasons.length).toBeGreaterThan(0);
    }

    expect(structured.recommendations[0]?.name).toBe("Flame & Fork");

    const summary = searched.content?.[0];
    const summaryText = summary && summary.type === "text" ? summary.text : "";
    expect(summaryText.length).toBeGreaterThan(0);
    expect(summaryText).not.toMatch(/database|query completed|records/i);
  });

  it("chains search_restaurants into compare_restaurants using the top two results", async () => {
    harness = await createConnectedTestClient();

    // Pinned to 7pm so this doesn't depend on which fixtures happen to be open right now.
    const searched = await harness.client.callTool({
      name: "search_restaurants",
      arguments: { location: "Croydon", radiusKm: 20, cuisines: ["burgers"], dateTime: "7pm" },
    });
    const structured = searched.structuredContent as { recommendations: RestaurantCardView[] };
    const [first, second] = structured.recommendations;
    expect(first && second).toBeTruthy();

    const compared = await harness.client.callTool({
      name: "compare_restaurants",
      arguments: { restaurantIds: [first!.id, second!.id], location: "Croydon", radiusKm: 20, cuisines: ["burgers"], dateTime: "7pm" },
    });

    expect(compared.isError).toBeFalsy();
    const comparison = compared.structuredContent as { items: unknown[]; bestOverallMatch?: string };
    expect(comparison.items).toHaveLength(2);
    expect(comparison.bestOverallMatch).toBeDefined();
  });
});
