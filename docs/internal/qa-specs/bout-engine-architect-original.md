# Test Specification: `lib/bout-engine.ts`
**Owner:** Architect
**Target:** \`lib/bout-engine.ts\` (~1,222 LOC)
**Coverage Goal:** ~100% (Statements, Branches, Functions, Lines)
**Tech Stack:** Vitest (Unit/Integration), Drizzle ORM (PG test DB), Playwright (E2E), LangSmith (tracing mocked)

---

## 1. Executive Summary

`lib/bout-engine.ts` is the heart of THE PIT's bout loop. It extracts the streaming SSE logic from `/app/api/run-bout/route.ts` and standardizes the synchronous (REST) consumption of the same logic. It contains critical financial, authorization, and AI integration code. 

Because this file bridges HTTP validation (Phase 1: `validateBoutRequest`) and streaming execution (Phase 2: `executeBout`), the testing strategy must independently verify the request gate and the execution loop. Due to its financial and operational criticality (intro pool, credits, preauthorization, billing margin), **integration testing against a real database is preferred over Drizzle mocks**, while **LLM calls should be reliably mocked** via async generators.

---

## 2. Phase 1: `validateBoutRequest`

This phase must be exhaustively tested via unit/integration tests as it guards the database and credit economy. 

### 2.1 Request Parsing & Sanitization
- **Invalid Payload:** Pass malformed JSON or empty objects `-> Returns { ok: false, error: 400 API_ERRORS.INVALID_JSON }`.
- **Missing Bout ID:** Omit `boutId` `-> Returns 400 "Missing boutId."`
- **Topic Constraints:** 
  - Length > 500 characters `-> Returns 400 "Topic must be 500 characters or fewer."`
  - Pattern matching `UNSAFE_PATTERN` `-> Returns 400 API_ERRORS.UNSAFE_CONTENT`.

### 2.2 Idempotency & Database State Constraints
- **Already Running:** Insert a bout with `status: 'running'` and a non-empty transcript. `-> Returns 409 "Bout is already running."`
- **Already Completed:** Insert a bout with `status: 'completed'`. `-> Returns 409 "Bout has already completed."`
- **Ownership Mismatch:** Existing bout owned by `user_A`, requested by `user_B`. `-> Returns 403 API_ERRORS.FORBIDDEN`.

### 2.3 Preset & Lineup Resolution
- **Missing Preset ID:** Request without `presetId`, where DB also has no `presetId` `-> Returns 400 "Missing presetId."`
- **Unknown Preset:** Request with `presetId: "non_existent"` `-> Returns 404 "Unknown preset."`
- **Arena Lineup Resolution:** 
  - `ARENA_PRESET_ID` with a valid JSONB `agentLineup` in the DB `-> Returns { ok: true }` and dynamically builds the preset.
  - `ARENA_PRESET_ID` without a lineup in the DB `-> Returns 404 "Unknown preset."`

### 2.4 Tier Authorization & Model Access
- **Anonymous User:** Assert model is locked to `FREE_MODEL_ID` regardless of requested model.
- **BYOK Access:**
  - Anonymous user asks for BYOK `-> Ignored/Locked to Free`.
  - Authenticated user asks for BYOK without a cookie key `-> Returns 400 "BYOK key required."`
- **Tier Upgrades:** 
  - Free tier requests Opus/Sonnet `-> Returns 402 "Your plan does not include access..."`
- **First-Bout Promotion:** 
  - Free tier user on their *very first bout* (0 used) is automatically upgraded to `FIRST_BOUT_PROMOTION_MODEL` (Sonnet) silently. Assert `context.modelId` reflects the upgrade.
  
### 2.5 Credit Economy (Preauthorization & Pools)
- **Research Bypass:** Provide a valid `X-Research-Key` header `-> Assert credits and rate limits are completely bypassed (simulates 'lab' tier)`.
- **Anonymous Intro Pool:**
  - Intro pool empty `-> Returns 401 API_ERRORS.AUTH_REQUIRED`.
  - Intro pool has funds, successful consumption `-> Returns { ok: true, introPoolConsumedMicro: N }` where N equals the preauthorization amount.
- **Authenticated Credits:**
  - User with 0 balance `-> Returns 402 "Insufficient credits."`
  - User with sufficient balance `-> Assert balance is decremented by the estimated amount in the DB`.
  
### 2.6 Rate Limiting
- Mock `checkRateLimit` to trigger a failure. `-> Returns 429 Rate limit exceeded` with correct upgrade tier URLs in the payload.

---

## 3. Phase 2: `executeBout`

This phase tests the async turn loop, event streaming, PostHog telemetry, and financial settlement. LLM streaming must be mocked by overriding `tracedStreamText` and `untracedStreamText`.

### 3.1 Streaming Event Sequence (Happy Path)
- **Setup:** Provide a mock context with 2 turns.
- **Execution:** Mock `streamText` to yield `"Hello"` and `" World"`.
- **Assertions (onEvent callback):**
  - Verify sequence: `start` -> `data-turn` -> `text-start` -> `text-delta` (x2) -> `text-end`.
  - Verify sequence repeats for Turn 2.
  - Verify `data-share-line` is emitted at the end.
- **Result Output:** Assert `inputTokens`, `outputTokens`, `transcript`, and `shareLine` accurately reflect the mocked output.

### 3.2 Scripted Turns (Experiment Injection)
- **Setup:** Pass `scriptedTurns` map containing content for turn 0.
- **Execution:** 
  - Assert turn 0 yields `text-delta` natively without calling the LLM mock.
  - Assert turn 1 correctly calls the LLM mock with turn 0's history.

### 3.3 Prompt Truncation & Token Accounting
- **Context Window Defense:** Mock `estimatePromptTokens` to simulate a massively oversized history.
  - Verify `truncateHistoryToFit` removes early turns to stay under the budget.
  - Verify a hard error is thrown if the *system prompt alone* exceeds the context window.
- **Token Telemetry:** Assert that Anthropic cache metadata (`cacheCreationInputTokens`, `cacheReadInputTokens`) is correctly parsed and passed to `serverCaptureAIGeneration`.

### 3.4 Refusal Detection
- **Trigger:** Mock LLM to return "I cannot fulfill this request."
- **Assertion:** Ensure `detectRefusal` fires and `logRefusal` is triggered, while the bout still completes.

### 3.5 Financial Settlement (The Ledger)
- **Overcharge (Refund):** 
  - Mock a bout that uses *fewer* tokens than preauthorized.
  - Assert `settleCredits` is called with a negative delta, refunding the user.
- **Undercharge (Debit):** 
  - Mock a bout that uses *more* tokens than preauthorized.
  - Assert `settleCredits` is called with a positive delta, debiting the user.

### 3.6 PostHog Analytics
- Verify the exact lifecycle payload is sent via `serverTrack`:
  - `bout_started`
  - `bout_completed`
  - `user_activated` (only fired if it's the user's exactly 1st completed bout in the DB).
  - `$ai_generation` (one per turn + one for share line, containing exact `inputCostUsd` and `outputCostUsd`).

### 3.7 Error Handling & Reverts (Critical Path)
- **Setup:** Force the LLM mock to throw an error on Turn 2.
- **Assertions:**
  - Ensure the DB row updates to `status: 'error'` with the partial transcript from Turn 1.
  - Ensure `bout_error` telemetry is fired.
  - **Credit Refund:** Assert `applyCreditDelta` runs and strictly refunds the unused preauthorization back to the user's ledger.
  - **Intro Pool Refund:** For anonymous bouts, assert `refundIntroPool` is called to return consumed credits, preventing pool drain attacks.

---

## 4. Behavioral / E2E Tests (Playwright)

These tests validate the client-server contract over SSE.

### 4.1 Unauthenticated Anonymous Bout
1. Navigate to `/arena`.
2. Select a Free tier preset (e.g., "Tech Bros").
3. Click "Start Bout".
4. **Assert:** The SSE connection opens, agents render DOM updates iteratively.
5. **Assert:** The Intro pool UI updates (if visible).
6. **Assert:** The bout concludes and the Replay/Share UI becomes visible.

### 4.2 Authenticated Credit Depletion
1. Sign in as a seeded test user with exactly 1 credit.
2. Select a Premium preset (Lab tier).
3. Click "Start Bout".
4. **Assert:** HTTP 402 Insufficient Credits is caught, and the "Top Up" modal is presented.

### 4.3 BYOK Passthrough
1. Sign in and configure a mock OpenRouter BYOK key in settings.
2. Start a bout with the BYOK model selected.
3. **Assert:** The bout streams successfully.
4. **Assert:** The user's internal credit balance does *not* decrease (verified via API or UI ledger).

---

## 5. Mocking Strategy & Caveats

1. **Database (Drizzle):** Do NOT mock. Use an isolated Postgres test schema (e.g. `test:unit` drops/migrates or runs in transactions). The credit economy relies on atomic SQL `UPDATE ... WHERE balance >= est`. Mocking this hides concurrency and constraint bugs.
2. **LLM Provider (LangSmith/AI SDK):** DO mock. Use `vi.mock('@/lib/langsmith')` to return deterministic text streams and token counts.
3. **Clerk Auth:** Mock `auth()` from `@clerk/nextjs/server` to manipulate `userId` and simulate unauthenticated requests.
4. **Time & Rate Limits:** Use `vi.useFakeTimers()` to test the `checkRateLimit` window without waiting 60 minutes.

---
**Prepared by:** Architect
**Standing Orders Observed:** SO-PERM-001 (chmod 444 on output artifacts)
