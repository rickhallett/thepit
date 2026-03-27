# Change Propagation Analysis - Phase 4: Architectural Assessment

Date: 2026-03-16
Author: Weaver (change propagation review)
Status: Complete

---

## 4.1 Architecture Health Summary

### Dominant Propagation Pattern

**Request-response with direct database access.** Every user action follows the same shape: UI component -> (server action | API route) -> lib function -> Drizzle query -> Postgres. The only exceptions are SSE streaming (for long-running LLM operations) and inbound Stripe webhooks.

This pattern is appropriate for the system's current domain (a content platform with a request-per-bout cadence) and scale (single-region, single-database, serverless deployment). The absence of event-driven infrastructure is a feature, not a gap - it eliminates an entire class of ordering and delivery problems.

The pattern would become a constraint if the system needs: cross-bout coordination (tournaments), real-time multi-user interaction (collaborative viewing), or asynchronous processing (batch analysis). None of these are current requirements.

### Boundary Integrity Score

| Boundary | Integrity | Notes |
|----------|-----------|-------|
| `middleware.ts` -> `lib/` | Clean | 2 imports only (ip.ts, copy-edge.ts) |
| `app/` pages -> `components/` | Clean | Props-based data flow, clear server/client split |
| `components/` -> `lib/` hooks | Clean | Hooks have well-defined interfaces |
| `app/` pages -> `lib/` | Leaky | 6 pages import `db/schema` directly; inconsistent use of lib functions vs raw queries |
| `lib/` -> `db/` | Leaky | 17 files import raw schema tables; no repository abstraction |
| `shared/` (Go) -> DB | Decoupled but fragile | Separate runtime, no shared schema types |
| Internal lib/ | Clean | No circular dependencies; DAG structure |

**Score: 4 of 7 boundaries are clean.** The leaky boundaries are all on the data access path, which is a common pattern in Next.js monoliths. The leak is contained by TypeScript's type system - schema changes produce compile errors.

### Failure Resilience

Across 7 traced paths, 34 total hops:

| Category | Count | %age |
|----------|-------|------|
| Adequate failure handling | 24 | 71% |
| Silent failure (logged only) | 5 | 15% |
| Missing failure handling | 3 | 9% |
| Cascading failure risk | 2 | 6% |

**Notable gaps:**
- `createBout` server action: no try/catch on DB insert (SMELL-03a)
- Stripe webhook: PostHog failure causes webhook retry (SMELL-03b)
- Bout completion: DB UPDATE failure loses transcript (SMELL-03c)

**Notable strengths:**
- Credit operations: atomic transactions with rollback
- Intro pool: atomic SQL with LEAST/GREATEST for concurrency safety
- Webhook dedup: two-layer protection (application check + DB unique index)
- Optimistic updates: full server reconciliation with error reversion
- Fire-and-forget analytics: never blocks user-facing paths

### Change Readiness

| Requirement | Readiness |
|-------------|-----------|
| Creator Profiles | High - additive, well-patterned |
| Multi-LLM Gateway | Medium - model abstraction exists, Anthropic coupling in bout-engine needs work |
| Tournament Brackets | Low - no event system, no state machine infrastructure, god module |

The system is well-prepared for requirements that add new pages, components, and data types. It is poorly prepared for requirements that need coordination between existing entities (e.g., bout completion triggering downstream actions).

---

## 4.2 Prioritised Recommendations

Ordered by impact-to-effort ratio. Each recommendation includes what breaks if you don't fix it.

### R1: Wrap analytics calls in Stripe webhook handler with try/catch

**Current state:** `app/api/credits/webhook/route.ts:189-196` - `serverTrack` and `serverIdentify` are awaited without error handling. PostHog outage causes 500 -> Stripe retry -> duplicate analytics events (DB writes are idempotent but analytics are not).

**Target state:** Wrap PostHog calls in try/catch, log warning, continue. Analytics loss is acceptable; webhook failure is not.

**Mechanism:** No change (still request-response).

**Migration path:** 5-line change. Add try/catch around the two await calls.

