-- BiteJoy schema, migration 0004: MVP community features only.
-- Per product scope: saved restaurants, shared lists, group shortlists +
-- voting, and lightweight "helpful" notes. Likes, full reviews, photos,
-- local groups, meetups and following are deliberately deferred - see
-- 0005_future_community.sql, which defines their tables without any
-- application logic wired up yet.

create table saved_restaurants (
  user_id uuid not null references profiles (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

alter table saved_restaurants enable row level security;

create policy "users manage their own saved restaurants"
  on saved_restaurants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table food_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  description text,
  is_shared boolean not null default false,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index food_lists_share_token_idx on food_lists (share_token);

create trigger food_lists_set_updated_at
  before update on food_lists
  for each row execute function set_updated_at();

alter table food_lists enable row level security;

create policy "owners manage their own lists"
  on food_lists for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "shared lists are readable by anyone with the link"
  on food_lists for select
  using (is_shared = true);

create table food_list_items (
  list_id uuid not null references food_lists (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  note text,
  added_by uuid references profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (list_id, restaurant_id)
);

alter table food_list_items enable row level security;

create policy "list items follow the parent list's visibility"
  on food_list_items for select
  using (
    exists (
      select 1 from food_lists
      where food_lists.id = food_list_items.list_id
        and (food_lists.owner_id = auth.uid() or food_lists.is_shared = true)
    )
  );

create policy "only the list owner can modify list items"
  on food_list_items for all
  using (
    exists (
      select 1 from food_lists
      where food_lists.id = food_list_items.list_id
        and food_lists.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from food_lists
      where food_lists.id = food_list_items.list_id
        and food_lists.owner_id = auth.uid()
    )
  );

-- A short-lived decision-making group ("who's picking where we eat tonight"),
-- distinct from the future, longer-lived "local food groups" in 0005.
create table dining_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles (id) on delete cascade,
  invite_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create unique index dining_groups_invite_token_idx on dining_groups (invite_token);

create table dining_group_members (
  group_id uuid not null references dining_groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table dining_groups enable row level security;
alter table dining_group_members enable row level security;

create policy "members can read their group"
  on dining_groups for select
  using (
    exists (
      select 1 from dining_group_members
      where dining_group_members.group_id = dining_groups.id
        and dining_group_members.user_id = auth.uid()
    )
  );

create policy "members can read the member list"
  on dining_group_members for select
  using (
    exists (
      select 1 from dining_group_members m
      where m.group_id = dining_group_members.group_id
        and m.user_id = auth.uid()
    )
  );

create table group_shortlists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references dining_groups (id) on delete cascade,
  name text not null default 'Tonight''s shortlist',
  created_at timestamptz not null default now()
);

create table group_shortlist_items (
  id uuid primary key default gen_random_uuid(),
  shortlist_id uuid not null references group_shortlists (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  added_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shortlist_id, restaurant_id)
);

create table group_shortlist_votes (
  shortlist_item_id uuid not null references group_shortlist_items (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shortlist_item_id, user_id)
);

alter table group_shortlists enable row level security;
alter table group_shortlist_items enable row level security;
alter table group_shortlist_votes enable row level security;

create policy "group members can read shortlists"
  on group_shortlists for select
  using (
    exists (
      select 1 from dining_group_members
      where dining_group_members.group_id = group_shortlists.group_id
        and dining_group_members.user_id = auth.uid()
    )
  );

create policy "group members can read shortlist items"
  on group_shortlist_items for select
  using (
    exists (
      select 1 from group_shortlists
      join dining_group_members on dining_group_members.group_id = group_shortlists.group_id
      where group_shortlists.id = group_shortlist_items.shortlist_id
        and dining_group_members.user_id = auth.uid()
    )
  );

create policy "group members can add shortlist items"
  on group_shortlist_items for insert
  with check (
    exists (
      select 1 from group_shortlists
      join dining_group_members on dining_group_members.group_id = group_shortlists.group_id
      where group_shortlists.id = group_shortlist_items.shortlist_id
        and dining_group_members.user_id = auth.uid()
    )
  );

create policy "group members can read votes"
  on group_shortlist_votes for select
  using (
    exists (
      select 1 from group_shortlist_items
      join group_shortlists on group_shortlists.id = group_shortlist_items.shortlist_id
      join dining_group_members on dining_group_members.group_id = group_shortlists.group_id
      where group_shortlist_items.id = group_shortlist_votes.shortlist_item_id
        and dining_group_members.user_id = auth.uid()
    )
  );

create policy "members can cast their own vote"
  on group_shortlist_votes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from group_shortlist_items
      join group_shortlists on group_shortlists.id = group_shortlist_items.shortlist_id
      join dining_group_members on dining_group_members.group_id = group_shortlists.group_id
      where group_shortlist_items.id = group_shortlist_votes.shortlist_item_id
        and dining_group_members.user_id = auth.uid()
    )
  );

create policy "members can retract their own vote"
  on group_shortlist_votes for delete
  using (auth.uid() = user_id);

-- Lightweight, moderated "did you know" / practical tips - not a full review
-- system (see `reviews` in 0005_future_community.sql for that).
create table community_notes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  note text not null check (char_length(note) <= 280),
  helpful_count integer not null default 0,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index community_notes_restaurant_idx on community_notes (restaurant_id) where is_approved = true;

alter table community_notes enable row level security;

create policy "approved notes are publicly readable"
  on community_notes for select
  using (is_approved = true or auth.uid() = user_id);

create policy "users can submit their own notes"
  on community_notes for insert
  with check (auth.uid() = user_id);
