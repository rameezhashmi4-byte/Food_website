import { nextWeekdayAt, type Weekday } from "@bitejoy/core";

const WEEKDAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const MEAL_HOUR: Record<string, number> = {
  breakfast: 9,
  brunch: 11,
  lunch: 13,
  "lunchtime": 13,
  afternoon: 15,
  dinner: 19,
  evening: 19,
  "late night": 22,
  "late-night": 22,
  night: 21,
};

const DEFAULT_DINING_HOUR = 19;

function findWeekday(text: string): Weekday | undefined {
  return WEEKDAYS.find((day) => new RegExp(`\\b${day}\\b`).test(text));
}

function findMealHour(text: string): number | undefined {
  for (const [phrase, hour] of Object.entries(MEAL_HOUR)) {
    if (new RegExp(`\\b${phrase}\\b`).test(text)) return hour;
  }
  return undefined;
}

/** Matches an explicit clock time, but only forms unambiguous enough not to false-positive on party sizes etc: "7pm", "7:30pm", "at 7", "19:00". */
function findExplicitTime(text: string): { hour: number; minute: number } | undefined {
  const ampm = text.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = ampm[2] ? Number(ampm[2]) : 0;
    const isPm = ampm[3]?.toLowerCase() === "pm";
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return { hour, minute };
  }

  const twentyFourHour = text.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFourHour) {
    return { hour: Number(twentyFourHour[1]), minute: Number(twentyFourHour[2]) };
  }

  const atHour = text.match(/\bat\s+(1[0-2]|0?[1-9]|1[3-9]|2[0-3])\b/i);
  if (atHour) {
    return { hour: Number(atHour[1]), minute: 0 };
  }

  return undefined;
}

export interface ResolvedDateTime {
  iso: string;
  /** Short, human-readable note on what was assumed (e.g. "tonight, 7pm") - surfaced so the summary can be transparent about it. */
  assumption: string;
}

/**
 * Deterministically resolves phrases like "tonight", "tomorrow evening",
 * "Friday at 7", "this Saturday lunch" into an absolute datetime relative to
 * `now`. Returns undefined when nothing about timing was mentioned at all -
 * callers should leave `dateTime` unset in that case (core already treats a
 * missing dateTime as "now"), rather than us guessing one.
 */
export function resolveRelativeDateTime(text: string, now: Date = new Date()): ResolvedDateTime | undefined {
  const normalized = text.toLowerCase();
  const explicitTime = findExplicitTime(normalized);
  const mealHour = findMealHour(normalized);
  const weekday = findWeekday(normalized);

  const mentionsTonight = /\btonight\b/.test(normalized);
  const mentionsToday = /\btoday\b/.test(normalized);
  const mentionsTomorrow = /\btomorrow|tmrw\b/.test(normalized);
  const mentionsWeekend = /\bweekend\b/.test(normalized);

  const hasAnyDaySignal = mentionsTonight || mentionsToday || mentionsTomorrow || mentionsWeekend || Boolean(weekday);
  const hasAnyTimeSignal = Boolean(explicitTime) || Boolean(mealHour) || mentionsTonight;

  if (!hasAnyDaySignal && !hasAnyTimeSignal) return undefined;

  const hour = explicitTime?.hour ?? mealHour ?? DEFAULT_DINING_HOUR;
  const minute = explicitTime?.minute ?? 0;

  let target: Date;
  let dayLabel: string;
  if (weekday) {
    target = nextWeekdayAt(weekday, hour, minute, now);
    dayLabel = weekday[0]?.toUpperCase() + weekday.slice(1);
  } else if (mentionsTomorrow) {
    target = new Date(now);
    target.setDate(target.getDate() + 1);
    target.setHours(hour, minute, 0, 0);
    dayLabel = "tomorrow";
  } else if (mentionsWeekend) {
    target = nextWeekdayAt("saturday", hour, minute, now);
    dayLabel = "Saturday";
  } else {
    // "tonight", "today", or a bare time/meal phrase - assume today.
    target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    dayLabel = mentionsTonight ? "tonight" : "today";
  }

  const timeLabel = formatHourMinute(hour, minute);
  return {
    iso: target.toISOString(),
    assumption: dayLabel === "tonight" || dayLabel === "today" ? `${dayLabel}, ${timeLabel}` : `${dayLabel} at ${timeLabel}`,
  };
}

function formatHourMinute(hour: number, minute: number): string {
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${displayHour}${period}` : `${displayHour}:${String(minute).padStart(2, "0")}${period}`;
}
