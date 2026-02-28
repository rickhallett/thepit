# Test Spec: `lib/bout-engine.ts` — Canonical

> **Status:** Spec complete. Implementation pending.
> **Authors:** Architect (initial), Weaver (gap analysis + case inventory), Captain (triage rulings)
> **Date:** 2026-02-28
> **Target:** ~100% line/branch coverage of 1,222 LOC core execution engine
> **Current coverage:** 0% direct (~35% indirect via 6 API route test files)
> **Rulings:** DB both (unit mock + integration real). E2E parked (holding-deck). 4-file split. Mock checkRateLimit directly. Export helpers. Use real xml-prompt.

---

## 1. Executive Summary

`lib/bout-engine.ts` is the heart of THE PIT's bout loop. It extracts the streaming
SSE logic from `/app/api/run-bout/route.ts` and standardizes the synchronous (REST)
consumption of the same logic. It contains critical financial, authorization, and AI
integration code.

Because this file bridges HTTP validation (Phase 1: `validateBoutRequest`) and
streaming execution (Phase 2: `executeBout`), the testing strategy must independently
verify the request gate and the execution loop.

**Key architectural insight:** The engine was extracted from the route *specifically*
to enable direct testing. We construct `Request` objects for validation and
`BoutContext` objects for execution — no HTTP overhead, no streaming complexity.

---

## 2. Testing Strategy

### Two layers, five files

| File | Layer | Scope | DB strategy |
|------|-------|-------|-------------|
| `bout-engine-validate.test.ts` | Unit | All 25+ validation branches | Mock DB |
| `bout-engine-execute.test.ts` | Unit | Turn loop, transcript, share line, events, settlement | Mock DB |
| `bout-engine-helpers.test.ts` | Unit | `isAnthropicModel()`, `hashUserId()` | None |
| `bout-engine-behavior.test.ts` | Behavior | End-to-end validate → execute scenarios | Mock DB |
| `bout-engine-credits.integration.test.ts` | Integration | Credit preauth, settlement, intro pool atomicity | **Real Postgres** |

### Why both mock and real DB

