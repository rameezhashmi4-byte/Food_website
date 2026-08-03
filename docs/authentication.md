# Authentication and user data

This document covers BiteJoy's Stage 3 authentication model: who can sign
in, what's stored about them, who can read it, and how it's deleted. For
the ChatGPT-side OAuth mechanics specifically, see
[docs/mcp-oauth.md](mcp-oauth.md). For provider setup, see
[docs/supabase-setup.md](supabase-setup.md),
[docs/google-login.md](google-login.md) and
[docs/microsoft-login.md](microsoft-login.md).

## Identity provider

Supabase Auth (`auth.users`) is the single source of truth for identity
across both surfaces - the website (`apps/web`) and the ChatGPT app
(`apps/mcp-server`). Three sign-in methods:

- **Google** - via Supabase's Google provider.
- **Microsoft** - via Supabase's `azure` provider (Microsoft Entra ID).
- **Email** - magic link (`signInWithOtp`), not password + confirmation
  email as two separate steps. Chosen because this Supabase project
  already requires email confirmation (`mailer_autoconfirm: false`,
  live-verified) - a magic link IS that confirmation, in one step, with no
  password to store or leak.

Anonymous use is fully preserved: every restaurant-discovery MCP tool
(`search_restaurants`, `get_restaurant_details`, `compare_restaurants`,
`surprise_me`, `find_hidden_gems`, `find_current_offers`,
`find_new_openings`, `understand_food_request`) works with zero
authentication, exactly as in Stage 2. Only tools that read or write
user-owned data require a signed-in session.

## What's stored, and where

One repository interface, `UserRepository` (`packages/database/src/types.ts`),
is the only way either app touches user data - see
`packages/database/src/supabaseRepository.ts` for the real implementation
and `packages/db/migrations/0008`-`0010` for the schema. Four tables:

| Table | Contents |
| --- | --- |
| `profiles` | display name, avatar URL, optional home/work area |
| `user_preferences` | search radius, budget, favourite/disliked cuisines, food/drink preferences, dietary needs, preferred atmosphere, favourite occasions, parking importance, accessibility needs, default party size |
| `saved_restaurants` | which restaurant, an optional personal note, when saved |
| `user_activity` | structured events only: `restaurant_saved`, `restaurant_removed`, `preferences_updated` - a restaurant id and a timestamp, nothing else |

## What's explicitly never stored

- **Raw ChatGPT conversation text or prompts.** `user_activity` records
  that an action happened (e.g. "restaurant saved"), never what was said to
  produce it.
- **Access tokens, refresh tokens, or raw authorization codes**, in any
  database table or application log. The MCP server verifies a bearer
  token per-request and discards it once the request completes; it is
  never persisted.
- **Passwords.** There are none - every sign-in method here is
  passwordless (OAuth or magic link).

## Who can read what (Row-Level Security)

Every one of the four tables above has Row-Level Security enabled, with
policies scoped to `auth.uid()` - a user can read and write only their own
rows, full stop. This is enforced by Postgres itself, not by application
code remembering to filter correctly: both `apps/mcp-server` and
`apps/web` construct their Supabase client **per request, scoped to the
calling user's own access token** - never the service-role key - so even a
bug in application logic can't leak another user's data past RLS. The
service-role key is reserved for migrations and disposable admin scripts
(e.g. creating/deleting test users during verification); see
`packages/database/src/supabaseRepository.ts` for exactly how the
user-scoped client is built.

This was proven, not just asserted: a live test created two real disposable
Supabase users and confirmed 11/11 cross-user access attempts (read,
update, insert-as, delete) against the currently-deployed schema were
correctly rejected. See
[docs/stage-3-verification.md](stage-3-verification.md) for the details.

## Account deletion

`/account/delete` on the website requires explicit confirmation before
calling `UserRepository.deleteAllUserData(userId)`, which removes the
user's profile, preferences, saved restaurants, and activity records, then
signs the session out. There is no soft-delete or retention window for
this data - given how minimal it is (no conversation history, no payment
records, no bookings), there's nothing that needs to survive deletion for
legal or operational reasons. The underlying Supabase Auth user record
itself (`auth.users`) is a separate concern from the application data
described here; see the account-deletion page's own copy for the exact
current behaviour.

## MCP account linking

Signing in on the website and linking ChatGPT to the same account both
resolve to the same Supabase user id - there's one identity, not two. See
[docs/mcp-oauth.md](mcp-oauth.md) for exactly how ChatGPT (as an OAuth
client) obtains a token for that identity, and what MCP tools do with it.
