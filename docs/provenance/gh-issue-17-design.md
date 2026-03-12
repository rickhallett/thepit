# GH #17: Rate Limiter Security Audit

**Issue:** in-memory rate limiter does not share state across serverless instances
**Priority:** Low (confirmed)
**Date:** 2026-03-12
**Analyst:** dementus (polecat)

## Executive Summary

The in-memory rate limiter is a best-effort anti-abuse mechanism, not a security boundary. The actual enforcement layer is the PostgreSQL credit preauthorization system, which provides atomic, shared-state guarantees. At current scale, the defense-in-depth architecture makes this a non-issue. No immediate action required.

## 1. Current Rate Limiter Implementation Analysis

### Location and Design

The rate limiter is implemented in `lib/rate-limit.ts` using a sliding window approach:

```
- Storage: In-memory Map per serverless instance
- Window: 1 hour for bout creation
- Limits by tier:
  - anonymous: 2 bouts/hour
  - free: 5 bouts/hour
  - pass: 15 bouts/hour
  - lab: unlimited
```

### Documented Limitations

The code itself documents the limitation (lines 1-14):

> "In-memory only - each serverless instance has independent state. A determined attacker hitting different instances can bypass limits."

This is intentional: the rate limiter is positioned as "best-effort throttling to reduce load on DB checks" rather than authoritative enforcement.

### Integration Point

Rate limiting is applied in `lib/bout-engine.ts:334-362` during `validateBoutRequest()`:

1. Resolve user tier (anonymous/free/pass/lab)
2. Look up tier-specific limit from `BOUT_LIMITS`
3. Check in-memory rate limit by userId or IP
4. Return 429 if limit exceeded

The check happens **before** the credit preauthorization, meaning rate limiting serves as a fast-path rejection to reduce database load.

## 2. Credit Gate Effectiveness Assessment

### PostgreSQL Credit Preauthorization

The credit system (`lib/credits.ts`) provides the authoritative enforcement layer:

**Atomic Conditional UPDATE Pattern** (lines 297-346):
```sql
UPDATE credits
SET balance_micro = balance_micro - $amount
WHERE user_id = $userId AND balance_micro >= $amount
RETURNING balance_micro
```

This is a single atomic operation that:
- Checks balance >= requested amount
- Deducts in the same statement
- Returns success/failure atomically

**Key property:** No TOCTOU (time-of-check-time-of-use) race condition. The check and deduction are indivisible at the database level.

### Anonymous User Protection (Intro Pool)

For anonymous users, the intro pool (`lib/intro-pool.ts`) provides an additional layer:

- Shared PostgreSQL state (not per-instance)
- Atomic consumption with exponential half-life decay
- Pre-check remaining credits before bout execution
- Refund mechanism if bout fails

The SQL pattern (lines 131-149) uses `LEAST()` and `GREATEST()` to atomically cap claims at available credits, preventing overdraw.

### Defense-in-Depth Layers

```
Request flow:
  [Rate Limiter]      <- Best effort, per-instance, fast
         |
         v
  [Tier Check]        <- DB-backed user tier lookup
         |
         v
  [Credit Preauth]    <- Atomic PostgreSQL, shared state
         |
         v
  [Bout Execution]
         |
         v
  [Credit Settlement] <- Actual cost reconciliation
```

Even if rate limiting is bypassed, the credit preauthorization blocks execution for:
- Users with insufficient credits
- Anonymous users when intro pool is exhausted

## 3. Threshold Analysis for Escalation Conditions

Per GH #17, escalation requires **all three** conditions simultaneously:

### Condition 1: Intro Pool Size

**Current state:** 10,000 credits initial with 3-day half-life

At half-life decay:
- Day 0: 10,000 credits
- Day 3: 5,000 credits
- Day 6: 2,500 credits
- Day 9: 1,250 credits

**Assessment:** The pool naturally decays, limiting sustained abuse. An attacker would need to coordinate rapid consumption before the pool decays. The atomic claim mechanism prevents race conditions during consumption.

**Status:** NOT MET - pool is not "large enough to sustain abuse"

### Condition 2: Per-Bout API Cost vs. Credit Recovery

**Current pricing model:**
- Haiku (free tier): ~3-5 credits per bout
- Sonnet 4.5: ~15-25 credits per bout
- Sonnet 4.6: ~15-25 credits per bout

