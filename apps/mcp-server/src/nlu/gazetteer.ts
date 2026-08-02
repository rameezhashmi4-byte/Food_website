import type { Coordinates } from "@bitejoy/core";

/**
 * A small, hand-built gazetteer covering the areas the fictional dataset
 * actually has restaurants in. There is no real geocoder wired up yet (no
 * Google API key requirement for Stage 2) - this is the deterministic,
 * zero-setup stand-in. Unresolvable places correctly fall through to the
 * "where should I look?" follow-up question rather than guessing.
 */
interface GazetteerEntry {
  label: string;
  coordinates: Coordinates;
  aliases: string[];
}

const GAZETTEER: GazetteerEntry[] = [
  {
    label: "East Croydon",
    coordinates: { lat: 51.38, lng: -0.0911 },
    aliases: ["east croydon"],
  },
  {
    label: "West Croydon",
    coordinates: { lat: 51.3822, lng: -0.1121 },
    aliases: ["west croydon"],
  },
  {
    label: "South Croydon",
    coordinates: { lat: 51.3655, lng: -0.0993 },
    aliases: ["south croydon"],
  },
  {
    label: "Croydon Old Town",
    coordinates: { lat: 51.3705, lng: -0.1012 },
    aliases: ["croydon old town", "old town"],
  },
  {
    label: "Broad Green",
    coordinates: { lat: 51.3722, lng: -0.0876 },
    aliases: ["broad green"],
  },
  {
    label: "Streatham",
    coordinates: { lat: 51.4021, lng: -0.1276 },
    aliases: ["streatham"],
  },
  {
    label: "Croydon",
    coordinates: { lat: 51.3762, lng: -0.0982 },
    aliases: ["croydon", "central croydon", "croydon town centre", "croydon centre", "croydon center"],
  },
];

// Longest alias first, so "east croydon" is tried before the generic "croydon" catches it.
const ALIASES_BY_LENGTH = GAZETTEER.flatMap((entry) => entry.aliases.map((alias) => ({ alias, entry }))).sort(
  (a, b) => b.alias.length - a.alias.length,
);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export interface ResolvedLocation {
  label: string;
  coordinates: Coordinates;
}

/** Resolves free text like "near Croydon" or "East Croydon" to known coordinates, or undefined if nothing matches. */
export function resolveLocationText(text: string): ResolvedLocation | undefined {
  const normalized = normalize(text);
  if (!normalized) return undefined;

  for (const { alias, entry } of ALIASES_BY_LENGTH) {
    const pattern = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`);
    if (pattern.test(normalized)) {
      return { label: entry.label, coordinates: entry.coordinates };
    }
  }
  return undefined;
}

export function knownLocationLabels(): string[] {
  return GAZETTEER.map((entry) => entry.label);
}
