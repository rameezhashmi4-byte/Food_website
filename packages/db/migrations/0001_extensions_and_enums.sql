-- BiteJoy schema, migration 0001: extensions + shared enum types.
-- Target: Supabase PostgreSQL.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Generic "touch updated_at" trigger, reused by every table below that has one.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type data_source_name as enum (
  'fictional_demo',
  'google_places',
  'restaurant_owner_submission',
  'community_submission',
  'restaurant_website',
  'booking_provider',
  'ordering_provider',
  'review_provider'
);

create type price_level as enum ('budget', 'moderate', 'elevated', 'splurge');

create type cuisine as enum (
  'british', 'italian', 'indian', 'chinese', 'japanese', 'thai', 'vietnamese',
  'korean', 'mexican', 'spanish', 'greek', 'turkish', 'lebanese', 'caribbean',
  'west_african', 'ethiopian', 'french', 'american', 'burgers', 'pizza',
  'seafood', 'steakhouse', 'vegetarian_vegan', 'brunch_cafe', 'bakery_dessert',
  'street_food', 'fusion', 'tapas_small_plates', 'bbq_grill'
);

create type dietary_tag as enum (
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'halal',
  'kosher', 'pescatarian', 'low_carb'
);

create type atmosphere as enum (
  'relaxed', 'romantic', 'lively', 'intimate', 'family_friendly', 'trendy',
  'quiet', 'outdoor_seating', 'late_night', 'casual', 'upscale', 'quirky',
  'traditional'
);

create type facility as enum (
  'parking', 'wheelchair_accessible', 'outdoor_seating', 'private_dining',
  'large_groups', 'live_music', 'sports_screens', 'wifi', 'dog_friendly',
  'high_chairs', 'byob', 'wheelchair_accessible_toilet'
);

create type restaurant_status as enum ('active', 'temporarily_closed', 'permanently_closed');

create type menu_item_category as enum ('food', 'drink');

create type offer_type as enum (
  'flash_discount', 'happy_hour', 'set_menu', 'lunch_deal', 'student_deal',
  'group_offer', 'drinks_offer', 'opening_promotion'
);

create type weekday as enum (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

create type auth_provider as enum ('google', 'microsoft', 'email', 'anonymous');
