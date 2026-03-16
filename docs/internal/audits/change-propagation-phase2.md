# Change Propagation Analysis - Phase 2: Change Propagation Tracing

Date: 2026-03-16
Author: Weaver (change propagation review)
Status: Complete

---

## Traced Actions

7 user-facing actions traced across the system's major boundaries.

| # | Action | Boundaries Crossed | Hops | Primary Mechanism |
|---|--------|--------------------|------|-------------------|
| 1 | User runs a preset bout | 6 (UI, server action, DB, API, bout-engine, LLM) | 8 | Request-response + SSE streaming |
| 2 | User creates a custom agent | 4 (UI, API, DB, EAS blockchain) | 7 | Request-response |
| 3 | Stripe webhook processes subscription | 3 (Stripe, API, DB) | 5 | Inbound webhook + request-response |
| 4 | Middleware processes a page request | 3 (Edge, internal API, DB) | 2 | Request preprocessing + fire-and-forget |
| 5 | User reacts to a turn | 3 (UI, API, DB) | 4 | Optimistic update + request-response |
| 6 | New user signup onboarding | 4 (Clerk, layout, DB, PostHog) | 8 | Server-side orchestration |
| 7 | Leaderboard page loads | 3 (ISR, DB, client) | 5 | Cache + full-payload hydration |

---

## Trace 1: User Runs a Preset Bout

