# Change Propagation Analysis - Phase 3: Pattern Analysis

Date: 2026-03-16
Author: Weaver (change propagation review)
Status: Complete

---

## 3.1 Mechanism Consistency

### Boundary: Client -> Server

| Mechanism | Used In | Rationale |
|-----------|---------|-----------|
| Server actions (form submit) | Bout creation, credit checkout, subscription checkout, billing portal, agent archive/restore | Form-based mutations that redirect on success |
| fetch() POST | Agent creation, reactions, voting, sharing, newsletter, contact, feature requests, BYOK stash, Ask The Pit | Client-side mutations that update local state without navigation |
| fetch() POST with SSE stream | Bout streaming (run-bout), Ask The Pit | Long-running responses that emit incremental data |
| fetch() GET | Feature request list, research export | Client-side data loading |

**Assessment:** The variation is intentional. Server actions handle mutations that result in page navigation (redirect). Fetch calls handle mutations that update in-place. SSE handles long-running operations. The distinction maps cleanly to UX requirements. No inconsistency.

### Boundary: Server -> Database

| Mechanism | Used In | Rationale |
|-----------|---------|-----------|
| Direct Drizzle queries | All 17 data-access files, 6 page files | Standard data access pattern |
| Drizzle transactions | Credit operations (preauth, settle, apply delta), admin seed-agents | Financial consistency |
| Atomic SQL (UPDATE with WHERE clause) | Intro pool claims, credit preauthorization | Concurrency control |
| ON CONFLICT DO NOTHING | User/credit account/bout creation | Idempotent upserts for race conditions |

**Assessment:** Consistent. Financial operations use transactions. Idempotent operations use ON CONFLICT. Concurrency-sensitive operations use atomic SQL. The pattern is disciplined and appropriate.

### Boundary: Server -> External Services

| Service | Mechanism | Used In |
|---------|-----------|---------|
| Anthropic API | Vercel AI SDK streamText/generateText | bout-engine.ts (turns + share line) |
| Stripe | Stripe SDK (webhook verification, checkout creation) | webhook handler, server actions |
| PostHog (server) | posthog-node captureImmediate/identifyImmediate | bout analytics, onboarding, PV recording |
| PostHog (client) | posthog-js capture | component analytics events |
| EAS (blockchain) | ethers + EAS SDK | agent attestation |
| Clerk | Clerk SDK (auth, profile fetch) | middleware, layout, API routes |
| LangSmith | langsmith SDK (tracing) | bout-engine.ts |
| Resend | HTTP API | contact form |
| arXiv | XML API | paper submissions |
| Sentry | @sentry/nextjs logger | bout-engine.ts |

**Assessment:** Consistent. Each external service has a single integration point (one lib file). The only variation is PostHog, which has both server-side (`posthog-server.ts`, using `captureImmediate` for serverless reliability) and client-side (`analytics.ts`, using standard `capture`). This variation is documented and intentional - it addresses the serverless event loss problem.

### Boundary: Server -> Client

| Mechanism | Used In |
|-----------|---------|
| Props drilling from server components | All page -> component connections |
| RSC payload serialization | Leaderboard (full dataset), bout page (initial state) |
| SSE streaming | Bout execution (turn-by-turn), Ask The Pit |

**Assessment:** Consistent. All server-to-client data flow uses React props or SSE. No other mechanism (WebSocket, polling, etc.) is used.

### Dominant Pattern

The system is **primarily request-response with direct database access**. The only asynchronous propagation mechanisms are:

1. **Inbound webhooks** (Stripe -> application)
2. **SSE streaming** (application -> client, for long-running LLM operations)
3. **Fire-and-forget internal fetch** (middleware -> /api/pv)

There are no event buses, no message queues, no pub/sub, no WebSockets, no polling. Change propagation is synchronous and explicit at every boundary.

---

## 3.2 Smell Catalogue

### SMELL-01: Cross-boundary direct mutation (DB schema as interface)

**Severity: Medium-High**
**Files:** 17 lib files + 6 page files import `@/db/schema` directly.