**What breaks if unfixed:** A PostHog API outage during a subscription event causes Stripe to retry the webhook, potentially multiple times. The DB writes are idempotent so no financial harm, but the webhook retry queue builds up, and analytics events fire N times instead of once.

**Effort: Low. Impact: Medium.**

### R2: Add try/catch to createBout server action DB insert

**Current state:** `app/actions.ts:89-98` - `INSERT INTO bouts` has no error handling. DB failure produces an unhandled Next.js 500 with no useful error message.

**Target state:** Catch DB errors, redirect to `/arena?error=service-unavailable` or similar.

**Mechanism:** No change.

**Migration path:** 10-line change. Wrap the insert in try/catch, redirect with error query param, display error in arena page.

**What breaks if unfixed:** A transient DB connection issue (Neon cold start, connection pool exhaustion) produces a raw 500 error page. The user has no idea what happened or how to recover.

**Effort: Low. Impact: Medium.**

### R3: Extract bout loading into a lib function

**Current state:** `app/bout/[id]/page.tsx:138-146` and `app/b/[id]/page.tsx` both do inline `SELECT * FROM bouts WHERE id = ? LIMIT 1`. The same query exists conceptually in `bout-engine.ts:222-244`.

**Target state:** `lib/bouts.ts` with `getBoutById(id)` function used by all consumers.

**Mechanism:** No change (still direct DB access, just consolidated).

**Migration path:** Create `lib/bouts.ts`, move query, update 3-4 import sites. Verify with gate.

**What breaks if unfixed:** If the bout query needs to change (e.g., adding a soft-delete filter, changing the select columns), each call site must be found and updated independently. At 3 sites this is manageable; if more features add bout lookups, it becomes a maintenance burden.

**Effort: Low. Impact: Low-Medium.**

### R4: Add error handling to bout completion DB write

**Current state:** `lib/bout-engine.ts:1053-1063` - the `UPDATE bouts SET status='completed', transcript=...` has no dedicated error handling. If this fails, the transcript is lost and the bout remains in `'running'` status permanently.

**Target state:** Wrap in try/catch. On failure: log error with full transcript as structured data. Optionally: retry once. The transcript text is already in memory - a logging call preserves it even if the DB write fails.

**Mechanism:** No change.

**Migration path:** 15-line change. The transcript is already available as a local variable; logging it to Sentry or a dead-letter mechanism preserves the data.

**What breaks if unfixed:** A DB connection hiccup at the exact moment of bout completion (after the LLM calls have all succeeded) loses the entire transcript. The user saw the bout stream in real-time but the replay page shows nothing. Credits were already deducted. This is a data-loss scenario with financial implications. The probability is low (one DB call at one specific moment) but the impact is high.

**Effort: Low. Impact: High.**

### R5: Decompose bout-engine.ts

**Current state:** `lib/bout-engine.ts` is 1274 lines with 22 internal imports. It handles validation, auth, tier checking, rate limiting, credit preauthorization, BYOK key reading, model selection, prompt construction, LLM streaming, transcript assembly, share line generation, DB persistence, credit settlement, analytics, and error recovery.

**Target state:** Extract into focused modules:
- `lib/bout-validation.ts` - `validateBoutRequest()` (lines 169-507, ~340 lines)
- `lib/bout-execution.ts` - `executeBout()` / turn loop (lines 541-1274, ~730 lines)
- `lib/bout-engine.ts` - re-exports from both, maintains backward compatibility

**Mechanism:** No change (still function calls between modules).

**Migration path:** Move functions, update imports within lib/, test with gate. External consumers (the 2 API routes) continue to import from bout-engine.ts via re-exports. Zero-risk refactor.

**What breaks if unfixed:** The module's high fan-out makes every change to the bout flow risky. Modifying credit logic means editing a file that also contains LLM streaming logic, prompt construction, and analytics. The blast radius of any change is the entire file. This is the primary velocity constraint for bout-related features.

**Effort: Medium. Impact: High.**

### R6: Make agent slot check atomic

