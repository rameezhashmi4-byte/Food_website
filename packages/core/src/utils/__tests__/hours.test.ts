import { describe, expect, it } from "vitest";
import { getOpeningStatus, isOpenAt } from "../hours.js";
import { nextWeekdayAt } from "../relativeDate.js";
import type { OpeningHours } from "../../types/restaurant.js";

function hours(intervals: OpeningHours["intervals"]): OpeningHours {
  return { intervals, meta: { source: "fictional_demo", lastCheckedAt: new Date().toISOString(), isVerified: true } };
}

describe("isOpenAt", () => {
  it("treats a same-day interval as open within its window", () => {
    const h = hours([{ day: "monday", opensAt: "12:00", closesAt: "22:00" }]);
    expect(isOpenAt(h, nextWeekdayAt("monday", 18))).toBe(true);
    expect(isOpenAt(h, nextWeekdayAt("monday", 23))).toBe(false);
  });

  it("handles overnight wraparound (e.g. 17:00 - 02:00)", () => {
    const h = hours([{ day: "friday", opensAt: "17:00", closesAt: "02:00" }]);
    expect(isOpenAt(h, nextWeekdayAt("friday", 23, 30))).toBe(true);
    expect(isOpenAt(h, nextWeekdayAt("saturday", 1))).toBe(true); // past midnight, still "Friday's" hours
    expect(isOpenAt(h, nextWeekdayAt("saturday", 3))).toBe(false); // after close
  });

  it("returns false for a day with no interval at all", () => {
    const h = hours([{ day: "monday", opensAt: "12:00", closesAt: "22:00" }]);
    expect(isOpenAt(h, nextWeekdayAt("tuesday", 18))).toBe(false);
  });
});

describe("getOpeningStatus", () => {
  it("reports closing_soon within the last 30 minutes before close", () => {
    const h = hours([{ day: "monday", opensAt: "12:00", closesAt: "22:00" }]);
    expect(getOpeningStatus(h, nextWeekdayAt("monday", 21, 45))).toBe("closing_soon");
    expect(getOpeningStatus(h, nextWeekdayAt("monday", 20))).toBe("open_now");
  });

  it("reports opens_later_today before the venue opens", () => {
    const h = hours([{ day: "monday", opensAt: "17:00", closesAt: "22:00" }]);
    expect(getOpeningStatus(h, nextWeekdayAt("monday", 14))).toBe("opens_later_today");
  });

  it("reports unknown when there are no intervals", () => {
    const h = hours([]);
    expect(getOpeningStatus(h, new Date())).toBe("unknown");
  });
});
