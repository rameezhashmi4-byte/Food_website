import { z } from "zod";
import type { SavedRestaurant } from "../repository/types.js";

/**
 * The safe, minimal view of a saved-restaurant record - deliberately
 * doesn't include `userId` (the caller already knows who they are; no need
 * to echo their own id back) or any other internal identifier beyond the
 * restaurant id needed to act on it again (remove_saved_restaurant).
 */
export const SavedRestaurantViewSchema = z.object({
  restaurantId: z.string(),
  note: z.string().optional(),
  savedAt: z.string().datetime(),
});
export type SavedRestaurantView = z.infer<typeof SavedRestaurantViewSchema>;

export function toSavedRestaurantView(record: SavedRestaurant): SavedRestaurantView {
  return { restaurantId: record.restaurantId, note: record.note, savedAt: record.createdAt };
}
