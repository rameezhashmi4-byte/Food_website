import { describe, expect, it } from "vitest";
import { completeSearchCriteria, getFictionalRestaurantById, nextWeekdayAt } from "@bitejoy/core";
import { buildComparisonEntries, computeAwards } from "../comparison.js";

const CROYDON = { lat: 51.3762, lng: -0.0982 };
const THURSDAY_EVENING = nextWeekdayAt("thursday", 19); // Nonna's Table (closed Mondays) is open Thursdays

function must(id: string) {
  const restaurant = getFictionalRestaurantById(id);
  if (!restaurant) throw new Error(`fixture missing: ${id}`);
  return restaurant;
}

describe("buildComparisonEntries", () => {
  it("flags a restaurant missing a required facility as a trade-off, without dropping it", () => {
    const criteria = completeSearchCriteria({ location: CROYDON, requiredFacilities: ["parking"] });
    const restaurants = [must("r_flame_fork"), must("r_spice_junction")]; // spice_junction has no parking
    const entries = buildComparisonEntries(restaurants, criteria, THURSDAY_EVENING);

    expect(entries).toHaveLength(2);
    const spiceJunction = entries.find((e) => e.card.id === "r_spice_junction");
    expect(spiceJunction?.meetsAllRequirements).toBe(false);
    expect(spiceJunction?.tradeOffs.length).toBeGreaterThan(0);

    const flameFork = entries.find((e) => e.card.id === "r_flame_fork");
    expect(flameFork?.meetsAllRequirements).toBe(true);
  });
});

describe("computeAwards", () => {
  it("only awards best atmosphere when an atmosphere/occasion was actually requested", () => {
    const criteriaNoAtmosphere = completeSearchCriteria({ location: CROYDON });
    const restaurants = [must("r_flame_fork"), must("r_nonnas_table")];
    const entriesNoAtmosphere = buildComparisonEntries(restaurants, criteriaNoAtmosphere, THURSDAY_EVENING);
    expect(computeAwards(entriesNoAtmosphere, criteriaNoAtmosphere).bestAtmosphere).toBeUndefined();

    const criteriaWithAtmosphere = completeSearchCriteria({ location: CROYDON, atmosphere: ["romantic"] });
    const entriesWithAtmosphere = buildComparisonEntries(restaurants, criteriaWithAtmosphere, THURSDAY_EVENING);
    const awards = computeAwards(entriesWithAtmosphere, criteriaWithAtmosphere);
    expect(awards.bestAtmosphere).toBe("r_nonnas_table"); // romantic/intimate
  });

  it("always computes a best overall match when there is at least one entry", () => {
    const criteria = completeSearchCriteria({ location: CROYDON });
    const restaurants = [must("r_flame_fork"), must("r_spice_junction")];
    const entries = buildComparisonEntries(restaurants, criteria, THURSDAY_EVENING);
    expect(computeAwards(entries, criteria).bestOverallMatch).toBeDefined();
  });
});
