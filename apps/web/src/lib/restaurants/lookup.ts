import type { SupabaseClient } from "@supabase/supabase-js";

export interface RestaurantSummary {
  id: string;
  name: string;
  area: string;
  city: string;
  slug: string;
  cuisines: string[];
  priceLevel: string;
}

interface RestaurantRow {
  id: string;
  name: string;
  area: string;
  city: string;
  slug: string;
  cuisines: string[];
  price_level: string;
}

/**
 * Cheap, read-only lookup of display info (name/area/etc) for a batch of
 * restaurant ids, for `/account/saved`.
 *
 * This deliberately does NOT go through `@bitejoy/core`'s
 * `FictionalRestaurantProvider`: `saved_restaurants.restaurant_id` stores
 * the live Supabase `restaurants.id` (a uuid generated at seed time), which
 * is a different id space to the fictional dataset's own string ids (e.g.
 * `"r_flame_fork"`) - `FictionalRestaurantProvider.getRestaurantById` would
 * simply never match. The `restaurants` table itself has no RLS (it's
 * public data, same as every other reader of it - the MCP server included),
 * so a direct read here is the correct, cheap way to enrich the ids
 * `UserRepository.listSavedRestaurants` returns - it is not a substitute
 * for the repository abstraction, which only ever covers this user's own
 * data, and it still only ever runs server-side, never from a component.
 */
export async function getRestaurantSummaries(
  supabase: SupabaseClient,
  restaurantIds: string[],
): Promise<Map<string, RestaurantSummary>> {
  if (restaurantIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, area, city, slug, cuisines, price_level")
    .in("id", restaurantIds)
    .returns<RestaurantRow[]>();

  if (error) {
    console.error(`getRestaurantSummaries failed (non-fatal): ${error.message}`);
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        area: row.area,
        city: row.city,
        slug: row.slug,
        cuisines: row.cuisines ?? [],
        priceLevel: row.price_level,
      },
    ]),
  );
}
