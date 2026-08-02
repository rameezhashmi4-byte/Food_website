import type { Coordinates } from "../types/common.js";
import type { DistanceInfo, TravelMode } from "../types/recommendation.js";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points, in kilometres. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * Rough average speeds used only as an offline fallback estimate. Stage 6
 * (live providers) should replace this with a real routing/travel-time API;
 * until then this keeps travel time in the right ballpark for ranking.
 */
const AVERAGE_SPEED_KMH: Record<TravelMode, number> = {
  walking: 4.8,
  driving: 24,
  transit: 18,
};

export function estimateTravelTime(km: number, mode: TravelMode = "driving"): number {
  const speed = AVERAGE_SPEED_KMH[mode];
  const hours = km / speed;
  return Math.max(1, Math.round(hours * 60));
}

export function getDistanceInfo(a: Coordinates, b: Coordinates, mode: TravelMode = "driving"): DistanceInfo {
  const km = distanceKm(a, b);
  return {
    distanceKm: Math.round(km * 10) / 10,
    travelTimeMinutes: estimateTravelTime(km, mode),
    mode,
  };
}
