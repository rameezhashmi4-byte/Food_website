import { describe, expect, it } from "vitest";
import { checkHardFilters } from "../filters.js";
import { getFictionalRestaurantById } from "../../data/fictionalRestaurants.js";
import { completeSearchCriteria } from "../../types/search.js";
import { nextWeekdayAt } from "../../utils/relativeDate.js";

const CROYDON = { lat: 51.3762, lng: -0.0982 };
const MONDAY_EVENING = nextWeekdayAt("monday", 19);
const THURSDAY_EVENING = nextWeekdayAt("thursday", 19);

function must(id: string) {
  const restaurant = getFictionalRestaurantById(id);
  if (!restaurant) throw new Error(`fixture missing: ${id}`);
  return restaurant;
}

describe("checkHardFilters", () => {
  it("excludes a restaurant that can't meet a stated dietary need", () => {
    const kimchiSocial = must("r_kimchi_social"); // only offers gluten_free
    const criteria = completeSearchCriteria({ location: CROYDON, dietaryNeeds: ["vegan"] });
    const result = checkHardFilters(kimchiSocial, criteria, THURSDAY_EVENING);
    expect(result.passes).toBe(false);
    expect(result.failedReasons).toContain("missing_dietary_options");
  });

  it("excludes a restaurant missing a required facility", () => {
    const spiceJunction = must("r_spice_junction"); // no parking
    const criteria = completeSearchCriteria({ location: CROYDON, requiredFacilities: ["parking"] });
    const result = checkHardFilters(spiceJunction, criteria, THURSDAY_EVENING);
    expect(result.passes).toBe(false);
    expect(result.failedReasons).toContain("missing_required_facilities");
  });

  it("excludes a restaurant that's far over budget but allows a little headroom", () => {
    const tokyoLane = must("r_tokyo_lane"); // ~£62pp, open Wed-Sat
    const criteria = completeSearchCriteria({ location: CROYDON, budgetPerPersonGbp: 20 });
    const result = checkHardFilters(tokyoLane, criteria, THURSDAY_EVENING);
    expect(result.passes).toBe(false);
    expect(result.failedReasons).toContain("far_over_budget");

    const flameFork = must("r_flame_fork"); // £28pp, within 1.4x of a £25 budget
    const withinHeadroom = checkHardFilters(flameFork, completeSearchCriteria({ location: CROYDON, budgetPerPersonGbp: 25 }), MONDAY_EVENING);
    expect(withinHeadroom.passes).toBe(true);
  });

  it("excludes a restaurant that's closed at the requested time", () => {
    const nonnasTable = must("r_nonnas_table"); // closed Mondays
    const criteria = completeSearchCriteria({ location: CROYDON });
    const result = checkHardFilters(nonnasTable, criteria, MONDAY_EVENING);
    expect(result.passes).toBe(false);
    expect(result.failedReasons).toContain("closed_at_requested_time");
  });

  it("requires an active offer in offers_near_me mode", () => {
    const nonnasTable = must("r_nonnas_table"); // never has offers seeded
    const criteria = completeSearchCriteria({ location: CROYDON });
    const result = checkHardFilters(nonnasTable, criteria, THURSDAY_EVENING, "offers_near_me");
    expect(result.passes).toBe(false);
    expect(result.failedReasons).toContain("no_active_offer");
  });

  it("passes a restaurant that satisfies every constraint", () => {
    const flameFork = must("r_flame_fork");
    const criteria = completeSearchCriteria({
      location: CROYDON,
      budgetPerPersonGbp: 30,
      requiredFacilities: ["parking"],
      dietaryNeeds: ["vegetarian"],
    });
    const result = checkHardFilters(flameFork, criteria, MONDAY_EVENING);
    expect(result.passes).toBe(true);
    expect(result.failedReasons).toEqual([]);
  });
});
