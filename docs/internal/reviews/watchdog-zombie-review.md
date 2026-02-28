# Watchdog Review — Test Suite Quality Audit

Date: 2026-02-28
Reviewer: Watchdog
HEAD: 89f6a07

## Executive Summary

The test suite is **substantially healthy**. Of 1,125 tests (+ 21 conditional skips), I estimate **~12-15 tests** have meaningful quality issues (tautological assertions, weak guard conditions, or over-broad acceptance criteria). The remaining ~1,110 tests verify real behavior through well-structured mocks and meaningful assertions. The biggest risk is not zombie tests — it's **missing coverage** on `lib/bout-engine.ts` (1,221 lines, the core execution engine, completely untested) and 24 other lib modules with no dedicated test file. The headline number of 1,125 is defensible but should be paired with honest disclosure of the coverage gap.

## Test Architecture Assessment

**Overall quality: B+**

The codebase demonstrates disciplined test engineering:
- Consistent `vi.hoisted()` + `vi.mock()` pattern across all 108 test files
- Clear `beforeEach` with `vi.clearAllMocks()` and mock reset
- Behavioral test names (e.g., `returns 401 when user is not authenticated`)
- Proper arrange/act/assert structure
- Zero `@ts-ignore` or `@ts-expect-error` in test files
- Module re-import pattern correctly used for env var testing
- Coverage thresholds enforced at 85% for 11 critical modules (all currently passing)

## Findings by Category

### Tautological or Meaningless Tests

**Finding 1: `expect(true).toBe(true)` in auth-bypass test**
- **File:** `tests/integration/security/auth-bypass.test.ts:160`
- **Test:** `SEC-AUTH-008: intro pool endpoint does not leak sensitive data`
- **Issue:** When the endpoint returns 404/401/403, the test falls through to `expect(true).toBe(true)` — a literal tautology. The early return means the "no sensitive data" check is never exercised for those status codes.
- **Impact:** Low (integration test, skipped in CI), but a hostile reviewer would screenshot this.
- **Fix:** Remove the `expect(true).toBe(true)` line; the `if (response.status === 200)` block is the real test. The early return already validates the acceptable status codes.

**Finding 2: Over-broad status acceptance in SEC-AUTH-001**
- **File:** `tests/integration/security/auth-bypass.test.ts:43`
- **Test:** `SEC-AUTH-001: rejects access to non-existent/unauthorized bout via API`
- **Issue:** `expect([401, 403, 404, 500].includes(response.status) || response.status === 200).toBe(true)` — this accepts literally ANY status code. If the server returns 200, it's accepted. If it returns 500, it's accepted. This assertion can never fail.
- **Impact:** Medium. The test documents intent but provides zero regression protection.
- **Fix:** Decide what the correct behavior IS (probably 401 or 404), and assert that specific status.

**Finding 3: Reaction badges test with `>= 0` assertion**
- **File:** `tests/e2e/qa-unleashed.spec.ts:243`
- **Test:** `hero shows reaction badges for most-reacted bout`
- **Issue:** `expect(badgeCount).toBeGreaterThanOrEqual(0)` — this can never fail because `count()` always returns >= 0.
- **Impact:** Low (E2E smoke test), but it inflates the test count without testing anything.
- **Fix:** Either assert `> 0` (since this is explicitly "the most-reacted bout") or remove the assertion.

### Over-Mocked Tests

The mock level across the suite is **appropriate for the architecture**. The codebase has a clear separation: pure functions in `lib/xml-prompt.ts`, `lib/validation.ts`, `lib/response-formats.ts`, etc. are tested without mocks, while modules that touch the DB, auth, or Stripe have well-structured mock chains.

However, there are a few areas where the mock density approaches the threshold:

**Finding 4: Drizzle query chain mocks obscure real query structure**
- **Files:** All API tests, all action tests (~30 files)
- **Pattern:** `mockDb.select → from → where → limit → async () => [data]`
- **Risk:** If the real Drizzle query chain changes (e.g., adding `.orderBy()` or `.groupBy()`), the mock won't catch it — the test passes because the mock returns the expected data regardless.
- **Assessment:** This is an **accepted trade-off**, not a defect. Unit tests should mock the DB; integration tests (which exist in `tests/integration/`) should catch query shape changes. The mock chain pattern is consistent and well-documented.