**Current state:** `app/api/agents/route.ts:176-192` - counts existing agents, then inserts a new one. Two concurrent requests can both pass the count check and create agents exceeding the slot limit.

**Target state:** Use a DB-level constraint or a SELECT FOR UPDATE within a transaction.

**Migration path:** Wrap the count + insert in a transaction with row-level locking. Or: add a trigger/check constraint at the DB level. Either approach is a small change.

**What breaks if unfixed:** A user can exceed their agent slot limit by submitting two agent creation requests simultaneously. The likelihood is low for manual use, but a script could exploit it trivially.

**Effort: Low. Impact: Low (exploitability is low for manual use).**

### R7: Add post-completion hook point to bout-engine

**Current state:** Bout completion updates a DB row and fires analytics. Nothing else is notified. The bout engine has no extension point for downstream effects.

**Target state:** Add a simple callback or hook point after successful bout completion: `onBoutCompleted(boutId, transcript, metadata)`. Initially a no-op. Tournament brackets would register a handler.

**Mechanism:** New mechanism (callback/hook pattern). Not event-driven - just a synchronous function call that registered handlers can use.

**Migration path:** Add an optional callback parameter to `executeBout()`. Default to no-op. Call it after the completion DB write. Tournament feature registers a handler.

**What breaks if unfixed:** Tournament brackets (Issue #14) become structurally difficult. The only alternative is polling the bouts table for status changes, which is fragile and adds latency.

**Effort: Medium. Impact: High (enables a major future feature).**

### R8: Consolidate environment variable access

**Current state:** 24 lib files read `process.env` directly at module scope. `lib/env.ts` provides Zod validation for most vars, but many files also read directly for feature flags and config.

**Target state:** All env access goes through `lib/env.ts`. Feature flags are accessed via a single `env.flags` object. Config constants via `env.config`. No `process.env` reads outside `env.ts`.

**Migration path:** Incremental. For each file that reads `process.env` directly, move the read to `env.ts` and import from there. Can be done one file at a time.

**What breaks if unfixed:** When a new environment is set up (staging, preview, new developer), the full set of required env vars is discoverable only by reading `env.ts` + scanning all files for `process.env`. Missing a var causes a runtime error, not a startup failure.

**Effort: Medium. Impact: Low-Medium.**

---

## 4.3 Decision Log

Inconsistencies identified during this review that are intentional tradeoffs, documented here to prevent future "fixes" that would break deliberate choices.

### D1: In-memory rate limiter (not distributed)

**Tradeoff:** The rate limiter (`lib/rate-limit.ts`) is per-serverless-instance. A determined attacker hitting different instances bypasses the limit.

**Why:** The DB-level constraints (unique indexes, atomic conditional updates, preauthorization) serve as the authoritative enforcement layer. The rate limiter provides best-effort throttling to reduce DB load. A distributed rate limiter (e.g., Upstash Redis) would add latency, cost, and a new failure mode for every API request.

**Revisit when:** Rate limit bypass causes measurable financial impact (credit theft, LLM cost overrun). Currently, the credit system's preauthorization/settlement pattern caps financial exposure per bout regardless of rate limit bypass. Tracked in Issue #17.

### D2: Full leaderboard payload sent to client

**Tradeoff:** The leaderboard page sends all 3 time ranges and both leaderboard types in the initial RSC payload, rather than loading on demand.

**Why:** This enables instant tab/range switching without network round-trips. The UX priority is zero-latency interaction. At current data volume, the payload is small enough that the trade-off is favourable.

**Revisit when:** The number of agents or players grows large enough that the payload becomes a performance concern (likely 1000+ entries per range). At that point, move to server-side pagination with client-side data fetching per tab switch.

### D3: JavaScript-side leaderboard aggregation

**Tradeoff:** Vote counts, win rates, and player stats are computed from raw table scans in JavaScript, not SQL aggregation.

**Why:** Simpler to write and iterate on. The 5-minute cache and ISR hide the cost. At current scale (hundreds of bouts, not thousands), the computation is fast enough.

**Revisit when:** Cold-cache leaderboard load exceeds 2 seconds. The fix is SQL aggregation queries (GROUP BY with COUNT/SUM) or a materialised view.

### D4: Bout row creation in server action, not API route

**Tradeoff:** The bout DB row is created in the server action (`app/actions.ts:89-98`) and the page load has a backfill safety net (`app/bout/[id]/page.tsx:161-178`). The bout engine also has an ensure-exists check (`bout-engine.ts:469-486`). Three places create the same row.

**Why:** The server action creates the row for URL generation (the redirect needs the bout ID). The page backfill handles the race condition where the redirect arrives before the INSERT commits. The engine ensure-exists handles the case where neither of the previous creates ran (e.g., direct API call). Each creation point is idempotent via `ON CONFLICT DO NOTHING`.

**Revisit when:** A fourth creation point is needed, or the race condition mitigation becomes unreliable (e.g., with read replicas that have significant lag).

### D5: BYOK key transport via HTTP-only cookie

**Tradeoff:** The BYOK API key is stashed in an HTTP-only cookie scoped to `/api/run-bout`, then consumed and deleted by the bout engine. This is a two-step process involving a separate `/api/byok-stash` request.

**Why:** Security. Sending the API key in the POST body to `/api/run-bout` would expose it in request logging, browser devtools network tab, and any request inspection middleware. The HTTP-only cookie is not visible to client-side JavaScript (XSS-safe) and is scoped to a single path (minimised exposure). The one-time-read-and-clear pattern means the key is not persisted.

**Revisit when:** Never. This is the correct security pattern for handling user secrets on a platform where the operator has no server-side key management infrastructure.

### D6: Two PostHog integration patterns (server vs client)

**Tradeoff:** Server-side analytics use `captureImmediate()` (one HTTP request per event, awaited). Client-side analytics use standard `capture()` (batched, fire-and-forget).

**Why:** Vercel serverless environments can terminate the runtime before batched events are flushed. `captureImmediate()` ensures delivery at the cost of one HTTP round-trip per event. Client-side runs in a persistent browser tab where batching works correctly.

**Revisit when:** The app moves to a long-running server process (not serverless) where standard batching is reliable.

### D7: AsyncLocalStorage for request context

**Tradeoff:** `lib/async-context.ts` uses Node's `AsyncLocalStorage` to propagate request context (requestId, clientIp, userId, etc.) implicitly through the call stack, rather than threading these values as function parameters.

**Why:** The bout engine has 22 internal imports and calls functions that call functions that need request context for logging and analytics. Threading context through every function signature would add significant parameter noise. AsyncLocalStorage provides implicit propagation without modifying function signatures.

**Revisit when:** The system moves to edge runtime (which may not support AsyncLocalStorage) or the implicit propagation causes debugging confusion.

---

## Summary

The Pit's architecture is a well-structured Next.js monolith with a flat library module (`lib/`) as its centre of gravity. Change propagation is overwhelmingly request-response with direct database access. The system has no event infrastructure, no message queues, and no distributed state.

**Strengths:**
- Clean client/server boundary (props drilling, no global state libraries)
- Disciplined financial operations (transactions, atomic SQL, two-layer dedup)
- No circular dependencies in the dependency graph
- Comprehensive error handling on the critical bout path (preauth/settle pattern, optimistic update reconciliation, multi-layer race condition handling)

**Weaknesses:**
- `bout-engine.ts` is a 1274-line god module (22 imports, handles validation through settlement)
- 17 lib files import raw DB schema tables with no repository abstraction
- Missing try/catch on 3 data-writing paths (createBout, webhook analytics, bout completion)
- No post-completion hook point, blocking tournament feature

**The system's architecture is appropriate for its current domain and scale.** The recommendations above are ordered by impact-to-effort ratio. R1 through R4 are low-effort fixes that should be addressed soon. R5 (bout-engine decomposition) is the highest-impact structural change. R7 (post-completion hook) is the key enabler for the next major feature.
