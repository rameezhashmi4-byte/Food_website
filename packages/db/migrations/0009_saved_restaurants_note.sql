-- BiteJoy schema, migration 0009: add an optional personal note to saved
-- restaurants.
--
-- `saved_restaurants` already exists (0004_mvp_community.sql) with the
-- right shape for everything except the note: primary key
-- `(user_id, restaurant_id)` already gives us the "UNIQUE (user_id,
-- restaurant_id)" the packages/database contract asks for, and its RLS
-- policy ("users manage their own saved restaurants", `auth.uid() =
-- user_id` for all operations) already matches. It's just missing the
-- `note` field from `SavedRestaurantSchema` - add it in place rather than
-- creating a second, competing saved-restaurants table.

alter table saved_restaurants
  add column note text check (note is null or char_length(note) <= 280);
