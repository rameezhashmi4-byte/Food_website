-- BiteJoy: Stage 3 migrations, combined for one-shot manual application.
--
-- This is NOT a new migration - it's migrations 0008-0012
-- (packages/db/migrations/) concatenated in order and wrapped in a single
-- transaction, purely so applying them via the Supabase Dashboard's SQL
-- Editor is one paste + one "Run" instead of five. The individual files
-- remain the source of truth; keep this in sync if they ever change.
--
-- Prerequisite: migrations 0001-0007 already applied (they were, as of
-- Stage 2.5 - this script assumes `profiles`, `user_preferences` and
-- `saved_restaurants` already exist in their 0001-0007 shape).
--
-- How to run:
--   1. Supabase Dashboard -> your BiteJoy project -> SQL Editor -> New query
--   2. Paste this entire file, click Run
--   3. Wrapped in BEGIN/COMMIT below, so if anything fails partway, nothing
--      partially applies - safe to fix and re-run from a clean state.
--
-- After this succeeds:
--   - `npm run seed -w @bitejoy/db` can load the fictional restaurant data
--   - `npx vitest run packages/database/src/__tests__/supabaseRepository.live.test.ts`
--     will stop self-skipping and run the real RLS cross-user isolation check

begin;

-- ============================================================
-- 0008: reconcile profiles / user_preferences with the shared
-- UserProfile / UserPreferences contract (packages/database)
-- ============================================================

-- Matches @bitejoy/core's OccasionSchema (packages/core/src/types/common.ts) exactly.
-- (Fixed after a live run confirmed this type was never actually created by
-- 0001_extensions_and_enums.sql, despite this script's original comment
-- claiming otherwise - it only ever existed as a Zod enum in @bitejoy/core.)
create type occasion as enum (
  'relaxed_evening', 'first_date', 'birthday', 'family_meal',
  'catch_up_with_friends', 'quick_lunch', 'celebration',
  'late_night_food', 'business_meal', 'solo_treat'
);

alter table profiles
  add column home_area text,
  add column work_area text;

alter table profiles
  add constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  add constraint profiles_home_area_length check (home_area is null or char_length(home_area) <= 120),
  add constraint profiles_work_area_length check (work_area is null or char_length(work_area) <= 120);

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

-- Dropped by definition-content lookup, not by a guessed/assumed name - a
-- live run showed the name Postgres actually assigned this constraint back
-- in 0003 doesn't match the `<table>_<column>_check` convention this
-- migration originally (wrongly) assumed.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'user_preferences'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%budget_per_person_gbp%'
  loop
    execute format('alter table user_preferences drop constraint %I', c.conname);
  end loop;
end $$;

alter table user_preferences
  add constraint user_preferences_budget_per_person_gbp_check
    check (budget_per_person_gbp is null or (budget_per_person_gbp > 0 and budget_per_person_gbp <= 1000)),
  add constraint user_preferences_search_radius_km_check
    check (search_radius_km is null or (search_radius_km > 0 and search_radius_km <= 50)),
  add constraint user_preferences_max_travel_time_minutes_check
    check (max_travel_time_minutes is null or (max_travel_time_minutes > 0 and max_travel_time_minutes <= 180)),
  add constraint user_preferences_default_party_size_check
    check (default_party_size is null or (default_party_size > 0 and default_party_size <= 50));

-- ============================================================
-- 0009: add a personal note to saved restaurants
-- ============================================================

alter table saved_restaurants
  add column note text check (note is null or char_length(note) <= 280);

-- ============================================================
-- 0010: user_activity audit log
-- ============================================================

create table user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  activity_type text not null check (activity_type in ('restaurant_saved', 'restaurant_removed', 'preferences_updated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index user_activity_user_idx on user_activity (user_id, created_at desc);

alter table user_activity enable row level security;

create policy "users read their own activity"
  on user_activity for select
  using (auth.uid() = user_id);

create policy "users insert their own activity"
  on user_activity for insert
  with check (auth.uid() = user_id);

create policy "users delete their own activity"
  on user_activity for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 0011: self-service full account deletion (delete_own_account RPC)
-- ============================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ============================================================
-- 0012: saved_restaurants.restaurant_id becomes an opaque
-- provider-defined string instead of a hard FK to restaurants(id)
-- ============================================================

-- Dropped by definition-content lookup, not the assumed default-naming
-- convention - the near-identical assumption above for a check constraint
-- turned out wrong on a live run, so this one isn't trusted either.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'saved_restaurants'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) ilike '%restaurant_id%'
  loop
    execute format('alter table saved_restaurants drop constraint %I', c.conname);
  end loop;
end $$;

alter table saved_restaurants alter column restaurant_id type text;

commit;
