/**
 * Mirrors the JSON shape returned by @bitejoy/mcp-server's tool
 * structuredContent (see apps/mcp-server/src/lib/cardView.ts and
 * lib/comparison.ts). Deliberately its own plain-string-typed definitions
 * rather than importing @bitejoy/core - this widget is a browser bundle and
 * should stay dependency-free; the contract is the wire JSON shape, not
 * shared TypeScript unions.
 */

export interface PricedItem {
  name: string;
  priceGbp: number;
}

export interface OfferView {
  title: string;
  discountText?: string;
  type: string;
  validUntil: string;
  isVerified: boolean;
}

export interface DataFreshnessView {
  label: string;
  source: string;
  isVerified: boolean;
  lastCheckedAt: string;
}

export interface RestaurantCard {
  id: string;
  slug: string;
  name: string;
  image?: string;
  cuisines: string[];
  area: string;
  city: string;
  address: string;
  location: { lat: number; lng: number };
  distanceKm: number;
  travelTimeMinutes: number;
  travelMode: string;
  priceLevel: string;
  pricePerPersonGbp: number;
  popularFoodPrices: PricedItem[];
  popularDrinkPrices: PricedItem[];
  offers: OfferView[];
  openingStatus: string;
  rating?: number;
  reviewCount?: number;
  popularDishes: string[];
  dietaryOptions: string[];
  atmosphere: string[];
  facilities: string[];
  isIndependent: boolean;
  isNewOpening: boolean;
  matchScorePercent: number;
  reasons: string[];
  dataFreshness: DataFreshnessView;
  bookingUrl?: string;
  orderingUrl?: string;
  website?: string;
}

export interface ResultsToolOutput {
  mode: string;
  locationLabel: string;
  recommendations: RestaurantCard[];
  count: number;
}

export interface SurpriseToolOutput {
  mode: "surprise_me";
  locationLabel: string;
  recommendation: RestaurantCard;
}

export interface ComparisonEntry {
  card: RestaurantCard;
  meetsAllRequirements: boolean;
  tradeOffs: string[];
}

export interface ComparisonToolOutput {
  locationLabel: string;
  items: ComparisonEntry[];
  bestOverallMatch?: string;
  bestValue?: string;
  bestAtmosphere?: string;
  bestForGroup?: string;
}

export function isSurpriseOutput(output: ResultsToolOutput | SurpriseToolOutput): output is SurpriseToolOutput {
  return "recommendation" in output;
}
