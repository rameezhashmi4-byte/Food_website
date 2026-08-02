import type { Restaurant } from "../types/restaurant.js";

/** A restaurant counts as a "new opening" for this many days after `openedAt`. */
export const NEW_OPENING_WINDOW_DAYS = 60;

export function isNewOpening(restaurant: Restaurant, at: Date = new Date(), withinDays = NEW_OPENING_WINDOW_DAYS): boolean {
  if (!restaurant.openedAt) return false;
  const openedAt = new Date(restaurant.openedAt).getTime();
  const ageMs = at.getTime() - openedAt;
  const windowMs = withinDays * 24 * 60 * 60 * 1000;
  return ageMs >= 0 && ageMs <= windowMs;
}

export function daysSinceOpening(restaurant: Restaurant, at: Date = new Date()): number | undefined {
  if (!restaurant.openedAt) return undefined;
  const openedAt = new Date(restaurant.openedAt).getTime();
  return Math.floor((at.getTime() - openedAt) / (24 * 60 * 60 * 1000));
}
