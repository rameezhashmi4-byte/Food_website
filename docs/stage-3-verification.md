# Stage 3 verification record

An honest account of what was genuinely tested (and how) versus what
wasn't, for BiteJoy's Stage 3 work: Supabase authentication, user
profiles/preferences/saved restaurants, a shared `@bitejoy/database`
package, authenticated MCP tools, and the `apps/web` account website. This
follows the same standard as [docs/chatgpt-app.md](./chatgpt-app.md)'s
"Current limitations" section - no claim here is made without the command
or test file that backs it.

## Automated checks - full monorepo

All run from the repo root against the final integrated tree:

| Check | Result |
|---|---|
| `npm run typecheck` (6 workspaces: core, database, db, chatgpt-app, mcp-server, web) | Clean, 0 errors |
| `npm run lint` (ESLint, flat config) | Clean, 0 errors, 0 warnings |
| `npm run test` (vitest: core+database+mcp-server, then chatgpt-app, then web) | **180 passed, 1 skipped**, 0 failed |
| `npm run build` (all 6 workspaces) | Clean - `tsc` builds, both widget bundles, `next build` |
| `npm audit` (repo root) | 3 high-severity advisories, all transitive inside `next`'s own bundled `postgres`/`sharp` (image optimization) - see "Known gaps" below |

The 1 skipped test is `packages/database/src/__tests__/supabaseRepository.live.test.ts`
- see "RLS cross-user isolation" below for exactly why.

## What was genuinely live-tested (real network calls, real services)

- **JWT verification against the real Supabase project.**
  `apps/mcp-server/src/auth/__tests__/verifyAccessToken.live.test.ts`
  creates a real throwaway Supabase user via the Admin API, signs in for a
  real ES256-signed access token, and verifies it with the production
  `verifyAccessToken` - real `createRemoteJWKSet` fetching the real JWKS
  over the network, real issuer check. **Ran and passed**, both standalone
  and inside the full monorepo suite. See
  [docs/mcp-oauth.md](./mcp-oauth.md) for the full mechanics.
- **The `apps/web` production build and dev server**, including the new
  Tailwind design system: `next build` succeeds; a real dev server was
  started and every route smoke-tested with real HTTP requests (`/`,
  `/login`, `/signup`, `/privacy`, `/style-guide`, and `/account`
  correctly redirecting to `/login` when signed out) - confirmed via
  response codes AND by inspecting the actual rendered HTML/CSS (real
  page copy, real Tailwind utility classes, the custom font loaded).
- **A full Playwright browser run against the real `apps/web` app**
  (`npx playwright test`, real Chromium, `e2e/*.spec.ts`):
  - **Passed for real**: the Google sign-in button, the Microsoft
    sign-in button, and the `/account` → `/login` redirect for a signed-out
    visitor.
  - **Found a real bug**: the email magic-link test triggered a genuine
    `supabase.auth.signInWithOtp()` call against the live Supabase project,
    which did not complete and left the Server Action hanging - the
    Supabase JS client's default `fetch` has no timeout, so a slow/stuck
    auth backend call hung indefinitely with the submit button stuck on
    "Sending..." forever and no way for the user to recover short of
    reloading. **This was a genuine production reliability bug**, found by
    running the real thing, not a mock. Fixed by adding a 15s timeout to
    every Supabase API call this app makes (`apps/web/src/lib/supabase/fetchWithTimeout.ts`,
    wired into both `lib/supabase/server.ts` and `lib/supabase/updateSession.ts`)
    - re-running the same test now fails cleanly in ~6s with the app's own
      friendly error message instead of hanging for ~19 minutes. The
      underlying reason `signInWithOtp` doesn't complete within 15s from
      this sandboxed environment is still open (see "Known gaps") - the fix
      here is the app no longer hanging indefinitely when it happens, which
      is the correct behavior regardless of root cause.
  - **3 honestly skipped, not faked**: the authenticated-area tests
    (preferences form, saved list, sign-out) use a fake-session fixture
    (`e2e/fixtures/auth.ts`) that seeds `localStorage`/intercepts
    `/auth/v1/*` - but `apps/web` uses `@supabase/ssr`'s cookie-based
    server sessions, which that bypass doesn't produce. Each test detects
    this (still lands on `/login`) and calls `test.skip(...)` with an
    explicit reason, rather than either faking a pass or failing
    confusingly. Real cookie-based test auth is a follow-up, not done here.
