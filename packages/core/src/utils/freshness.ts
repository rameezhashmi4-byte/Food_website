import type { SourceMeta } from "../types/common.js";

/**
 * How long a fact stays trustworthy before it should be treated as stale.
 * Offers move fast; opening hours barely move at all.
 */
export const FRESHNESS_WINDOWS_HOURS = {
  offer: 24,
  openingHours: 24 * 30,
  menu: 24 * 14,
  reviewSummary: 24 * 7,
  restaurantCore: 24 * 30,
} as const;

export type FreshnessCategory = keyof typeof FRESHNESS_WINDOWS_HOURS;

export function isStale(meta: SourceMeta, category: FreshnessCategory, now: Date = new Date()): boolean {
  const lastChecked = new Date(meta.lastCheckedAt).getTime();
  const windowMs = FRESHNESS_WINDOWS_HOURS[category] * 60 * 60 * 1000;
  return now.getTime() - lastChecked > windowMs;
}

export function hoursSinceChecked(meta: SourceMeta, now: Date = new Date()): number {
  const lastChecked = new Date(meta.lastCheckedAt).getTime();
  return (now.getTime() - lastChecked) / (60 * 60 * 1000);
}

/** Human-friendly "data freshness" label for display in a recommendation card. */
export function freshnessLabel(meta: SourceMeta, now: Date = new Date()): string {
  const hours = hoursSinceChecked(meta, now);
  if (hours < 1) return "Checked moments ago";
  if (hours < 24) return `Checked ${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Checked yesterday";
  if (days <= 30) return `Checked ${days} days ago`;
  return "May be out of date";
}
