import { describe, expect, it } from "vitest";
import { isNewOpening, daysSinceOpening } from "../newOpenings.js";
import { getFictionalRestaurantById } from "../../data/fictionalRestaurants.js";

function must(id: string) {
  const restaurant = getFictionalRestaurantById(id);
  if (!restaurant) throw new Error(`fixture missing: ${id}`);
  return restaurant;
}

describe("isNewOpening", () => {
  it("is true for restaurants that opened recently", () => {
    expect(isNewOpening(must("r_ember_vine"))).toBe(true);
    expect(isNewOpening(must("r_crumb_co"))).toBe(true);
  });

  it("is false for restaurants with no known opening date", () => {
    expect(isNewOpening(must("r_flame_fork"))).toBe(false);
  });

  it("is false once a restaurant is outside the new-opening window", () => {
    const restaurant = must("r_ember_vine");
    const farFuture = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    expect(isNewOpening(restaurant, farFuture)).toBe(false);
  });
});

describe("daysSinceOpening", () => {
  it("returns undefined when opening date is unknown", () => {
    expect(daysSinceOpening(must("r_flame_fork"))).toBeUndefined();
  });

  it("returns a small positive number for a recent opening", () => {
    const days = daysSinceOpening(must("r_crumb_co"));
    expect(days).toBeGreaterThan(35);
    expect(days).toBeLessThan(45);
  });
});
