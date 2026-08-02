-- BiteJoy schema, migration 0006: Joy Points.
-- Point values and repeat/cooldown policy live in `joy_point_action_types`
-- (an admin-tunable config table) rather than being hardcoded in app code,
-- and are enforced by `check_joy_points_action` so a client can never award
-- itself unlimited points for the same low-value action.

create table joy_point_action_types (
  action_type text primary key,
  points_value integer not null check (points_value > 0),
  is_repeatable boolean not null default true,
  cooldown_hours integer not null default 0,
  description text
);

insert into joy_point_action_types (action_type, points_value, is_repeatable, cooldown_hours, description) values
  ('completed_preferences', 20, false, 0, 'Filled in food preferences for the first time'),
  ('wrote_approved_review', 15, true, 0, 'An approved helpful review'),
  ('shared_accurate_offer', 10, true, 24, 'Shared an offer that was verified accurate'),
  ('reported_expired_offer', 5, true, 1, 'Flagged an offer that had expired'),
  ('uploaded_approved_photo', 8, true, 1, 'An approved restaurant photograph'),
  ('discovered_new_restaurant', 25, true, 24, 'Added a restaurant BiteJoy did not have yet'),
  ('created_useful_food_list', 10, true, 24, 'Created a food list others found useful'),
  ('helped_group_select_restaurant', 5, true, 1, 'Helped a group land on a restaurant via voting');

create table joy_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  action_type text not null references joy_point_action_types (action_type),
  points integer not null check (points > 0),
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index joy_points_ledger_user_idx on joy_points_ledger (user_id, created_at desc);

create or replace function check_joy_points_action()
returns trigger
language plpgsql
as $$
declare
  action_config joy_point_action_types%rowtype;
  recent_count integer;
begin
  select * into action_config from joy_point_action_types where action_type = new.action_type;

  if action_config.action_type is null then
    raise exception 'Unknown Joy Points action type: %', new.action_type;
  end if;

  if not action_config.is_repeatable then
    select count(*) into recent_count from joy_points_ledger
      where user_id = new.user_id and action_type = new.action_type;
    if recent_count > 0 then
      raise exception 'Joy Points action % has already been awarded to this user', new.action_type;
    end if;
  elsif action_config.cooldown_hours > 0 then
    select count(*) into recent_count from joy_points_ledger
      where user_id = new.user_id
        and action_type = new.action_type
        and created_at > now() - (action_config.cooldown_hours || ' hours')::interval;
    if recent_count > 0 then
      raise exception 'Joy Points action % is on cooldown for this user', new.action_type;
    end if;
  end if;

  if new.points <> action_config.points_value then
    new.points := action_config.points_value;
  end if;

  return new;
end;
$$;

create trigger joy_points_ledger_check_action
  before insert on joy_points_ledger
  for each row execute function check_joy_points_action();

create table joy_points_balances (
  user_id uuid primary key references profiles (id) on delete cascade,
  total_points integer not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now()
);

create or replace function apply_joy_points()
returns trigger
language plpgsql
as $$
begin
  insert into joy_points_balances (user_id, total_points, level, updated_at)
  values (new.user_id, new.points, greatest(1, new.points / 100 + 1), now())
  on conflict (user_id) do update
    set total_points = joy_points_balances.total_points + new.points,
        level = greatest(1, (joy_points_balances.total_points + new.points) / 100 + 1),
        updated_at = now();
  return new;
end;
$$;

create trigger joy_points_ledger_apply_balance
  after insert on joy_points_ledger
  for each row execute function apply_joy_points();

create table badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

insert into badges (code, name, description, icon) values
  ('first_bite', 'First Bite', 'Completed your BiteJoy preferences', '🍽️'),
  ('gem_hunter', 'Gem Hunter', 'Discovered a hidden gem restaurant', '💎'),
  ('group_hero', 'Group Hero', 'Helped a group land on a restaurant', '🎉'),
  ('trusted_reviewer', 'Trusted Reviewer', 'Had multiple reviews approved', '⭐');

create table user_badges (
  user_id uuid not null references profiles (id) on delete cascade,
  badge_id uuid not null references badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table joy_points_ledger enable row level security;
alter table joy_points_balances enable row level security;
alter table user_badges enable row level security;
alter table badges enable row level security;

create policy "users read their own ledger"
  on joy_points_ledger for select
  using (auth.uid() = user_id);

create policy "users read their own balance"
  on joy_points_balances for select
  using (auth.uid() = user_id);

create policy "users read their own badges"
  on user_badges for select
  using (auth.uid() = user_id);

create policy "badge definitions are publicly readable"
  on badges for select
  using (true);
