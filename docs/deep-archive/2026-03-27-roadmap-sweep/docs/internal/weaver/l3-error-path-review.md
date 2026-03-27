# L3: Error Path Review

> Date: 2026-03-16
> Rule: Ignore the happy path entirely. Trace what happens when things fail.
> Scope: API infrastructure, credits/billing, database access
> Decision: SD-328 [tech-debt-exposure]
> Depends on: L1 dependency map, L2 API surface audit

---

## Summary

31 findings across two domains. The API infrastructure has a critical chain
where a logger failure during error handling can mask the original error
(double-fault with total information loss). The credits/billing system has
sound transaction usage in its core operations but a dangerous gap: there
is no reconciliation mechanism for preauths that are never settled due to
process crash. Two multi-step operations lack transaction wrappers.

The error handling is generally good - better than most AI-generated codebases.
The patterns are consistent, error responses are sanitized, and the
infrastructure layer catches more than it misses. The gaps that exist are
in edge cases that only manifest under failure conditions (DB outage during
settlement, process crash between preauth and settle).

---

## Critical Chain: The Double-Fault (F1 + F4 + F3)

Three findings form a causal chain in `lib/api-logging.ts`:

```
Route handler throws with context containing circular reference
  -> withLogging catch block fires
    -> log.error() calls JSON.stringify on context
      -> JSON.stringify throws TypeError (F1: no try/catch in emit())
        -> log.error() throw exits catch block (F4: no protection)
          -> checkAnomaly() never reached (F3: called before re-throw)
            -> throw error never reached
              -> TypeError propagates instead of original error
                -> TOTAL INFORMATION LOSS
```

**Scenario:** Any route handler that throws an error with a context object
containing a circular reference will trigger this chain. The original error
is never logged, never re-thrown. The error that reaches Next.js is
`TypeError: Converting circular structure to JSON`.

**Probability:** Low. Circular references in structured log context are
uncommon. But the blast radius is complete - no diagnostics survive.

**Fix:**

```typescript
// In lib/api-logging.ts catch block:
} catch (error) {
  try {
    log.error(`${method} ${path} unhandled error`, toError(error), { ... });
  } catch { /* logger failure must not mask original error */ }
  try {
    checkAnomaly({ clientIp, userAgent, route: routeName, status: 500 });
  } catch { /* anomaly failure must not mask original error */ }
  throw error;
}
```

---

## API Infrastructure Findings

| ID | Severity | File | Finding |
|----|----------|------|---------|
| F3 | HIGH | api-logging.ts | `checkAnomaly()` before `throw error` in catch - anomaly throw replaces original |
| F4 | MEDIUM | api-logging.ts | `log.error()` in catch unprotected - logger failure = double-fault |
| F1 | MEDIUM | logger.ts | `JSON.stringify` in `emit()` has no try/catch - circular ref = unhandled |
| F5 | LOW | api-logging.ts | `new URL(req.url)` outside try/catch - malformed URL = unlogged crash |
| F6 | LOW | anomaly.ts | Webhook failures completely silent - no observability on anomaly system |
| F7 | LOW | health route | 503 response has no `error` field - shape inconsistency |
| F2 | LOW | api-utils.ts | `rateLimitResponse` shape is superset of `errorResponse` - undocumented |

### Positive Findings

- `withLogging` coverage: 20/20 routes (100%)
- Every error response uses `errorResponse()` or `rateLimitResponse()` - no hand-rolled errors
- Error messages sanitized: static strings from `API_ERRORS`, no internals leaked
- `parseValidBody` discriminated union prevents missing error handling at compile time
- Catch block in `withLogging` logs AND re-throws (when it works) - correct pattern

---

## Credits/Billing Findings

| ID | Severity | File | Finding |
|----|----------|------|---------|
| F-10 | RISK | credits + bout-engine | Process crash between preauth and settle = permanent user overcharge, no reconciliation |
| F-09 | RISK | credits.ts | `settleCredits` has no try/catch; DB failure after bout complete = dangling preauth |
| F-16 | RISK | intro-pool.ts | `claimIntroCredits` two-step not transactional; partial fail = vanished credits |
| F-25 | RISK | onboarding.ts | `initializeUserSession` 6+ DB operations no transaction |
| F-24 | RISK | users.ts | No DB error handling on query functions |
| F-06 | CONCERN | credits.ts | `GREATEST(0)` floors balance but creates ledger/balance discrepancy, no warning |
| F-08 | CONCERN | credits.ts | Settlement cap has audit metadata but no alerting on revenue leak |
| F-11 | CONCERN | credits.ts | Malformed `MODEL_PRICES_GBP_JSON` silently falls back, no log |
| F-02 | CONCERN | db/index.ts | No pool size config, no pool exhaustion handling |
| F-03 | CONCERN | db/index.ts | Singleton pool, no health check or reconnection logic |
| F-19 | CONCERN | tier.ts | No-user on increment returns 0, caller may misinterpret |
| F-31 | CONCERN | credits.ts | Error message includes userId, potential leakage if uncaught |

