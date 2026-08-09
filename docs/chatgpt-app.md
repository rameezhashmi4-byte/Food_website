# BiteJoy ChatGPT app (Stage 2)

This document covers the Stage 2 deliverable: a working MCP server
(`apps/mcp-server`) and an interactive widget UI (`apps/chatgpt-app`) that
together let ChatGPT answer "where should we eat?" using BiteJoy's existing
Stage 1 recommendation engine (`@bitejoy/core`).

**Honesty check, up front:** this has been tested thoroughly *locally* - the
MCP protocol layer (via an in-memory MCP client/server pair and real
stdio/HTTP process smoke tests), and the widget UI (via React Testing
Library and a manual browser check). It has **not** been connected to a real
ChatGPT session in this build. Anything below describing "how to connect in
ChatGPT developer mode" is based on OpenAI's published Apps SDK
documentation as of this build, not a live-verified connection - see
"Known limitations" at the end.

## Architecture

```
apps/mcp-server/        MCP server (stdio + streamable HTTP transports)
  src/
    tools/               8 MCP tools - thin glue only, all real logic in @bitejoy/core
    nlu/                 deterministic natural-language extraction (no AI needed)
    ai/                  optional OpenAI-backed refinement/explanation layer
    lib/                 view mappers (Recommendation -> chat-friendly JSON), personality text, errors
    resources/           ui:// widget resources, read from apps/chatgpt-app's build output
    server.ts            builds the configured McpServer
    stdio.ts / http.ts    the two entrypoints

apps/chatgpt-app/       Interactive widget UI (React + Vite, built as single-file HTML)
  src/
    components/          RestaurantResultsApp, RestaurantCard, ComparisonApp, ActionButtons
    openaiBridge.ts       window.openai host bridge (feature-detected, safe outside ChatGPT)
  results.html            entry for search/hidden-gems/offers/new-openings/surprise-me
  comparison.html         entry for compare_restaurants
```

Nothing in `apps/mcp-server` re-implements filtering, ranking or restaurant
facts - every tool calls into `@bitejoy/core`'s `rankRestaurants` /
`pickSurprise` / `buildRecommendation` / `checkHardFilters`, then maps the
result into a chat-friendly shape (`lib/cardView.ts`, `lib/detailView.ts`,
`lib/comparison.ts`). The AI model, when configured, only ever rephrases
data that's already been computed - see "OpenAI integration" below.

## Prerequisites

```bash
npm install
npm run build   # builds @bitejoy/core, both widget bundles, and the MCP server
```

No API keys are required for any of this - `BITEJOY_PROVIDER` defaults to
the fictional demo dataset, and every tool works with `OPENAI_API_KEY`
unset (see "OpenAI integration").

## Running the server locally

**stdio** (what most MCP clients, including ChatGPT's developer mode and
Claude Desktop, expect):

```bash
npm run dev -w @bitejoy/mcp-server        # ts source, auto-restart
# or, after `npm run build`:
npm run start -w @bitejoy/mcp-server      # compiled dist/stdio.js
```

**Streamable HTTP** (for remote/browser-based clients, or quick `curl`
testing):

```bash
npm run dev:http -w @bitejoy/mcp-server   # http://localhost:3333/mcp
```

### Exact local testing steps used to verify this build

1. `npm run build`
2. `npm run dev:http -w @bitejoy/mcp-server` (or `start:http` after a build)
3. Health check: `curl http://localhost:3333/healthz` → `{"ok":true,"server":"bitejoy"}`
4. Handshake:
   ```bash
   curl -s -X POST http://localhost:3333/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0.0.0"}}}'
   ```
5. The flagship example, end to end:
   ```bash
   curl -s -X POST http://localhost:3333/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{
       "name":"search_restaurants",
       "arguments":{"location":"Croydon","partySize":4,"budgetPerPersonGbp":30,
                     "cuisines":["burgers"],"requiredFacilities":["parking"],"dateTime":"tonight"}
     }}'
   ```
   This returns `Flame & Fork` as the top match with a warm text summary and
   full structured card data - exactly what's asserted in
   `apps/mcp-server/src/__tests__/integration.test.ts`.

