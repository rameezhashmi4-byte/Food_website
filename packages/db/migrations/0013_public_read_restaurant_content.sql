-- BiteJoy schema, migration 0013: public read access on restaurant content.
--
-- 0002_restaurants_and_content.sql never enabled RLS or granted anon/
-- authenticated any privilege on these 5 tables at all - a gap that went
-- unnoticed until a live check (post-seed, Stage 3) showed the anon key
-- genuinely cannot read `restaurants` despite rows existing, contradicting
-- apps/web/src/lib/restaurants/lookup.ts's header comment claiming "the
-- restaurants table has no RLS - it's public data". Intent was always
-- public read (restaurant/menu/hours/offers/reviews info, same as any
-- public restaurant directory) - this migration is what actually delivers
-- that, for both anonymous browsing and signed-in users alike.
--
-- Deliberately NOT `data_sources` - that's an internal admin/freshness-
-- tooling registry, not user-facing content, and stays locked down (no
-- policy at all = inaccessible via the API either way).
--
-- Read-only: no insert/update/delete policy for anon/authenticated on any
-- of these - writes stay service-role-only (seeding, future admin tooling).

alter table restaurants enable row level security;
alter table restaurant_opening_hours enable row level security;
alter table menu_items enable row level security;
alter table offers enable row level security;
alter table review_summaries enable row level security;

create policy "restaurants are publicly readable"
  on restaurants for select
  to anon, authenticated
  using (true);

create policy "restaurant opening hours are publicly readable"
  on restaurant_opening_hours for select
  to anon, authenticated
  using (true);

create policy "menu items are publicly readable"
  on menu_items for select
  to anon, authenticated
  using (true);

create policy "offers are publicly readable"
  on offers for select
  to anon, authenticated
  using (true);

create policy "review summaries are publicly readable"
  on review_summaries for select
  to anon, authenticated
  using (true);
