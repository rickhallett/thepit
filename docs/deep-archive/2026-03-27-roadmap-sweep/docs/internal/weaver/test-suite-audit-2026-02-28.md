# Test Suite Audit — 2026-02-28

Post-merge state after bout-engine test spec (169 cases, PRs #385-#389). Data gathered by subagent, synthesis by Weaver.

Back-reference: SD-230 (bugbot findings log), SD-231 (greppable principles), SD-235 (Paper Guardrail).

---

## Headline Numbers

| Metric | Value | Assessment |
|--------|-------|------------|
| Test files | 115 (78 unit, 33 API, 4 integration) | Good breadth |
| Tests passing | 1,295 | Solid count |
| Tests skipped | 9 | Acceptable — all conditional on DB/server |
| Coverage gate | 11 of 71 lib files | Structural gap |
| Coverage on gated files | 96% avg | Strong where it exists |
| Untested lib files | 19 of 71 | 27% of lib/ has zero tests |

## Defense in Depth

Verification chain: agent writes → local gate (typecheck + lint + vitest) → Bugbot → human.

The gate catches syntax, types, and whether tests pass. It does NOT catch:

- Whether tests verify the right thing (Right Answer, Wrong Work)
- Whether mocks leak between tests (mock isolation)
- Whether the 60 lib files outside the coverage gate regress

The coverage gate is a 15% window. 11 files gated, 60 ungated. A regression in any ungated file produces zero signal.

## Phantom Greenlight Risk

### 167 status-code-only assertions

Every one is a potential Right Answer, Wrong Work. The test asserts `toBe(400)` or `toBe(200)` without checking the error code, message, or response body structure. Top offender: `bout-engine-validate.test.ts` at 25 instances — the file we just wrote.

### 122 bare `.toHaveBeenCalled()` assertions

Verify a function was called but not what it was called with. A mock could be called with completely wrong arguments and the test still passes.

### 28 weak boolean assertions

`toBeTruthy`/`toBeFalsy`. Most in E2E (different context), a few in unit tests.

## Mock Isolation

44 of 47 test files use `vi.clearAllMocks()` — the weakest cleanup. Resets call history but preserves mock implementations. Only 2 use `resetAllMocks`, 1 uses `restoreAllMocks`.

235 `mockImplementation` calls across the suite. Every one sets a custom implementation that `clearAllMocks` will NOT reset.

16 `Object.defineProperty` calls in `actions.test.ts` and `actions-happy.test.ts` without try/finally.

## Untested Critical Files

| File | Lines | Risk | Reason |
|------|-------|------|--------|
| `lib/refusal-detection.ts` | 89 | High | Pure function, security-adjacent, trivially testable |
| `lib/anomaly.ts` | 198 | High | Security-adjacent anomaly detection, zero tests |
| `lib/copy-edge.ts` | — | Medium | Edge-case copy logic, where bugs hide |

19 of 71 lib files have zero tests. None are in the coverage gate.

## What a Hostile Reviewer Would Find

1. "1,295 tests but only 11 files in the coverage gate" — test count is impressive until you read vitest.config.ts
2. "167 status-code-only assertions" — `grep -rn 'toBe(4' tests/` finds them in seconds
3. "clearAllMocks everywhere, 235 mockImplementations" — weakest cleanup option applied uniformly

## Recommendations (Priority Order)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Replace `clearAllMocks` with `resetAllMocks` globally | Closes mock implementation leak class entirely | Low |
| 2 | Add `refusal-detection.ts` and `anomaly.ts` to coverage gate | Covers two highest-risk untested files | Medium |
| 3 | Audit the 167 status-code-only assertions | Identify which are Right Answer, Wrong Work | High |
| 4 | Wrap all `Object.defineProperty` in try/finally | 16 instances in actions tests | Low |
| 5 | Expand coverage gate from 11 to 20+ files | Bring gate vision closer to actual codebase | Medium |

---

*The suite is strong where it looks. The risk is in how much it doesn't look at.*
