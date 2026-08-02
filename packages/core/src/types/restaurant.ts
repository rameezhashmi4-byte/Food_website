import { z } from "zod";
import {
  AtmosphereSchema,
  CoordinatesSchema,
  CuisineSchema,
  DietaryTagSchema,
  FacilitySchema,
  PriceLevelSchema,
  SourceMetaSchema,
  WeekdaySchema,
} from "./common.js";

export const OpeningHoursIntervalSchema = z.object({
  day: WeekdaySchema,
  opensAt: z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM"),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM"),
});
export type OpeningHoursInterval = z.infer<typeof OpeningHoursIntervalSchema>;

export const OpeningHoursSchema = z.object({
  intervals: z.array(OpeningHoursIntervalSchema),
  meta: SourceMetaSchema,
});
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

export const MenuItemCategorySchema = z.enum(["food", "drink"]);
export type MenuItemCategory = z.infer<typeof MenuItemCategorySchema>;

export const MenuItemSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: MenuItemCategorySchema,
  priceGbp: z.number().nonnegative(),
  dietaryTags: z.array(DietaryTagSchema).default([]),
  isPopular: z.boolean().default(false),
  imageUrl: z.string().url().optional(),
  meta: SourceMetaSchema,
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const OfferTypeSchema = z.enum([
  "flash_discount",
  "happy_hour",
  "set_menu",
  "lunch_deal",
  "student_deal",
  "group_offer",
  "drinks_offer",
  "opening_promotion",
]);
export type OfferType = z.infer<typeof OfferTypeSchema>;

export const OfferSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  type: OfferTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  discountText: z.string().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  meta: SourceMetaSchema,
});
export type Offer = z.infer<typeof OfferSchema>;

/** True if an offer's validity window covers `at` (defaults to now). Expired offers must never be shown. */
export function isOfferActive(offer: Offer, at: Date = new Date()): boolean {
  const from = new Date(offer.validFrom).getTime();
  const until = new Date(offer.validUntil).getTime();
  const t = at.getTime();
  return t >= from && t <= until;
}

export const ReviewSummarySchema = z.object({
  restaurantId: z.string(),
  averageRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  themes: z.array(z.string()).default([]),
  meta: SourceMetaSchema,
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

export const RestaurantStatusSchema = z.enum(["active", "temporarily_closed", "permanently_closed"]);
export type RestaurantStatus = z.infer<typeof RestaurantStatusSchema>;

export const ExternalIdsSchema = z
  .object({
    googlePlaceId: z.string().optional(),
    bookingProviderId: z.string().optional(),
    orderingProviderId: z.string().optional(),
  })
  .default({});
export type ExternalIds = z.infer<typeof ExternalIdsSchema>;

export const RestaurantSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  cuisines: z.array(CuisineSchema).min(1),
  location: CoordinatesSchema,
  address: z.string(),
  area: z.string(),
  city: z.string(),
  postcode: z.string().optional(),
  priceLevel: PriceLevelSchema,
  averagePricePerPersonGbp: z.number().positive(),
  atmosphere: z.array(AtmosphereSchema).default([]),
  facilities: z.array(FacilitySchema).default([]),
  dietaryOptions: z.array(DietaryTagSchema).default([]),
  isIndependent: z.boolean().default(false),
  status: RestaurantStatusSchema.default("active"),
  /** When the restaurant opened, if known - powers "new openings" discovery. Omit if unknown; never guess it. */
  openedAt: z.string().datetime().optional(),
  images: z.array(z.string().url()).default([]),
  bookingUrl: z.string().url().optional(),
  orderingUrl: z.string().url().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  externalIds: ExternalIdsSchema,
  openingHours: OpeningHoursSchema,
  reviewSummary: ReviewSummarySchema.optional(),
  menuItems: z.array(MenuItemSchema).default([]),
  offers: z.array(OfferSchema).default([]),
  /** Rolling activity signal (e.g. recent saves/searches) used to surface trending & hidden-gem candidates. */
  trendScore: z.number().min(0).max(1).default(0),
  meta: SourceMetaSchema,
});
export type Restaurant = z.infer<typeof RestaurantSchema>;
