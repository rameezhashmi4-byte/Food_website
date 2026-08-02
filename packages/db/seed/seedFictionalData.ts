/**
 * Seeds Supabase with the fictional demonstration dataset from
 * @bitejoy/core. Idempotent: safe to re-run - restaurants are upserted by
 * slug, and each restaurant's hours/menu/offers are replaced wholesale on
 * every run rather than accumulating duplicates.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed -w @bitejoy/db
 */
import { createClient } from "@supabase/supabase-js";
import { FICTIONAL_RESTAURANTS, type Restaurant } from "@bitejoy/core";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY - see .env.example");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function toRestaurantRow(restaurant: Restaurant) {
  return {
    slug: restaurant.slug,
    name: restaurant.name,
    description: restaurant.description ?? null,
    cuisines: restaurant.cuisines,
    lat: restaurant.location.lat,
    lng: restaurant.location.lng,
    address: restaurant.address,
    area: restaurant.area,
    city: restaurant.city,
    postcode: restaurant.postcode ?? null,
    price_level: restaurant.priceLevel,
    average_price_per_person_gbp: restaurant.averagePricePerPersonGbp,
    atmosphere: restaurant.atmosphere,
    facilities: restaurant.facilities,
    dietary_options: restaurant.dietaryOptions,
    is_independent: restaurant.isIndependent,
    status: restaurant.status,
    opened_at: restaurant.openedAt ?? null,
    images: restaurant.images,
    booking_url: restaurant.bookingUrl ?? null,
    ordering_url: restaurant.orderingUrl ?? null,
    phone: restaurant.phone ?? null,
    website: restaurant.website ?? null,
    google_place_id: restaurant.externalIds.googlePlaceId ?? null,
    booking_provider_id: restaurant.externalIds.bookingProviderId ?? null,
    ordering_provider_id: restaurant.externalIds.orderingProviderId ?? null,
    trend_score: restaurant.trendScore,
    source: restaurant.meta.source,
    is_verified: restaurant.meta.isVerified,
    last_checked_at: restaurant.meta.lastCheckedAt,
  };
}

async function seedRestaurant(restaurant: Restaurant): Promise<void> {
  const { data: row, error: upsertError } = await supabase
    .from("restaurants")
    .upsert(toRestaurantRow(restaurant), { onConflict: "slug" })
    .select("id")
    .single();

  if (upsertError || !row) {
    throw new Error(`Failed to upsert ${restaurant.slug}: ${upsertError?.message}`);
  }

  const restaurantId = row.id as string;

  await supabase.from("restaurant_opening_hours").delete().eq("restaurant_id", restaurantId);
  if (restaurant.openingHours.intervals.length > 0) {
    const { error } = await supabase.from("restaurant_opening_hours").insert(
      restaurant.openingHours.intervals.map((interval) => ({
        restaurant_id: restaurantId,
        day: interval.day,
        opens_at: interval.opensAt,
        closes_at: interval.closesAt,
        source: restaurant.openingHours.meta.source,
        last_checked_at: restaurant.openingHours.meta.lastCheckedAt,
      })),
    );
    if (error) throw new Error(`Failed to insert opening hours for ${restaurant.slug}: ${error.message}`);
  }

  await supabase.from("menu_items").delete().eq("restaurant_id", restaurantId);
  if (restaurant.menuItems.length > 0) {
    const { error } = await supabase.from("menu_items").insert(
      restaurant.menuItems.map((item) => ({
        restaurant_id: restaurantId,
        name: item.name,
        description: item.description ?? null,
        category: item.category,
        price_gbp: item.priceGbp,
        dietary_tags: item.dietaryTags,
        is_popular: item.isPopular,
        image_url: item.imageUrl ?? null,
        source: item.meta.source,
        is_verified: item.meta.isVerified,
        last_checked_at: item.meta.lastCheckedAt,
      })),
    );
    if (error) throw new Error(`Failed to insert menu items for ${restaurant.slug}: ${error.message}`);
  }

  await supabase.from("offers").delete().eq("restaurant_id", restaurantId);
  if (restaurant.offers.length > 0) {
    const { error } = await supabase.from("offers").insert(
      restaurant.offers.map((offer) => ({
        restaurant_id: restaurantId,
        type: offer.type,
        title: offer.title,
        description: offer.description ?? null,
        discount_text: offer.discountText ?? null,
        valid_from: offer.validFrom,
        valid_until: offer.validUntil,
        source: offer.meta.source,
        is_verified: offer.meta.isVerified,
        last_checked_at: offer.meta.lastCheckedAt,
      })),
    );
    if (error) throw new Error(`Failed to insert offers for ${restaurant.slug}: ${error.message}`);
  }

  if (restaurant.reviewSummary) {
    const { error } = await supabase.from("review_summaries").upsert(
      {
        restaurant_id: restaurantId,
        average_rating: restaurant.reviewSummary.averageRating,
        review_count: restaurant.reviewSummary.reviewCount,
        themes: restaurant.reviewSummary.themes,
        source: restaurant.reviewSummary.meta.source,
        is_verified: restaurant.reviewSummary.meta.isVerified,
        last_checked_at: restaurant.reviewSummary.meta.lastCheckedAt,
      },
      { onConflict: "restaurant_id" },
    );
    if (error) throw new Error(`Failed to upsert review summary for ${restaurant.slug}: ${error.message}`);
  }

  console.log(`Seeded ${restaurant.name} (${restaurantId})`);
}

async function main() {
  console.log(`Seeding ${FICTIONAL_RESTAURANTS.length} fictional restaurants into ${SUPABASE_URL}...`);
  for (const restaurant of FICTIONAL_RESTAURANTS) {
    await seedRestaurant(restaurant);
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