### Positive Findings

- `applyCreditDelta`: uses transaction correctly (ledger + balance atomic)
- `preauthorizeCredits`: atomic conditional UPDATE prevents concurrent double-preauth
- `consumeIntroPoolAnonymous`: single atomic SQL, no race condition
- `refundIntroPool`: atomic with floor at 0, double-refund safe
- `ensureCreditAccount` / `ensureUserRecord`: idempotent upsert with conflict handling
- `getUserTier` fails closed (throw, not default) - correct for billing

### Transaction Usage Summary

| Operation | Transaction? | Multi-step? | Gap? |
|-----------|-------------|-------------|------|
| applyCreditDelta | Yes | 2-step | None |
| preauthorizeCredits | Yes | 2-step | None |
| settleCredits | Yes | 2-step | None |
| claimIntroCredits | **No** | 2-step | **F-16** |
| initializeUserSession | **No** | 6+ steps | **F-25** |
| consumeIntroPoolAnonymous | N/A (1 atomic SQL) | 1-step | None |
| refundIntroPool | N/A (1 atomic SQL) | 1-step | None |

---

## The Preauth-Settle Gap (F-09 + F-10)

This is the highest-impact finding. The lifecycle:

```
preauthorizeCredits()   -- deducts immediately from user balance
  ... bout executes ...
  ... time passes ...
settleCredits()         -- reconciles estimate vs actual
```

If the process crashes between these two calls (OOM, serverless timeout,
Neon outage during bout execution):

- User balance has been reduced by `preauthMicro` (the estimate)
- No settlement or refund entry exists in `credit_transactions`
- The preauth is permanently stuck - user is overcharged
- **No detection mechanism exists** - no reconciliation job, no scheduled scan
- **No recovery mechanism exists** - manual DB intervention required

**Detection query (if implemented):**

```sql
SELECT ct.* FROM credit_transactions ct
WHERE ct.source = 'preauth'
AND ct.created_at < NOW() - INTERVAL '30 minutes'
AND NOT EXISTS (
  SELECT 1 FROM credit_transactions ct2
  WHERE ct2.source IN ('settlement', 'settlement-error')
  AND ct2.metadata->>'boutId' = ct.metadata->>'boutId'
);
```

**Recommended fix:** Scheduled reconciliation job that runs this query
and auto-refunds stale preauths. This is the only finding where user
money is permanently lost with no detection mechanism.

---

## Top 5 Recommendations (by impact)

| Priority | Finding | Fix | Effort |
|----------|---------|-----|--------|
| 1 | F-10: Preauth reconciliation | Scheduled job to detect and refund stale preauths | Medium |
| 2 | F3+F4: Double-fault chain | Wrap log.error() and checkAnomaly() in try/catch in withLogging | 10 min |
| 3 | F-16: claimIntroCredits | Wrap pool claim + user credit in db.transaction() | 15 min |
| 4 | F-09: settleCredits in bout-engine | Add try/catch around settlement in success path, log for manual recovery | 15 min |
| 5 | F-25: initializeUserSession | Wrap multi-step init in transaction or make each step independently idempotent | 30 min |

---

## Interview-Ready Observations

**"How do you handle errors in your API layer?"**
Every route is wrapped in `withLogging` which provides structured error logging
with request context via AsyncLocalStorage. Error responses are centralized
through `errorResponse()` which guarantees consistent JSON shape. Request
body validation uses `parseValidBody()` which returns a discriminated union
that makes error handling compiler-enforced - you cannot access the parsed
data without first checking the error path.

**"How do you handle billing failures?"**
Credit operations use a preauthorize-settle pattern similar to credit card
holds. Core operations (`applyCreditDelta`, `preauthorizeCredits`,
`settleCredits`) are transactional - ledger and balance updates are atomic.
The bout engine has explicit error-path credit refunds, including drain
attack prevention on the anonymous intro pool. The known gap is stale preauth
reconciliation, which needs a scheduled job to detect and refund preauths
that were never settled due to process crash.

**"What is the most critical error handling gap you have identified?"**
The preauth-settle gap. If the process crashes after preauthorizing credits
but before settling, the user is permanently overcharged with no automated
detection or recovery. I identified this through a systematic error path
review and proposed a reconciliation query that scans for orphaned preauth
entries. The fix is a scheduled job, not a code change - the individual
operations are sound, but the system lacks a safety net for the gap between
them.