Unit tests mock for speed and isolation (consistent with all existing test files).
Integration tests use real Postgres for the credit economy paths where atomicity
matters — the `UPDATE ... WHERE balance >= est` pattern hides concurrency bugs
under mocks. (Architect's insight, Captain-approved.)

### Why four+one files

1. **Isolation** — validation and execution have different dependency profiles
2. **Parallelism** — Vitest runs files in parallel
3. **Readability** — 1,222 LOC source needs ~2,400 lines of tests
4. **DB gating** — integration file skips when no DATABASE_URL (like existing integration tests)

---

## 3. File 1: `tests/unit/bout-engine-validate.test.ts`

Tests `validateBoutRequest()`. Every early return is a branch.

### Mock Setup

- `new Request('http://test', { method: 'POST', body: JSON.stringify(payload) })`
- Mock: `@/db`, `@clerk/nextjs/server`, `next/headers`, `@/lib/credits`, `@/lib/tier`, `@/lib/intro-pool`, `@/lib/rate-limit`, `@/lib/langsmith`, `@/lib/posthog-server`, `@sentry/nextjs`
- Real: `@/lib/validation`, `@/lib/api-utils`, `@/lib/response-lengths`, `@/lib/response-formats`, `@/lib/errors`

### Test Cases (64)

#### 1. Input Parsing (lines 181-211)

| ID | Case | Expected |
|----|------|----------|
| V-01 | Invalid JSON body | 400 INVALID_JSON |
| V-02 | null body after parse | 400 INVALID_JSON |
| V-03 | Non-object body (string, number, array) | 400 INVALID_JSON |
| V-04 | Missing boutId | 400 "Missing boutId" |
| V-05 | Topic > 500 chars | 400 "Topic must be 500..." |
| V-06 | UNSAFE_PATTERN (script tag) | 400 UNSAFE_CONTENT |
| V-07 | UNSAFE_PATTERN (javascript: URL) | 400 UNSAFE_CONTENT |
| V-08 | Topic trimmed of whitespace | context.topic verified |
| V-09 | Empty topic preserved as empty string | context.topic === '' |

#### 2. Database Availability (lines 214-219)

| ID | Case | Expected |
|----|------|----------|
| V-10 | requireDb() throws | 503 SERVICE_UNAVAILABLE |

#### 3. Idempotency (lines 222-243)

| ID | Case | Expected |
|----|------|----------|
| V-11 | Running + has transcript | 409 "already running" |
| V-12 | Running + empty transcript | passes through (retry) |
| V-13 | Completed | 409 "already completed" |
| V-14 | Not found | passes through (new bout) |
| V-15 | Error state | passes through (retry) |

#### 4. Preset Resolution (lines 244-287)

| ID | Case | Expected |
|----|------|----------|
| V-16 | PresetId from payload | used directly |
| V-17 | PresetId fallback from existing bout | fallback works |
| V-18 | PresetId missing everywhere | 400 "Missing presetId" |
| V-19 | Known preset ID | resolved from registry |
| V-20 | Unknown non-arena preset | 404 "Unknown preset" |
| V-21 | Arena + agentLineup | buildArenaPresetFromLineup called |
| V-22 | Arena + no agentLineup | 404 "Unknown preset" |
| V-23 | Arena fallback: topic/length/format from DB row | values populated |

#### 5. Authentication & Ownership (lines 292-306)

| ID | Case | Expected |
|----|------|----------|
| V-24 | Authenticated user | userId in context |
| V-25 | Anonymous user | userId null |
| V-26 | BYOK + authenticated | readAndClearByokKey called |
| V-27 | BYOK + anonymous | byokData null |
| V-28 | Ownership mismatch | 403 FORBIDDEN |
| V-29 | Ownership match | passes through |
| V-30 | No ownerId on bout | passes through |

#### 6. Research API Key Bypass (lines 312-323)

| ID | Case | Expected |
|----|------|----------|
| V-31 | Valid x-research-key | tier='lab', bypass=true |
| V-32 | Invalid key | bypass=false |
| V-33 | Missing header | bypass=false |
| V-34 | Header but no env var | bypass=false |
| V-35 | Different-length keys | no crash, bypass=false |

#### 7. Rate Limiting (lines 325-361)

| ID | Case | Expected |
|----|------|----------|
| V-36 | Anonymous limit exceeded | 429 + upgrade tiers |
| V-37 | Free tier exceeded | 429 + pass+lab tiers |
| V-38 | Pass tier exceeded | 429 + lab-only tier |
| V-39 | Lab tier | skipped entirely |
| V-40 | Research bypass | skipped (tier='lab') |
| V-41 | Response payload | currentTier, limit, message |

#### 8. Tier-Based Model Selection (lines 362-422)

| ID | Case | Expected |
|----|------|----------|
| V-42 | SUBSCRIPTIONS_ENABLED=false | FREE_MODEL_ID |
| V-43 | canRunBout not allowed | 402 |
| V-44 | BYOK + key present | modelId='byok' |
| V-45 | BYOK + no key | 400 "BYOK key required" |
| V-46 | Premium model + access | modelId set |
| V-47 | Premium model + no access | 402 |
| V-48 | Premium preset, no explicit model | auto-upgrade |
| V-49 | Arena preset | treated as premium |
| V-50 | Free + first bout | FIRST_BOUT_PROMOTION_MODEL |
| V-51 | Free + not first bout | FREE_MODEL_ID |
| V-52 | Free tier | incrementFreeBoutsUsed called |
| V-53 | Pass/lab tier | NOT called |

#### 9. Credit Pre-authorization (lines 424-466)

| ID | Case | Expected |
|----|------|----------|
| V-54 | CREDITS_ENABLED=false | no checks |
| V-55 | Research bypass | all gates skipped |
| V-56 | Anonymous + pool has credits | consumed |
| V-57 | Anonymous + pool exhausted | 401 |
| V-58 | Anonymous + pool insufficient | 401 |
| V-59 | Anonymous + consumption race | 402 |
| V-60 | Authenticated + preauth succeeds | preauthMicro set |
| V-61 | Authenticated + insufficient | 402 |

#### 10. Bout Row Creation (lines 468-506)

| ID | Case | Expected |
|----|------|----------|
| V-62 | INSERT succeeds | ok: true, full BoutContext |
| V-63 | INSERT fails | 503 |
| V-64 | Context fields verified | all 14 fields present |

---

## 4. File 2: `tests/unit/bout-engine-execute.test.ts`

Tests `executeBout()`. Constructs `BoutContext` directly.

### Streaming Mock Pattern

```typescript
function createStreamResult(text: string, usage?: { inputTokens: number; outputTokens: number }) {
  return {
    textStream: (async function* () {
      for (const chunk of text.match(/.{1,10}/g) ?? [text]) yield chunk;
    })(),
    usage: Promise.resolve(usage ?? { inputTokens: 100, outputTokens: 50 }),
    providerMetadata: Promise.resolve({}),
  };
}
```

### Test Cases (78)

#### Turn Loop (E-01 to E-05)
- Single/multi/three-agent rotation, empty agents throw, color fallback

#### SSE Events (E-06 to E-11)
- Event sequence per turn, data-turn payload, no-callback safety, share line event

#### Scripted Turns (E-12 to E-16)
- LLM skipped, transcript+history added, no token accounting, mix with live turns

#### Prompt Hook (E-17 to E-20)
- Injection appended, null return = no change, history copy not reference

#### Context Window (E-21 to E-26)
- No truncation, truncation logged, BYOK model resolution, hard guard throw, first turn

#### LLM Configuration (E-27 to E-32)
- traced vs untraced (BYOK privacy), Anthropic cache control, maxOutputTokens

#### Token Accounting (E-33 to E-37)
- Real usage vs fallback estimation, cumulative across turns, cache metadata

#### TTFT & Refusal (E-38 to E-41)
- Slow provider warning, refusal detection + logging

#### Share Line (E-42 to E-47)
- Generated/trimmed/stored, >140 truncation, quote stripping, failure non-fatal, 2000-char clip

#### DB Persistence (E-48 to E-50)
- Running status at start, completed with transcript+shareLine, shareGeneratedAt null

#### Analytics (E-51 to E-60)
- bout_started, bout_completed, $ai_generation per turn, BYOK attribution, user_activated, flushServerAnalytics, Sentry

#### Settlement Success (E-61 to E-66)
- Refund/charge/exact-match, CREDITS_ENABLED=false, anonymous skip, financial telemetry

#### Error Path (E-67 to E-75)
- Partial transcript, credit refund, intro pool refund, serverTrack bout_error, Sentry, error re-thrown

#### Tracing Wrapper (E-76 to E-78)
- Metadata, graceful degradation on throw, tags

---

## 5. File 3: `tests/unit/bout-engine-helpers.test.ts`

Pure functions. Requires exporting with `@internal` JSDoc.

| ID | Case | Expected |
|----|------|----------|
| H-01 | isAnthropicModel: platform | true |
| H-02 | isAnthropicModel: byok + anthropic | true |
| H-03 | isAnthropicModel: byok + openrouter | false |
| H-04 | isAnthropicModel: byok + null data | false |
| H-05 | hashUserId: 16-char hex | verified |
| H-06 | hashUserId: deterministic | same in = same out |
| H-07 | hashUserId: different inputs | different outputs |
| H-08 | hashUserId: crypto failure | 'unknown' |

---

## 6. File 4: `tests/unit/bout-engine-behavior.test.ts`

End-to-end scenarios. Validate → execute in sequence.

| ID | Scenario |
|----|----------|
| B-01 | Anonymous bout via intro pool — full lifecycle |
| B-02 | Authenticated free-tier bout — preauth → execute → settle |
| B-03 | BYOK bout — untracedStreamText, BYOK fee |
| B-04 | LLM fails turn 3 of 6 — partial transcript, refund, re-throw |
| B-05 | Anonymous error — intro pool refund |
| B-06 | Idempotency — completed bout returns 409 |
| B-07 | First-bout promotion |
| B-08 | Rate limit + tier — 429 with upgrade URLs |
| B-09 | Arena custom lineup from agentLineup JSONB |
| B-10 | 12-turn bout — truncation kicks in on later turns |
| B-11 | Share line lifecycle — generate, truncate, emit, persist |
| B-12 | Research bypass — lab tier, no limits, no credits |

---

## 7. File 5: `tests/integration/bout-engine-credits.integration.test.ts`

**Real Postgres.** Tests credit atomicity that mocks would hide.
Gated by `DATABASE_URL` (skips when unavailable, like existing integration tests).

| ID | Scenario |
|----|----------|
| I-01 | Preauth deducts exact amount atomically (concurrent requests don't overdraw) |
| I-02 | Settlement refund: actual < preauth → balance increases by difference |
| I-03 | Settlement charge: actual > preauth → balance decreases, capped at available |
| I-04 | Error path refund: applyCreditDelta returns correct amount after partial bout |
| I-05 | Intro pool consumption + refund: pool balance round-trips correctly |

---

## 8. Coverage Projection

| Region | Lines | Current | Projected |
|--------|-------|---------|-----------|
| Input parsing | 31 | 60% | **100%** |
| DB availability | 6 | 0% | **100%** |
| Idempotency | 22 | 80% | **100%** |
| Preset resolution | 44 | 70% | **100%** |
| Auth & ownership | 15 | 20% | **100%** |
| Research bypass | 12 | 0% | **100%** |
| Rate limiting | 37 | 0% | **100%** |
| Model selection | 61 | 50% | **100%** |
| Credit preauth | 43 | 70% | **100%** |
| Bout row creation | 39 | 80% | **100%** |
| executeBout wrapper | 44 | 0% | **100%** |
| Turn loop | 328 | 15% | **95%** |
| Share line | 48 | 40% | **100%** |
| DB persistence | 11 | 50% | **100%** |
| Analytics | 57 | 0% | **100%** |
| Settlement | 46 | 40% | **100%** |
| Error path | 85 | 30% | **100%** |
| Helpers | 22 | 0% | **100%** |
| **Total** | **1,222** | **~35%** | **~98%** |

---

## 9. Implementation Priority

1. **bout-engine-helpers.test.ts** — 8 tests. Export helpers first.
2. **bout-engine-validate.test.ts** — 64 tests. Establishes mock scaffold.
3. **bout-engine-execute.test.ts** — 78 tests. Streaming mock pattern.
4. **bout-engine-behavior.test.ts** — 12 tests. Composes patterns from 2+3.
5. **bout-engine-credits.integration.test.ts** — 5 tests. Requires DB available.

**Total: ~167 test cases, ~2,500 lines.**

---

## 10. Decisions on File

| Decision | Ruling | Source |
|----------|--------|--------|
| DB mocking | Both: unit tests mock, integration tests real Postgres | Captain |
| Playwright E2E | Parked in holding-deck (bout-engine-e2e-scenarios) | Captain |
| File organization | 4 unit + 1 integration | Weaver (Captain approved) |
| Rate limit testing | Mock checkRateLimit directly, don't use fakeTimers | Weaver |
| Helper exports | Export with @internal JSDoc | Weaver (Captain approved) |
| xml-prompt functions | Use real (pure, already tested) | Weaver (Captain approved) |
| Coverage target | 85% threshold in vitest.config, aim for 95%+ actual | Weaver |

---
**Prepared by:** Architect (initial spec) + Weaver (gap analysis, case inventory, convergence) + Captain (triage rulings)
