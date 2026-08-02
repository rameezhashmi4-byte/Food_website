import { describe, expect, it } from "vitest";
import { resolveLocationText } from "../gazetteer.js";

describe("resolveLocationText", () => {
  it("resolves the generic 'Croydon' alias", () => {
    const result = resolveLocationText("somewhere near Croydon");
    expect(result?.label).toBe("Croydon");
  });

  it("prefers the more specific 'East Croydon' over the generic 'Croydon'", () => {
    const result = resolveLocationText("East Croydon please");
    expect(result?.label).toBe("East Croydon");
  });

  it("returns undefined for a place it doesn't know", () => {
    expect(resolveLocationText("Manchester")).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(resolveLocationText("")).toBeUndefined();
  });
});
