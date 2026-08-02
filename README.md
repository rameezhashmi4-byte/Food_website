# BiteJoy

BiteJoy is a joyful AI food-discovery agent. It isn't a restaurant directory -
it's a food-loving friend that helps people answer **"where should we eat?"**,
starting life as a ChatGPT app (OpenAI Apps SDK + MCP) backed by a shared
TypeScript/Supabase backend that will later also power an embeddable website
widget, a supporting Next.js website, and future mobile apps.

This repo is being built in stages (see "Build order" below). **Stage 1 is
complete**: the shared backend - domain types, a deterministic recommendation
scoring engine, replaceable data-source adapters, and the Supabase schema -
with no AI model in the loop yet. Stages 2-6 (MCP tools, auth, the website,
the embeddable widget, live data providers) come next.

## Why structured scoring comes before the AI model

BiteJoy's product rule is that the model may *explain, phrase and warm up*
recommendations, but it must never *invent* a restaurant, price, offer,
rating, review or opening time. To make that possible, all filtering and
ranking in this repo is pure, deterministic TypeScript with no model call
anywhere in the path - see `packages/core/src/scoring`. Every fact a
recommendation surfaces is traceable back to a `SourceMeta` (`source` +
`lastCheckedAt` + `isVerified`) on the underlying record.

## Monorepo layout

```
packages/
  core/   @bitejoy/core - the shared backend: Zod domain types, the
          recommendation scoring engine, replaceable provider adapters,
          and fictional demo data. Framework-agnostic, imported by every
          later stage (MCP server, website, widget).
  db/     @bitejoy/db - Supabase SQL migrations (full data model,
          including tables reserved for future community features) and a
          seed script that loads the fictional dataset for local dev.
```

### `packages/core`

- `src/types/` - Zod schemas + inferred types for restaurants, menus,
  offers, opening hours, search criteria, user preferences and
  recommendations. These are the contracts every later stage (MCP tools,
  API routes, the widget) validates against.
- `src/data/fictionalRestaurants.ts` - ~16 entirely fictional restaurants
  scattered around Croydon (matching the product's example query), each
  fully fleshed out with menu items, prices, opening hours, offers (some
  deliberately expired, to exercise freshness logic) and review summaries.
  Everything is tagged `source: "fictional_demo"` so it can never be
  mistaken for a real place.
- `src/providers/` - the `RestaurantProvider` interface plus two
  implementations: `FictionalRestaurantProvider` (always available, backs
  local dev/tests/the ChatGPT sandbox) and `GooglePlacesProvider` (a
  structurally-complete Stage 1 skeleton for the Places API (New); it has
  not been exercised against a live key yet, and Google has no concept of
  menus/offers/independent-status, so those are estimated or left empty and
  every fact it returns is marked `isVerified: false`). Both speak the same
  interface, so the scoring engine never knows which source it's ranking.
- `src/scoring/` - the recommendation pipeline:
  - `filters.ts` - hard constraints a restaurant must pass (open at the
    requested time, meets every stated dietary need, has every required
    facility, isn't wildly over budget).
  - `weights.ts` / `scoreRestaurant.ts` - weighted soft-scoring across
    cuisine/food/drink match, atmosphere, occasion, budget fit, rating,
    review volume, active offers, independence, trend, proximity and data
    freshness, plus mode-specific weight profiles for each joyful mode
    (`find_my_vibe`, `surprise_me`, `hidden_gem`, `offers_near_me`,
    `group_decision`, `food_adventure`). Every score comes with factual,
    data-grounded `reasons` - this is what the AI model is later allowed to
    turn into warm prose, never a substitute for it.
  - `rank.ts` - `rankRestaurants()` (the core 3-to-5-strong-recommendations
    pipeline) and `pickSurprise()` (weighted-random pick from the top
    matches, for the "Surprise me" mode).
- `src/utils/` - haversine distance + travel-time estimation, opening-hours
  math (including overnight wraparound, e.g. 17:00-02:00), and data
  freshness helpers.

### `packages/db`

- `migrations/0001`-`0006` - hand-written SQL migrations for Supabase
  Postgres: enums, `restaurants` + hours/menu/offers/review summaries,
  `profiles` + `user_preferences` (on top of Supabase Auth), the **MVP**
  community layer (saved restaurants, shared food lists, group shortlists +
  voting, helpful community notes), a **future** community layer (full
  reviews, photos, likes, following, long-lived local food groups,
  invitations, meetups - schema only, no application code uses these yet),
  and Joy Points (a ledger + balances + badges, with spam prevention via a
  configurable per-action repeatability/cooldown policy enforced by a
  Postgres trigger).
- `seed/seedFictionalData.ts` - loads `FICTIONAL_RESTAURANTS` from
  `@bitejoy/core` into Supabase. Idempotent (upserts by slug).

Run migrations with the Supabase CLI or dashboard SQL editor, in order.
Then, with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set (see
`.env.example`):

```bash
npm run seed -w @bitejoy/db
```

## Getting started

```bash
npm install
npm run build       # builds @bitejoy/core
npm run typecheck   # typechecks every workspace
npm run lint         # ESLint (flat config, typescript-eslint)
npm run test          # vitest - scoring, filters, providers, opening hours
```

The flagship example from the product spec - *"Find somewhere fun near
Croydon for four people tonight. Around £30 each, good burgers, drinks and
somewhere with parking"* - is exercised end-to-end in
`packages/core/src/scoring/__tests__/rank.test.ts`.

## Build order

- [x] **Stage 1** - shared backend, database schema, fictional seed data,
      recommendation scoring, provider adapters.
- [ ] **Stage 2** - MCP server, ChatGPT app tools, interactive restaurant
      cards, comparison and conversation flows.
- [ ] **Stage 3** - authentication, preferences, saved restaurants, shared
      group shortlists and voting.
- [ ] **Stage 4** - supporting Next.js website, restaurant pages, account
      pages, admin dashboard.
- [ ] **Stage 5** - embeddable website chat widget (general / restaurant /
      hotel-venue modes) + installation docs.
- [ ] **Stage 6** - permitted live data providers, offers/freshness
      checking, monitoring and deployment.

## Known follow-ups going into Stage 2+

- `GooglePlacesProvider` is untested against a live key; its field mapping
  should be re-verified against current Google Places API (New) docs before
  it handles real traffic.
- Dev-dependency audit flags a moderate/high advisory in `esbuild`/`vite`
  (transitive, via `vitest`'s dev server) - affects local dev tooling only,
  not runtime code; revisit when upgrading to `vitest` 4.