The database schema types (`bouts`, `agents`, `credits`, `users`, etc.) serve as the shared interface between all modules. There is no repository layer, no data access abstraction, no DTO pattern. Any schema change (column rename, type change, new column) propagates to every consumer.

**Specific instances:**
- `app/bout/[id]/page.tsx:30` imports `bouts` table and `TranscriptEntry` type
- `app/arena/page.tsx` uses `getCreditBalanceMicro`, `getCreditTransactions` from credits.ts
- `components/arena.tsx` imports `ReactionCountMap` type from `lib/reactions.ts`
- `lib/bout-engine.ts:29` imports `bouts` and `TranscriptEntry` directly

**Mitigating factor:** Drizzle ORM provides compile-time type safety. A schema change that breaks consumers will be caught by `tsc --noEmit` (part of the gate). The risk is developer velocity, not runtime correctness.

### SMELL-02: Inconsistent mechanism at same boundary (page-level DB access)

**Severity: Medium**
**Files:** `app/bout/[id]/page.tsx`, `app/b/[id]/page.tsx`, `app/sitemap.ts`, `app/arena/page.tsx`

Some page files access the database directly via `requireDb()` and raw Drizzle queries, while most delegate to lib functions. The inconsistency means the same data access concern (e.g., loading a bout by ID) is implemented in two places: once in the page file and once in a lib function.

**Specific instances:**
- `app/bout/[id]/page.tsx:138-146` does its own `SELECT * FROM bouts WHERE id = ?` instead of using a lib function
- `app/sitemap.ts` does a raw `SELECT id, updatedAt FROM bouts WHERE status = 'completed'`
- Meanwhile, `app/agents/[id]/page.tsx` correctly delegates to `getAgentDetail()` in lib

**Requires human judgment:** The page-level DB access may be intentional for simplicity in cases where the query is trivial and only used once. But it violates the principle that data access should be in lib/.

### SMELL-03: Missing failure handling on change hops

**Severity: High (for data-writing paths)**

**3a: DB write failure in createBout server action**
- `app/actions.ts:89-98`: The `INSERT INTO bouts` call has no try/catch. A DB failure produces an unhandled exception that surfaces as a generic Next.js 500 error with no user-facing message.

**3b: PostHog failure in Stripe webhook handler**
- `app/api/credits/webhook/route.ts:189-196`: `serverTrack` and `serverIdentify` calls are awaited but not wrapped in try/catch. A PostHog outage causes a 500 response to Stripe, triggering retries. The DB writes are idempotent so retries are safe, but the analytics calls could fire multiple times.

**3c: DB write failure at bout completion**
- `lib/bout-engine.ts:1053-1063`: The final `UPDATE bouts SET status='completed', transcript=...` has no dedicated error handling. If this UPDATE fails, the transcript is lost but the streaming response has already been sent to the client. The bout would remain in `'running'` status permanently.

**3d: Credit settlement failure**
- `lib/bout-engine.ts:1161-1172`: `settleCredits` failure in the success path is caught and logged, but the bout is already marked 'completed'. A financial discrepancy exists until manual review. This is documented behaviour but worth noting.

### SMELL-04: Implicit ordering dependencies

**Severity: Medium**

**4a: Bout creation -> page load race**
- `app/actions.ts` creates a bout row then redirects to `/bout/[id]`. The redirect URL construction and the DB INSERT are sequential in the server action, but the redirect causes a new HTTP request. The page load at `/bout/[id]` may arrive before the INSERT's WAL commit is visible on a read replica. The backfill INSERT at `app/bout/[id]/page.tsx:161-178` is an explicit mitigation for this race.

**4b: BYOK cookie set -> form submit ordering**
- `components/preset-card.tsx:126-146`: The BYOK path sets a cookie via `/api/byok-stash` and then calls `form.requestSubmit()`. The cookie must be set before the form submission triggers the server action, which triggers the bout page, which triggers `/api/run-bout`, which reads the cookie. There are 3 HTTP request boundaries between cookie write and cookie read, all sequential.