**Credit value:** 1 credit = 0.01 GBP, plus 10% platform margin

**Assessment:** The credit charge includes a margin on top of API cost. Preauthorization estimates exceed actual cost in most cases (the code explicitly tracks "margin health" in settlement). Platform revenue >= API cost per bout.

**Status:** NOT MET - credit system is profitable per-bout

### Condition 3: Concurrent Serverless Instances

**Current deployment:** Vercel serverless with cold start pooling

**Assessment:** At Vercel's typical deployment pattern, achieving >50 concurrent instances would require:
- Sustained high request volume
- Requests spread across enough time to spawn new instances
- Geographic distribution to hit multiple regions

This traffic pattern would be detectable via monitoring well before it becomes material.

**Status:** NOT MET - current traffic does not reach this threshold

## 4. Attack Scenario Analysis

### Scenario A: Distributed Rate Limit Bypass

**Attack:** Attacker hits different serverless instances to bypass per-instance rate limits.

**Outcome:**
- Rate limiter bypassed: YES
- Bout executed: ONLY IF credits available
- Financial impact: ZERO (credit preauth blocks unpaid execution)

### Scenario B: Anonymous Pool Draining

**Attack:** Attacker rapidly consumes intro pool credits.

**Outcome:**
- Rate limiter helps slow this: PARTIALLY (2/hour limit per IP)
- Pool exhausted: Eventually (but atomic claims prevent overdraw)
- Impact on legitimate users: Pool shows as exhausted, requires signup
- Financial impact: Capped at pool size (10k credits = ~100 GBP)

**Mitigation already in place:** Half-life decay naturally reduces pool. Error-path refunds return credits when bouts fail.

### Scenario C: Authenticated User Abuse

**Attack:** Attacker creates many accounts to abuse free tier.

**Outcome:**
- Each account starts with 100 credits
- Rate limit: 5 bouts/hour per account
- Credit consumption: 3-25 credits per bout
- Account exhausted in: 4-33 bouts
- Sybil attack cost: Account creation overhead

**Assessment:** The credit system naturally gates abuse. Creating accounts faster than credit burn rate requires significant automation effort for minimal gain.

## 5. Recommended Action

**Recommendation: Do Nothing (Status Quo)**

### Justification

1. **Credit gate is effective.** The PostgreSQL preauthorization system is the true security boundary. It operates on shared state, uses atomic operations, and prevents any unpaid execution.

2. **Rate limiter serves its purpose.** It reduces load on the database by fast-rejecting obvious abuse. It doesn't need to be perfect - it's a performance optimization, not a security control.

3. **Monitoring exists.** PostHog LLM analytics track per-bout cost. Sentry logs capture anomalies. Drift would be visible.

4. **Escalation conditions not met.** None of the three required conditions hold. The issue is theoretical, not material.

5. **Opportunity cost.** Engineering time is better spent on user-facing features than hardening a control that isn't under load.

### Future Triggers for Revisiting

Escalate to distributed rate limiting if any of:

- PostHog shows >10x bout volume increase
- Intro pool consumption rate exceeds half-life decay
- Financial settlement shows consistent "leak" (actual > estimated)
- Vercel billing shows >50 concurrent function instances

### If Escalation Needed

Preferred solution order:

1. **Vercel KV** - Platform-native, minimal code change, same billing
2. **Upstash Redis** - Proven, fast, serverless-native
3. **API Gateway (Cloudflare)** - Zero code change, rate limiting at edge

All options are straightforward to implement when needed. No architectural preparation required now.

## Appendix: Code References

| File | Lines | Purpose |
|------|-------|---------|
| `lib/rate-limit.ts` | 1-117 | In-memory rate limiter implementation |
| `lib/bout-engine.ts` | 334-362 | Rate limit check integration |
| `lib/credits.ts` | 297-347 | Atomic preauthorization |
| `lib/intro-pool.ts` | 111-178 | Anonymous pool claims |
| `lib/tier.ts` | 55-80 | Tier configuration |
| `qa/tests/rate-limiting/index.ts` | 1-356 | Rate limit test suite |

---

*This analysis confirms GH #17 as low priority. The defense-in-depth architecture provides adequate protection at current scale.*
