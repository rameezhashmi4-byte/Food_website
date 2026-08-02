-- BiteJoy schema, migration 0002: restaurants, hours, menu, offers, reviews.
-- Every fact-bearing table carries `source` + `last_checked_at` (+ `is_verified`
-- where relevant) so the product can always show data freshness and never let
-- the AI model pass off a guess as a verified fact.

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  cuisines cuisine[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  address text not null,
  area text not null,
  city text not null,
  postcode text,
  price_level price_level not null,
  average_price_per_person_gbp numeric(6, 2) not null check (average_price_per_person_gbp > 0),
  atmosphere atmosphere[] not null default '{}',
  facilities facility[] not null default '{}',
  dietary_options dietary_tag[] not null default '{}',
  is_independent boolean not null default false,
  status restaurant_status not null default 'active',
  images text[] not null default '{}',
  booking_url text,
  ordering_url text,
  phone text,
  website text,
  google_place_id text,
  booking_provider_id text,
  ordering_provider_id text,
  trend_score real not null default 0 check (trend_score between 0 and 1),
  source data_source_name not null,
  is_verified boolean not null default false,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_location_idx on restaurants (lat, lng);
create index restaurants_cuisines_idx on restaurants using gin (cuisines);
create index restaurants_city_idx on restaurants (city);
create index restaurants_status_idx on restaurants (status);
create unique index restaurants_google_place_id_idx on restaurants (google_place_id) where google_place_id is not null;

create trigger restaurants_set_updated_at
  before update on restaurants
  for each row execute function set_updated_at();

create table restaurant_opening_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  day weekday not null,
  opens_at time not null,
  closes_at time not null,
  source data_source_name not null,
  last_checked_at timestamptz not null default now()
);

create index restaurant_opening_hours_restaurant_idx on restaurant_opening_hours (restaurant_id);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  description text,
  category menu_item_category not null,
  price_gbp numeric(6, 2) not null check (price_gbp >= 0),
  dietary_tags dietary_tag[] not null default '{}',
  is_popular boolean not null default false,
  image_url text,
  source data_source_name not null,
  is_verified boolean not null default false,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index menu_items_restaurant_idx on menu_items (restaurant_id);

create table offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  type offer_type not null,
  title text not null,
  description text,
  discount_text text,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  source data_source_name not null,
  is_verified boolean not null default false,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (valid_until > valid_from)
);

create index offers_restaurant_idx on offers (restaurant_id);
-- Powers "find current offers" queries: only ever select offers whose window covers now().
create index offers_validity_idx on offers (valid_from, valid_until);

create table review_summaries (
  restaurant_id uuid primary key references restaurants (id) on delete cascade,
  average_rating numeric(2, 1) not null check (average_rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  themes text[] not null default '{}',
  source data_source_name not null,
  is_verified boolean not null default false,
  last_checked_at timestamptz not null default now()
);

-- Registry of configured data sources (used by admin + freshness tooling), separate
-- from the `data_source_name` enum tag stored on individual facts above.
create table data_sources (
  id uuid primary key default gen_random_uuid(),
  name data_source_name not null unique,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
