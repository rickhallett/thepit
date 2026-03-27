# Change Propagation Analysis - Phase 2: Tracing

**Date:** 2026-03-16
**Codebase:** The Pit (thepit-v2)
**Methodology:** `docs/internal/audits/change-propagation-methodology.md`

---

## Selection Rationale

The following 5 paths were selected to expose the system's core architecture across synchronous mutations, streaming workflows, data-heavy reads, async event integrations, and multi-table business operations:

1. **Start Bout (`app/actions.ts:createBout`)**: The core product action entry point.
2. **Execute Bout Stream (`app/api/run-bout/route.ts`)**: The system's most complex execution path, handling streaming LLM responses, real-time rate limits, and financial state (credits).
3. **Leaderboard View (`app/leaderboard/page.tsx`)**: Exercises the application's caching layer and read-heavy query aggregation.
4. **Stripe Subscription Webhook (`app/api/credits/webhook/route.ts`)**: Traces external asynchronous event ingestion and idempotency handling.
5. **New User Onboarding (`lib/onboarding.ts:applySignupBonus`)**: Demonstrates how cross-boundary state (users, credits, system intro pool) is synchronized.

---

## Trace 1: Start Bout (Core Mutation)

**Origin**: User submits "Start Bout" form on `/arena`.

```text
HOP 1:
  From: UI Form Submit (Client)
  To: app/actions.ts:createBout (Line 62)
  Mechanism: Request-response (Server Action execution)
  Boundary crossed: Client -> Server (`app/`)
  Failure mode: Surfaced (Next.js error boundary / Toast if handled by client wrapper)
  Ordering assumption: none

HOP 2:
  From: app/actions.ts:createBout (Line 63)
  To: lib/presets.ts:getPresetById
  Mechanism: Request-response (In-memory lookup)
  Boundary crossed: `app/` -> `lib/`
  Failure mode: Logged/Cascading (If preset invalid, immediately redirects to `/arena`)
  Ordering assumption: Preset data must be loaded into memory before action executes.

HOP 3:
  From: app/actions.ts:createBout (Line 67)
  To: @clerk/nextjs:auth
  Mechanism: Request-response (Session check)
  Boundary crossed: `app/` -> External Auth
  Failure mode: Cascading (Unauthenticated users without demo mode are redirected to `/sign-up`)
  Ordering assumption: none

HOP 4:
  From: app/actions.ts:createBout (Line 89)
  To: db/schema.ts (bouts table)
  Mechanism: Direct mutation (SQL INSERT via Drizzle)
  Boundary crossed: `app/` -> `db/` (Directly, bypassing `lib/`)
  Failure mode: Cascading (DB connection or constraint error throws 500)
  Ordering assumption: none

HOP 5:
  From: app/actions.ts:createBout (Line 113)
  To: next/navigation:redirect
  Mechanism: Request-response (HTTP 303 Redirect)
  Boundary crossed: Server (`app/`) -> Client
  Failure mode: Surfaced (Browser navigation)
  Ordering assumption: DB insertion (Hop 4) must complete successfully before redirecting.
```

**Trace Summary**:
- **Total hops**: 5
- **Unique mechanisms**: Request-response, Direct mutation.
- **Boundaries crossed**: 4 (`Client` -> `app/` -> `lib/`, `app/` -> External, `app/` -> `db/`, `app/` -> `Client`).
- **Consistency**: The action directly mutates the database rather than delegating to a `lib/bouts.ts` service, showing a pattern of leaky DB boundaries in Next.js Server Actions.

---

## Trace 2: Execute Bout Stream (Async/Streaming Execution)

**Origin**: Client opens SSE/Streaming connection to `/api/run-bout`.

