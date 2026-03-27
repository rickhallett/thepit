# L4: State Management Audit

> Date: 2026-03-16
> Scope: Server-side (5 domains) + Client-side (5 domains)
> Decision: SD-328 [tech-debt-exposure]
> Depends on: L1-L3, L5

---

## Summary

State management is generally sound. The DB is the unambiguous source of
truth for all server-side domains. No Redis, no distributed cache, no
shared mutable state between serverless instances. Client state is
ephemeral and correctly defers to the DB on page reload. The gaps are:
stuck bouts with no recovery mechanism, the ledger/balance discrepancy
from the GREATEST(0) floor (mapped precisely here), and mid-stream
connection drops that lose partial transcripts with no reconnection.

---

## Server-Side State

### Credits

**Source of truth:** `credits.balanceMicro` (single row per user) + `credit_transactions` (append-only ledger)

**Mutation surface:** 7 paths - `ensureCreditAccount`, `applyCreditDelta`, `preauthorizeCredits`, `settleCredits` (charge + refund), Stripe webhook (4 event types via `applyCreditDelta`).

**Cache:** None. Every read queries the DB.

**Divergence risk - MEDIUM:** The `GREATEST(0, balance + delta)` floor in
`applyCreditDelta` and the `LEAST(delta, GREATEST(0, balance))` cap in
`settleCredits` create a ledger/balance discrepancy. The ledger records the
full intended delta, but the balance change is capped. Sum of ledger deltas
will not equal final balance when the floor triggers. `intendedChargeMicro`
metadata enables manual reconciliation but no automated check exists.

`preauthorizeCredits` does NOT have this problem - it uses a conditional
WHERE clause and simply fails if insufficient. Clean.

---

### Bout Lifecycle

**Source of truth:** `bouts.status` (enum: `running`, `completed`, `error`)

**Mutation surface:** 5 write points - `createBout` (server action), `createArenaBout` (server action), `executeBout` (3 transitions: INSERT running, UPDATE completed, UPDATE error).

**Transitions:** No DB trigger, CHECK constraint, or state machine enforces valid transitions. Convention only. Terminal states (`completed`, `error`) are never transitioned FROM in existing code, but nothing prevents it.

**Divergence risk - MEDIUM: Stuck bouts.** If the serverless function dies
mid-execution, the bout remains `running` forever. No TTL, no sweep job,
no heartbeat. The idempotency check blocks re-execution of a `running`
bout that has a transcript. A bout with a partial transcript stuck in
`running` is permanently orphaned.

**Recovery needed:** Same pattern as the preauth reconciliation - a sweep
job that detects bouts stuck in `running` for longer than N minutes
(max bout duration is bounded by `preset.maxTurns * 30s timeout`) and
transitions them to `error` with their partial transcript preserved.

---

### User Tier

**Source of truth:** `users.subscriptionTier` (column on users table)

**Mutation surface:** Exclusively via Stripe webhook events through
`updateUserSubscription` (SET operation, idempotent).

**Cache:** None. Every `getUserTier` call queries the DB. Tier is frozen
into `BoutContext` at validation time and does not change during execution.

**Divergence risk - NONE.** This is the cleanest domain. Single source of
truth, single mutation path (Stripe), no caching, request-scoped freezing
for in-flight operations. Mid-bout upgrade does not affect running bouts.

---

### Intro Pool

**Source of truth:** Single row in `intro_pool` table. `remaining` is
derived (`initialMicro * 0.5^(elapsed/halfLife) - claimedMicro`), not stored.

**Mutation surface:** 3 write paths - `claimIntroCredits` (user signup
claim), `consumeIntroPoolAnonymous` (anonymous bout), `refundIntroPool`
(error-path refund).

**Divergence risk - MEDIUM:** `claimIntroCredits` is a non-transactional
two-step: pool UPDATE succeeds, then `applyCreditDelta` for user credit.
If step 2 fails, pool is depleted but user never received credits. Credits
vanish. (Also flagged in L3 as F-16.)