```
ACTION: User selects a preset and runs a bout (core product action)
ENTRY POINT: components/preset-card.tsx handleSubmit()

HOP 1:
  From: PresetCard form submit (components/preset-card.tsx:101)
  To: createBout server action (app/actions.ts:62)
  Mechanism: request-response (Next.js server action via HTML form)
  Boundary crossed: yes - client to server
  Failure mode: BYOK stash failure -> surfaced (inline error). Form validation -> surfaced.
  Ordering assumption: BYOK cookie must be set before form submit (sequential)
  Notes: BYOK path has a pre-flight fetch to /api/byok-stash before submitting the form.
         PostHog 'preset_selected' event fires client-side before the server action.

HOP 2:
  From: createBout (app/actions.ts:62)
  To: bouts table (DB INSERT), users table (UPSERT)
  Mechanism: direct mutation (Drizzle INSERT)
  Boundary crossed: yes - server to DB
  Failure mode: silent (DB failure -> unhandled 500). Invalid preset -> redirect to /arena (no error message).
  Ordering assumption: bout row must exist before redirect to /bout/[id]
  Notes: ensureUserRecord may call Clerk API if profile is stale (>24h). Bout is created with
         status='running' and empty transcript. Redirect passes presetId/topic/model as query params.

HOP 3:
  From: browser redirect to /bout/[id] (Next.js navigation)
  To: BoutPage server component (app/bout/[id]/page.tsx:89)
  Mechanism: request-response (page render)
  Boundary crossed: yes - client to server (new page load)
  Failure mode: DB read failure -> logged, continues with bout=undefined. No preset -> 404.
  Ordering assumption: assumes bout row created in HOP 2 is visible. Has backfill INSERT ON
                       CONFLICT DO NOTHING as safety net for race conditions.
  Notes: 4 parallel DB reads for reactions/votes. Loads initial state for SSR hydration.

HOP 4:
  From: BoutPage (server render)
  To: Arena client component (components/arena.tsx:363)
  Mechanism: derived computation (React hydration, props drilling)
  Boundary crossed: yes - server to client (RSC payload)
  Failure mode: none at this boundary
  Ordering assumption: none
  Notes: All initial state (preset, transcript, reactions, votes) crosses as serialized props.

HOP 5:
  From: useBout hook useEffect (lib/use-bout.ts:119)
  To: /api/run-bout (fetch POST)
  Mechanism: request-response (fetch with SSE streaming response)
  Boundary crossed: yes - client to API route
  Failure mode: surfaced (error detail with tier-aware upgrade prompts for 401/402/429)
  Ordering assumption: assumes bout row already exists in DB
  Notes: BYOK key NOT in request body - read from HTTP-only cookie server-side.
         2-4 second "thinking delay" buffers tokens before showing to create UX effect.

HOP 6:
  From: POST handler (app/api/run-bout/route.ts:18)
  To: validateBoutRequest (lib/bout-engine.ts:169)
  Mechanism: request-response (function call)
  Boundary crossed: no (same module)
  Failure mode: 17 distinct validation gates, each returning structured error Response
  Ordering assumption: rate limit, tier check, credit preauthorization must complete before execution
  Notes: Reads and clears BYOK cookie. Pre-authorizes credits atomically. Idempotency check
         on boutId prevents double-execution.

HOP 7:
  From: validateBoutRequest (lib/bout-engine.ts:169)
  To: executeBout (lib/bout-engine.ts:541)
  Mechanism: request-response (async function, SSE callback for streaming)
  Boundary crossed: yes - server to Anthropic API (external)
  Failure mode: cascading (turn timeout -> partial content preserved, bout continues.
               Non-timeout error -> bout marked 'error', credits refunded)
  Ordering assumption: turns are sequential. Each turn must complete before the next starts.
  Notes: N LLM calls (1 per turn + 1 for share line). Anthropic prompt caching on system message.
         LangSmith tracing wraps the entire execution. Sentry structured logging. PostHog
         server-side analytics per turn. Credit settlement on completion (delta from preauth).

HOP 8:
  From: executeBout completion/error
  To: bouts table (DB UPDATE), credits table (DB UPDATE)
  Mechanism: direct mutation (Drizzle UPDATE)
  Boundary crossed: yes - server to DB
  Failure mode: logged. DB update failure -> transcript lost (non-recoverable). Credit
               settlement failure -> financial discrepancy (logged for manual review).
  Ordering assumption: transcript UPDATE must happen before SSE stream closes
  Notes: On error path: partial transcript saved, credits refunded, intro pool refunded.
         PostHog flush is best-effort. LangSmith flush is scheduled via next/server after().

TOTAL HOPS: 8
MECHANISMS USED: request-response (server action, fetch, function call), direct mutation (DB),
                 derived computation (React hydration), event propagation (SSE streaming)
BOUNDARIES CROSSED: 6 (client->server, server->DB, server->client, client->API, server->Anthropic,
                       server->LangSmith/PostHog/Sentry)
CONSISTENCY ASSESSMENT: Mechanisms are consistent and intentional. The SSE streaming pattern is
  well-suited for the long-running LLM turn loop. The credit preauthorization/settlement pattern
  is a deliberate two-phase commit for financial correctness. The BYOK cookie pattern (set in
  one request, consumed and cleared in the next) is a security-motivated design choice to avoid
  sending API keys in request bodies.
```

---

## Trace 2: User Creates a Custom Agent

