"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseUserRepository } from "@/lib/database";

export async function removeSavedRestaurantAction(formData: FormData): Promise<void> {
  const user = await requireUser("/account/saved");
  const restaurantId = formData.get("restaurantId");
  if (typeof restaurantId !== "string" || restaurantId.length === 0) return;

  const supabase = await createSupabaseServerClient();
  const repository = createSupabaseUserRepository(supabase);

  await repository.removeSavedRestaurant(user.id, restaurantId);
  await repository.recordActivity(user.id, "restaurant_removed", { restaurantId });

  revalidatePath("/account/saved");
}