SQL operations themselves are atomic and sound. `consumeIntroPoolAnonymous`
uses a single CASE expression. `refundIntroPool` floors at zero. Concurrent
access is serialised by Postgres row-level locking.

---

### Agent Registry

**Source of truth:** DUAL - preset JSON files (bootstrap) and `agents`
table (runtime). `getAgentSnapshots` tries DB first, falls back to presets
if DB is empty.

**Divergence risk - LOW:** Preset JSON edits are silently ignored for
already-seeded agents. The seed endpoint only INSERTs new agents, never
UPDATEs existing ones. By design (content-addressed identity with hashes),
but no warning mechanism when preset JSON diverges from DB.

---

## Client-Side State

### Bout UI

**Where state lives:** Four React hooks (`useBout`, `useBoutVoting`,
`useBoutReactions`, `useBoutSharing`) with local `useState`. No Context,
no external store.

**SSE consumption:** Fetch-based stream reader (not native EventSource).
Vercel AI SDK `parseJsonEventStream`. Event types: `data-turn`,
`text-delta`, `data-share-line`, `error`.

**Source of truth:** DB after completion. Client state is ephemeral -
matches DB content during the session, discarded on navigation. Revisiting
`/bout/{id}` fetches from DB and hydrates from `initialTranscript`.

**Divergence risk - MEDIUM: No reconnection.** If the SSE connection drops
mid-stream, `useBout` sets `status='error'`. No reconnection logic, no
resume-from-turn-N capability. Partial transcript in React state is lost on
navigation. The DB may contain a partial transcript (written by the error
path in `bout-engine.ts`) or none at all. The user has no way to recover
the partial bout.

**Optimistic updates:** Reactions reconcile with server-returned counts
and revert on error. Votes are write-once, no reconciliation needed.

---

### Arena Builder

**Where state lives:** React `useState` hooks + uncontrolled form inputs
(DOM state for topic, length, format, turns).

**Persisted:** Only on form submission (server action `createArenaBout`
inserts DB row and redirects).

**Divergence risk - LOW:** Full loss on refresh before submission. Partial
mitigation: re-roll links carry `agent[]` and `topic` via URL params. Model,
length, format, and turns are lost. This is the expected tradeoff for a
form that has not been submitted.

---

### Auth (Clerk)

**Where state lives:** Clerk JWT in HTTP-only cookie. Server via `auth()`,
client via `useAuth()`.

**Divergence risk - NONE.** Clerk manages session lifecycle. PostHog
identity synced via `posthog.identify(userId)`, cleaned on sign-out via
`ph.reset()`.

---

### URL State

**What lives in URL params:** Bout config (presetId, topic, model, length,
format) on creation redirect. Arena builder pre-population (agent[], topic)
on re-roll. Pagination. Referral attribution.

**Divergence risk - NONE.** DB takes precedence when URL params and DB
disagree (`bout?.topic ?? topicFromQuery`). Correct resolution.

---

### Cookie / LocalStorage

| State | Storage | TTL | Stale risk |
|-------|---------|-----|------------|
| Analytics consent | `pit_consent` cookie | 1 year | Low |
| BYOK API key | `pit_byok` cookie | 60 seconds | **Medium - can expire before form submit** |
| Referral attribution | `pit_ref` cookie | 30 days | Low |
| UTM attribution | `pit_utm` cookie | First-touch | Low |
| A/B variant | `pit_variant` cookie | Unknown | Low (stale variant caught by config check) |
| Rate limit dismiss | sessionStorage | Tab close | None |
| PostHog identity | localStorage | Until reset | Cleaned on sign-out |

**Divergence risk - LOW-MEDIUM:** The BYOK 60-second cookie is the only
concerning one. If the user stashes a key but does not submit within 60
seconds, the key is gone. The form re-submission logic assumes the cookie
is alive. The bout engine would fall back to the platform's default model.
User loses their BYOK selection silently.

---

## In-Memory Cache Inventory

