import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { createFakeUserRepository } from "../../repository/__tests__/fakeUserRepository.js";
import type { RestaurantDetailView } from "../../lib/detailView.js";

const RESTAURANT_IDS = ["r_flame_fork", "r_spice_junction", "r_nonnas_table", "r_bao_bun_co", "r_herring_bone"];

describe("list_saved_restaurants tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("returns an empty list (not an error) when nothing is saved", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    const result = await harness.client.callTool({ name: "list_saved_restaurants", arguments: {} });
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as { items: unknown[]; count: number };
    expect(structured.items).toEqual([]);
    expect(structured.count).toBe(0);
  });

  it("enriches each saved entry with the full detail view (no distance/match score, since there's no search origin)", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: "r_flame_fork", note: "for later" } });
    const result = await harness.client.callTool({ name: "list_saved_restaurants", arguments: {} });

    const structured = result.structuredContent as {
      items: Array<{ restaurantId: string; note?: string; savedAt: string; restaurant: RestaurantDetailView }>;
    };
    expect(structured.items).toHaveLength(1);
    const entry = structured.items[0]!;
    expect(entry.restaurantId).toBe("r_flame_fork");
    expect(entry.note).toBe("for later");
    expect(entry.restaurant.name).toBe("Flame & Fork");
    expect(entry.restaurant.openingHours.length).toBeGreaterThan(0);
    expect(entry.restaurant).not.toHaveProperty("distanceKm");
    expect(entry.restaurant).not.toHaveProperty("matchScorePercent");
  });

  it("paginates via limit/cursor, newest first, without duplicating or skipping entries", async () => {
    const { repository } = createFakeUserRepository();
    harness = await createConnectedTestClient({ auth: { userId: "user-1", accessToken: "t" }, repository });

    for (const id of RESTAURANT_IDS) {
      await harness.client.callTool({ name: "save_restaurant", arguments: { restaurantId: id } });
    }

    const seen = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await harness.client.callTool({ name: "list_saved_restaurants", arguments: { limit: 2, cursor } });
      const structured = page.structuredContent as { items: Array<{ restaurantId: string }>; nextCursor?: string };
      expect(structured.items.length).toBeLessThanOrEqual(2);
      for (const item of structured.items) seen.add(item.restaurantId);
      cursor = structured.nextCursor;
      pages += 1;
      expect(pages).toBeLessThan(10); // guard against an infinite loop if pagination is broken
    } while (cursor);

    expect(seen.size).toBe(RESTAURANT_IDS.length);
    for (const id of RESTAURANT_IDS) expect(seen.has(id)).toBe(true);
  });

  it("requires a signed-in user", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "list_saved_restaurants", arguments: {} });
    expect(result.isError).toBe(true);
  });
});
