import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseUserRepository } from "@/lib/database";
import { getRestaurantSummaries } from "@/lib/restaurants/lookup";
import { removeSavedRestaurantAction } from "@/actions/saved";
import { humanizeToken } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Saved restaurants" };

export default async function SavedRestaurantsPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const repository = createSupabaseUserRepository(supabase);

  const { items: saved } = await repository.listSavedRestaurants(user.id, { limit: 50 });
  const summaries = await getRestaurantSummaries(
    supabase,
    saved.map((s) => s.restaurantId),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Saved restaurants</h1>
        <p className="mt-1 text-muted">Places you&rsquo;ve saved while chatting with BiteJoy.</p>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="When BiteJoy shows you somewhere you like in ChatGPT, save it and it'll show up here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {saved.map((item) => {
            const restaurant = summaries.get(item.restaurantId);
            return (
              <li key={item.restaurantId}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-text">{restaurant?.name ?? "Restaurant no longer available"}</p>
                    {restaurant ? (
                      <p className="text-sm text-muted">
                        {restaurant.area}, {restaurant.city}
                        {restaurant.cuisines.length > 0 && ` · ${restaurant.cuisines.map(humanizeToken).join(", ")}`}
                      </p>
                    ) : (
                      <p className="text-sm text-muted">ID: {item.restaurantId}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">Saved {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <form action={removeSavedRestaurantAction}>
                    <input type="hidden" name="restaurantId" value={item.restaurantId} />
                    <Button type="submit" variant="secondary" size="sm">
                      Remove
                    </Button>
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