| Cache | Location | What | TTL | Risk |
|-------|----------|------|-----|------|
| `recentlyInitialized` | onboarding.ts | User session init dedup | 1 hour | Low |
| `leaderboardCache` | leaderboard.ts | Full leaderboard result | Config-based | Moderate (stale data) |
| `stores` | rate-limit.ts | Per-client request counts | Per-window | Low (best-effort) |
| Anomaly stores (4) | anomaly.ts | Sliding window counters | Window-based | None (observation only) |
| `PRESET_BY_ID` | presets.ts | Preset map from JSON | Infinite (module init) | High for agents, low for presets |
| `variantCache` | copy.ts | Copy variants | Infinite (module init) | None (static at deploy) |
| PostHog client | posthog-server.ts | SDK instance | Process lifetime | None |
| LangSmith client | langsmith.ts | SDK instance | Process lifetime | None |

All caches are **per-serverless-instance**. No shared cache layer (Redis,
Memcached, etc.). Rate limiter explicitly documents this limitation.
Authoritative state is always in the DB.

---

## State Map (Source of Truth by Domain)

```
DOMAIN              SOURCE OF TRUTH        CACHES/DERIVED          DIVERGENCE
---------------------------------------------------------------------------
credits.balance     credits.balanceMicro   none                    ledger floor
credits.ledger      credit_transactions    none                    see balance
bout.status         bouts.status           client React state      stuck running
bout.transcript     bouts.transcript       client React state      SSE drop
user.tier           users.subscriptionTier BoutContext (req-scope)  none
intro.pool          intro_pool row         none                    two-step gap
agents              agents table + JSON    PRESET_BY_ID (infinite) JSON drift
auth                Clerk JWT cookie       PostHog identity        cleaned on signout
arena.builder       React state (client)   none                    lost on refresh
BYOK key            pit_byok cookie (60s)  none                    TTL expiry
analytics consent   pit_consent cookie     none                    none
A/B variant         pit_variant cookie     none                    stale variant
```

---

## Top 5 Findings (New to L4)

| Priority | Finding | Domain | Fix |
|----------|---------|--------|-----|
| 1 | Stuck bouts - no recovery for `running` status after serverless death | Bouts | Sweep job: transition to `error` after max duration + margin |
| 2 | SSE connection drop - no reconnection, partial transcript lost | Bout UI | At minimum: persist partial transcript URL for retry |
| 3 | Ledger/balance discrepancy precisely mapped - GREATEST(0) floor is the mechanism | Credits | Alerting on `sum(ledger) != balance` per user |
| 4 | BYOK 60s cookie TTL - key can expire before form submit | BYOK | Extend TTL or stash in sessionStorage instead |
| 5 | Agent preset JSON silently ignored after initial seed | Agents | Log warning on seed when DB row differs from JSON |

---

## Interview-Ready Observations

**"How do you manage state in your application?"**
The database is the unambiguous source of truth for all server-side state.
No Redis, no distributed cache. Client state is ephemeral React hooks that
defer to the DB on page reload. In-flight operations freeze their context
at validation time (e.g. user tier is captured once and does not change
during bout execution), which eliminates mid-operation state drift. The
tradeoff is that every read hits the DB, but for a serverless architecture
with no shared memory between instances, this is the correct default.

**"Where are the risks in your state management?"**
Two lifecycle gaps: bouts can get stuck in `running` if the serverless
function dies, and credit preauths can be orphaned on process crash. Both
need sweep jobs - one to transition stale running bouts to error, one to
refund orphaned preauths. The individual state transitions are transactional
and sound; the gaps are in the spaces between transitions where process
death can leave the system in an intermediate state.

**"How does your client handle streaming failures?"**
Currently it sets an error state but does not reconnect or resume. The
server persists partial transcripts on error, so the data is not lost
server-side, but the client has no mechanism to pick up where it left off.
This is a known gap - a production system would need either SSE reconnection
with last-event-ID, or a polling fallback that fetches the transcript from
the DB after a connection drop.
