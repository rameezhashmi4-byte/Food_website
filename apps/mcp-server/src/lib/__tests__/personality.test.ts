import { describe, expect, it } from "vitest";
import { buildResultsSummary, buildSurpriseSummary, buildDetailSummary, describeCriteria } from "../personality.js";
import type { RestaurantCardView } from "../cardView.js";
import type { RestaurantDetailView } from "../detailView.js";

function makeCard(overrides: Partial<RestaurantCardView> = {}): RestaurantCardView {
  return {
    id: "r_flame_fork",
    slug: "flame-and-fork",
    name: "Flame & Fork",
    cuisines: ["burgers"],
    area: "East Croydon",
    city: "Croydon",
    address: "12 Dingwall Road",
    location: { lat: 51.3757, lng: -0.0921 },
    distanceKm: 0.4,
    travelTimeMinutes: 5,
    travelMode: "walking",
    priceLevel: "moderate",
    pricePerPersonGbp: 28,
    popularFoodPrices: [],
    popularDrinkPrices: [],
    offers: [],
    openingStatus: "open_now",
    popularDishes: [],
    dietaryOptions: [],
    atmosphere: [],
    facilities: [],
    isIndependent: true,
    isNewOpening: false,
    matchScorePercent: 81,
    reasons: ["Serves burgers", "Has parking"],
    dataFreshness: { label: "Checked 4h ago", source: "fictional_demo", isVerified: true, lastCheckedAt: "2026-08-02T19:00:00.000Z" },
    ...overrides,
  };
}

describe("buildResultsSummary", () => {
  it("lowercases every joined reason, not just the first one", () => {
    const summary = buildResultsSummary({ mode: "search", cards: [makeCard()], locationLabel: "Croydon", assumptions: [] });
    expect(summary).toContain("serves burgers and has parking");
    expect(summary).not.toMatch(/and Has parking/);
  });

  it("never uses robotic database language", () => {
    const summary = buildResultsSummary({ mode: "search", cards: [makeCard()], locationLabel: "Croydon", assumptions: [] });
    expect(summary).not.toMatch(/database|query completed|records/i);
  });

  it("gives an honest, non-defeatist message when there are no matches", () => {
    const summary = buildResultsSummary({ mode: "search", cards: [], locationLabel: "Croydon", assumptions: [] });
    expect(summary).toMatch(/couldn't find/i);
  });

  it("surfaces the first assumption transparently", () => {
    const summary = buildResultsSummary({
      mode: "search",
      cards: [makeCard()],
      locationLabel: "Croydon",
      assumptions: ["Assuming tonight, 7pm"],
    });
    expect(summary).toContain("Assuming tonight, 7pm.");
  });
});

describe("buildSurpriseSummary", () => {
  it("mentions the restaurant name and lowercases joined reasons", () => {
    const summary = buildSurpriseSummary(makeCard(), "Croydon");
    expect(summary).toContain("Flame & Fork");
    expect(summary).not.toMatch(/and Has parking/);
  });
});

describe("buildDetailSummary", () => {
  it("includes cuisine, area and price without inventing anything extra", () => {
    const detail: RestaurantDetailView = {
      id: "r_flame_fork",
      slug: "flame-and-fork",
      name: "Flame & Fork",
      cuisines: ["burgers"],
      area: "East Croydon",
      city: "Croydon",
      address: "12 Dingwall Road",
      location: { lat: 51.3757, lng: -0.0921 },
      priceLevel: "moderate",
      pricePerPersonGbp: 28,
      foodItems: [],
      drinkItems: [],
      popularDishes: [],
      openingHours: [],
      openingStatus: "open_now",
      offers: [],
      dietaryOptions: [],
      atmosphere: [],
      facilities: [],
      reviewThemes: [],
      isIndependent: true,
      isNewOpening: false,
      orderingAvailable: false,
      dataFreshness: { label: "Checked 4h ago", source: "fictional_demo", isVerified: true, lastCheckedAt: "2026-08-02T19:00:00.000Z" },
    };
    const summary = buildDetailSummary(detail);
    expect(summary).toContain("Flame & Fork");
    expect(summary).toContain("East Croydon");
    expect(summary).toContain("£28");
  });
});

describe("describeCriteria", () => {
  it("returns a short comma-joined recap", () => {
    expect(
      describeCriteria({ locationLabel: "Croydon", partySize: 4, budgetPerPersonGbp: 30, cuisines: ["burgers"], requiredFacilities: ["parking"] }),
    ).toBe("Croydon, 4 people, ~£30pp, burgers, needs parking");
  });

  it("has a friendly fallback when nothing was understood", () => {
    expect(describeCriteria({})).toBe("no specific preferences yet");
  });
});
