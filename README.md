# BiteJoy

BiteJoy is a joyful AI food-discovery agent. It isn't a restaurant directory -
it's a food-loving friend that helps people answer **"where should we eat?"**,
starting life as a ChatGPT app (OpenAI Apps SDK + MCP) backed by a shared
TypeScript/Supabase backend that will later also power an embeddable website
widget, a supporting Next.js website, and future mobile apps.

This repo is being built in stages (see "Build order" below).

- **Stage 1 (complete):** the shared backend - domain types, a
  deterministic recommendation scoring engine, replaceable data-source
  adapters, and the Supabase schema - with no AI model in the loop.
- **Stage 2 (complete):** a working MCP server (`apps/mcp-server`) exposing
  8 tools to ChatGPT, and an interactive restaurant-card widget
  (`apps/chatgpt-app`) - built on top of Stage 1's scoring engine without
  duplicating any of its logic. See [docs/chatgpt-app.md](docs/chatgpt-app.md)
  for the full write-up, exact local testing steps, and honest limitations
  (it has been tested thoroughly locally, but not against a live ChatGPT
  connection or a live OpenAI/Google key).

Stages 3-6 (auth, the supporting website, the embeddable widget, live data
providers) come next.

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
  core/          @bitejoy/core - the shared backend: Zod domain types, the
                 recommendation scoring engine, replaceable provider adapters,
                 and fictional demo data. Framework-agnostic, imported by
                 every later stage (MCP server, website, widget).
  db/            @bitejoy/db - Supabase SQL migrations (full data model,
                 including tables reserved for future community features)
                 and a seed script that loads the fictional dataset.
apps/
  mcp-server/    @bitejoy/mcp-server - the MCP server: 8 ChatGPT app tools,
                 deterministic natural-language extraction, an optional
                 OpenAI enhancement layer, and widget resource registration.
                 Depends on @bitejoy/core for all filtering/ranking - no
                 recommendation logic is duplicated here.
  chatgpt-app/   @bitejoy/chatgpt-app - the interactive widget UI (React,
                 built as dependency-free single-file HTML) that ChatGPT
                 renders inline for search results and comparisons.
```

### `packages/core`

- `src/types/` - Zod schemas + inferred types for restaurants, menus,
  offers, opening hours, search criteria, user preferences and
  recommendations. These are the contracts every later stage (MCP tools,
  API routes, the widget) validates against.
- `src/data/fictionalRestaurants.ts` - 18 entirely fictional restaurants
  scattered around Croydon (matching the product's example query), each
  fully fleshed out with menu items, prices, opening hours, offers (some
  deliberately expired, to exercise freshness logic) and review summaries.
  Two are tagged `openedAt` within the last couple of months to back the
  `find_new_openings` mode. Everything is tagged `source: "fictional_demo"`
  so it can never be mistaken for a real place.
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

### `apps/mcp-server`

The MCP server. Full write-up (setup, exact `curl`/MCP-Inspector testing
steps, ChatGPT developer-mode connection, tool reference, limitations) is in
[docs/chatgpt-app.md](docs/chatgpt-app.md) - short version:

```bash
npm run build
npm run dev -w @bitejoy/mcp-server        # stdio transport
npm run dev:http -w @bitejoy/mcp-server   # http://localhost:3333/mcp
```

8 tools, all thin wrappers around `@bitejoy/core`'s scoring engine:
`understand_food_request`, `search_restaurants`, `get_restaurant_details`,
`compare_restaurants`, `surprise_me`, `find_hidden_gems`,
`find_current_offers`, `find_new_openings`. Every tool validates input and
output with Zod and reports failures as a clean `isError: true` result
(never a raw stack trace).

Natural-language understanding (`src/nlu/`) is fully deterministic -
gazetteer-based location resolution, regex-based date/budget/cuisine/
dietary/occasion/atmosphere/facility extraction - and works with zero setup.
An optional OpenAI layer (`src/ai/`) can refine judgment-call fields and
rephrase the (already data-grounded) recommendation summary, but every code
path has a deterministic fallback and the test suite doesn't depend on a key
being set.

### `apps/chatgpt-app`

The interactive widget UI ChatGPT renders inline: a joyful, scannable grid
of restaurant cards (image, cuisine, distance, price, rating, offers,
opening status, popular dishes, atmosphere, facilities, match score, and a
short "why BiteJoy recommends it") plus a comparison table. Built with React
+ Vite, bundled as two dependency-free single-file HTML documents
(`vite-plugin-singlefile`) that `apps/mcp-server` reads straight off disk.

```bash
npm run build -w @bitejoy/chatgpt-app   # -> dist/results.html, dist/comparison.html
npm run dev -w @bitejoy/chatgpt-app     # preview against built-in demo data, no server needed
```

Actions that aren't implemented yet (Save later, Book, Order - Stage 3+)
are shown disabled rather than pretending to work; Directions is a genuine
maps link; View details and Compare are fully functional.

## Getting started

```bash
npm install
npm run build       # builds @bitejoy/core, both widget bundles, and the MCP server
npm run typecheck   # typechecks every workspace
npm run lint         # ESLint (flat config, typescript-eslint)
npm run test          # vitest across every workspace (109 tests)
```

The flagship example from the product spec - *"Find somewhere fun near
Croydon for four people tonight. Around £30 each, good burgers, drinks and
somewhere with parking"* - is exercised end-to-end in
`packages/core/src/scoring/__tests__/rank.test.ts` (pure scoring) and again
in `apps/mcp-server/src/__tests__/integration.test.ts` (through the actual
MCP protocol: `understand_food_request` → `search_restaurants`).

## Build order

- [x] **Stage 1** - shared backend, database schema, fictional seed data,
      recommendation scoring, provider adapters.
- [x] **Stage 2** - MCP server (8 tools), interactive restaurant-card
      widget, comparison flow. See [docs/chatgpt-app.md](docs/chatgpt-app.md).
- [ ] **Stage 3** - authentication, preferences, saved restaurants, shared
      group shortlists and voting.
- [ ] **Stage 4** - supporting Next.js website, restaurant pages, account
      pages, admin dashboard.
- [ ] **Stage 5** - embeddable website chat widget (general / restaurant /
      hotel-venue modes) + installation docs.
- [ ] **Stage 6** - permitted live data providers, offers/freshness
      checking, monitoring and deployment.

## Known follow-ups going into Stage 3+

- `GooglePlacesProvider` is untested against a live key; its field mapping
  should be re-verified against current Google Places API (New) docs before
  it handles real traffic.
- The MCP server has not been connected to a live ChatGPT session, and the
  optional OpenAI enhancement layer has not been exercised against a live
  key - both are implemented and locally tested (protocol layer, deterministic
  fallbacks), see "Current limitations" in
  [docs/chatgpt-app.md](docs/chatgpt-app.md).
- No auth yet, so `save_restaurant` / booking / ordering are Stage 3+; the
  widget shows those actions disabled rather than pretending they work.
