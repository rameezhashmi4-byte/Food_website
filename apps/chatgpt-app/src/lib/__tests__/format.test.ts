import { describe, expect, it } from "vitest";
import { formatGbp, humanize, humanizeList, openingStatusMeta } from "../format.js";

describe("humanize", () => {
  it("replaces underscores with spaces", () => {
    expect(humanize("gluten_free")).toBe("gluten free");
  });
});

describe("humanizeList", () => {
  it("joins and humanizes a truncated list", () => {
    expect(humanizeList(["burgers", "bbq_grill", "pizza", "sushi"], 2)).toBe("burgers, bbq grill");
  });
});

describe("formatGbp", () => {
  it("formats whole numbers without decimals", () => {
    expect(formatGbp(28)).toBe("£28");
  });

  it("formats fractional amounts with two decimals", () => {
    expect(formatGbp(27.5)).toBe("£27.50");
  });
});

describe("openingStatusMeta", () => {
  it("maps known statuses to friendly labels", () => {
    expect(openingStatusMeta("open_now").label).toBe("Open now");
    expect(openingStatusMeta("closing_soon").label).toBe("Closing soon");
    expect(openingStatusMeta("closed").label).toBe("Closed");
  });

  it("falls back to a humanized label for an unknown status", () => {
    expect(openingStatusMeta("mystery_status").label).toBe("mystery status");
  });
});
