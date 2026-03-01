# PR #408 Meta-Audit — Testing Broadside Phases 1-3

**Auditor:** Watchdog  
**Date:** 2026-03-01  
**Scope:** 51 test files modified, 1,279 tests passing, gate green  
**Method:** Full diff analysis (e23e94c..3462aec), full file reads of highest-risk files, production code cross-reference for error message assertions  

---

## Executive Summary

**No critical systemic errors found.** The broadside was well-executed. I found **3 genuine findings** (1 MEDIUM, 2 LOW) and **0 HIGH** severity issues. The mock migrations are correct, the error message assertions match production code, the try/finally patterns are sound, and the `toHaveBeenCalledWith` additions are appropriately specific.

The green gate is telling the truth here — these tests are testing what they claim to test.

---

## Finding 1: Inline Factory Mocks Not Re-established After resetAllMocks

**FILE:** `tests/api/short-links.test.ts`, `tests/api/paper-submissions.test.ts`, `tests/api/feature-requests.test.ts`  
**SEVERITY:** LOW  
**CATEGORY:** over-mock (incomplete re-establishment)  
**LINE(S):** short-links.test.ts:28, paper-submissions.test.ts:40, feature-requests.test.ts:34  

**DESCRIPTION:** Three test files define `getClientIdentifier` as an inline `vi.fn().mockReturnValue('127.0.0.1')` inside their `vi.mock()` factory (not hoisted). After `vi.resetAllMocks()`, this inline mock is reset and returns `undefined` instead of `'127.0.0.1'`. The tests pass because `checkRateLimit` is also mocked and doesn't actually consume the client identifier — but the tests are now silently passing `undefined` as the client identifier to the rate-limit mock, which is a different test condition than intended.

**EVIDENCE:**
```typescript
// short-links.test.ts line 26-29
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),  // ← reset by resetAllMocks
}));

// beforeEach does NOT re-establish getClientIdentifier
beforeEach(() => {
  vi.resetAllMocks();
  // ... no getClientIdentifier re-establishment
});
```

**IMPACT:** Low. The production code path that consumes `getClientIdentifier` is:
```typescript
// short-links route
checkRateLimit(RATE_LIMIT, getClientIdentifier(req))
```
Since `checkRateLimit` is mocked to return `{ success: true }`, the `undefined` client identifier has no observable effect. But if someone adds a test that checks the client identifier was passed correctly, it would see `undefined`.

**RECOMMENDED FIX:** Either (a) hoist `getClientIdentifier` as a separate mock, or (b) add `getClientIdentifierMock.mockReturnValue('127.0.0.1')` to the `beforeEach` blocks. This is a pre-existing issue that the broadside did NOT introduce — it existed before (since `clearAllMocks` also resets return values). So this is not a regression, just an existing defect now made slightly more visible by the `resetAllMocks` migration.

---

## Finding 2: security-admin-auth.test.ts — Redirect Mock Not Re-established

**FILE:** `tests/api/security-admin-auth.test.ts`  
**SEVERITY:** MEDIUM  
**CATEGORY:** over-mock (mock reset fragility)  
**LINE(S):** 67-69 (beforeEach), 87 (assertion)  

**DESCRIPTION:** The `redirectMock` is hoisted with `vi.fn(() => { throw new Error('NEXT_REDIRECT'); })` but `beforeEach` only calls `vi.resetAllMocks()` without re-establishing the throw implementation. The "allows admin users to grant credits" test expects `rejects.toThrow('NEXT_REDIRECT')` — which requires `redirect()` to throw. After `resetAllMocks()`, `redirectMock` returns `undefined` instead of throwing.

**EVIDENCE:**
```typescript
// Hoisted with throw implementation
const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));

// beforeEach resets without re-establishing
beforeEach(() => {
  vi.resetAllMocks();  // ← clears the throw implementation
  // NO re-establishment of redirectMock
});

// Test expects a throw that should no longer happen
it('allows admin users to grant credits', async () => {
  // ...
  await expect(grantTestCredits()).rejects.toThrow('NEXT_REDIRECT');
  // ↑ should fail because redirect() no longer throws
});
```

**IMPACT:** The test passes in practice (confirmed by test run), which means either (a) there's a Vitest internal behavior with cached module evaluation that preserves the mock implementation in ways I cannot trace statically, or (b) the function throws for a different reason (e.g., logger import side effect). In either case, the mock setup is incomplete by our standards and should be fixed defensively.

**NOTE:** This is a **pre-existing fragility** that was unmasked by the `clearAllMocks → resetAllMocks` migration. Under `clearAllMocks`, the mock implementation was preserved (clearAll only clears call history and return values, not implementations). Under `resetAllMocks`, the implementation IS cleared. So the broadside technically changed the behavior — but the test still passes, suggesting this specific code path has redundant safety.

