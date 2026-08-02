import { z } from "zod";
import { AtmosphereSchema, CoordinatesSchema, CuisineSchema, DietaryTagSchema } from "./common.js";

export const AuthProviderSchema = z.enum(["google", "microsoft", "email", "anonymous"]);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email().optional(),
  authProvider: AuthProviderSchema,
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserPreferencesSchema = z.object({
  userId: z.string(),
  favoriteCuisines: z.array(CuisineSchema).default([]),
  dietaryNeeds: z.array(DietaryTagSchema).default([]),
  budgetPerPersonGbp: z.number().positive().optional(),
  preferredAtmosphere: z.array(AtmosphereSchema).default([]),
  favoriteDrinks: z.array(z.string()).default([]),
  homeLocation: CoordinatesSchema.optional(),
  updatedAt: z.string().datetime(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/** A fraction 0..1 of how many preference fields are filled in - used to award the "completing preferences" Joy Points action once, not repeatedly. */
export function preferencesCompleteness(prefs: Partial<UserPreferences>): number {
  const fields: Array<keyof UserPreferences> = [
    "favoriteCuisines",
    "dietaryNeeds",
    "budgetPerPersonGbp",
    "preferredAtmosphere",
    "favoriteDrinks",
    "homeLocation",
  ];
  const filled = fields.filter((f) => {
    const v = prefs[f];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null;
  });
  return filled.length / fields.length;
}
