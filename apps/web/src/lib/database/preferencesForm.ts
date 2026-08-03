import { AtmosphereSchema, CuisineSchema, DietaryTagSchema, FacilitySchema, OccasionSchema } from "@bitejoy/core";
import type { PreferencesPatch, ProfilePatch, UserPreferences } from "./index";

/** Option lists for the preferences form's checkbox/radio groups, straight from `@bitejoy/core`'s shared vocabulary. */
export const CUISINE_OPTIONS = CuisineSchema.options;
export const DIETARY_OPTIONS = DietaryTagSchema.options;
export const ATMOSPHERE_OPTIONS = AtmosphereSchema.options;
export const OCCASION_OPTIONS = OccasionSchema.options;

/**
 * The real `UserPreferences.accessibilityNeeds` is a constrained
 * `Facility[]` (shared with restaurant filtering), not free text - these
 * are the subset of facility tags that are genuinely accessibility-related,
 * shown as a short, friendly checklist rather than the full facility list.
 */
export const ACCESSIBILITY_FACILITY_OPTIONS = [
  "wheelchair_accessible",
  "wheelchair_accessible_toilet",
] as const satisfies readonly (typeof FacilitySchema.options)[number][];

function numberOrUndefined(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function textOrUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Splits a free-text, comma-separated field into a clean, de-duplicated list. */
function toList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return Array.from(new Set(value.split(",").map((s) => s.trim()).filter((s) => s.length > 0)));
}

/**
 * Checkbox values are submitted as plain strings, so a malformed or
 * tampered request could send anything under these field names. Filtering
 * to the known option set here means an unexpected value is silently
 * dropped instead of ever reaching the database.
 */
function toKnownOptions<T extends string>(values: FormDataEntryValue[], allowed: readonly T[]): T[] {
  const allowedSet = new Set<string>(allowed);
  const seen = new Set<T>();
  for (const value of values) {
    if (typeof value === "string" && allowedSet.has(value)) seen.add(value as T);
  }
  return Array.from(seen);
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((item) => setB.has(item));
}

export interface ParsedPreferencesForm {
  budgetPerPersonGbp?: number;
  searchRadiusKm?: number;
  favoriteCuisines: PreferencesPatch["favoriteCuisines"] & {};
  dietaryNeeds: PreferencesPatch["dietaryNeeds"] & {};
  foodPreferences: string[];
  drinkPreferences: string[];
  preferredAtmosphere: PreferencesPatch["preferredAtmosphere"] & {};
  favoriteOccasions: PreferencesPatch["favoriteOccasions"] & {};
  parkingImportant?: boolean;
  accessibilityNeeds: PreferencesPatch["accessibilityNeeds"] & {};
  homeArea?: string;
  workArea?: string;
}

/**
 * Reads every preferences field out of a submitted form into a full
 * "intended state" object. Not the patch sent to `updatePreferences` yet -
 * see `diffPreferencesPatch`, which compares this against what was already
 * saved and keeps only what actually changed. `homeArea`/`workArea` live on
 * the profile, not preferences (see `diffProfilePatch`) - captured here
 * anyway since they're shown on the same short, friendly form.
 */
export function parsePreferencesForm(formData: FormData): ParsedPreferencesForm {
  const parkingRaw = formData.get("parkingImportant");

  return {
    budgetPerPersonGbp: numberOrUndefined(formData.get("budgetPerPersonGbp")),
    searchRadiusKm: numberOrUndefined(formData.get("searchRadiusKm")),
    favoriteCuisines: toKnownOptions(formData.getAll("favoriteCuisines"), CUISINE_OPTIONS),
    dietaryNeeds: toKnownOptions(formData.getAll("dietaryNeeds"), DIETARY_OPTIONS),
    foodPreferences: toList(formData.get("foodPreferences")),
    drinkPreferences: toList(formData.get("drinkPreferences")),
    preferredAtmosphere: toKnownOptions(formData.getAll("preferredAtmosphere"), ATMOSPHERE_OPTIONS),
    favoriteOccasions: toKnownOptions(formData.getAll("favoriteOccasions"), OCCASION_OPTIONS),
    parkingImportant: typeof parkingRaw === "string" ? parkingRaw === "true" : undefined,
    accessibilityNeeds: toKnownOptions(formData.getAll("accessibilityNeeds"), ACCESSIBILITY_FACILITY_OPTIONS),
    homeArea: textOrUndefined(formData.get("homeArea")),
    workArea: textOrUndefined(formData.get("workArea")),
  };
}

/**
 * Keeps only the preference fields that actually differ from what's
 * already saved, so `updatePreferences` only ever receives a genuinely
 * partial patch (per the product brief: "only changed fields sent").
 */
export function diffPreferencesPatch(current: UserPreferences | undefined, submitted: ParsedPreferencesForm): PreferencesPatch {
  const patch: PreferencesPatch = {};

  if (submitted.budgetPerPersonGbp !== undefined && submitted.budgetPerPersonGbp !== current?.budgetPerPersonGbp) {
    patch.budgetPerPersonGbp = submitted.budgetPerPersonGbp;
  }
  if (submitted.searchRadiusKm !== undefined && submitted.searchRadiusKm !== current?.searchRadiusKm) {
    patch.searchRadiusKm = submitted.searchRadiusKm;
  }
  if (!sameSet(submitted.favoriteCuisines, current?.favoriteCuisines ?? [])) {
    patch.favoriteCuisines = submitted.favoriteCuisines;
  }
  if (!sameSet(submitted.dietaryNeeds, current?.dietaryNeeds ?? [])) {
    patch.dietaryNeeds = submitted.dietaryNeeds;
  }
  if (!sameSet(submitted.foodPreferences, current?.foodPreferences ?? [])) {
    patch.foodPreferences = submitted.foodPreferences;
  }
  if (!sameSet(submitted.drinkPreferences, current?.drinkPreferences ?? [])) {
    patch.drinkPreferences = submitted.drinkPreferences;
  }
  if (!sameSet(submitted.preferredAtmosphere, current?.preferredAtmosphere ?? [])) {
    patch.preferredAtmosphere = submitted.preferredAtmosphere;
  }
  if (!sameSet(submitted.favoriteOccasions, current?.favoriteOccasions ?? [])) {
    patch.favoriteOccasions = submitted.favoriteOccasions;
  }
  if (submitted.parkingImportant !== undefined && submitted.parkingImportant !== current?.parkingImportant) {
    patch.parkingImportant = submitted.parkingImportant;
  }
  if (!sameSet(submitted.accessibilityNeeds, current?.accessibilityNeeds ?? [])) {
    patch.accessibilityNeeds = submitted.accessibilityNeeds;
  }

  return patch;
}

/** Same idea as `diffPreferencesPatch`, but for the profile-level home/work area fields. */
export function diffProfilePatch(
  current: { homeArea?: string; workArea?: string } | undefined,
  submitted: ParsedPreferencesForm,
): ProfilePatch {
  const patch: ProfilePatch = {};
  if (submitted.homeArea !== undefined && submitted.homeArea !== current?.homeArea) patch.homeArea = submitted.homeArea;
  if (submitted.workArea !== undefined && submitted.workArea !== current?.workArea) patch.workArea = submitted.workArea;
  return patch;
}
