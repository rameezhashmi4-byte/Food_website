# MCP server authentication (Stage 3)

How `apps/mcp-server` decides who's calling, what it trusts, and exactly
what's been verified against the real, live Supabase project versus what's
only been exercised offline. Read this alongside [`docs/authentication.md`](./authentication.md)
(the product-level policy: what's stored, RLS, account deletion) - this doc
is the MCP-specific mechanics.

## The short version

- BiteJoy's MCP server is an OAuth 2.1 **resource server** (RFC 9728), not
  an authorization server. It never issues tokens, never sees a password,
  and never talks to Google/Microsoft - Supabase Auth is the one and only
  authorization server, and every access token it verifies is a real
  Supabase-issued, ES256-signed JWT.
- Identity is derived **only** from a verified token's `sub` claim, never
  from anything a tool call's input arguments say. No tool handler accepts
  a `userId` parameter.
- Public tools (`search_restaurants`, `get_restaurant_details`,
  `compare_restaurants`, `find_hidden_gems`, `find_current_offers`,
  `find_new_openings`, `understand_food_request`, `surprise_me`) never
  require a token. Private tools (`get_user_preferences`,
  `update_user_preferences`, `save_restaurant`, `remove_saved_restaurant`,
  `list_saved_restaurants`) always do.

## Discovery: RFC 9728 Protected Resource Metadata

`GET /.well-known/oauth-protected-resource` (see `http.ts`) returns:

```json
{
  "resource": "<MCP_PUBLIC_URL, e.g. https://your-tunnel/mcp>",
  "authorization_servers": ["<SUPABASE_URL>/auth/v1"]
}
```

This is how a compliant MCP/OAuth client discovers *which* authorization
server can mint tokens this server accepts, instead of that being
hardcoded client-side. On a request with a missing/invalid bearer token,
the server also sets:

```
WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"
```

per RFC 6750 - verified directly against a real `http.Server` in
`__tests__/httpAuth.test.ts` (not asserted on faith; see the long comment
in `http.ts` above `resolveRequestAuth` for exactly why this header has to
be set *before* the transport touches the response object).

## Token verification

`auth/verifyAccessToken.ts` is the entire trust boundary:

- **Issuer**: `${SUPABASE_URL}/auth/v1` - checked as an exact `iss` claim
  match.
- **Signature**: ES256, verified against Supabase's real JWKS at
  `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` via `jose`'s
  `createRemoteJWKSet` (fetched over the network, cached/rotated by
  `jose` itself - this project is confirmed to use asymmetric JWT signing
  keys, not the legacy shared HS256 secret).
- **Expiry**: enforced automatically by `jwtVerify` (rejects an expired
  `exp`).
- **Identity**: the verified `sub` claim becomes `VerifiedAuth.userId`.
  Nothing else - not `email`, not any tool argument - is ever used to
  decide who's calling.

Failure modes are mapped to a small typed set (`missing_token`,
`invalid_token`, `expired_token`, `wrong_issuer`) in `auth/errors.ts`.
Callers only ever see one generic, friendly message
(`lib/authGuard.ts`'s `SIGN_IN_REQUIRED_MESSAGE`,
*"This needs a connected BiteJoy account - please sign in and try again."*)
- the specific `AuthError` code/message is for server logs only, never
  relayed to the model or the end user.

## What's public vs. private, and how that's enforced

`context.ts` builds one `AppContext` per HTTP request:

```ts
{ provider, auth?: VerifiedAuth, repository?: UserRepository }
```

`auth`/`repository` are only populated when a bearer token was present
*and* verified; a missing or invalid token is not an error by itself - it
just means this request's `AppContext` has no `auth`/`repository`, which
is the normal, expected shape for the 8 public tools. Every private tool's
first line is `requireAuthedContext(ctx)` (`lib/authGuard.ts`), which
throws the one friendly sign-in error whenever `ctx.auth`/`ctx.repository`
is missing - there is no path by which a private tool can run without a
verified `userId`, and no tool handler anywhere accepts a caller-supplied
user id as an alternative.

The repository itself (`repository/factory.ts`) is built fresh per
request from the verified token: `createUserRepositoryForToken(token)`
constructs a Supabase client using the **anon** key with
`Authorization: Bearer <token>` set as the client's own auth header, so
every database call this request makes runs *as that user* under Postgres
Row-Level Security - never the service-role key, never a manually-scoped
query. See migrations `0001`-`0012` in `packages/db/migrations` for the
RLS policies this depends on.

## What's genuinely live-tested vs. offline-only

- **`auth/__tests__/verifyAccessToken.test.ts`** - offline, self-signed
  ES256 test key pair, `createLocalJWKSet` (no network). Covers every
  logic branch: valid token, expired, wrong issuer, forged signature,
  malformed token, missing token, and confirms a token's own `userId`/other
  fields never override the verified `sub`.
- **`auth/__tests__/verifyAccessToken.live.test.ts`** - a real,
  live round trip against the actual Supabase project: creates a
  throwaway user via the Admin API, signs in for a real Supabase-issued
  access token, verifies it with the *production* `verifyAccessToken`
  (real `createRemoteJWKSet` fetching the real JWKS over the network, real
  issuer check), asserts the verified `userId` matches, then deletes the
  test user. **This genuinely ran and passed** during Stage 3 integration
  (both standalone and as part of the full monorepo suite) - proof the
  JWKS/issuer approach works against production, not just a local test
  key. It self-skips (not a failure) if `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` aren't available in
  the environment.
- **`__tests__/httpAuth.test.ts`** - real `http.Server`, real HTTP
  requests, confirms the `WWW-Authenticate` header and Protected Resource
  Metadata document are actually served correctly.
- **Not tested**: a real ChatGPT client actually completing the OAuth
  authorize/token exchange end to end and calling a private tool with the
  resulting token. Supabase's own OAuth AS endpoints
  (`/auth/v1/oauth/authorize`, `/auth/v1/oauth/token`) are confirmed live
  and support PKCE (S256), but **Dynamic Client Registration is not
  available** (`/auth/v1/oauth/register` returns 404) - a real ChatGPT
  connection would need a manually pre-registered OAuth client in the
  Supabase dashboard, which hasn't been set up or exercised in this
  environment. Until that's done, "account linking from inside ChatGPT" is
  implemented and unit-tested, not live-verified.

## Account linking from the widget

The ChatGPT widget has no documented, verified way to check "is this user
authenticated with BiteJoy" up front, and cannot itself drive an OAuth
popup from inside its sandboxed iframe. `ActionButtons.tsx`'s Save/Remove
buttons work around this with an optimistic-then-verify pattern: flip the
UI immediately, call the real tool, and roll back to a "Connect your
BiteJoy account" prompt if the tool result comes back `isError: true` -
the one documented failure shape these tools have for an unauthenticated
caller. "Connect account" itself hands off to the host conversation via
`sendFollowUpMessage` rather than attempting an in-widget flow. See
`docs/chatgpt-app.md`'s "Current limitations" section for the full
rationale.
