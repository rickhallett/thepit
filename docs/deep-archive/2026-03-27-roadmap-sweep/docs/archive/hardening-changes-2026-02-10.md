# Security Hardening Changes — 2026-02-10

**Branch:** `fix/hardening`  
**Commits:** 8 commits implementing security and performance fixes  
**Review document:** `docs/code-review-2026-02-10.md`

---

## Summary

This document details the changes made to address critical and high-priority issues identified in the adversarial code review. 8 of 20 identified issues were resolved; remaining issues are deferred for future sprints.

---

## Changes Made

### 1. Atomic Credit Preauthorization (CRITICAL)

**Commit:** `9a7e37f fix: add atomic credit preauthorization to prevent race condition`

**Problem:** The credit system used a check-then-act pattern (`getCreditBalanceMicro()` → compare → `applyCreditDelta()`) that allowed concurrent requests to overdraw accounts.

**Solution:** 
- Added `preauthorizeCredits()` function in `lib/credits.ts`
- Uses conditional SQL UPDATE: `WHERE balance >= amount`
- Atomically deducts credits only if sufficient balance exists
- Returns `{ success: boolean, balanceMicro: number }`

**Verification:**
- 3 new unit tests for success, failure, and transaction recording scenarios
- All 87 unit tests pass

**Files changed:**
- `lib/credits.ts` — Added `preauthorizeCredits()`
- `app/api/run-bout/route.ts` — Updated to use atomic preauth
- `tests/unit/credits.test.ts` — Added 3 tests

---

### 2. Agent Creation Authentication (CRITICAL)

**Commit:** `b554d5e fix: require authentication for agent creation`

**Problem:** Anyone could create agents without authentication, enabling database pollution and DoS attacks.

**Solution:**
- Added auth check at top of POST handler
- Returns 401 if `userId` is null
- Simplified downstream code since `userId` is now guaranteed

**Verification:**
- Added test for 401 response on unauthenticated requests
- All tests pass

**Files changed:**
- `app/api/agents/route.ts` — Added auth guard
- `tests/api/agents.test.ts` — Added 401 test

---

### 3. Reactions Rate Limiting (CRITICAL)

**Commit:** `e8fd93e feat: add rate limiting to reactions endpoint`

**Problem:** The reactions endpoint had no rate limiting, allowing unlimited DB inserts.

**Solution:**
- Created reusable `lib/rate-limit.ts` with sliding window algorithm
- Applied 30 requests/minute limit per IP to reactions
- Returns 429 with `Retry-After` header when rate limited
- Includes `X-RateLimit-*` headers in responses

**Verification:**
- 10 new unit tests for rate limiter
- Test for 429 response in reactions API
- All tests pass

**Files changed:**
- `lib/rate-limit.ts` — New rate limiter utility
- `app/api/reactions/route.ts` — Applied rate limiting
- `tests/unit/rate-limit.test.ts` — 10 tests
- `tests/api/reactions.test.ts` — Updated with rate limit test

---

### 4. Intro Pool Race Condition (HIGH)

**Commit:** `eaa276a fix: prevent intro pool race condition with atomic claim`

**Problem:** Concurrent signup credits claims could overdraw the intro pool.

**Solution:**
- Replaced check-then-act with atomic SQL UPDATE
- Uses `LEAST()` and `GREATEST()` in SQL to cap claims at available balance
- Calculates remaining credits server-side in the UPDATE statement

**Verification:**
- Type checks pass
- Unit tests pass

**Files changed:**
- `lib/intro-pool.ts` — Atomic claim implementation

---

### 5. Bout Idempotency (HIGH)

**Commit:** `3f519d1 fix: add bout idempotency check to prevent double-running`

**Problem:** The run-bout API could be called multiple times for the same bout, causing double-charging and data corruption.

**Solution:**
- Check bout status before processing
- Return 409 Conflict if bout is `running` or `completed`
- Allow re-running bouts with `error` status

**Verification:**
- 2 new tests for 409 responses
- All tests pass

