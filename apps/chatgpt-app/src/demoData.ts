import type { ComparisonToolOutput, ResultsToolOutput, RestaurantCard } from "./types.js";

/**
 * Fictional preview data so `npm run dev` renders something real without a
 * live MCP server or ChatGPT host - matches the shape of Flame & Fork from
 * @bitejoy/core's demo dataset closely enough to sanity-check the UI.
 */
const flameFork: RestaurantCard = {
  id: "r_flame_fork",
  slug: "flame-and-fork",
  name: "Flame & Fork",
  image: undefined,
  cuisines: ["burgers", "american"],
  area: "East Croydon",
  city: "Croydon",
  address: "12 Dingwall Road, Croydon",
  location: { lat: 51.3757, lng: -0.0921 },
  distanceKm: 0.4,
  travelTimeMinutes: 5,
  travelMode: "walking",
  priceLevel: "moderate",
  pricePerPersonGbp: 28,
  popularFoodPrices: [
    { name: "Double Smash Burger", priceGbp: 13.5 },
    { name: "Fire-Roasted Cauliflower Burger", priceGbp: 12 },
  ],
  popularDrinkPrices: [{ name: "Smoked Old Fashioned", priceGbp: 9.5 }],
  offers: [{ title: "Tables of 4+ get a free starter platter", type: "group_offer", validUntil: "", isVerified: true }],
  openingStatus: "open_now",
  rating: 4.6,
  reviewCount: 812,
  popularDishes: ["Double Smash Burger", "Fire-Roasted Cauliflower Burger", "Smoked Old Fashioned"],
  dietaryOptions: ["vegetarian", "gluten_free"],
  atmosphere: ["lively", "casual", "trendy"],
  facilities: ["parking", "large_groups", "wheelchair_accessible", "wifi"],
  isIndependent: true,
  isNewOpening: false,
  matchScorePercent: 87,
  reasons: [
    "Serves burgers",
    "About £28 per person, within your £30 budget",
    "Has parking, large groups",
    "Rated 4.6/5 from 812 reviews",
  ],
  dataFreshness: { label: "Checked 4h ago", source: "fictional_demo", isVerified: true, lastCheckedAt: new Date().toISOString() },
  bookingUrl: "https://booking.bitejoy.app/demo/flame-and-fork",
  orderingUrl: "https://order.bitejoy.app/demo/flame-and-fork",
  website: "https://flameandfork.example.com",
};

const emberVine: RestaurantCard = {
  ...flameFork,
  id: "r_ember_vine",
  slug: "ember-and-vine",
  name: "Ember & Vine",
  cuisines: ["tapas_small_plates", "fusion"],
  area: "East Croydon",
  distanceKm: 1.2,
  travelTimeMinutes: 15,
  travelMode: "driving",
  pricePerPersonGbp: 29,
  rating: 4.6,
  reviewCount: 28,
  isNewOpening: true,
  matchScorePercent: 74,
  reasons: ["An independent spot that's loved by the people who've found it", "Getting a lot of love from BiteJoy explorers right now"],
  atmosphere: ["trendy", "intimate", "relaxed"],
  facilities: ["outdoor_seating", "wheelchair_accessible", "wifi"],
  offers: [],
  popularDishes: ["Wood-Fired Hispi Cabbage", "Charred Octopus"],
};

export const DEMO_RESULTS: ResultsToolOutput = {
  mode: "search",
  locationLabel: "Croydon",
  recommendations: [flameFork, emberVine],
  count: 2,
};

export const DEMO_COMPARISON: ComparisonToolOutput = {
  locationLabel: "Croydon",
  items: [
    { card: flameFork, meetsAllRequirements: true, tradeOffs: [] },
    { card: emberVine, meetsAllRequirements: false, tradeOffs: ["fewer reviews than the others, so less proven"] },
  ],
  bestOverallMatch: flameFork.id,
  bestAtmosphere: emberVine.id,
};
