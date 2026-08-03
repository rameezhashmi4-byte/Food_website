import { describe, expect, it } from "vitest";
import { diffPreferencesPatch, diffProfilePatch, parsePreferencesForm } from "../preferencesForm";

function formData(entries: Array<[string, string]>): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

describe("parsePreferencesForm", () => {
  it("reads scalar, list and checkbox fields", () => {
    const parsed = parsePreferencesForm(
      formData([
        ["budgetPerPersonGbp", "30"],
        ["searchRadiusKm", "8"],
        ["favoriteCuisines", "burgers"],
        ["favoriteCuisines", "italian"],
        ["dietaryNeeds", "vegan"],
        ["foodPreferences", "spicy, big portions"],
        ["parkingImportant", "true"],
        ["homeArea", "Croydon"],
      ]),
    );

    expect(parsed.budgetPerPersonGbp).toBe(30);
    expect(parsed.searchRadiusKm).toBe(8);
    expect(parsed.favoriteCuisines.sort()).toEqual(["burgers", "italian"]);
    expect(parsed.dietaryNeeds).toEqual(["vegan"]);
    expect(parsed.foodPreferences).toEqual(["spicy", "big portions"]);
    expect(parsed.parkingImportant).toBe(true);
    expect(parsed.homeArea).toBe("Croydon");
  });

  it("silently drops unknown checkbox values instead of passing them through", () => {
    const parsed = parsePreferencesForm(formData([["favoriteCuisines", "not_a_real_cuisine"]]));
    expect(parsed.favoriteCuisines).toEqual([]);
  });
});

describe("diffPreferencesPatch", () => {
  it("only includes fields that actually changed", () => {
    const current = { userId: "u1", favoriteCuisines: ["italian"] as const, budgetPerPersonGbp: 30, updatedAt: "" } as never;
    const submitted = parsePreferencesForm(formData([["budgetPerPersonGbp", "30"], ["favoriteCuisines", "burgers"]]));
    const patch = diffPreferencesPatch(current, submitted);

    expect(patch.budgetPerPersonGbp).toBeUndefined();
    expect(patch.favoriteCuisines).toEqual(["burgers"]);
  });
});

describe("diffProfilePatch", () => {
  it("only includes home/work area when they changed", () => {
    const submitted = parsePreferencesForm(formData([["homeArea", "Croydon"]]));
    const patch = diffProfilePatch(undefined, submitted);
    expect(patch).toEqual({ homeArea: "Croydon" });
  });

  it("is empty when nothing was submitted", () => {
    const submitted = parsePreferencesForm(formData([]));
    expect(diffProfilePatch(undefined, submitted)).toEqual({});
  });
});