```
ACTION: User fills agent builder form and creates a new agent
ENTRY POINT: components/agent-builder.tsx handleSubmit()

HOP 1:
  From: AgentBuilder form submit (components/agent-builder.tsx:110)
  To: POST /api/agents (fetch)
  Mechanism: request-response (fetch POST with JSON body)
  Boundary crossed: yes - client to API
  Failure mode: surfaced (error message displayed inline)
  Ordering assumption: none
  Notes: Client-side validation (name required, name length, at least one personality field)
         runs before the fetch. buildStructuredPrompt runs in useMemo for live preview.

HOP 2:
  From: POST /api/agents handler (app/api/agents/route.ts:59)
  To: agents table (DB INSERT)
  Mechanism: request-response (Zod validation, function calls) then direct mutation (DB INSERT)
  Boundary crossed: yes - API to DB
  Failure mode: surfaced (400/401/402/429 with structured error messages)
  Ordering assumption: ensureUserRecord must complete before slot count check
  Notes: 12-step pipeline: Zod -> UNSAFE_PATTERN -> prompt build -> response config -> auth ->
         rate limit -> user record -> slot check -> ID gen -> manifest build -> hash -> DB insert.
         Slot check is count-then-insert (not atomic) - race condition possible for concurrent requests.

HOP 3:
  From: agents table INSERT
  To: EAS contract (Base L2 blockchain)
  Mechanism: request-response (RPC call, on-chain transaction)
  Boundary crossed: yes - server to blockchain
  Failure mode: non-fatal (attestationFailed flag set, agent still created)
  Ordering assumption: agent must exist in DB before attestation (attestation references agentId)
  Notes: EAS attestation is the only blockchain interaction in the system. Costs gas. Produces
         an on-chain attestation UID that is stored back in the agents table via UPDATE.

HOP 4:
  From: agents table INSERT
  To: remix_events table (DB INSERT), credits table (DB UPDATE)
  Mechanism: direct mutation (fire-and-forget DB writes)
  Boundary crossed: no (same DB)
  Failure mode: silent (caught and logged, does not fail the response)
  Ordering assumption: agent must exist before remix event references it
  Notes: Only fires for clone/remix operations (parentId is set). Reward amounts default to 0,
         so credit distribution is effectively disabled unless configured.

TOTAL HOPS: 4 (3 if no EAS, 2 if no clone)
MECHANISMS USED: request-response (fetch, Zod, DB queries, RPC), direct mutation (DB INSERT/UPDATE)
BOUNDARIES CROSSED: 4 (client->API, API->DB, server->blockchain, server->PostHog)
CONSISTENCY ASSESSMENT: The pipeline is linear and well-ordered. The non-fatal treatment of
  EAS failure is an intentional availability-over-consistency tradeoff. The fire-and-forget
  remix event recording is appropriate for a non-critical side effect.
```

---

## Trace 3: Stripe Webhook Processes Subscription Creation

```
ACTION: Stripe sends customer.subscription.created webhook after checkout
ENTRY POINT: app/api/credits/webhook/route.ts POST handler

HOP 1:
  From: Stripe webhook delivery
  To: POST /api/credits/webhook handler (route.ts:80)
  Mechanism: request-response (inbound webhook)
  Boundary crossed: yes - external to server
  Failure mode: surfaced to Stripe (400/500 status codes trigger Stripe retry)
  Ordering assumption: webhook signature must verify (HMAC-SHA256)
  Notes: Stripe retries webhooks with exponential backoff for non-200 responses.

HOP 2:
  From: webhook handler
  To: users table (DB UPDATE)
  Mechanism: direct mutation (Drizzle UPDATE)
  Boundary crossed: yes - server to DB
  Failure mode: cascading (DB failure -> 500 -> Stripe retries). But UPDATE is idempotent
               (SET operation, not increment), so retries are safe.
  Ordering assumption: userId must be in subscription.metadata (set during checkout session creation)
  Notes: Missing userId in metadata -> entire block silently skipped. No error logged for this case.

HOP 3:
  From: webhook handler
  To: credit_transactions + credits tables (DB transaction)
  Mechanism: direct mutation (Drizzle transaction: INSERT + UPDATE)
  Boundary crossed: no (same DB)
  Failure mode: transaction rolls back atomically. DB unique index on reference_id is the backstop
               against double-granting.
  Ordering assumption: ensureCreditAccount must run before applyCreditDelta
  Notes: Two-layer deduplication: (1) hasExistingGrant() application-level SELECT, (2) DB unique
         partial index on credit_transactions.reference_id. The reference_id format encodes the
         subscription ID: "{sub_id}:subscription_grant".

HOP 4:
  From: webhook handler
  To: PostHog API
  Mechanism: request-response (HTTP POST via captureImmediate)
  Boundary crossed: yes - server to external (PostHog)
  Failure mode: cascading (PostHog outage -> unhandled throw -> 500 -> Stripe retries).
               Tier update and credit grant may have already committed.
  Ordering assumption: analytics should fire after DB writes succeed
  Notes: PostHog failure here is problematic - it can cause 500 responses that trigger Stripe
         retries. The DB writes are idempotent so retries are safe, but the PostHog events
         could fire multiple times. This is a missing try/catch.

TOTAL HOPS: 4
MECHANISMS USED: request-response (webhook, HTTP to PostHog), direct mutation (DB UPDATE, DB transaction)
BOUNDARIES CROSSED: 3 (Stripe->server, server->DB, server->PostHog)
CONSISTENCY ASSESSMENT: The deduplication mechanism is sound (application-level check + DB unique
  index). The idempotent tier UPDATE handles retries cleanly. The PostHog failure mode is a gap -
  analytics calls should be wrapped in try/catch to prevent them from triggering webhook retries.
```