For interactive, point-and-click testing of every tool (rather than raw
`curl`), use the official [MCP
Inspector](https://www.npmjs.com/package/@modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node apps/mcp-server/dist/stdio.js
```

This opens a local web UI where you can call each tool, inspect its Zod
input/output schemas, and read the widget resources directly.

### Widget preview (without any MCP server at all)

```bash
npm run dev -w @bitejoy/chatgpt-app
```

Opens a Vite dev server rendering `results.html` / `comparison.html` against
built-in demo data (`src/demoData.ts`), so the card UI can be sanity-checked
in a real browser without a running server or ChatGPT host.

## Connecting in ChatGPT developer mode

**This exact checklist has not been run against a live ChatGPT session from
this development environment** - there's no browser or ChatGPT access here,
and no tunneling tool (`ngrok`, `localtunnel`, ...) is installed in this
sandbox. Everything below is the precise, real sequence to run manually;
nothing in it is simulated or assumed to have passed.

### 1. Start the MCP server

```bash
npm run build
npm run start:http -w @bitejoy/mcp-server   # http://localhost:3333/mcp
```

Confirm it's actually up: `curl http://localhost:3333/healthz` should return
`{"ok":true,"server":"bitejoy"}`.

### 2. Expose it over HTTPS

ChatGPT developer mode requires an HTTPS endpoint - `localhost` alone isn't
reachable from ChatGPT's servers. For local development, a tunnel is the
quickest way to get one; **the tunnel itself is a dev convenience, never
part of the production architecture** - a real deployment should terminate
TLS on a proper host instead (see `MCP_PUBLIC_URL` in `.env.example`, which
should be set to whichever of the two you're using).

```bash
# any of these work - pick whichever you have installed
ngrok http 3333
# or
npx localtunnel --port 3333
```

Note the resulting `https://…` URL. Set `MCP_PUBLIC_URL` in `.env` to
`https://<tunnel-host>/mcp` and restart the server so its OAuth Protected
Resource Metadata (see [docs/mcp-oauth.md](mcp-oauth.md)) advertises the
right public URL.

### 3. The exact MCP endpoint URL format

```
https://<tunnel-or-production-host>/mcp
```

That's the single URL ChatGPT needs - the same streamable-HTTP path used
for local `curl` testing above, just reached over the tunnel instead of
`localhost`.

### 4. Enable ChatGPT developer mode and connect

1. In ChatGPT, open Settings → Apps & Connectors (or the current equivalent
   - this menu has moved before and may again; search ChatGPT's own help
   center for "developer mode" if it's not where expected).
2. Enable developer mode.
3. Add a new connector / custom connector, pointing at the URL from step 3.
4. If the server requires authentication for a tool (see
   [docs/mcp-oauth.md](mcp-oauth.md) - public restaurant-discovery tools
   never require it, only the account-linked ones like `save_restaurant`
   do), ChatGPT should prompt for sign-in the first time an authenticated
   tool is invoked, redirecting through Supabase's real OAuth screen.
5. ChatGPT calls `tools/list` and should discover all registered tools, and
   calls `resources/read` for a tool's `ui://` resource the first time it
   renders that tool's widget.

### 5. Prompts to test

- *"Find somewhere fun near Croydon for four people tonight. Around £30
  each, good burgers, drinks and somewhere with parking."* (public, no
  auth - should return Flame & Fork on top with an interactive card grid)
- *"What hidden gems are there near Croydon?"* (public)
- *"Compare Flame & Fork and Wok This Way for a group of 4."* (public)
- *"Save Flame & Fork for later"* (requires the account-linking flow -
  expect a sign-in prompt the first time)
- *"What are my saved restaurants?"* (requires auth)

### 6. Inspecting failures

- **Tool not discovered at all**: check the server logs for startup errors,
  and confirm `tools/list` returns it via `curl` or the MCP Inspector
  (below) before suspecting the ChatGPT side.
- **Tool call fails immediately**: every tool returns `isError: true` with a
  human-readable message rather than a raw exception (see
  `apps/mcp-server/src/lib/errors.ts`) - that message is exactly what
  ChatGPT will show; there's no hidden detail being swallowed.
- **Widget doesn't render**: most likely cause is drift in the resource MIME
  type / `_meta` convention (`openai/outputTemplate`, `text/html+skybridge`)
  - re-check against
  [developers.openai.com/apps-sdk](https://developers.openai.com/apps-sdk),
  since this surface has been evolving. Confirm the resource itself is
  correct first: `curl`-fetch it via the MCP Inspector's resource viewer.
- **Auth prompt never appears / fails**: check the server's
  `/.well-known/oauth-protected-resource` response is reachable over the
  tunnel URL, and see the troubleshooting section in
  [docs/mcp-oauth.md](mcp-oauth.md).

If ChatGPT access genuinely isn't available in a given environment (as
here), everything up through "the tunnel URL responds correctly to a raw
MCP `tools/call` over HTTPS" can still be verified without it - do that,
document exactly which parts you verified, and leave the ChatGPT-side steps
as an explicit manual checklist rather than claiming they were run.

## Custom GPT Action (fallback when Developer Mode isn't available)

MCP connectors / Developer Mode are not available on every ChatGPT
plan/account - confirmed on a live account during Stage 3, not assumed.
When that's the case, the same server also exposes a plain REST +
OpenAPI 3.1 surface (`apps/mcp-server/src/rest/`) built for ChatGPT's
older "Custom GPT" Actions system instead. This is a second *transport*
for identical behavior, not a second implementation - every REST route
calls the exact same `perform*` function the equivalent MCP tool does
(see `src/tools/*.ts`), so there's nothing to keep in sync by hand.

**Endpoints** (same origin as the `/mcp` endpoint):

| Route | Auth | Same as MCP tool |
| --- | --- | --- |
| `GET /restaurants/search?location=...` | none (public) | `search_restaurants` |
| `POST /restaurants/{id}/save` | Bearer token | `save_restaurant` |
| `DELETE /restaurants/{id}/save` | Bearer token | `remove_saved_restaurant` |
| `GET /account/saved` | Bearer token | `list_saved_restaurants` |
| `GET /openapi.json` | none | the schema itself, for import into a GPT Action |

Unlike the MCP transport (where a missing/invalid token still returns a
`200` with an in-band "please sign in" message, since most MCP tools are
public), every private REST route returns a real `401` with no token -
that's what lets a GPT Action's configured OAuth flow actually trigger
instead of silently doing nothing.

### Setting it up

1. **Deploy the server somewhere with a real public URL** (Railway/Fly -
   see `fly.toml`/`railway.json` at the repo root) or use a tunnel for
   testing, same as the MCP setup above. `MCP_PUBLIC_URL` must be set so
   `/openapi.json`'s `servers` entry matches the real reachable origin.
2. **Register an OAuth client in the Supabase dashboard.** Supabase's
   project already runs a real OAuth 2.1 Authorization Server (confirmed
   live: PKCE-S256-capable `/auth/v1/oauth/authorize` and
   `/auth/v1/oauth/token` endpoints - see docs/mcp-oauth.md) - but it has
   no Dynamic Client Registration, so a client id/secret has to be created
   by hand: Supabase Dashboard → Authentication → find the OAuth
   Apps/clients section → create a new app. You'll need ChatGPT's redirect
   URI for this specific Action, which ChatGPT only shows you once you
   start step 3 below - do that first if the dashboard asks for it up
   front, then come back and finish this step.
3. **In ChatGPT: Create a GPT → Configure → Actions → Create new action.**
   - Import from URL: `<your-server-url>/openapi.json`
   - Authentication: OAuth
     - Client ID / Client Secret: from step 2
     - Authorization URL: `<SUPABASE_URL>/auth/v1/oauth/authorize`
     - Token URL: `<SUPABASE_URL>/auth/v1/oauth/token`
     - Scope: whatever the dashboard's client-creation screen in step 2
       actually calls it (`email` is `rest/openapiSchema.ts`'s best-guess
       default, not empirically confirmed against this specific Supabase
       feature - worth checking against the real screen)
   - Save, then test with a prompt like *"find me somewhere to eat in
     Croydon tonight"* - that hits `searchRestaurants` (no auth needed);
     saving something will prompt the OAuth sign-in the first time.

This whole section was built and REST-verified live (public search,
every private route's real 401-without-a-token, and a full authenticated
save → list → remove round trip using a real disposable Supabase test
user - see docs/stage-3-verification.md). The GPT Builder click-through in
step 3 itself has not been run - it needs a real ChatGPT session and the
OAuth client from step 2, neither of which this environment has.

## Tools

| Tool | Purpose |
| --- | --- |
| `understand_food_request` | Free text → structured criteria. Deterministic (no AI needed); asks at most one follow-up question. |
| `search_restaurants` | 3-5 ranked recommendations for structured criteria. |
| `get_restaurant_details` | Full record for one restaurant by id. |
| `compare_restaurants` | Compares 2-4 restaurants against the same requirements: best overall/value/atmosphere/group, plus trade-offs. |
| `surprise_me` | One strong, slightly adventurous pick - still respects budget/dietary/radius. |
| `find_hidden_gems` | Independent, lesser-known restaurants only - hard-excludes chains and anything with 500+ reviews, never just "poorly rated". |
| `find_current_offers` | Restaurants with a currently valid (non-expired) offer, with verification status. |
| `find_new_openings` | Restaurants opened within the last ~60 days. |

Every tool: validates input and output with Zod, never throws a raw error
(`isError: true` + a clean message instead - see
`apps/mcp-server/src/lib/errors.ts`), and never invents a restaurant, price,
offer, rating or opening time - all of that comes from `@bitejoy/core`'s
scoring engine and fictional dataset.

### Example requests

```
"Find somewhere fun near Croydon for four people tonight. Around £30 each, good burgers, drinks and somewhere with parking."
"Surprise me - somewhere in Croydon, vegan, around £20 each."
"What hidden gems are there near Croydon?"
"Any good offers on near Croydon right now?"
"What's new near Croydon?"
"Compare Flame & Fork and Wok This Way for a group of 4."
```

## OpenAI integration

`apps/mcp-server/src/ai/openaiClient.ts` is entirely optional:

- **`understand_food_request`** always runs deterministic extraction first
  (`nlu/extractCriteria.ts` - regex/keyword rules covering location, date,
  party size, budget, cuisine, dietary needs, occasion, atmosphere,
  facilities). If `OPENAI_API_KEY` is set, an AI pass can *fill gaps* the
  deterministic rules left blank (never overrides a rule-based match, and is
  never allowed to touch location/coordinates - that stays purely
  deterministic to avoid geocoding hallucination).
- **`search_restaurants` and friends** always build a deterministic warm
  summary from the scoring engine's own `reasons` (`lib/personality.ts`). If
  `OPENAI_API_KEY` is set, that summary can optionally be rephrased by the
  model - constrained by a prompt that forbids adding any fact not already
  present in the JSON it's given (see `ai/prompts/`).
- Every AI call is wrapped in a try/catch that falls back to the
  deterministic path on any error, timeout, or invalid/unparseable output.
- Prompts live in dedicated files under `ai/prompts/`, not inlined in tool
  handlers.

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env` to enable this layer -
**this has not been tested against a live OpenAI key** in this build; the
deterministic path is what's actually verified by the test suite.

## How fictional data mode works

`BITEJOY_PROVIDER=fictional` (the default) backs every tool with
`FictionalRestaurantProvider` from `@bitejoy/core` - ~18 entirely invented
restaurants around Croydon/Streatham, each tagged `source: "fictional_demo"`
with realistic menus, prices, hours, offers (some deliberately expired) and
review summaries. This is what every test in this repo runs against, and
what ChatGPT will see until a real data source is wired in.

## How Google Places will later replace/supplement fictional data

Setting `BITEJOY_PROVIDER=google_places` (with `GOOGLE_PLACES_API_KEY` set)
swaps in `GooglePlacesProvider`, which speaks the exact same
`RestaurantProvider` interface - no tool or scoring code changes. It's
structurally complete but **has not been exercised against a live Google
API key**; Google has no concept of menus, offers or independent-vs-chain
status, so those fields are estimated or left empty and everything it
returns is marked `isVerified: false`. Re-verify its field mapping against
current Google Places API (New) docs before enabling it for real traffic
(tracked as a Stage 6 task). The two providers can eventually run
side-by-side (e.g. fictional as a fallback, Google Places as the primary
source) since both return the same `Restaurant[]` shape.

## Current limitations

- **Not tested against a live ChatGPT connection.** The widget resource
  MIME type (`text/html+skybridge`) and `_meta` conventions
  (`openai/outputTemplate`, `openai/toolInvocation/*`) match OpenAI's
  documented conventions as of this build, but that surface has been
  evolving alongside the emerging "MCP Apps" spec - re-check
  developers.openai.com/apps-sdk before shipping.
- **Not tested against a live OpenAI key.** The optional AI layer is
  implemented and unit-testable in its fallback path, but the actual model
  call has not been exercised end to end.
- **Save is real, but optimistic-and-unverified up front.** Stage 3 adds
  accounts and saved restaurants via `save_restaurant` /
  `remove_saved_restaurant` / `list_saved_restaurants` /
  `get_user_preferences` / `update_user_preferences` on the MCP server, and
  the widget calls these for real (see `ActionButtons.tsx`). There is still
  no documented, verified way for the widget to ask "is this ChatGPT user
  authenticated with BiteJoy?" up front, so it optimistically flips Save to
  "Saved ✓" on click and rolls back to a "connect your account" prompt if
  the tool call reports `isError: true`. Connecting an account itself is a
  handoff to the host conversation (`sendFollowUpMessage`), not a real
  in-widget OAuth flow - the sandboxed widget iframe has no documented way
  to drive that itself. Book / Order remain disabled - no real
  booking/ordering integration exists yet.
- **Stateless HTTP transport.** `http.ts` creates a fresh server + transport
  per request (no server-side session or widget state persistence across
  turns beyond what the client itself keeps).
- **Compare requires re-passing search criteria.** MCP tool calls are
  stateless; `compare_restaurants` takes the same location/budget/etc.
  arguments as the original search so it can score consistently against
  the same requirements (the widget and the model both do this
  automatically).
