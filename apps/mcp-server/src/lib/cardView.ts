import { z } from "zod";
import {
  AtmosphereSchema,
  CuisineSchema,
  DietaryTagSchema,
  FacilitySchema,
  OfferTypeSchema,
  OpeningStatusSchema,
  PriceLevelSchema,
  TravelModeSchema,
  freshnessLabel,
  isNewOpening,
  type Recommendation,
} from "@bitejoy/core";

export const PricedItemViewSchema = z.object({ name: z.string(), priceGbp: z.number() });

export const OfferViewSchema = z.object({
  title: z.string(),
  discountText: z.string().optional(),
  type: OfferTypeSchema,
  validUntil: z.string(),
  isVerified: z.boolean(),
});

export const DataFreshnessViewSchema = z.object({
  label: z.string(),
  source: z.string(),
  isVerified: z.boolean(),
  lastCheckedAt: z.string(),
});

/**
 * The trimmed, chat-friendly view of a recommendation - everything the
 * product spec's "Recommendation output" section asks for, and nothing
 * more (full menus, raw scoring internals and every image are left out to
 * avoid flooding the model/chat with excessive data). `reasons` is plain
 * text lifted straight from the scoring engine's data-grounded reasons -
 * never model-invented.
 */
export const RestaurantCardViewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  image: z.string().optional(),
  cuisines: z.array(CuisineSchema),
  area: z.string(),
  city: z.string(),
  address: z.string(),
  location: z.object({ lat: z.number(), lng: z.number() }),
  distanceKm: z.number(),
  travelTimeMinutes: z.number(),
  travelMode: TravelModeSchema,
  priceLevel: PriceLevelSchema,
  pricePerPersonGbp: z.number(),
  popularFoodPrices: z.array(PricedItemViewSchema),
  popularDrinkPrices: z.array(PricedItemViewSchema),
  offers: z.array(OfferViewSchema),
  openingStatus: OpeningStatusSchema,
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  popularDishes: z.array(z.string()),
  dietaryOptions: z.array(DietaryTagSchema),
  atmosphere: z.array(AtmosphereSchema),
  facilities: z.array(FacilitySchema),
  isIndependent: z.boolean(),
  isNewOpening: z.boolean(),
  matchScorePercent: z.number(),
  reasons: z.array(z.string()),
  dataFreshness: DataFreshnessViewSchema,
  bookingUrl: z.string().optional(),
  orderingUrl: z.string().optional(),
  website: z.string().optional(),
});
export type RestaurantCardView = z.infer<typeof RestaurantCardViewSchema>;

export function toCardView(rec: Recommendation, at: Date = new Date()): RestaurantCardView {
  const restaurant = rec.restaurant;
  const foodItems = [...restaurant.menuItems]
    .filter((item) => item.category === "food")
    .sort((a, b) => Number(b.isPopular) - Number(a.isPopular))
    .slice(0, 3);
  const drinkItems = [...restaurant.menuItems]
    .filter((item) => item.category === "drink")
    .sort((a, b) => Number(b.isPopular) - Number(a.isPopular))
    .slice(0, 2);

  return {
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    image: restaurant.images[0],
    cuisines: restaurant.cuisines,
    area: restaurant.area,
    city: restaurant.city,
    address: restaurant.address,
    location: restaurant.location,
    distanceKm: rec.distance.distanceKm,
    travelTimeMinutes: rec.distance.travelTimeMinutes,
    travelMode: rec.distance.mode,
    priceLevel: restaurant.priceLevel,
    pricePerPersonGbp: rec.expectedPricePerPersonGbp,
    popularFoodPrices: foodItems.map((item) => ({ name: item.name, priceGbp: item.priceGbp })),
    popularDrinkPrices: drinkItems.map((item) => ({ name: item.name, priceGbp: item.priceGbp })),
    offers: rec.activeOffers.map((offer) => ({
      title: offer.title,
      discountText: offer.discountText,
      type: offer.type,
      validUntil: offer.validUntil,
      isVerified: offer.meta.isVerified,
    })),
    openingStatus: rec.openingStatus,
    rating: restaurant.reviewSummary?.averageRating,
    reviewCount: restaurant.reviewSummary?.reviewCount,
    popularDishes: rec.popularDishes,
    dietaryOptions: restaurant.dietaryOptions,
    atmosphere: restaurant.atmosphere,
    facilities: restaurant.facilities,
    isIndependent: restaurant.isIndependent,
    isNewOpening: isNewOpening(restaurant, at),
    matchScorePercent: Math.round(rec.score * 100),
    reasons: rec.reasons.map((reason) => reason.detail),
    dataFreshness: {
      label: freshnessLabel(restaurant.meta, at),
      source: restaurant.meta.source,
      isVerified: restaurant.meta.isVerified,
      lastCheckedAt: restaurant.meta.lastCheckedAt,
    },
    bookingUrl: restaurant.bookingUrl,
    orderingUrl: restaurant.orderingUrl,
    website: restaurant.website,
  };
}