**Finding 5: `toHaveBeenCalled()` without argument verification (100 instances)**
- **Files:** 30+ files across unit and API tests
- **Pattern:** `expect(mockDb.insert).toHaveBeenCalled()` without `.toHaveBeenCalledWith()`
- **Risk:** Verifies the function was called but not what it was called with. If the code starts inserting the wrong data, these tests won't catch it.
- **Assessment:** Mixed severity. Most of these (~70) are negative assertions (`not.toHaveBeenCalled()`) which are valid — they verify a code path was NOT taken. The ~30 positive assertions should ideally use `.toHaveBeenCalledWith()`, but many are supplemented by adjacent assertions that verify the response body or redirect URL, which indirectly validates the call. **~8-10 instances** are genuinely weak where the only assertion is `.toHaveBeenCalled()` with no other verification:
  - `tests/unit/actions.test.ts:391` — `expect(mockDb.insert).toHaveBeenCalled()` after createBout
  - `tests/unit/actions-happy.test.ts:274,284` — archive/restore only check `.toHaveBeenCalled()` on update
  - `tests/unit/tier.test.ts:310` — incrementFreeBoutsUsed only checks update was called, not what was set
  - `tests/unit/logger.test.ts:37,45,54` — `expect(consoleSpy).toHaveBeenCalled()` (but these are followed by actual output string checks on the next lines, so they're technically redundant, not weak)
  - `tests/unit/eas.test.ts:177-178` — attest success only checks `.connect()` and `.attest()` were called, but the return value is verified

### Dead or Skipped Tests

**Finding 6: Integration tests always skipped in CI (21 tests)**
- **Files:**
  - `tests/integration/db.test.ts` — 3 tests, skipped unless `TEST_DATABASE_URL` is set
  - `tests/integration/security/auth-bypass.test.ts` — 10 tests, skipped unless server is reachable
  - `tests/integration/security/race-conditions.test.ts` — 8 tests, skipped unless server is reachable
- **Assessment:** These are **correctly conditional**, not dead. They're designed for manual QA runs against a live server. The skip conditions have clear comments. However, they inflate the "1,146 total" count by 21 tests that never run in CI.
- **Recommendation:** Report headline as "1,125 tests (+ 21 integration tests requiring live server)" for honesty.

**Finding 7: One explicitly skipped test with documented bug**
- **File:** `tests/integration/security/race-conditions.test.ts:139`
- **Test:** `SEC-RACE-006: handles concurrent reactions without crashing`
- **Comment:** `TODO: Production bug - concurrent unauthenticated reactions return 500`
- **Assessment:** This is a **properly documented skip** — it tracks a known bug. Not a dead test.

### Duplicate Tests

**Finding 8: `actions.test.ts` and `actions-happy.test.ts` share significant mock setup**
- **Files:** `tests/unit/actions.test.ts` (456 lines), `tests/unit/actions-happy.test.ts` (645 lines)
- **Issue:** Both files mock the same 15+ modules with nearly identical `vi.hoisted()` blocks (lines 1-177 are ~95% identical between files). The split is by test focus (error paths vs happy paths), not by module boundary.
- **Assessment:** This is a **style concern**, not a defect. The duplication is the mock setup, not the assertions. Consolidating into a shared test helper would reduce ~150 lines of duplication but risk coupling.

**Finding 9: `createBout` tested in both action files**
- `actions.test.ts:382-392` tests createBout → redirect + insert called
- `actions-happy.test.ts:358-405` tests createBout with custom params + redirect
- **Assessment:** These test **different branches** (default vs custom params). Not true duplicates.

### Missing Coverage (High-Value Gaps)

This is the most significant finding. **25 lib modules have no dedicated test file:**

**Critical (financial/execution/auth — should be tested):**

| Module | Lines | Risk | Priority |
|--------|-------|------|----------|
| `lib/bout-engine.ts` | 1,221 | **Core execution engine** — validation, turn loop, settlement, streaming. This is THE critical path. | **P0** |
| `lib/byok.ts` | 58 | BYOK key handling — security-sensitive | P1 |
| `lib/winner-votes.ts` | 42 | Vote counting — integrity-sensitive | P1 |
| `lib/refusal-detection.ts` | 89 | Safety/content moderation | P1 |
| `lib/anomaly.ts` | 198 | Anomaly detection for financial operations | P1 |
| `lib/research-exports.ts` | 197 | Data export — privacy-sensitive | P2 |
| `lib/recent-bouts.ts` | 101 | Public listing queries | P2 |
| `lib/engagement.ts` | 130 | Engagement scoring | P2 |

**React hooks (client-side — lower priority for unit tests):**

| Module | Lines | Note |
|--------|-------|------|
| `lib/use-bout.ts` | 338 | Main bout hook — complex state machine |
| `lib/use-bout-reactions.ts` | 136 | Reaction UI state |
| `lib/use-bout-sharing.ts` | 177 | Share modal logic |
| `lib/use-bout-voting.ts` | 55 | Vote UI state |
| `lib/use-byok-model-picker.ts` | 77 | BYOK model picker state |

**Infrastructure (acceptable to skip):**

| Module | Lines | Note |
|--------|-------|------|
| `lib/cn.ts` | 6 | Tailwind class merger — trivial |
| `lib/stripe.ts` | 25 | Stripe client init — config only |
| `lib/analytics.ts` | 61 | PostHog wrapper — side-effect only |
| `lib/posthog-server.ts` | 204 | Server-side PostHog — side-effect only |
| `lib/request-context.ts` | 30 | AsyncLocalStorage setup |
| `lib/agent-display-name.ts` | 39 | Display string formatting |
| `lib/api-logging.ts` | 109 | Request/response logging middleware |
| `lib/api-schemas.ts` | 186 | Zod schema definitions — tested indirectly via API tests |
| `lib/openapi.ts` | 406 | OpenAPI spec generation |
| `lib/copy.ts` | 217 | UI copy strings — tested indirectly via `copy-*.test.ts` |
| `lib/copy-edge.ts` | 99 | Edge-specific copy |
| `lib/langsmith.ts` | 223 | LangSmith integration — tested via `langsmith-*.test.ts` |

### Test Infrastructure Issues

**Finding 10: `vitest.config.ts` coverage thresholds miss the biggest module**
- `lib/bout-engine.ts` (1,221 lines) is not in the coverage threshold list
- `lib/xml-prompt.ts` IS in the system prompt but NOT in the actual `vitest.config.ts` coverage includes (it was removed at some point but still has 424 lines of tests)
- **Recommendation:** Add `lib/bout-engine.ts` and `lib/xml-prompt.ts` to coverage thresholds

**Finding 11: E2E tests target hardcoded production bout IDs**
- **Files:** `qa-unleashed.spec.ts`, `qa-og-images.spec.ts`
- **Issue:** Tests reference specific bout IDs (`T-NWqp-drZM0Vv5LPG6IT`, `25UCNhXykSLLvejs_EJDR`, etc.) and a specific short link slug (`HwWTtfYo`). If these bouts are ever deleted or the DB is reset, the tests break.
- **Assessment:** Acceptable for production smoke tests but fragile. These are E2E tests designed to run against production, and the bout IDs are stable (completed bouts aren't deleted). Document this assumption.

**Finding 12: `env.test.ts` tests a reconstructed schema, not the actual one**
- **File:** `tests/unit/env.test.ts`
- **Issue:** The test creates its own Zod schema mimicking `lib/env.ts` rather than importing and testing the real schema. If the real schema diverges, the test still passes.
- **Assessment:** This is intentional (the real module validates at import time and would crash without env vars), but it means the test doesn't catch schema drift. A module re-import pattern (like `credits.test.ts` uses) would be more robust.

**Finding 13: Playwright config is well-structured**
- `playwright.config.ts` correctly handles:
  - System chromium detection
  - Configurable base URL via `BASE_URL` env var
  - Dev server auto-start when no `BASE_URL`
  - Reasonable timeouts (120s test, 30s assertion)
- No issues found.

## Go CLI Test Assessment

**Total Go test files: 51 files, ~13,961 lines across 9 CLI tools + shared**

All Go tests pass. Quality assessment by tool:

| Tool | Files | Lines | Quality | Notes |
|------|-------|-------|---------|-------|
| **pitstorm** | 11 | 4,670 | **A** | Engine, client, SSE, metrics, budget, persona, profile, auth, action, config — comprehensive with httptest servers |
| **pitforge** | 10 | 2,473 | **A** | Cross-implementation parity tests (golden hashes from TS), agent CRUD, canon, prompt, diff, lint, validate, init |
| **pitnet** | 5 | 2,103 | **A-** | ABI parity, chain, crypto integrity, proof, submit — 2 integration tests (skipped without chain access) |
| **pitlab** | 4 | 1,062 | **B+** | Cmd, workflow E2E, dataset, analysis — solid but fewer edge cases |
| **pitlinear** | 3 | 823 | **B+** | Client, cache, main — good coverage of cache invalidation |
| **shared** | 3 | 801 | **B** | Config, format, license — fundamentals covered |
| **pitctl** | 4 | 754 | **B** | Smoke, query, cmd, alert, license — smoke test is well-designed |
| **pitbench** | 2 | 669 | **B** | Estimate, pricing parity — cross-implementation verification |
| **pitkeel** | 1 | 606 | **B** | Main test — good but single file for the whole tool |

**Notable Go test patterns:**
- **Cross-implementation parity tests** in pitforge and pitbench (golden hash values from TS) — excellent engineering practice
- **httptest servers** used extensively in pitstorm — tests the real HTTP path
- **Table-driven tests** used consistently
- No tautological assertions found in Go tests

## E2E Test Assessment

**7 E2E test files, ~50 tests across ~1,375 lines**

| File | Tests | Quality | Notes |
|------|-------|---------|-------|
| `bout.spec.ts` | 1 | **A** | Real streaming test, properly skipped when auth required |
| `citations.spec.ts` | 6 | **A** | Verifies all 18 arXiv links resolve (HEAD requests!), bidirectional citation linkage |
| `qa-hydration-418.spec.ts` | ~14 | **A** | Thorough hydration error regression suite, 10 pages tested, consent-gated analytics |
| `qa-unleashed.spec.ts` | ~20 | **B+** | Comprehensive feature QA, one tautological assertion (Finding 3) |
| `qa-pagination.spec.ts` | ~10 | **A** | Edge cases: page=0, page=-1, page=abc, page=999 |
| `qa-og-images.spec.ts` | ~8 | **B+** | OG image validation, cache-control headers, graceful 404 handling |
| `mobile-responsive.spec.ts` | ~8 | **A** | Horizontal overflow detection, hamburger menu lifecycle |

**E2E health verdict:** The E2E suite is well-designed, modern, and tests real user behavior. The hardcoded bout IDs are a fragility risk (Finding 11) but acceptable for production smoke tests.

## Recommendations

### Priority 0: Address Before Portfolio Review

1. **Fix the tautological `expect(true).toBe(true)`** in `auth-bypass.test.ts:160` — 5 min fix
2. **Fix the always-passing assertion** in `auth-bypass.test.ts:43` — decide on expected status, assert it
3. **Fix `>= 0` assertion** in `qa-unleashed.spec.ts:243` — change to `> 0` or remove
4. **Disclose test counts honestly** — "1,125 unit/API tests + 21 conditional integration tests + ~50 E2E tests"

### Priority 1: Coverage Gaps (Next Sprint)

5. **Write tests for `lib/bout-engine.ts`** — this is the biggest gap. Even 10 tests covering validation, turn loop termination, and error handling would be significant. Add to coverage thresholds.
6. **Write tests for `lib/refusal-detection.ts`** — safety-critical
7. **Write tests for `lib/byok.ts`** — security-sensitive (key handling)
8. **Write tests for `lib/anomaly.ts`** — financial anomaly detection
9. **Add `lib/xml-prompt.ts` back to `vitest.config.ts` coverage thresholds** — it has 424 lines of excellent tests but isn't in the coverage enforcement list

### Priority 2: Strengthen Existing Tests

10. **Upgrade ~10 bare `.toHaveBeenCalled()` assertions** to `.toHaveBeenCalledWith()` — especially in `actions.test.ts` and `actions-happy.test.ts`
11. **Add argument verification** to EAS attest test (`eas.test.ts:177-178`)
12. **Refactor `env.test.ts`** to test the real schema via module re-import

### Priority 3: Nice to Have

13. Extract shared mock setup from `actions.test.ts` and `actions-happy.test.ts` into a test helper
14. Add `lib/bout-engine.ts` and `lib/winner-votes.ts` to vitest coverage thresholds once tests exist
15. Write basic tests for `lib/use-bout.ts` (338 lines) — the main client-side bout state machine

## Estimated Impact

| Category | Count | Action |
|----------|-------|--------|
| Tests to delete | 0 | None are truly dead — all test something |
| Tests to rewrite | 3 | Fix tautological assertions (Findings 1-3) |
| Assertions to strengthen | ~10 | Upgrade bare `.toHaveBeenCalled()` to `.toHaveBeenCalledWith()` |
| Tests to add (P0) | ~20-30 | `bout-engine.ts` coverage |
| Tests to add (P1) | ~15-20 | `refusal-detection`, `byok`, `anomaly`, `winner-votes` |
| Config fixes | 2 | Add `xml-prompt.ts` and `bout-engine.ts` to coverage thresholds |
| Net test count change | +35 to +50 | After adding missing coverage |

## Verdict

The test suite is **not a liability**. The 1,125 number is defensible — the vast majority of tests verify meaningful behavior through well-structured mocks, pure function assertions, and real HTTP request/response cycles. A hostile reviewer will find the 3 tautological assertions (especially `expect(true).toBe(true)`) embarrassing but not damning. The real vulnerability is the `bout-engine.ts` coverage gap — 1,221 lines of core execution logic with zero dedicated tests. Fix that, fix the 3 tautologies, and the test suite becomes a genuine strength of the portfolio.

---

*Review conducted by Watchdog. All test files read, all tests executed (1,125 passed, 21 skipped). All Go tests passed across 9 CLI tools + shared. No source code or test files were modified during this review.*