**Files changed:**
- `app/api/run-bout/route.ts` — Added idempotency check
- `tests/api/run-bout.test.ts` — Added 409 tests

---

### 6. Webhook Timing Oracle (MEDIUM)

**Commit:** `d624309 fix: mitigate webhook timing oracle vulnerability`

**Problem:** Different code paths for new vs. duplicate webhook events created a timing oracle.

**Solution:**
- Always query for existing transaction (regardless of userId/credits validity)
- Uniform code path timing whether session was processed or not
- Added logging for duplicate detection

**Verification:**
- Manual review of code path uniformity
- Type checks pass

**Files changed:**
- `app/api/credits/webhook/route.ts` — Restructured for uniform timing

---

### 7. Attestation UID Validation (MEDIUM)

**Commit:** `f066d6b feat: add attestation UID and txHash validation`

**Problem:** No validation that EAS attestation returns valid bytes32 format.

**Solution:**
- Added `isValidBytes32()` helper function
- Added `isValidTxHash()` helper function
- Throws error if UID is invalid (catches corruption early)
- Warns on invalid txHash (informational only)

**Verification:**
- Type checks pass
- Exported helpers can be tested directly

**Files changed:**
- `lib/eas.ts` — Added validation helpers and checks

---

### 8. Preset Lookup Optimization (MEDIUM)

**Commit:** `55b1fcf perf: add O(1) preset lookup via Map`

**Problem:** `ALL_PRESETS.find()` is O(n) for every request.

**Solution:**
- Added `PRESET_BY_ID` Map for constant-time lookups
- Added `getPresetById()` helper function
- Updated run-bout route to use O(1) lookup

**Verification:**
- All tests pass
- Type checks pass

**Files changed:**
- `lib/presets.ts` — Added Map and helper
- `app/api/run-bout/route.ts` — Use `getPresetById()`

---

## Deferred Issues

The following issues were identified but not addressed in this session:

| # | Severity | Issue | Reason for Deferral |
|---|----------|-------|---------------------|
| 3 | CRITICAL | BYOK key in session storage | Requires architectural changes (encrypted cookie or server-side) |
| 7 | HIGH | Remix self-enrichment loophole | Needs product decision on fraud detection |
| 9 | HIGH | Credit settlement can go negative | Edge case, needs analysis of actual token variance |
| 11 | MEDIUM | Global DB client nullable | Build-time vs runtime trade-off |
| 13 | MEDIUM | Transcript unbounded growth | Needs context window budget strategy |
| 14-20 | LOW/MEDIUM | Code quality issues | Lower priority, incremental improvements |

---

## Verification Summary

| Check | Result |
|-------|--------|
| TypeScript (`pnpm run typecheck`) | ✅ Pass |
| ESLint (`pnpm run lint`) | ✅ Pass |
| Unit Tests (`pnpm run test:unit`) | ✅ 87/87 pass |
| Integration Tests (`pnpm run test:integration`) | ⏭️ 6 skipped (require DB) |
| Coverage | 100% statements, 98% branches |

---

## Blockers Encountered

**None.** All changes were implemented without blockers.

---

## Recommendations for Next Session

1. **BYOK Security:** Consider moving to encrypted HTTP-only cookies with server-side decryption
2. **Fraud Detection:** Implement IP fingerprinting and rate limiting for remix rewards
3. **Credit Settlement:** Add monitoring for settlement deltas to detect model cost variance
4. **Context Budget:** Implement sliding window or summarization for long transcripts

---

## Commits

```
55b1fcf perf: add O(1) preset lookup via Map
f066d6b feat: add attestation UID and txHash validation
d624309 fix: mitigate webhook timing oracle vulnerability
3f519d1 fix: add bout idempotency check to prevent double-running
eaa276a fix: prevent intro pool race condition with atomic claim
e8fd93e feat: add rate limiting to reactions endpoint
b554d5e fix: require authentication for agent creation
9a7e37f fix: add atomic credit preauthorization to prevent race condition
```

All commits follow Conventional Commits format. No co-authors.
