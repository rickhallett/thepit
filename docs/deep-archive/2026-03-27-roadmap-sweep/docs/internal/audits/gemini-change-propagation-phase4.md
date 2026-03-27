# Change Propagation Analysis - Phase 4: Architectural Assessment

**Date:** 2026-03-16
**Codebase:** The Pit (thepit-v2)
**Methodology:** `docs/internal/audits/change-propagation-methodology.md`

---

## 4.1 Health Summary

- **Dominant propagation pattern:** The system primarily uses synchronous **Request-response** function calls combined with **Direct mutation** via the Drizzle ORM. Streaming Server-Sent Events (SSE) are cleanly used for the LLM bout execution. This is highly appropriate for a Next.js App Router application.
- **Boundary integrity score:** **2/5**. The `lib/` domain layer successfully encapsulates complex external integrations (LLMs, PostHog, LangSmith). However, the boundary between the transport/UI layer (`app/`) and the database (`db/`) is heavily compromised. Next.js Server Actions and Webhook handlers directly import database schemas and execute raw ORM queries instead of utilizing a cohesive service layer.
- **Failure resilience:** Generally **Strong**, particularly in the streaming implementation (`lib/bout-engine.ts`) which explicitly catches and surfaces rate limits, timeouts, and overloads to the UI. However, a critical **Missing/Cascading** gap exists in multi-table mutations (e.g., `lib/onboarding.ts`) where sequential, un-transactional updates can permanently leak state if interrupted mid-flight.
- **Change readiness:** **Moderate to Poor**. Horizontal scaling (e.g., Vercel Edge/Serverless deployments) will expose significant flaws in the current in-memory caching design. Furthermore, database schema changes will require invasive rewrites across Next.js UI Server Actions and HTTP Webhooks due to the lack of domain encapsulation.

---

## 4.2 Prioritised Recommendations

### 1. Replace In-Memory Caching with a Distributed Store (Redis)
- **Current state:** `lib/leaderboard.ts:88`, `lib/onboarding.ts:73`, and `lib/copy.ts:164` use module-level variables (e.g., `let leaderboardCache`) to cache heavy computations and static configurations.
- **Target state:** All shared state must use a centralized distributed cache (e.g., Upstash Redis, Vercel KV) to ensure consistency across stateless, ephemeral serverless isolates.
- **Mechanism:** Request-response (Redis `GET`/`SET` with TTL).
- **Migration path:** Introduce a `lib/cache.ts` module wrapping a Redis client. Replace all instances of `leaderboardCache` and `onboardingCache` with asynchronous Redis reads/writes. (Risk level: Medium, requires infrastructure provisioning).
- **What breaks if unfixed:** As the application scales horizontally, different serverless functions will hold different states in memory. Users will see wildly inconsistent leaderboards, and onboarding idempotency checks will fail across requests routed to different isolates.

### 2. Encapsulate DB Writes into a Repository/Service Layer
- **Current state:** `app/actions.ts:createBout` (Line 89) imports `bouts` from `@/db/schema` and directly executes `db.insert(bouts)`. `app/api/credits/webhook/route.ts` (Line 183) executes `db.select().from(users)`.
- **Target state:** The `app/` directory should only import from `lib/` (e.g., `BoutService.createBout(params)`, `BillingService.processWebhook(payload)`).
- **Mechanism:** Maintain Direct mutation, but enforce the module boundary.
- **Migration path:** Move all Drizzle queries out of `app/actions.ts` and `app/api/*` into dedicated functions in `lib/bouts.ts`, `lib/users.ts`, and `lib/billing.ts`. (Risk level: Low, ~150 LOC affected).
- **What breaks if unfixed:** Any future changes to the database schema or ORM tool will force a rewrite of the UI transport layer. The Next.js routing layer remains tightly coupled to the database.

### 3. Implement Transactional Safety for Intro Pool Deductions
- **Current state:** `lib/onboarding.ts:applySignupBonus` calls `claimIntroCredits` (Line 36), which mutates the global pool, and then calls `applyCreditDelta` (Line 43), which grants credits to the user.
- **Target state:** Both mutations must succeed or fail together as a single atomic unit.
- **Mechanism:** Direct mutation via a Drizzle transaction (`db.transaction`).
- **Migration path:** Update `claimIntroCredits` and `applyCreditDelta` to accept an optional `tx` (transaction object) parameter instead of instantiating `db` internally. Wrap the logic in `applySignupBonus` inside a `db.transaction(async (tx) => { ... })` block. (Risk level: Medium).
- **What breaks if unfixed:** A transient database failure occurring exactly between Hop 3 and Hop 4 will deduct credits from the finite intro pool but fail to credit the user, permanently leaking credits.

---

## 4.3 Decision Log

### Intentional Inconsistency: HTTP Redirects inside Server Actions
- **The Issue:** `app/actions.ts` uses `redirect('/arena')` (Line 64, 73, 113) midway through business logic, blending HTTP response handling into data mutation logic.
- **The Tradeoff:** Next.js App Router leverages exceptions for redirects (`next/navigation`). Separating this into a clean "return status code -> let UI redirect" model is verbose and anti-idiomatic in Next.js Server Actions.
- **Why it was made:** To align with the idiomatic Next.js 14/15 framework design where `redirect()` throws a known error that the Next.js router explicitly catches and handles natively without manual client-side JavaScript.
- **When to revisit:** This must be revisited if the `createBout` action ever needs to be exposed as a traditional REST/GraphQL API endpoint for a mobile app or a third-party client, as the exception-based redirect will cause unhandled 500 errors or opaque behavior outside of the Next.js frontend context.

(End of Phase 4)