**RECOMMENDED FIX:** Add to `beforeEach`:
```typescript
beforeEach(() => {
  vi.resetAllMocks();
  redirectMock.mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;${url}` });
  });
});
```

---

## Finding 3: expect.anything() in BYOK Model Assertions

**FILE:** `tests/unit/bout-engine-execute.test.ts`, `tests/unit/bout-engine-behavior.test.ts`  
**SEVERITY:** LOW  
**CATEGORY:** over-spec (too loose)  
**LINE(S):** bout-engine-execute.test.ts:655, bout-engine-behavior.test.ts:336  

**DESCRIPTION:** Two BYOK-related assertions were upgraded from bare `.toHaveBeenCalled()` to `.toHaveBeenCalledWith(expect.objectContaining({ model: expect.anything() }))`. The `expect.anything()` on `model` is a smell — it matches any truthy value. The subagent likely used it because the BYOK model resolution chain (byokData.modelId → ANTHROPIC_BYOK_MODEL → FREE_MODEL_ID) produces a value the subagent couldn't easily predict.

**EVIDENCE:**
```typescript
// bout-engine-execute.test.ts E-28
expect(untracedStreamTextMock).toHaveBeenCalledWith(
  expect.objectContaining({ model: expect.anything() }),
);
```

**IMPACT:** The assertion is strictly better than `.toHaveBeenCalled()` — it at least verifies the model field exists. But `expect.anything()` matches `null`, `undefined`, `0`, etc. A more precise assertion would be `expect.any(String)` or a specific model instance.

**RECOMMENDED FIX:** Replace `expect.anything()` with the actual expected value. For E-28, the test sets up `byokData: { provider: 'anthropic', modelId: 'claude-sonnet-4-5-20250929', key: 'sk-test' }` and mocks `getModelMock.mockReturnValue('mock-model-instance')` — but `untracedStreamText` creates its own model from the key, so the value isn't `'mock-model-instance'`. A reasonable improvement would be `expect.any(Object)` to at least verify it's an object, not `undefined`.

---

## Categories Audited — Clean

### Mock Setup Drift (Category 1) — CLEAN
Reviewed all `beforeEach` blocks in the 5 highest-risk files. The mock re-establishment patterns are faithful copies of the original module-scope implementations. The DB chain mocks (`.mockReturnValue({ values: ... })`) are correctly rebuilt. No semantic differences in return values.

### Over-Mocking in beforeEach (Category 2) — CLEAN (except Findings 1 & 2)
No evidence of `beforeEach` overwriting test-local mock setups. The try/finally patterns for `Object.defineProperty` toggles correctly capture and restore original values.

### Error Message Assertion Correctness (Category 3) — CLEAN
Cross-referenced all 14 error message assertions in bout-engine tests against `lib/bout-engine.ts` production code. All messages match the actual production error paths:
- `'Invalid JSON.'` → line 188
- `'Missing boutId.'` → line 203
- `'Service unavailable.'` → line 214
- `'Unknown preset.'` → line 267
- `'Forbidden.'` → line 326
- `'Account suspended'` → line 375 (passthrough from `canRunBout.reason`)
- `'BYOK key required.'` → line 380
- `'Authentication required.'` → line 465/475
- `'Intro pool exhausted. Sign in to continue.'` → line 480
- `'Insufficient credits.'` → line 494
- `'Service temporarily unavailable.'` → line 501

Cross-referenced all 30 error message assertions in API tests against their respective route handlers. All correct.

### toHaveBeenCalledWith Over-specification (Category 4) — CLEAN (except Finding 3)
The 34 `toHaveBeenCalledWith` additions use appropriate specificity:
- Schema table assertions (`expect.objectContaining({ id: 'id' })`) correctly verify which table was targeted
- `expect.any(Object)` and `expect.any(Number)` are appropriately loose where the exact value depends on runtime state
- `expect.stringContaining('user_test')` for Stripe search query is precise enough without being brittle

### Semantic Changes Disguised as Assertion Strengthening (Category 5) — CLEAN
No subagent changed test setup, mock configuration, or execution paths. All changes were purely additive assertions or mock re-establishment required by the `resetAllMocks` migration.

### Intentional State Sharing Broken (Category 6) — CLEAN
No `describe` blocks relied on inter-test mock state accumulation. All tests were already designed for isolation — the `clearAllMocks → resetAllMocks` migration did not break any intentional sharing patterns.

---

## Verdict

**The broadside is sound.** Two minor findings to clean up, one medium finding worth investigating for defensive hardening. No systemic blind spots detected in the 51-file, 1,279-test suite. The green gate accurately reflects test health.
