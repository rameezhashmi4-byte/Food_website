import { describe, expect, it } from "vitest";
import { FictionalRestaurantProvider, type ResolvedLocation, type RestaurantProvider } from "@bitejoy/core";
import { resolveCriteria } from "../resolveCriteria.js";
import { ToolInputError } from "../errors.js";

const fictionalProvider = new FictionalRestaurantProvider();

/**
 * Stand-in for `GooglePlacesProvider`: implements `resolveLocation` (real
 * geocoding) so tests can assert `resolveCriteria` actually defers to it
 * instead of the UK-only gazetteer, without making a live Google API call.
 */
class FakeGeocodingProvider implements RestaurantProvider {
  readonly sourceName = "google_places" as const;

  constructor(private readonly locations: Record<string, ResolvedLocation>) {}

  async searchRestaurants() {
    return [];
  }

  async getRestaurantById() {
    return undefined;
  }

  async resolveLocation(text: string): Promise<ResolvedLocation | undefined> {
    return this.locations[text.toLowerCase()];
  }
}

describe("resolveCriteria", () => {
  describe("with a provider that has no real geocoding (fictional demo data)", () => {
    it("resolves a known location and passes through explicit fields", async () => {
      const { criteria, locationLabel } = await resolveCriteria(fictionalProvider, {
        location: "Croydon",
        partySize: 4,
        budgetPerPersonGbp: 30,
      });
      expect(locationLabel).toBe("Croydon");
      expect(criteria.partySize).toBe(4);
      expect(criteria.budgetPerPersonGbp).toBe(30);
    });

    it("throws a ToolInputError for an unrecognised location, without touching a geocoder", async () => {
      await expect(resolveCriteria(fictionalProvider, { location: "Narnia" })).rejects.toThrow(ToolInputError);
    });

    it("throws a ToolInputError for a real worldwide city it simply has no data for", async () => {
      // Proves the fallback gazetteer is genuinely UK-only demo-data-scoped,
      // not a general geocoder - this is expected/intentional for this provider.
      await expect(resolveCriteria(fictionalProvider, { location: "Tokyo, Japan" })).rejects.toThrow(ToolInputError);
    });

    it("resolves a natural-language dateTime phrase", async () => {
      const { criteria, assumptions } = await resolveCriteria(fictionalProvider, { location: "Croydon", dateTime: "tonight" });
      expect(criteria.dateTime).toBeDefined();
      expect(assumptions.some((a) => a.toLowerCase().includes("tonight"))).toBe(true);
    });

    it("passes an already-ISO dateTime straight through untouched", async () => {
      const iso = new Date("2026-09-01T18:00:00.000Z").toISOString();
      const { criteria } = await resolveCriteria(fictionalProvider, { location: "Croydon", dateTime: iso });
      expect(criteria.dateTime).toBe(iso);
    });

    it("splits a total budget across the party size", async () => {
      const { criteria, assumptions } = await resolveCriteria(fictionalProvider, { location: "Croydon", partySize: 4, totalBudgetGbp: 100 });
      expect(criteria.budgetPerPersonGbp).toBe(25);
      expect(assumptions.some((a) => a.includes("£100"))).toBe(true);
    });
  });

  describe("with a provider that has real geocoding (google_places)", () => {
    const tokyo = new FakeGeocodingProvider({
      "tokyo, japan": { label: "Tokyo, Japan", coordinates: { lat: 35.6762, lng: 139.6503 } },
      "new york, ny": { label: "New York, NY, USA", coordinates: { lat: 40.7128, lng: -74.006 } },
    });

    it("resolves a worldwide location via the provider's own geocoding, bypassing the UK gazetteer entirely", async () => {
      const { criteria, locationLabel } = await resolveCriteria(tokyo, { location: "Tokyo, Japan" });
      expect(locationLabel).toBe("Tokyo, Japan");
      expect(criteria.location).toEqual({ lat: 35.6762, lng: 139.6503 });
    });

    it("also resolves a location that is not in the UK-only gazetteer at all", async () => {
      const { locationLabel } = await resolveCriteria(tokyo, { location: "New York, NY" });
      expect(locationLabel).toBe("New York, NY, USA");
    });

    it("throws a ToolInputError (not silently falling back to the gazetteer) when the geocoder itself finds nothing", async () => {
      await expect(resolveCriteria(tokyo, { location: "Nowhereville" })).rejects.toThrow(ToolInputError);
    });
  });
});