---

## Trace 4: Middleware Processes a Page Request

```
ACTION: Any GET request hits the middleware pipeline
ENTRY POINT: middleware.ts (Clerk middleware wrapper)

HOP 1:
  From: incoming HTTP request
  To: middleware pipeline (middleware.ts:45-288)
  Mechanism: request preprocessing (header injection, cookie management)
  Boundary crossed: yes - edge to application
  Failure mode: each step is independent. IP resolution -> 'unknown'. Variant assignment ->
               default. UTM/session/visit -> gated behind consent. No step can crash the request.
  Ordering assumption: x-copy-variant header must be set before NextResponse.next() (line 117-119)
  Notes: 12 distinct operations in sequence: request ID, IP, geo, copy variant, referral cookie,
         consent gate, UTM cookie, session cookie, visit counter, page view recording.
         Sets 4 request headers (x-request-id, x-client-ip, x-client-country, x-copy-variant).
         Writes up to 6 cookies conditionally.

HOP 2:
  From: middleware (fire-and-forget fetch)
  To: POST /api/pv handler (app/api/pv/route.ts)
  Mechanism: request-response (internal fetch, fire-and-forget with 5s timeout)
  Boundary crossed: yes - middleware to internal API route
  Failure mode: silent (caught with empty .catch(), user never sees it)
  Ordering assumption: none (fire-and-forget)
  Notes: Protected by PV_INTERNAL_SECRET (timing-safe comparison). Inserts into page_views table.
         Fires PostHog session_started event for new sessions. The middleware has already returned
         the response to the user by this point - the PV recording is non-blocking.

TOTAL HOPS: 2
MECHANISMS USED: request preprocessing (header/cookie manipulation), request-response (internal fetch)
BOUNDARIES CROSSED: 3 (edge->app, middleware->API, API->DB)
CONSISTENCY ASSESSMENT: Clean separation of concerns. Each middleware step is independent and
  fault-tolerant. The fire-and-forget PV recording is appropriate for analytics that should
  never block the user experience.
```

---

## Trace 5: User Reacts to a Turn (Heart/Fire)

