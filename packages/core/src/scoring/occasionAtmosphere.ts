import type { Atmosphere, Occasion } from "../types/common.js";

/** Best-effort mapping from a stated occasion to the atmospheres that usually suit it. */
export const OCCASION_ATMOSPHERE_MAP: Record<Occasion, Atmosphere[]> = {
  relaxed_evening: ["relaxed", "quiet"],
  first_date: ["romantic", "intimate"],
  birthday: ["lively", "trendy"],
  family_meal: ["family_friendly", "casual"],
  catch_up_with_friends: ["relaxed", "casual", "lively"],
  quick_lunch: ["casual"],
  celebration: ["lively", "upscale", "trendy"],
  late_night_food: ["late_night"],
  business_meal: ["upscale", "quiet"],
  solo_treat: ["quiet", "intimate", "casual"],
};
