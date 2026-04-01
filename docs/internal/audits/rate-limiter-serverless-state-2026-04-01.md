# Rate Limiter Serverless State Audit

Date: 2026-04-01
Issue: #17
Status: Accept risk (with documented rationale)

## Current Implementation

The rate limiter (`lib/rate-limit.ts`) uses a two-tier strategy:

1. **Distributed (Upstash Redis):** When `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` are set, all rate limit checks go through
   `@upstash/ratelimit` with a sliding-window algorithm. This shares state
   across all serverless instances.

2. **In-memory fallback:** When the env vars are absent or Redis is
   unreachable at runtime, requests fall back to a per-instance in-memory
   `Map<string, RateLimitEntry>`. Each serverless cold start gets its own
   map, so limits do not share state across instances.

The distributed path is already implemented, tested (unit tests cover both
paths including Redis failure fallback), and the Upstash packages are
installed (`@upstash/ratelimit@^2.0.8`, `@upstash/redis@^1.37.0`). The env
vars are declared as optional in `lib/env.ts`.

## Protected Routes (15 total)

### Cost-bearing (LLM API calls)

| Route | Identifier | Limits | Window |
|---|---|---|---|
| `run-bout` (via `bout-validation.ts`) | userId or IP | anon: 2, free: 5, pass: 15 | 1 hour |
| `ask-the-pit` | IP | varies | varies |
| `agents` | userId | varies | varies |

### Non-cost-bearing (DB writes only)

| Route | Identifier |
|---|---|
| `contact` | IP |
| `newsletter` | IP |
| `reactions` | IP/userId |
| `feature-requests` | userId |
| `feature-requests/vote` | userId |
| `paper-submissions` | IP |
| `winner-vote` | userId |
| `short-links` | IP |
| `openapi` | IP |
| `research/export` | IP |
| `v1/bout` | (references same validation) |
| `byok-stash` | userId |

## Blast Radius Analysis

### What happens if rate limits are not shared across instances?

For the in-memory fallback, an attacker hitting N concurrent serverless
instances gets N times the intended rate limit. With Vercel's default
concurrency, a burst could fan out to 10-50 instances.

However, the actual damage is bounded by deeper guards:

1. **Credit preauthorization (DB-level, shared Postgres state):** Every
   bout checks `preauthorizeCredits()` against the user's balance via an
   atomic Postgres operation. No credits = no bout executes. This is the
   authoritative gate.

2. **Intro pool for anonymous users:** Anonymous bouts draw from a shared
   intro pool (`consumeIntroPoolAnonymous`), also backed by Postgres
   with atomic decrement. When the pool is empty, anonymous bouts are
   rejected with 401.

3. **Subscription tier checks:** Authenticated users go through
   `canRunBout()` which checks subscription status in the DB.

4. **BYOK users:** Bring-your-own-key users pay their own API costs.
   Rate limiting protects them from self-inflicted damage, not the
   platform.

### The three conditions from issue #17

For the in-memory gap to cause material financial exposure, ALL three must
hold simultaneously:

1. Large intro pool -- currently the intro pool is small and finite.
2. Per-bout API cost exceeds credit charge -- the preauth estimate covers
   expected cost.
3. More than 50 concurrent instances -- typical Vercel fan-out for this
   project is far below this.

None of these conditions hold today.

### Non-cost-bearing routes

Spam on contact forms, newsletter signups, reactions, etc. is unpleasant
but not financially damaging. These routes write to Postgres and are
bounded by DB connection limits and Neon's own rate controls.

## Is the DB Credit Gate Sufficient?

Yes, at current scale. The credit preauthorization is:

- **Atomic:** Uses Postgres conditional updates, not read-then-write.
- **Shared:** All instances hit the same Neon database.
- **Authoritative:** The rate limiter is explicitly documented as
  "best-effort throttling to reduce load on those DB checks."

The rate limiter exists to reduce unnecessary DB round-trips and provide
a better UX (fast 429 instead of slow 402). It is not the security
boundary.

## Recommendation: Accept Risk

### Rationale

1. The distributed rate limiter is already implemented and ready to
   activate. Setting two Vercel env vars (`UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`) enables it with zero code changes.

2. The in-memory fallback is documented as exactly that: a fallback.
   The code comments and module docstring are explicit about the
   architecture.

3. The DB-level credit gate is the real security boundary and it works
   correctly across all instances today.

4. The financial exposure from the in-memory gap is negligible given
   current pool sizes, pricing, and traffic.

### When to Revisit

Activate the Upstash distributed limiter (provision Redis, set env vars)
when any of these thresholds are crossed:

- Intro pool size exceeds 100 GBP equivalent
- Monthly active users exceed 1,000
- Observed rate-limit evasion in logs (`log.security` events)
- Per-bout cost increases (e.g., switching to more expensive models)

### Action Items

- [ ] Provision Upstash Redis (free tier is sufficient for current scale)
- [ ] Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in
      Vercel project env vars
- [ ] Verify distributed path activates by checking for absence of
      "[rate-limit] Redis unavailable" warnings in production logs

These are optional improvements, not blockers.