**4c: Middleware PV recording -> page render independence**
- `middleware.ts:260-285`: The fire-and-forget fetch to `/api/pv` is explicitly non-blocking. But it accesses Clerk auth (`await clerkAuth()`) which could delay the middleware response. The `AbortController` with 5s timeout mitigates this.

### SMELL-05: Manual synchronisation of derived state

**Severity: Low (at current scale)**

**5a: Leaderboard aggregation in JavaScript**
- `lib/leaderboard.ts:137-320`: Vote counts, win rates, best bouts, and player stats are computed from raw table scans in JavaScript. This is derived state that should ideally be maintained by the database (materialised views, triggers, or aggregate queries). Currently, the 5-minute cache masks the cost, but the computation scales linearly with data volume.

**5b: Agent snapshot resolution**
- `lib/agent-registry.ts:80-134`: Agent snapshots are assembled by merging DB records with static preset definitions. The same resolution logic runs in `getAgentSnapshots`, `findAgentById`, `getAgentDetail`, and the leaderboard aggregation. Each call site independently queries and resolves. No shared cached resolution.

### SMELL-06: Event chains with no circuit breaker

**Severity: N/A**

No event chains exist. The system has no event-driven patterns, no pub/sub, no custom event emitters. Change propagation is entirely request-response. This smell does not apply.

### SMELL-07: Polling where subscription would serve

**Severity: Low**

No polling patterns found. The leaderboard uses ISR (revalidate=30s) which is server-push on revalidation, not client polling. The bout streaming uses SSE, not polling. The system does not poll for state changes.

### SMELL-08: State duplication without sync strategy

**Severity: Medium**

**8a: Go CLI tools and TypeScript app share the database but not the schema**
- `shared/db/db.go` connects to the same Postgres instance as `db/index.ts`. Schema knowledge is implicitly shared - the Go code knows table names and column names but has no type-safe schema definition. A migration in `db/schema.ts` will not produce a compile error in Go code. The sync strategy is "developer remembers to update both."

**8b: Preset definitions in JSON vs DB agents table**
- `presets/` contains JSON files defining arena presets. These are loaded at module startup by `lib/presets.ts`. The `agents` table also contains agent records seeded from these presets via `/api/admin/seed-agents`. The "true" agent definition lives in the preset JSON; the DB record is a materialised copy. A preset JSON change requires re-running the seed endpoint. No automated sync.

**8c: Two dead tables**
- `free_bout_pool` and `agent_flags` exist in the schema but have no active code paths. They are remnants of previous features. They carry no sync risk (no readers or writers) but add schema surface area.

---

## 3.3 Change Impact Projection

### Requirement 1: Creator Profiles (Issues #61-65)

**What it needs:** A new `/profile/[id]` page showing a user's created agents, bout history, community contributions, and public display name.

**Modules that change:**
- `db/schema.ts` - new `profiles` table or extended `users` table (display_name, bio, avatar, visibility)
- `lib/` - new `profile.ts` data access file (or extend `users.ts`)
- `app/profile/[id]/` - new page route
- `components/` - new `creator-profile.tsx` component
- `lib/agent-detail.ts` - link agent detail page to creator profile
- `components/leaderboard-table.tsx` - link player names to profiles
- `lib/leaderboard.ts` - include profile data in player leaderboard response
- `lib/copy.ts` / `copy/` - new copy strings for profile UI

**Files touched:** 8-12
**Boundaries crossed:** 3 (DB schema change, new page route, component additions)
**Mechanisms needed:** Request-response (standard), derived computation (profile data from existing tables)

**Assessment: Easy.** The current architecture accommodates this cleanly. The data model is additive (new table or columns). The page/component pattern is well-established. No new propagation mechanism needed. The only friction is SMELL-05b - the leaderboard would need to include profile data, adding another join to an already-expensive query.

### Requirement 2: Tournament Brackets (Issue #14)

**What it needs:** Multi-round elimination events where bouts feed into a bracket structure, with automated progression and a final winner.