- **Google Places API and OpenAI** - live-tested during Stage 2.5 (see
  `packages/core/src/providers/googlePlacesProvider.ts`'s header comment
  and `docs/chatgpt-app.md`); unchanged in Stage 3.

## What was NOT live-tested

- **A real ChatGPT client completing OAuth and calling a private tool.**
  Supabase's OAuth AS endpoints are live and support PKCE, but Dynamic
  Client Registration isn't available (`/auth/v1/oauth/register` → 404),
  so a real connection needs a manually pre-registered OAuth client in the
  Supabase dashboard - not set up in this environment. `save_restaurant`
  and friends are implemented and unit/integration-tested (fake
  repository, real auth-guard logic), never called by an actual ChatGPT
  session.
- **Live browser click-through for Google/Microsoft OAuth.** The e2e run
  confirmed both buttons render correctly and are enabled (i.e. Supabase
  reports both providers as configured), but never completed a real
  Google/Microsoft consent screen - that needs a real Google/Microsoft
  account making an interactive choice, which no automated run here can
  do.
- **Migrations 0008-0012 applied to the live Supabase project.** This
  environment has no `psql`, no Postgres connection string, and no
  Supabase personal access token - only the project's REST/Auth API keys
  (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), which
  cannot authenticate a CLI `db push` or a direct SQL connection. Confirmed
  by directly checking the live schema at runtime (see next section) - the
  extended columns these migrations add are not yet present. **Applying
  them via the Supabase SQL Editor is a manual step outside this
  environment** (see [docs/supabase-setup.md](./supabase-setup.md)).
- **Seed data** (`npm run seed -w @bitejoy/db`) - not run against the live
  project this session, for the same reason: it depends on the schema
  migrations being applied first.

## RLS cross-user isolation - written, ready, not yet run for real

`packages/database/src/__tests__/supabaseRepository.live.test.ts` is a
genuinely rigorous live test: it creates two real Supabase Auth users,
gives each their own request-scoped client (anon key + that user's own
access token, exactly how `apps/mcp-server`/`apps/web` build one per
request), runs a full CRUD lifecycle for user A, and then **proves user
B's client cannot read or write user A's rows** - it doesn't just trust
that an RLS policy exists, it tries the forbidden read/write and asserts
Postgres rejects it. Both test users are deleted in `afterAll` regardless
of outcome.

It detects schema readiness at runtime (queries for
`user_preferences.search_radius_km` and `user_activity`) rather than
assuming, and **self-skips when the schema isn't migrated yet** - which is
exactly what happened when it was run standalone against the live project
in this session: `1 skipped`, confirming migrations 0008-0010 genuinely
haven't been applied to production yet. This test is real, ready evidence
waiting to run the moment the migrations are applied - RLS isolation
itself has NOT been confirmed live in Stage 3, only designed, migrated
(on paper), and covered by a test that will prove it the first time
someone runs it with the schema in place.

## Known gaps and accepted risks

- **`npm audit`: 3 high-severity advisories**, all inside `next`'s own
  vendored `postgres` (XSS/path-traversal in CSS/sourcemap handling) and
  `sharp` (libvips CVEs, used for `next/image` optimization) - not a
  BiteJoy dependency choice. The only fix `npm audit fix --force` offers
  is downgrading to `next@9.3.3`, a pre-App-Router version that would
  break the entire `apps/web` codebase built in this stage. Accepted as an
  upstream-Next.js risk to revisit when Next.js ships a patched version,
  not something to route around by breaking the app.
- **The magic-link timeout hang's root cause is unconfirmed.** The fix
  (bounded timeout) makes the symptom (indefinite hang) impossible either
  way, but *why* the live call didn't complete within 15s from this
  sandboxed environment - network egress restriction, Supabase-side email
  provider latency, or something else - wasn't root-caused here.
- **Tailwind is pinned to v3** (`tailwindcss@^3.4.17`) rather than v4,
  because the design system's CSS (`@tailwind base/components/utilities`
  directives) and `tailwind.config.ts` (JS config, `content` globs) both
  use v3's syntax; v4 is a CSS-first config model that would need a real
  migration, not a version bump.
