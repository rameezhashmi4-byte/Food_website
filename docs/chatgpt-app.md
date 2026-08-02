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

This is the documented flow per OpenAI's Apps SDK docs, **not yet exercised
against a live ChatGPT connection**:

1. Run the HTTP server somewhere ChatGPT can reach it (`npm run start:http`
   locally + a tunnel such as `ngrok http 3333` for a quick test, or deploy
   it).
2. In ChatGPT, enable developer mode and add a new connector pointing at
   `https://<your-host>/mcp`.
3. ChatGPT calls `tools/list`, discovers the 8 tools below, and calls
   `resources/read` for each tool's `ui://` resource the first time it
   renders a widget.
4. Try the flagship prompt: *"Find somewhere fun near Croydon for four
   people tonight. Around £30 each, good burgers, drinks and somewhere with
   parking."*

If the widget doesn't render inside ChatGPT, the most likely cause is the
resource MIME type / `_meta` convention drift mentioned below - re-check
against [developers.openai.com/apps-sdk](https://developers.openai.com/apps-sdk)
before debugging further.

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
- **No authentication yet.** Save later / Book / Order are shown disabled
  in the widget - Stage 3 adds accounts, saved restaurants and real
  persistence.
- **Stateless HTTP transport.** `http.ts` creates a fresh server + transport
  per request (no server-side session or widget state persistence across
  turns beyond what the client itself keeps).
- **Compare requires re-passing search criteria.** MCP tool calls are
  stateless; `compare_restaurants` takes the same location/budget/etc.
  arguments as the original search so it can score consistently against
  the same requirements (the widget and the model both do this
  automatically).