**Modules that change:**
- `db/schema.ts` - new tables: `tournaments`, `tournament_rounds`, `tournament_matches` (or similar)
- `lib/bout-engine.ts` - tournament-aware bout execution (progression logic)
- `lib/` - new `tournament.ts` orchestration module
- `app/tournament/` - new page routes (bracket view, tournament detail)
- `components/` - new bracket visualization component
- `app/actions.ts` or new API routes - tournament creation, round advancement
- `lib/credits.ts` - tournament-level cost estimation and settlement
- `lib/presets.ts` - tournament preset definitions

**Files touched:** 15-25
**Boundaries crossed:** 5+ (new DB tables, new page routes, new API routes, new components, modified bout-engine)
**Mechanisms needed:** Request-response (standard), potentially new: **scheduled execution** (auto-advance rounds), **state machine** (tournament lifecycle)

**Assessment: Awkward to Structurally Difficult.** The current architecture has no concept of multi-bout orchestration. `bout-engine.ts` executes a single bout in isolation. Tournaments require:
1. A new state machine (tournament lifecycle: registration -> seeding -> rounds -> finals -> completed)
2. Coordination between bout completion and round advancement (currently, bout completion has no downstream effects beyond credit settlement)
3. Either scheduled execution (cron to advance rounds) or event-driven progression (bout completion triggers next match) - neither mechanism exists today
4. The `bout-engine.ts` god module (1274 lines, 22 imports) would need modification, increasing its already-high complexity

The core obstruction is the lack of any event/callback mechanism for bout completion. Today, a bout completes and updates a DB row. Nothing is notified. Tournament progression would need to know when a bout finishes, which requires either:
- Polling (fragile, latency)
- A post-completion hook in bout-engine.ts (requires modifying the god module)
- An event/queue system (new infrastructure)

### Requirement 3: Multi-LLM / AI Gateway (Issue #13)

**What it needs:** BYOK users choose from any LLM provider (not just Anthropic), routed via Vercel AI Gateway or OpenRouter.

**Modules that change:**
- `lib/models.ts` - expanded model registry with provider routing
- `lib/ai.ts` - multi-provider model instantiation (currently Anthropic + OpenRouter only)
- `lib/bout-engine.ts` - provider-specific prompt formatting, caching, token counting
- `lib/credits.ts` - per-model pricing (partially implemented via `MODEL_PRICES_GBP_JSON`)
- `lib/env.ts` - new env vars for additional providers
- `components/preset-card.tsx`, `components/arena-builder.tsx` - expanded model picker UI
- `lib/byok.ts` - multi-provider key validation

**Files touched:** 8-12
**Boundaries crossed:** 2 (lib/ changes, component changes)
**Mechanisms needed:** Request-response (existing), new provider SDK integrations

**Assessment: Easy to Awkward.** The model abstraction (`lib/ai.ts`, `lib/models.ts`) is already designed for multiple providers - `getModel()` dispatches by model ID to either Anthropic or OpenRouter. Adding more providers is additive. The friction comes from `bout-engine.ts`:
- Anthropic-specific prompt caching (`ANTHROPIC_CACHE_CONTROL` at line 90-92) would need conditional application
- The `isAnthropicModel()` check (line 99-101) would need expansion
- Token counting and cost estimation are partially model-specific
- The XML prompt format (`lib/xml-prompt.ts`) works well for Claude but may not be optimal for other models

The current mechanism choice (direct function calls for model selection) does not obstruct this requirement. The risk is in the bout-engine's coupling to Anthropic-specific features.

---

## Summary of Impact Analysis

| Requirement | Difficulty | Primary Friction |
|-------------|-----------|-----------------|
| Creator Profiles | Easy | Additive. Well-established patterns. |
| Tournament Brackets | Structurally Difficult | No event system for bout completion. God module. No state machine infrastructure. |
| Multi-LLM Gateway | Easy to Awkward | Model abstraction exists. Anthropic-specific code in bout-engine needs conditional handling. |
