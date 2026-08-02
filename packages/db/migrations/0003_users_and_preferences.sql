-- BiteJoy schema, migration 0003: user profiles + preferences.
-- Auth itself (Google, Microsoft, email/password, anonymous) is handled by
-- Supabase Auth (`auth.users`); this table holds the public-facing profile
-- BiteJoy needs on top of it, one-to-one with an auth user.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  auth_provider auth_provider not null default 'email',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "profiles are readable by their owner"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles are updatable by their owner"
  on profiles for update
  using (auth.uid() = id);

create policy "profiles are insertable by their owner"
  on profiles for insert
  with check (auth.uid() = id);

create table user_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  favorite_cuisines cuisine[] not null default '{}',
  dietary_needs dietary_tag[] not null default '{}',
  budget_per_person_gbp numeric(6, 2) check (budget_per_person_gbp > 0),
  preferred_atmosphere atmosphere[] not null default '{}',
  favorite_drinks text[] not null default '{}',
  home_lat double precision,
  home_lng double precision,
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on user_preferences
  for each row execute function set_updated_at();

alter table user_preferences enable row level security;

create policy "preferences are readable by their owner"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "preferences are writable by their owner"
  on user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