```
ACTION: User clicks heart or fire reaction button on a bout turn
ENTRY POINT: components/arena.tsx MessageCard reaction button

HOP 1:
  From: reaction button onClick (arena.tsx:199)
  To: useBoutReactions.sendReaction (lib/use-bout-reactions.ts:43)
  Mechanism: derived computation (React state update via optimistic pattern)
  Boundary crossed: no (same component tree)
  Failure mode: none at this stage
  Ordering assumption: none
  Notes: Debounce via pendingRef Set prevents double-clicks. Uses useRef (not useState)
         for user reaction state to avoid stale closures in the async callback.

HOP 2:
  From: sendReaction optimistic update
  To: POST /api/reactions (fetch)
  Mechanism: request-response (fetch POST)
  Boundary crossed: yes - client to API
  Failure mode: surfaced (optimistic update reverted on any error)
  Ordering assumption: optimistic update must happen before fetch (for instant UI feedback)
  Notes: Optimistic count uses delta (+1/-1). Server returns absolute counts which replace
         the optimistic values, eliminating drift.

HOP 3:
  From: /api/reactions handler (app/api/reactions/route.ts)
  To: reactions table (DB toggle: SELECT + DELETE or INSERT)
  Mechanism: direct mutation (Drizzle SELECT then DELETE or INSERT)
  Boundary crossed: yes - API to DB
  Failure mode: cascading (DB error -> 500 -> client reverts optimistic state)
  Ordering assumption: toggle direction determined by existing row check. Race condition on
                      concurrent clicks handled by onConflictDoNothing on INSERT.
  Notes: Fingerprint = userId (if authenticated) or "anon:{sha256(ip)}". Supports anonymous
         reactions. Returns absolute counts (re-aggregated from DB) for reconciliation.

HOP 4:
  From: API response
  To: client state reconciliation (use-bout-reactions.ts:86-108)
  Mechanism: derived computation (React state replacement from server data)
  Boundary crossed: yes - API to client
  Failure mode: if response OK but data malformed -> counts not reconciled, optimistic values persist
  Ordering assumption: server counts are authoritative and replace client counts
  Notes: This is the key consistency mechanism. The optimistic update provides instant feedback.
         The server response provides authoritative state. The client replaces its counts with
         server counts, correcting any drift from concurrent users or failed optimistic updates.

TOTAL HOPS: 4
MECHANISMS USED: derived computation (optimistic update, reconciliation), request-response (fetch),
                 direct mutation (DB toggle)
BOUNDARIES CROSSED: 3 (client->API, API->DB, API->client)
CONSISTENCY ASSESSMENT: The optimistic-update-with-server-reconciliation pattern is well-implemented.
  The use of useRef for user reaction state avoids the common stale-closure bug. The debounce via
  pendingRef prevents double-submission. The server returning absolute counts (not deltas) is the
  correct choice for eventual consistency with concurrent users.
```

---

## Trace 6: New User Signup Onboarding

```
ACTION: Authenticated user's first page load triggers onboarding
ENTRY POINT: app/layout.tsx (root layout, every page)

HOP 1:
  From: root layout auth resolution (app/layout.tsx:48)
  To: initializeUserSession (lib/onboarding.ts:58)
  Mechanism: request-response (async function call from server component)
  Boundary crossed: no (same server render)
  Failure mode: silent (analytics try/catch at line 139). DB failures would cascade to 500.
  Ordering assumption: Clerk auth must resolve before onboarding runs
  Notes: Fires on EVERY authenticated page load. In-memory cache (1hr TTL) prevents the
         5+ DB queries from running repeatedly.

HOP 2:
  From: initializeUserSession
  To: users table (UPSERT), referrals table (SELECT/UPDATE)
  Mechanism: direct mutation (Drizzle queries)
  Boundary crossed: yes - server to DB
  Failure mode: cascading (DB failure -> unhandled 500 on page render)
  Ordering assumption: userRecordExists must run BEFORE ensureUserRecord to capture the
                      durable new-user signal
  Notes: 3 sequential DB operations: userRecordExists, ensureUserRecord, ensureReferralCode.
         ensureUserRecord may call Clerk API if profile is stale.

HOP 3:
  From: initializeUserSession (credits branch)
  To: credits + credit_transactions + intro_pool tables
  Mechanism: direct mutation (DB transaction for credit delta, atomic SQL for pool claim)
  Boundary crossed: no (same DB)
  Failure mode: pool exhaustion is handled gracefully (returns 'empty', user still onboarded)
  Ordering assumption: ensureCreditAccount before applySignupBonus before applyReferralBonus
  Notes: Intro pool uses exponential decay computed atomically in SQL:
         remaining = initial * 0.5^(elapsed/halfLife) - claimed.
         DB-level dedup via credit_transactions WHERE source='signup' prevents double-claiming
         across deploys/restarts.

HOP 4:
  From: initializeUserSession (analytics)
  To: PostHog API
  Mechanism: request-response (HTTP POST via captureImmediate/identifyImmediate)
  Boundary crossed: yes - server to external
  Failure mode: silent (try/catch at onboarding.ts:139, analytics loss is acceptable)
  Ordering assumption: analytics fires only for genuinely new users (isNewUser flag)
  Notes: Fires signup_completed event with acquisition channel (referral > paid > organic).
         Sets persistent person properties (signup_date, initial_tier, acquisition_channel).

TOTAL HOPS: 4 (conceptually), 8 (individual DB operations)
MECHANISMS USED: request-response (function calls, Clerk API, PostHog HTTP),
                 direct mutation (DB inserts/updates/transactions)
BOUNDARIES CROSSED: 4 (Clerk->server, server->DB, server->Clerk API, server->PostHog)
CONSISTENCY ASSESSMENT: Well-designed layered deduplication:
  1. In-memory cache (1hr) - performance optimization
  2. DB query for existing credit transaction (source='signup') - correctness guarantee
  3. DB unique index on reference_id - backstop
  The durable new-user detection (userRecordExists before ensureUserRecord) is a deliberate
  design that survives process restarts.
```

