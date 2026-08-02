-- BiteJoy schema, migration 0005: schema for FUTURE community features only.
-- These tables exist so the data model doesn't need reshaping later, but no
-- application code in this build reads or writes them yet: full reviews,
-- photos, likes, following, local (long-lived) food groups, invitations and
-- meetups are all explicitly deferred past the MVP per the product scope.

create table reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) <= 1000),
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index reviews_restaurant_idx on reviews (restaurant_id) where is_approved = true;

alter table reviews enable row level security;

create policy "approved reviews are publicly readable"
  on reviews for select
  using (is_approved = true or auth.uid() = user_id);

create policy "users can submit their own reviews"
  on reviews for insert
  with check (auth.uid() = user_id);

create table restaurant_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  url text not null,
  caption text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index restaurant_photos_restaurant_idx on restaurant_photos (restaurant_id) where is_approved = true;

alter table restaurant_photos enable row level security;

create policy "approved photos are publicly readable"
  on restaurant_photos for select
  using (is_approved = true or auth.uid() = user_id);

create policy "users can submit their own photos"
  on restaurant_photos for insert
  with check (auth.uid() = user_id);

create table likes (
  user_id uuid not null references profiles (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

alter table likes enable row level security;

create policy "likes are publicly readable"
  on likes for select
  using (true);

create policy "users manage their own likes"
  on likes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Following either a trusted contributor (another user) or a restaurant.
-- Exactly one of the two target columns is set.
create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followed_user_id uuid references profiles (id) on delete cascade,
  followed_restaurant_id uuid references restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (followed_user_id is not null and followed_restaurant_id is null)
    or (followed_user_id is null and followed_restaurant_id is not null)
  )
);

create unique index follows_user_target_idx on follows (follower_id, followed_user_id) where followed_user_id is not null;
create unique index follows_restaurant_target_idx on follows (follower_id, followed_restaurant_id) where followed_restaurant_id is not null;

alter table follows enable row level security;

create policy "users manage their own follows"
  on follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- Long-lived local communities, distinct from the ephemeral `dining_groups`
-- used for MVP group-decision shortlists.
create table local_food_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  area text,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table local_food_group_members (
  group_id uuid not null references local_food_groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create type group_invitation_status as enum ('pending', 'accepted', 'declined');

create table group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references local_food_groups (id) on delete cascade,
  invited_by uuid not null references profiles (id) on delete cascade,
  invited_email text,
  invited_user_id uuid references profiles (id) on delete cascade,
  status group_invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (invited_email is not null or invited_user_id is not null)
);

create table food_meetups (
  id uuid primary key default gen_random_uuid(),
  local_group_id uuid not null references local_food_groups (id) on delete cascade,
  restaurant_id uuid references restaurants (id) on delete set null,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create type meetup_attendance_status as enum ('going', 'interested', 'declined');

create table food_meetup_attendees (
  meetup_id uuid not null references food_meetups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status meetup_attendance_status not null default 'interested',
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);
