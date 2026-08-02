import { describe, expect, it } from "vitest";
import { getEssentialFollowUp, mergeGroupPreferences } from "../search.js";

describe("getEssentialFollowUp", () => {
  it("asks for location when missing", () => {
    expect(getEssentialFollowUp({})).toMatch(/whereabouts/i);
  });

  it("asks for party size when location is known but size isn't", () => {
    const question = getEssentialFollowUp({ location: { lat: 51.37, lng: -0.1 } });
    expect(question).toMatch(/how many/i);
  });

  it("returns undefined once the essentials are present", () => {
    const question = getEssentialFollowUp({ location: { lat: 51.37, lng: -0.1 }, partySize: 4 });
    expect(question).toBeUndefined();
  });
});

describe("mergeGroupPreferences", () => {
  it("takes the most conservative budget and unions dietary needs", () => {
    const merged = mergeGroupPreferences({
      location: { lat: 51.37, lng: -0.1 },
      members: [
        { memberId: "a", cuisines: ["burgers"], dietaryNeeds: ["vegetarian"], budgetPerPersonGbp: 30, atmosphere: [], mustAvoid: [] },
        { memberId: "b", cuisines: ["mexican"], dietaryNeeds: ["gluten_free"], budgetPerPersonGbp: 20, atmosphere: [], mustAvoid: [] },
      ],
    });

    expect(merged.budgetPerPersonGbp).toBe(20);
    expect(merged.dietaryNeeds.sort()).toEqual(["gluten_free", "vegetarian"]);
    expect(merged.cuisines.sort()).toEqual(["burgers", "mexican"]);
    expect(merged.partySize).toBe(2);
  });
});
