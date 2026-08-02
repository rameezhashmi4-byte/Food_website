import { z } from "zod";
import {
  AtmosphereSchema,
  CuisineSchema,
  DietaryTagSchema,
  FacilitySchema,
  MenuItemCategorySchema,
  OfferTypeSchema,
  OpeningStatusSchema,
  PriceLevelSchema,
  WeekdaySchema,
  freshnessLabel,
  getOpeningStatus,
  isNewOpening,
  isOfferActive,
  type Restaurant,
} from "@bitejoy/core";
import { DataFreshnessViewSchema } from "./cardView.js";

export const MenuItemViewSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: MenuItemCategorySchema,
  priceGbp: z.number(),
  dietaryTags: z.array(DietaryTagSchema),
  isPopular: z.boolean(),
});

export const OpeningIntervalViewSchema = z.object({
  day: WeekdaySchema,
  opensAt: z.string(),
  closesAt: z.string(),
});

export const DetailOfferViewSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  discountText: z.string().optional(),
  type: OfferTypeSchema,
  validUntil: z.string(),
  isVerified: z.boolean(),
});

/**
 * The full structured record for one restaurant, independent of any
 * particular search (so no distance/match-score fields - those only make
 * sense relative to a search origin, see cardView.ts).
 */
export const RestaurantDetailViewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  cuisines: z.array(CuisineSchema),
  area: z.string(),
  city: z.string(),
  address: z.string(),
  postcode: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }),
  priceLevel: PriceLevelSchema,
  pricePerPersonGbp: z.number(),
  foodItems: z.array(MenuItemViewSchema),
  drinkItems: z.array(MenuItemViewSchema),
  popularDishes: z.array(z.string()),
  openingHours: z.array(OpeningIntervalViewSchema),
  openingStatus: OpeningStatusSchema,
  offers: z.array(DetailOfferViewSchema),
  dietaryOptions: z.array(DietaryTagSchema),
  atmosphere: z.array(AtmosphereSchema),
  facilities: z.array(FacilitySchema),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  reviewThemes: z.array(z.string()),
  isIndependent: z.boolean(),
  isNewOpening: z.boolean(),
  bookingUrl: z.string().optional(),
  orderingUrl: z.string().optional(),
  orderingAvailable: z.boolean(),
  website: z.string().optional(),
  phone: z.string().optional(),
  dataFreshness: DataFreshnessViewSchema,
});
export type RestaurantDetailView = z.infer<typeof RestaurantDetailViewSchema>;

export function toDetailView(restaurant: Restaurant, at: Date = new Date()): RestaurantDetailView {
  const foodItems = restaurant.menuItems.filter((item) => item.category === "food");
  const drinkItems = restaurant.menuItems.filter((item) => item.category === "drink");
  const popularDishes = restaurant.menuItems.filter((item) => item.isPopular).map((item) => item.name);
  const activeOffers = restaurant.offers.filter((offer) => isOfferActive(offer, at));

  return {
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    description: restaurant.description,
    cuisines: restaurant.cuisines,
    area: restaurant.area,
    city: restaurant.city,
    address: restaurant.address,
    postcode: restaurant.postcode,
    location: restaurant.location,
    priceLevel: restaurant.priceLevel,
    pricePerPersonGbp: restaurant.averagePricePerPersonGbp,
    foodItems: foodItems.map(toMenuItemView),
    drinkItems: drinkItems.map(toMenuItemView),
    popularDishes: popularDishes.length > 0 ? popularDishes : foodItems.slice(0, 2).map((item) => item.name),
    openingHours: restaurant.openingHours.intervals.map((interval) => ({ ...interval })),
    openingStatus: getOpeningStatus(restaurant.openingHours, at),
    offers: activeOffers.map((offer) => ({
      title: offer.title,
      description: offer.description,
      discountText: offer.discountText,
      type: offer.type,
      validUntil: offer.validUntil,
      isVerified: offer.meta.isVerified,
    })),
    dietaryOptions: restaurant.dietaryOptions,
    atmosphere: restaurant.atmosphere,
    facilities: restaurant.facilities,
    rating: restaurant.reviewSummary?.averageRating,
    reviewCount: restaurant.reviewSummary?.reviewCount,
    reviewThemes: restaurant.reviewSummary?.themes ?? [],
    isIndependent: restaurant.isIndependent,
    isNewOpening: isNewOpening(restaurant, at),
    bookingUrl: restaurant.bookingUrl,
    orderingUrl: restaurant.orderingUrl,
    orderingAvailable: Boolean(restaurant.orderingUrl),
    website: restaurant.website,
    phone: restaurant.phone,
    dataFreshness: {
      label: freshnessLabel(restaurant.meta, at),
      source: restaurant.meta.source,
      isVerified: restaurant.meta.isVerified,
      lastCheckedAt: restaurant.meta.lastCheckedAt,
    },
  };
}

function toMenuItemView(item: Restaurant["menuItems"][number]) {
  return {
    name: item.name,
    description: item.description,
    category: item.category,
    priceGbp: item.priceGbp,
    dietaryTags: item.dietaryTags,
    isPopular: item.isPopular,
  };
}
