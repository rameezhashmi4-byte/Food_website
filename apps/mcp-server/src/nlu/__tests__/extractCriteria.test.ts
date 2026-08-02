import { describe, expect, it } from "vitest";
import { extractCriteriaDeterministic } from "../extractCriteria.js";

describe("extractCriteriaDeterministic", () => {
  it("extracts the full flagship example without any AI model", () => {
    const result = extractCriteriaDeterministic(
      "Find somewhere fun near Croydon for four people tonight. Around £30 each, good burgers, drinks and somewhere with parking.",
    );

    expect(result.criteria.locationLabel).toBe("Croydon");
    expect(result.criteria.partySize).toBe(4);
    expect(result.criteria.budgetPerPersonGbp).toBe(30);
    expect(result.criteria.cuisines).toContain("burgers");
    expect(result.criteria.requiredFacilities).toContain("parking");
    expect(result.criteria.atmosphere).toContain("lively"); // "fun"
    expect(result.criteria.dateTime).toBeDefined();
    expect(result.essentialFollowUp).toBeUndefined();
  });

  it("flags location as the essential follow-up when nothing resolves it", () => {
    const result = extractCriteriaDeterministic("Somewhere nice for dinner");
    expect(result.criteria.location).toBeUndefined();
    expect(result.essentialFollowUp).toMatch(/whereabouts/i);
  });

  it("flags party size as the essential follow-up once location is known", () => {
    const result = extractCriteriaDeterministic("Somewhere nice in Croydon");
    expect(result.criteria.location).toBeDefined();
    expect(result.essentialFollowUp).toMatch(/how many/i);
  });

  it("resolves dietary needs and independent/offer signals", () => {
    const result = extractCriteriaDeterministic(
      "Looking for a vegan-friendly, gluten free independent place in Croydon for 2, ideally with a good offer on.",
    );
    expect(result.criteria.dietaryNeeds).toEqual(expect.arrayContaining(["vegan", "gluten_free"]));
    expect(result.criteria.prioritiseIndependent).toBe(true);
    expect(result.criteria.wantsOffers).toBe(true);
  });

  it("splits a total budget across the party size when no per-person figure is given", () => {
    const result = extractCriteriaDeterministic("Croydon, for 4 people, £120 total for the group");
    expect(result.criteria.budgetPerPersonGbp).toBe(30);
    expect(result.assumptions.some((a) => a.includes("£120"))).toBe(true);
  });

  it("extracts occasion and atmosphere words", () => {
    const result = extractCriteriaDeterministic("Croydon, romantic first date for 2, somewhere quiet and intimate");
    expect(result.criteria.occasion).toBe("first_date");
    expect(result.criteria.atmosphere).toEqual(expect.arrayContaining(["quiet", "intimate"]));
  });
});
