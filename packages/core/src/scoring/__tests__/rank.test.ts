import { describe, expect, it } from "vitest";
import { rankRestaurants, pickSurprise } from "../rank.js";
import { FictionalRestaurantProvider } from "../../providers/fictionalProvider.js";
import { completeSearchCriteria } from "../../types/search.js";
import { FICTIONAL_RESTAURANTS } from "../../data/fictionalRestaurants.js";
import { nextWeekdayAt } from "../../utils/relativeDate.js";

const CROYDON = { lat: 51.3762, lng: -0.0982 };
// Friday evening: every seeded restaurant used in these assertions is open then,
// and it's well within every non-expired seeded offer's validity window.
const FRIDAY_EVENING = nextWeekdayAt("friday", 19);

describe("rankRestaurants", () => {
  it("matches the flagship example: burgers, drinks, parking, £30pp, 4 people, tonight", async () => {
    const provider = new FictionalRestaurantProvider();
    const criteria = completeSearchCriteria({
      location: CROYDON,
      locationLabel: "Croydon",
      partySize: 4,
      budgetPerPersonGbp: 30,
      cuisines: ["burgers"],
      requiredFacilities: ["parking"],
    });
    const candidates = await provider.searchRestaurants({ criteria });
    const recommendations = rankRestaurants(candidates, criteria, { at: FRIDAY_EVENING });

    expect(recommendations.length).toBeGreaterThanOrEqual(1);
    expect(recommendations.length).toBeLessThanOrEqual(5);
    // Every result must genuinely have parking - it was a hard requirement.
    for (const rec of recommendations) {
      expect(rec.restaurant.facilities).toContain("parking");
    }
    // Flame & Fork (burgers, parking, £28pp, open Fridays) should be the top match.
    expect(recommendations[0]?.restaurant.id).toBe("r_flame_fork");
    expect(recommendations[0]?.reasons.length).toBeGreaterThan(0);
  });

  it("never returns more than 5 recommendations even with a wide-open search", () => {
    const criteria = completeSearchCriteria({ location: CROYDON, radiusKm: 20 });
    const recommendations = rankRestaurants(FICTIONAL_RESTAURANTS, criteria, { at: FRIDAY_EVENING });
    expect(recommendations.length).toBeLessThanOrEqual(5);
  });

  it("sorts recommendations by descending score", () => {
    const criteria = completeSearchCriteria({ location: CROYDON, radiusKm: 20 });
    const recommendations = rankRestaurants(FICTIONAL_RESTAURANTS, criteria, { at: FRIDAY_EVENING });
    const scores = recommendations.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("offers_near_me only returns restaurants with a currently active offer", () => {
    const criteria = completeSearchCriteria({ location: CROYDON, radiusKm: 20, wantsOffers: true });
    const recommendations = rankRestaurants(FICTIONAL_RESTAURANTS, criteria, { mode: "offers_near_me", at: FRIDAY_EVENING });

    expect(recommendations.length).toBeGreaterThan(0);
    for (const rec of recommendations) {
      expect(rec.activeOffers.length).toBeGreaterThan(0);
    }
    // The Marmalade Cat's only offer is seeded as expired - it must never appear here.
    expect(recommendations.find((r) => r.restaurant.id === "r_marmalade_cat")).toBeUndefined();
  });

  it("hidden_gem mode favours independent, well-rated places and excludes the most mainstream one", () => {
    const criteria = completeSearchCriteria({ location: CROYDON, radiusKm: 20, prioritiseIndependent: true });
    const recommendations = rankRestaurants(FICTIONAL_RESTAURANTS, criteria, { mode: "hidden_gem", at: FRIDAY_EVENING });

    expect(recommendations.length).toBeGreaterThan(0);
    for (const rec of recommendations) {
      expect(rec.restaurant.isIndependent).toBe(true);
      // "Hidden gem" must never mean "poorly rated".
      expect(rec.restaurant.reviewSummary?.averageRating ?? 0).toBeGreaterThanOrEqual(4);
    }
    // Flame & Fork (812 reviews) is the most mainstream/popular restaurant in the fixture
    // set - however good it is, it's the opposite of a hidden gem and must not appear here.
    expect(recommendations.find((r) => r.restaurant.id === "r_flame_fork")).toBeUndefined();
  });

  it("hidden_gem mode ranks a genuinely obscure gem above the dataset's most mainstream restaurant", () => {
    const criteria = completeSearchCriteria({ location: CROYDON, radiusKm: 20, prioritiseIndependent: true });
    const hiddenGemScores = rankRestaurants(FICTIONAL_RESTAURANTS, criteria, {
      mode: "hidden_gem",
      at: FRIDAY_EVENING,
      limit: 5,
      minScore: 0,
    });
    const searchScores = rankRestaurants(FICTIONAL_RESTAURANTS, criteria, { mode: "search", at: FRIDAY_EVENING, minScore: 0 });

    // Under plain "search" scoring Flame & Fork (812 reviews) normally leads the pack;
    // under hidden_gem scoring, Tokyo Lane (42 reviews, independent, 4.9 rating) should
    // out-rank it - proving obscurity genuinely moves the ranking, not just the label.
    const flameForkRank = hiddenGemScores.findIndex((r) => r.restaurant.id === "r_flame_fork");
    const tokyoLaneRank = hiddenGemScores.findIndex((r) => r.restaurant.id === "r_tokyo_lane");
    expect(searchScores[0]?.restaurant.id).toBe("r_flame_fork");
    expect(tokyoLaneRank).toBeGreaterThanOrEqual(0);
    expect(flameForkRank === -1 || tokyoLaneRank < flameForkRank).toBe(true);
  });
});

describe("pickSurprise", () => {
  it("always returns a restaurant that satisfies the hard constraints", () => {
    const criteria = completeSearchCriteria({ location: CROYDON, radiusKm: 20, dietaryNeeds: ["vegan"] });
    for (let i = 0; i < 10; i += 1) {
      const surprise = pickSurprise(FICTIONAL_RESTAURANTS, criteria, { at: FRIDAY_EVENING });
      expect(surprise).toBeDefined();
      expect(surprise?.restaurant.dietaryOptions).toContain("vegan");
    }
  });
});
