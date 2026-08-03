-- BiteJoy schema, migration 0008: reconcile Stage-1 `profiles` /
-- `user_preferences` with the richer UserProfile / UserPreferences
-- contract now shared by apps/mcp-server and apps/web via
-- packages/database/src/types.ts.
--
-- Reconciliation choice: ALTER the existing tables from
-- 0003_users_and_preferences.sql in place rather than creating new ones.
-- Both tables already exist, already have the right primary keys and RLS
-- shape (`auth.uid() = id` / `auth.uid() = user_id`), and are already
-- referenced by foreign keys from 0004/0006 (saved_restaurants,
-- food_lists, joy_points_*, ...). Recreating them under new names would
-- mean re-pointing every one of those FKs for no real benefit. What
-- actually changes:
--
--   * `profiles` gains `home_area` / `work_area` (free text, e.g.
--     "Croydon") to match `UserProfile.homeArea` / `.workArea`, plus
--     length checks mirroring `ProfilePatchSchema`'s `.max(...)` bounds,
--     and a DELETE policy so `UserRepository.deleteAllUserData` can
--     remove a profile through a user-scoped client (the 0003 policies
--     only covered select/update/insert).
--
--   * `user_preferences` gains every field `UserPreferences` has that
--     Stage 1 didn't: search radius, max travel time, disliked cuisines,
--     food preferences, favourite occasions, parking importance,
--     accessibility needs and default party size. These reuse the
--     `cuisine`, `atmosphere`, `occasion` and `facility` enum types
--     already defined in 0001_extensions_and_enums.sql rather than
--     redefining them.
--
--   * `user_preferences.favorite_drinks` (text[]) is renamed to
--     `drink_preferences` to match `UserPreferences.drinkPreferences` -
--     same shape and meaning, just the contract's field name.
--
--   * `user_preferences.home_lat` / `home_lng` are dropped. No shipped
--     app ever read or wrote per-user home coordinates, they aren't part
--     of the new contract, and "home" is now the free-text
--     `profiles.home_area` above (restaurant-side lat/lng for distance
--     scoring is untouched, on `restaurants`). The project has no
--     production users yet, so dropping now is safe; carrying the dead
--     columns forward would just be confusing.

alter table profiles
  add column home_area text,
  add column work_area text;

alter table profiles
  add constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  add constraint profiles_home_area_length check (home_area is null or char_length(home_area) <= 120),
  add constraint profiles_work_area_length check (work_area is null or char_length(work_area) <= 120);

-- `deleteAllUserData` runs under a user-scoped client, never the service
-- role (see docs/authentication.md), so the owner needs to be able to
-- delete their own profile row directly.
create policy "profiles are deletable by their owner"
  on profiles for delete
  using (auth.uid() = id);

alter table user_preferences
  add column search_radius_km numeric(5, 2),
  add column max_travel_time_minutes integer,
  add column disliked_cuisines cuisine[] not null default '{}',
  add column food_preferences text[] not null default '{}',
  add column favorite_occasions occasion[] not null default '{}',
  add column parking_important boolean,
  add column accessibility_needs facility[] not null default '{}',
  add column default_party_size integer;

alter table user_preferences rename column favorite_drinks to drink_preferences;

alter table user_preferences drop column home_lat;
alter table user_preferences drop column home_lng;

-- Re-bound the existing budget check (was "> 0" with no ceiling) to match
-- `UserPreferencesSchema.budgetPerPersonGbp`'s `.max(1000)`, and add
-- matching checks for the new bounded fields.
alter table user_preferences drop constraint user_preferences_budget_per_person_gbp_check;
alter table user_preferences
  add constraint user_preferences_budget_per_person_gbp_check
    check (budget_per_person_gbp is null or (budget_per_person_gbp > 0 and budget_per_person_gbp <= 1000)),
  add constraint user_preferences_search_radius_km_check
    check (search_radius_km is null or (search_radius_km > 0 and search_radius_km <= 50)),
  add constraint user_preferences_max_travel_time_minutes_check
    check (max_travel_time_minutes is null or (max_travel_time_minutes > 0 and max_travel_time_minutes <= 180)),
  add constraint user_preferences_default_party_size_check
    check (default_party_size is null or (default_party_size > 0 and default_party_size <= 50));
