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
  for the full write-up, exact local testing steps, and honest limitations.
- **Stage 3 (complete):** Supabase authentication (Google, Microsoft,
  email magic-link), a shared `@bitejoy/database` package used identically
  by the MCP server and the website, 5 new authenticated MCP tools, and a
  minimal Next.js account website (`apps/web`). See
  [docs/authentication.md](docs/authentication.md) (policy),
  [docs/mcp-oauth.md](docs/mcp-oauth.md) (MCP-side mechanics), and
  [docs/stage-3-verification.md](docs/stage-3-verification.md) (exactly
  what was live-tested versus not - read this before trusting any Stage 3
  claim).

Stages 4-6 (the supporting website's deeper features, the embeddable
widget, live data providers) come next.

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
  database/      @bitejoy/database - the shared persistence contract
                 (UserRepository: profile, preferences, saved restaurants,
                 activity log) plus an InMemoryUserRepository (tests) and a
                 SupabaseUserRepository (production) - used identically by
                 apps/mcp-server and apps/web so there is exactly one
                 implementation of "how BiteJoy reads/writes user data".
  db/            @bitejoy/db - Supabase SQL migrations (full data model,
                 including tables reserved for future community features)
                 and a seed script that loads the fictional dataset.
apps/
  mcp-server/    @bitejoy/mcp-server - the MCP server: 8 public tools + 5
                 Stage 3 authenticated tools, deterministic natural-language
                 extraction, an optional OpenAI enhancement layer, and
                 widget resource registration. Depends on @bitejoy/core for
                 all filtering/ranking and @bitejoy/database for all
                 persistence - no logic is duplicated here.
  chatgpt-app/   @bitejoy/chatgpt-app - the interactive widget UI (React,
                 built as dependency-free single-file HTML) that ChatGPT
                 renders inline for search results and comparisons, with
                 auth-aware Save/Remove actions.
  web/           @bitejoy/web - the BiteJoy account website (Next.js 16 App
                 Router): sign in/up, profile, preferences, saved
                 restaurants, connected apps, account deletion. Server-only
                 Supabase access throughout; depends on @bitejoy/database
                 for all persistence, same as the MCP server.
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

Save/Remove are real as of Stage 3 (optimistic UI, backed by the
authenticated MCP tools - see [docs/mcp-oauth.md](docs/mcp-oauth.md));
Book and Order stay shown disabled - no real booking/ordering integration
exists yet. Directions is a genuine maps link; View details and Compare
are fully functional.

### `apps/web`

The BiteJoy account website - Next.js 16 App Router, server-only Supabase
access (`@supabase/ssr`), Tailwind design system shared visually with the
ChatGPT widget's own color tokens.

```bash
npm run dev -w @bitejoy/web    # http://localhost:3000
npm run build -w @bitejoy/web
```

Pages: `/`, `/login`, `/signup` (Google/Microsoft/email magic-link),
`/account`, `/account/preferences`, `/account/saved`,
`/account/connected-apps`, `/account/delete`, `/privacy`, plus a
`/style-guide` component reference. See
[docs/stage-3-verification.md](docs/stage-3-verification.md) for exactly
what's been live-tested here.

## Getting started

```bash
npm install
npm run build       # builds every workspace (core, database, db, mcp-server, chatgpt-app, web)
npm run typecheck   # typechecks every workspace
npm run lint         # ESLint (flat config, typescript-eslint)
npm run test          # vitest across every workspace (180+ tests)
npm run test:e2e     # Playwright, against a real apps/web dev server
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
- [x] **Stage 3** - Supabase authentication, `@bitejoy/database`, 5
      authenticated MCP tools, `apps/web` account website. See
      [docs/stage-3-verification.md](docs/stage-3-verification.md) for what
      was genuinely live-tested versus not.
- [ ] **Stage 4** - restaurant pages, admin dashboard, shared group
      shortlists and voting.
- [ ] **Stage 5** - embeddable website chat widget (general / restaurant /
      hotel-venue modes) + installation docs.
- [ ] **Stage 6** - permitted live data providers, offers/freshness
      checking, monitoring and deployment.

## Known follow-ups going into Stage 4+

- `GooglePlacesProvider` is live-tested (Stage 2.5) but should be
  re-verified periodically against current Google Places API (New) docs.
- The MCP server has not been connected to a live ChatGPT session end to
  end (no Dynamic Client Registration on Supabase's OAuth AS - see
  [docs/mcp-oauth.md](docs/mcp-oauth.md)); the optional OpenAI enhancement
  layer has been live-tested (Stage 2.5).
- Migrations `0008`-`0012` (Stage 3's profile/preferences/activity/saved-restaurant
  schema) have not yet been applied to the live Supabase project - this
  environment has no Postgres connection credentials, only REST/Auth API
  keys. Apply via the Supabase SQL Editor - see
  [docs/supabase-setup.md](docs/supabase-setup.md) - before RLS
  cross-user isolation (already written as a live test, see
  [docs/stage-3-verification.md](docs/stage-3-verification.md)) or seeding
  (`npm run seed -w @bitejoy/db`) can actually run.
- Live browser OAuth click-through (a real Google/Microsoft account
  completing sign-in) and a real ChatGPT session calling the authenticated
  MCP tools are both implemented and tested up to the edge of what this
  environment can drive automatically - see
  [docs/stage-3-verification.md](docs/stage-3-verification.md).
