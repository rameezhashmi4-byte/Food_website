# Supabase setup

BiteJoy uses one Supabase project as the identity provider (Auth) and the
persistence layer for user-owned data (profiles, preferences, saved
restaurants, activity). Restaurant/menu/offer data stays in the same
project's Postgres (see `packages/db`) but is never user-owned - RLS on
those tables is not the concern of this doc.

This project's real configuration has been live-verified as part of Stage
2.5/3 (see [docs/stage-3-verification.md](stage-3-verification.md) for the
full list of what was actually checked, with real request/response
evidence, vs what's still manual).

## 1. Create the project

Standard Supabase project creation (dashboard or `supabase projects
create`). Note the project URL (`https://<ref>.supabase.co`) and, from
Project Settings → API, the `anon` and `service_role` keys.

## 2. JWT signing keys (important - affects `docs/mcp-oauth.md`)

Project Settings → API → JWT Settings. This project uses **asymmetric
signing keys (ES256)**, not the legacy shared HS256 secret - confirmed live
by fetching `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`, which returns a
real public EC key. If a project is still on the legacy shared-secret
scheme, either migrate it to signing keys (Supabase supports this
in-place) or the MCP OAuth resource server's JWKS-based verification (see
`docs/mcp-oauth.md`) will need a different verification strategy - it
currently assumes a real JWKS endpoint exists.

## 3. Enable Auth providers

Authentication → Providers:

- **Email**: enabled by default. This project has `mailer_autoconfirm:
  false` (confirmed via `<SUPABASE_URL>/auth/v1/settings`), i.e. sign-in
  requires confirming ownership of the address - which is exactly what a
  magic-link flow provides natively, so `apps/web` uses magic link
  (`signInWithOtp`) rather than password + confirmation email as two
  separate steps.
- **Google**: see [docs/google-login.md](google-login.md).
- **Microsoft (Azure)**: see [docs/microsoft-login.md](microsoft-login.md).
  Supabase's internal provider key for this is `azure`, not `microsoft` -
  don't be thrown by that when reading dashboard settings or the
  `/auth/v1/settings` response.

## 4. Redirect URLs

Authentication → URL Configuration → Redirect URLs must include:

```
http://localhost:3000/auth/callback   (local dev)
https://<your-production-domain>/auth/callback
```

This must match `AUTH_REDIRECT_URL` in `.env` exactly (including scheme and
trailing path) or the OAuth/magic-link flow will fail at the final
redirect step.

## 5. Run the database migrations

`packages/db/migrations/0001` through `0010` (Stage 1 + Stage 3). **As of
this build, only 0001-0007 have been applied to the live project** -
0008-0010 (the Stage 3 auth/preferences/saved-restaurants schema
reconciliation + `user_activity`) still need to be run manually: this
sandbox has no Supabase CLI, no direct Postgres connection string, and the
service-role API key does not grant Management API / arbitrary-DDL access
(all confirmed live, not assumed - see
[docs/stage-3-verification.md](stage-3-verification.md)).

**To apply them:** open the Supabase Dashboard → SQL Editor for this
project, and run, in order:

```
packages/db/migrations/0008_reconcile_profile_and_preferences.sql
packages/db/migrations/0009_saved_restaurants_note.sql
packages/db/migrations/0010_user_activity.sql
```

After that, `packages/database/src/__tests__/supabaseRepository.live.test.ts`
will run its full contract + RLS suite against the real schema instead of
skipping (it detects the schema automatically - no code changes needed).

## 6. Environment variables

See `.env.example` for the full list. The Supabase-specific ones:

```
SUPABASE_URL=                    # e.g. https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=       # migrations + admin scripts only, never per-user requests
SUPABASE_ANON_KEY=               # backend (MCP server) public key
NEXT_PUBLIC_SUPABASE_URL=        # same value as SUPABASE_URL, browser-exposed for apps/web
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # same value as SUPABASE_ANON_KEY, browser-exposed
SUPABASE_JWT_ISSUER=             # "<SUPABASE_URL>/auth/v1"
SUPABASE_JWKS_URL=               # "<SUPABASE_URL>/auth/v1/.well-known/jwks.json"
```

## 7. Service-role key handling

The service-role key bypasses Row-Level Security entirely. It is used in
exactly two places in this codebase: `packages/db/seed/seedFictionalData.ts`
(seeding demo restaurant data) and one-off admin scripts (creating/deleting
test users during verification). It is never used inside a normal
request-handling path in `apps/mcp-server` or `apps/web` - both construct a
per-user-scoped Supabase client from the caller's own access token for
every real operation, so RLS is always the actual enforcement mechanism for
user data. See `packages/database/src/supabaseRepository.ts`.
