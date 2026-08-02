import { describe, expect, it } from "vitest";
import { FictionalRestaurantProvider } from "../fictionalProvider.js";
import { completeSearchCriteria } from "../../types/search.js";

const CROYDON = { lat: 51.3762, lng: -0.0982 };

describe("FictionalRestaurantProvider", () => {
  it("only returns restaurants within the requested radius", async () => {
    const provider = new FictionalRestaurantProvider();
    const criteria = completeSearchCriteria({ location: CROYDON, radiusKm: 1.2 });
    const results = await provider.searchRestaurants({ criteria });

    expect(results.length).toBeGreaterThan(0);
    // Tokyo Lane (~1.5km) and Istanbul Grill House (~3.5km) are seeded outside a 1.2km radius.
    expect(results.find((r) => r.id === "r_tokyo_lane")).toBeUndefined();
    expect(results.find((r) => r.id === "r_istanbul_grill")).toBeUndefined();
  });

  it("widens results as the radius grows", async () => {
    const provider = new FictionalRestaurantProvider();
    const small = await provider.searchRestaurants({ criteria: completeSearchCriteria({ location: CROYDON, radiusKm: 1 }) });
    const large = await provider.searchRestaurants({ criteria: completeSearchCriteria({ location: CROYDON, radiusKm: 20 }) });

    expect(large.length).toBeGreaterThanOrEqual(small.length);
  });

  it("looks restaurants up by id", async () => {
    const provider = new FictionalRestaurantProvider();
    const found = await provider.getRestaurantById("r_flame_fork");
    expect(found?.name).toBe("Flame & Fork");
    expect(await provider.getRestaurantById("does_not_exist")).toBeUndefined();
  });
});
