import type { OpeningHours } from "../types/restaurant.js";
import type { OpeningStatus } from "../types/recommendation.js";
import type { Weekday } from "../types/common.js";

const WEEKDAY_INDEX: Record<Weekday, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const JS_DAY_TO_WEEKDAY: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MINUTES_PER_WEEK = 7 * 24 * 60;
const CLOSING_SOON_WINDOW_MINUTES = 30;

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function weekdayOf(at: Date): Weekday {
  return JS_DAY_TO_WEEKDAY[at.getDay()] ?? "monday";
}

/** Minutes since the start of the week (Monday 00:00), assumed to be in the venue's local time. */
function minutesSinceWeekStart(day: Weekday, hhmm: string): number {
  return WEEKDAY_INDEX[day] * 1440 + hhmmToMinutes(hhmm);
}

interface ExpandedInterval {
  startMin: number;
  endMin: number;
}

/** Expands each opening interval to an absolute [start,end] within the weekly cycle, handling overnight wraps (e.g. Fri 18:00 - Sat 02:00). */
function expandIntervals(hours: OpeningHours): ExpandedInterval[] {
  return hours.intervals.map((interval) => {
    const start = minutesSinceWeekStart(interval.day, interval.opensAt);
    let end = minutesSinceWeekStart(interval.day, interval.closesAt);
    if (end <= start) end += 1440;
    return { startMin: start, endMin: end };
  });
}

function isWithin(nowMin: number, interval: ExpandedInterval): boolean {
  for (const offset of [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK]) {
    const shifted = nowMin + offset;
    if (shifted >= interval.startMin && shifted <= interval.endMin) return true;
  }
  return false;
}

export function isOpenAt(hours: OpeningHours, at: Date): boolean {
  const nowMin = minutesSinceWeekStart(weekdayOf(at), `${at.getHours()}:${at.getMinutes()}`);
  return expandIntervals(hours).some((interval) => isWithin(nowMin, interval));
}

export function getOpeningStatus(hours: OpeningHours, at: Date = new Date()): OpeningStatus {
  if (hours.intervals.length === 0) return "unknown";

  const nowMin = minutesSinceWeekStart(weekdayOf(at), `${at.getHours()}:${at.getMinutes()}`);
  const intervals = expandIntervals(hours);

  const openInterval = intervals.find((interval) => isWithin(nowMin, interval));
  if (openInterval) {
    for (const offset of [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK]) {
      const shifted = nowMin + offset;
      if (shifted >= openInterval.startMin && shifted <= openInterval.endMin) {
        const minutesToClose = openInterval.endMin - shifted;
        return minutesToClose <= CLOSING_SOON_WINDOW_MINUTES ? "closing_soon" : "open_now";
      }
    }
  }

  const opensLaterToday = intervals.some((interval) => {
    for (const offset of [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK]) {
      const shiftedStart = interval.startMin - offset;
      if (shiftedStart > nowMin && shiftedStart - nowMin < 24 * 60) return true;
    }
    return false;
  });

  return opensLaterToday ? "opens_later_today" : "closed";
}
