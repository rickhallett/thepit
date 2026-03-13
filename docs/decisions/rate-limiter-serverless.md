# Rate Limiter Serverless State Decision

**Decision:** Accept current in-memory rate limiter design
**Date:** 2026-03-13
**Status:** Accepted
**Issue:** GH #17

## Context

The rate limiter in `lib/rate-limit.ts` uses an in-memory Map which does not share state across serverless instances. Each Vercel function instance maintains independent rate windows.

## Decision

The current approach is acceptable for the deployment model. No changes required.

## Rationale

### 1. Defense-in-Depth Architecture

The rate limiter is not a security boundary - it is a load reduction mechanism:

```
Request flow:
  [Rate Limiter]      <- Best effort, per-instance, fast
         |
         v
  [Credit Preauth]    <- Atomic PostgreSQL, shared state (authoritative)
         |
         v
  [Bout Execution]
```

### 2. DB-Level Enforcement is Authoritative

The PostgreSQL credit preauthorization system provides the true enforcement:

- Atomic conditional UPDATE prevents TOCTOU races
- Shared state across all instances
- No credits = no execution, regardless of rate limiter state

```sql
UPDATE credits
SET balance_micro = balance_micro - $amount
WHERE user_id = $userId AND balance_micro >= $amount
RETURNING balance_micro
```

### 3. Escalation Conditions Not Met

Distributed rate limiting is warranted only when ALL three conditions hold:

| Condition | Current Status |
|-----------|----------------|
| Intro pool large enough to sustain abuse | NOT MET - 10k credits with half-life decay |
| Per-bout cost exceeds credit recovery | NOT MET - credit system is profitable |
| >50 concurrent serverless instances | NOT MET - traffic below threshold |

### 4. Code Already Documents Limitation

The rate limiter header (lines 1-14) explicitly states:

> "In-memory only - each serverless instance has independent state. A determined attacker hitting different instances can bypass limits. For strict production enforcement, migrate to a shared store."

This is intentional design, not oversight.

## Alternatives Considered

| Option | Effort | Benefit at Current Scale |
|--------|--------|--------------------------|
| Vercel KV rate limiter | Low | None - DB gate sufficient |
| Upstash Redis | Low | None - DB gate sufficient |
| Cloudflare API gateway | Zero code | None - DB gate sufficient |

## Future Triggers

Revisit this decision if any of:

- PostHog shows >10x bout volume increase
- Intro pool consumption rate exceeds half-life decay
- Vercel billing shows >50 concurrent function instances
- Financial settlement shows consistent margin leak

## References

- Full analysis: `docs/provenance/gh-issue-17-design.md`
- Rate limiter implementation: `lib/rate-limit.ts`
- Credit preauthorization: `lib/credits.ts:297-347`
- GitHub Issue: #17
