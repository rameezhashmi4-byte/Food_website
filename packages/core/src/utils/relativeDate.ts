import type { Weekday } from "../types/common.js";

const WEEKDAY_JS_INDEX: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Builds a Date for "the next occurrence of this weekday at this time of
 * day" (including today, if today already is that weekday), relative to
 * `from`. Used both by opening-hours/offer tests (so they don't hardcode a
 * calendar year) and by the food-request NLU when someone says "next
 * Friday" or "this Saturday".
 */
export function nextWeekdayAt(weekday: Weekday, hour: number, minute = 0, from: Date = new Date()): Date {
  const target = WEEKDAY_JS_INDEX[weekday];
  const result = new Date(from);
  const diff = (target - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + diff);
  result.setHours(hour, minute, 0, 0);
  return result;
}