---

## Trace 7: Leaderboard Page Loads

```
ACTION: User navigates to /leaderboard
ENTRY POINT: app/leaderboard/page.tsx

HOP 1:
  From: incoming page request
  To: Next.js ISR cache check
  Mechanism: derived computation (Next.js ISR, revalidate=30s)
  Boundary crossed: no (framework-level cache)
  Failure mode: cache miss -> full server render
  Ordering assumption: none
  Notes: If cached HTML is <30s old, served directly. No server code runs.

HOP 2:
  From: ISR cache miss
  To: getLeaderboardData (lib/leaderboard.ts:87)
  Mechanism: request-response (function call with in-memory cache)
  Boundary crossed: no (same server process)
  Failure mode: DB failure -> unhandled 500
  Ordering assumption: none
  Notes: 5-minute in-memory cache. Worst-case staleness: 5min + 30s (in-memory + ISR).

HOP 3:
  From: getLeaderboardData (cache miss)
  To: DB (5 parallel queries per range, 3 ranges = 15 queries)
  Mechanism: request-response (Drizzle SELECT)
  Boundary crossed: yes - server to DB
  Failure mode: cascading (any query failure -> unhandled 500)
  Ordering assumption: none (queries are independent)
  Notes: Full-table scans for all 5 tables per range. All aggregation (vote counting, win
         determination, win rate computation) happens in JavaScript, not SQL. This is explicitly
         acknowledged as a scale concern in code comments.

HOP 4:
  From: server component render
  To: LeaderboardDashboard client component (props)
  Mechanism: derived computation (React serialization, props drilling)
  Boundary crossed: yes - server to client (RSC payload)
  Failure mode: none at this boundary
  Ordering assumption: none
  Notes: FULL dataset for all 3 ranges and both leaderboard types crosses the boundary.
         This enables instant client-side tab/range switching without network requests.
         Trade-off: larger initial payload for zero-latency interaction.

HOP 5:
  From: LeaderboardDashboard
  To: LeaderboardTable / PlayerLeaderboardTable
  Mechanism: derived computation (React state + useMemo for filter/sort)
  Boundary crossed: no (same client tree)
  Failure mode: none
  Ordering assumption: none
  Notes: All filtering (search, preset, source) and re-sorting happens client-side via
         useMemo. No network requests for any leaderboard interaction after initial load.

TOTAL HOPS: 5
MECHANISMS USED: derived computation (ISR, in-memory cache, React hydration, client-side filter/sort),
                 request-response (DB queries)
BOUNDARIES CROSSED: 3 (ISR->server, server->DB, server->client)
CONSISTENCY ASSESSMENT: Two-layer caching (ISR + in-memory) is intentional but creates a staleness
  window. The full-payload hydration pattern is a deliberate UX trade-off for instant interaction.
  The in-JavaScript aggregation is a known scale limitation. All patterns are consistent and
  appropriate for current data volume.
```
