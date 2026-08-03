-- BiteJoy schema, migration 0010: user_activity audit log.
--
-- Minimal, structured record of what a user did - saved a restaurant,
-- removed one, updated preferences - for their own account history and
-- future Joy Points auditing. `metadata` is for small structured facts
-- only (e.g. {"restaurantId": "..."}). This table must NEVER hold raw
-- conversation text, free-form chat transcripts, or anything else that
-- could leak what a user actually said to the assistant - that's a
-- product rule enforced at the call site by `UserRepository.recordActivity`'s
-- typed `ActivityType` + plain-object `metadata` signature (see
-- packages/database/src/types.ts), not by a DB constraint, since Postgres
-- has no way to know "this jsonb value looks like a chat transcript".
--
-- References `profiles` (not `auth.users` directly), consistent with
-- every other per-user table in this schema, so it cascades away cleanly
-- when `UserRepository.deleteAllUserData` deletes the profile row.

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

-- Needed so a cascading delete from `profiles` (triggered by
-- `deleteAllUserData`, running under the owner's own user-scoped client)
-- is itself permitted by RLS on this table.
create policy "users delete their own activity"
  on user_activity for delete
  using (auth.uid() = user_id);
