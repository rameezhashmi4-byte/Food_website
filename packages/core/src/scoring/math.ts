export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function overlapFraction<T>(wanted: T[], available: T[]): number {
  if (wanted.length === 0) return 0.5; // no preference expressed - neutral, not a penalty
  const matched = wanted.filter((item) => available.includes(item));
  return matched.length / wanted.length;
}
