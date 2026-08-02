import { describe, expect, it } from "vitest";
import { resolveCriteria } from "../resolveCriteria.js";
import { ToolInputError } from "../errors.js";

describe("resolveCriteria", () => {
  it("resolves a known location and passes through explicit fields", () => {
    const { criteria, locationLabel } = resolveCriteria({ location: "Croydon", partySize: 4, budgetPerPersonGbp: 30 });
    expect(locationLabel).toBe("Croydon");
    expect(criteria.partySize).toBe(4);
    expect(criteria.budgetPerPersonGbp).toBe(30);
  });

  it("throws a ToolInputError for an unrecognised location", () => {
    expect(() => resolveCriteria({ location: "Narnia" })).toThrow(ToolInputError);
  });

  it("resolves a natural-language dateTime phrase", () => {
    const { criteria, assumptions } = resolveCriteria({ location: "Croydon", dateTime: "tonight" });
    expect(criteria.dateTime).toBeDefined();
    expect(assumptions.some((a) => a.toLowerCase().includes("tonight"))).toBe(true);
  });

  it("passes an already-ISO dateTime straight through untouched", () => {
    const iso = new Date("2026-09-01T18:00:00.000Z").toISOString();
    const { criteria } = resolveCriteria({ location: "Croydon", dateTime: iso });
    expect(criteria.dateTime).toBe(iso);
  });

  it("splits a total budget across the party size", () => {
    const { criteria, assumptions } = resolveCriteria({ location: "Croydon", partySize: 4, totalBudgetGbp: 100 });
    expect(criteria.budgetPerPersonGbp).toBe(25);
    expect(assumptions.some((a) => a.includes("£100"))).toBe(true);
  });
});