```text
HOP 1:
  From: UI Stream Request (Client)
  To: app/api/run-bout/route.ts:POST (Line 66)
  Mechanism: Request-response (Streaming HTTP)
  Boundary crossed: Client -> `app/`
  Failure mode: Surfaced (UI shows connection error)
  Ordering assumption: none

HOP 2:
  From: app/api/run-bout/route.ts (Line 19)
  To: lib/bout-engine.ts:validateBoutRequest
  Mechanism: Request-response (Authentication, DB checks, rate limits, credit balance check)
  Boundary crossed: `app/` -> `lib/`
  Failure mode: Surfaced (Validation fails return explicit HTTP 400/403/429 errors)
  Ordering assumption: Validation must fully resolve before any LLM execution begins.

HOP 3:
  From: app/api/run-bout/route.ts (Line 36)
  To: lib/bout-engine.ts:executeBout
  Mechanism: Derived computation / Streaming delegate
  Boundary crossed: `app/` -> `lib/`
  Failure mode: Surfaced (Caught by `onError` handler in `createUIMessageStream` which returns user-friendly messages like "API rate limited").
  Ordering assumption: none

HOP 4:
  From: lib/bout-engine.ts:_executeBoutInner (Line 616)
  To: lib/posthog-server.ts:serverTrack
  Mechanism: Event propagation (Telemetry metric)
  Boundary crossed: `lib/` -> External (PostHog)
  Failure mode: Silent (Telemetry failures are typically swallowed to avoid breaking the core flow)
  Ordering assumption: none

HOP 5:
  From: lib/bout-engine.ts:_executeBoutInner (Line 806+)
  To: ai:streamText (Anthropic/OpenAI)
  Mechanism: Request-response (External API call)
  Boundary crossed: `lib/` -> External LLM
  Failure mode: Cascading (Throws error, caught by Hop 3 `onError` handler)
  Ordering assumption: Turns execute sequentially; Turn N depends on Turn N-1 completing.

HOP 6:
  From: lib/bout-engine.ts:_executeBoutInner (End of stream / Post-processing)
  To: lib/credits.ts:finalizeCreditHold & db/schema.ts (bouts table)
  Mechanism: Direct mutation (Deduct credits, UPDATE bout status to 'completed')
  Boundary crossed: `lib/` -> `db/`
  Failure mode: Logged (DB failures here may result in "free" bouts if credits fail to finalize, or stuck "running" status)
  Ordering assumption: Stream must close or error before final state is written.
```

**Trace Summary**:
- **Total hops**: 6
- **Unique mechanisms**: Request-response, Event propagation, Direct mutation.
- **Boundaries crossed**: 4 (`Client` -> `app/`, `app/` -> `lib/`, `lib/` -> External, `lib/` -> `db/`).
- **Consistency**: High consistency. Validation, core logic, and teardown are properly encapsulated within `lib/bout-engine.ts`. The API route acts solely as a transport wrapper. Failure modes are exceptionally well-handled via explicit error matching.

---

## Trace 3: Leaderboard Read Path (Caching)

**Origin**: User visits `/leaderboard`.

```text
HOP 1:
  From: UI Navigation (Client)
  To: app/leaderboard/page.tsx:LeaderboardPage (Line 8)
  Mechanism: Request-response (RSC render)
  Boundary crossed: Client -> `app/`
  Failure mode: Surfaced (Next.js Error Boundary)
  Ordering assumption: none

HOP 2:
  From: app/leaderboard/page.tsx (Line 9)
  To: lib/leaderboard.ts:getLeaderboardData (Line 88)
  Mechanism: Request-response
  Boundary crossed: `app/` -> `lib/`
  Failure mode: Cascading (Throws 500 if internal logic fails)
  Ordering assumption: none

HOP 3:
  From: lib/leaderboard.ts:getLeaderboardData (Line 89)
  To: lib/leaderboard.ts (In-memory `leaderboardCache`)
  Mechanism: Derived computation (Cache read)
  Boundary crossed: none
  Failure mode: Silent (Cache miss simply falls through to DB query)
  Ordering assumption: Cache TTL check determines flow.

HOP 4: (Cache Miss Path)
  From: lib/leaderboard.ts:getLeaderboardData (Line 115)
  To: db/schema.ts (bouts, winnerVotes, referrals, users)
  Mechanism: Request-response (SQL SELECTs via `Promise.all`)
  Boundary crossed: `lib/` -> `db/`
  Failure mode: Cascading (DB timeout/error breaks the page load)
  Ordering assumption: Aggregation queries execute concurrently.
```

**Trace Summary**:
- **Total hops**: 4
- **Unique mechanisms**: Request-response, Derived computation.
- **Boundaries crossed**: 3 (`Client` -> `app/`, `app/` -> `lib/`, `lib/` -> `db/`).
- **Consistency**: Clean separation of concerns. The page relies entirely on `lib/leaderboard.ts`. However, the in-memory cache mechanism assumes a single runtime instance, which is problematic in horizontal serverless environments.

---

## Trace 4: Stripe Webhook (Async Event Ingestion)

**Origin**: Stripe pushes an event to `POST /api/credits/webhook/route.ts`.

```text
HOP 1:
  From: Stripe (External)
  To: app/api/credits/webhook/route.ts:POST (Line 80)
  Mechanism: Event propagation
  Boundary crossed: External -> `app/`
  Failure mode: Surfaced (Stripe receives 400/500 and applies retry schedule)
  Ordering assumption: none

HOP 2:
  From: app/api/credits/webhook/route.ts (Line 89)
  To: stripe.webhooks.constructEvent
  Mechanism: Request-response (Signature cryptographic validation)
  Boundary crossed: `app/` -> `lib/stripe.ts`
  Failure mode: Logged/Surfaced (Returns 400 to Stripe immediately if invalid)
  Ordering assumption: Must validate before parsing payload.

HOP 3:
  From: app/api/credits/webhook/route.ts (Line 183 - `invoice.payment_succeeded`)
  To: db/schema.ts (users table)
  Mechanism: Request-response (Lookup userId by stripeCustomerId if missing)
  Boundary crossed: `app/` -> `db/`
  Failure mode: Cascading (Breaks webhook processing, triggering Stripe retry)
  Ordering assumption: none

HOP 4:
  From: app/api/credits/webhook/route.ts (Line 196)
  To: lib/credits.ts:applyCreditDelta
  Mechanism: Direct mutation (Drizzle `db.transaction` inserting to `credit_transactions` and updating `user_credits`)
  Boundary crossed: `app/` -> `lib/` -> `db/`
  Failure mode: Cascading (Transaction rolls back, throws 500, Stripe retries)
  Ordering assumption: Idempotency is handled internally by checking `referenceId` inside the transaction.
```

**Trace Summary**:
- **Total hops**: 4
- **Unique mechanisms**: Event propagation, Request-response, Direct mutation.
- **Boundaries crossed**: 4 (`External` -> `app/`, `app/` -> `lib/stripe.ts`, `app/` -> `db/`, `app/` -> `lib/credits.ts`).
- **Consistency**: The webhook handler (`app/`) contains significant business logic (determining monthly grants, resolving tiers) rather than delegating the entire event payload to a `lib/billing.ts` service. This leaks domain rules into the routing layer.

---

## Trace 5: New User Onboarding (Complex State Sync)

**Origin**: Application triggers `applySignupBonus` (e.g., post-login).

```text
HOP 1:
  From: Caller (`app/actions.ts` or similar)
  To: lib/onboarding.ts:applySignupBonus (Line 18)
  Mechanism: Request-response
  Boundary crossed: `app/` -> `lib/`
  Failure mode: Cascading
  Ordering assumption: none

HOP 2:
  From: lib/onboarding.ts:applySignupBonus (Line 23)
  To: db/schema.ts (creditTransactions table)
  Mechanism: Request-response (Idempotency check - "did this user already get a signup bonus?")
  Boundary crossed: `lib/` -> `db/`
  Failure mode: Cascading
  Ordering assumption: Must run before attempting to deduct from the intro pool.

HOP 3:
  From: lib/onboarding.ts:applySignupBonus (Line 36)
  To: lib/intro-pool.ts:claimIntroCredits
  Mechanism: Direct mutation (Atomic decrement of global `intro_pool_state` record)
  Boundary crossed: `lib/` -> `lib/` (Cross-domain within lib)
  Failure mode: Surfaced (Returns `{ status: 'pool_empty' }` if funds depleted)
  Ordering assumption: Pool deduction must succeed before crediting the user.

HOP 4:
  From: lib/onboarding.ts:applySignupBonus (Line 43)
  To: lib/credits.ts:applyCreditDelta
  Mechanism: Direct mutation (Adds credits to user)
  Boundary crossed: `lib/` -> `lib/`
  Failure mode: Cascading (DB insertion failure leaves pool deducted but user uncredited - potential state drift, though pool will eventually be reconciled or lost)
  Ordering assumption: none

HOP 5:
  From: lib/onboarding.ts:applySignupBonus (Line 54)
  To: lib/posthog-server.ts:serverTrack
  Mechanism: Event propagation (Metrics `signup_bonus_applied`)
  Boundary crossed: `lib/` -> External
  Failure mode: Silent
  Ordering assumption: Fire-and-forget after DB commits.
```

**Trace Summary**:
- **Total hops**: 5
- **Unique mechanisms**: Request-response, Direct mutation, Event propagation.
- **Boundaries crossed**: 3 (`app/` -> `lib/`, `lib/` -> `db/`, `lib/` -> External).
- **Consistency**: High consistency within `lib/`. Distinct domains (`intro-pool.ts`, `credits.ts`, `users.ts`) are cleanly composed by `onboarding.ts`.
- **Failure Handling Gap**: If Hop 4 (`applyCreditDelta`) fails (e.g., DB disconnect), Hop 3 (`claimIntroCredits`) has already permanently deducted from the global intro pool. There is no distributed transaction or compensation logic to return the credits to the pool if the user write fails.

(End of Phase 2)
