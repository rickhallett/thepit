# E2 - Bout Engine Spec Plan

> Provenance document. Written by @Weaver before dispatch to @Architect.
> Covers plans 07, 08, 09. Credits stubbed (CREDITS_ENABLED=false). Plan 13 wires credits later.

## Status: SPEC APPROVED - AWAITING DISPATCH

## Scope (one sentence per PR)

**PR1 - Types + Validation:** Define bout types, SSE event shapes, request schema, and validation logic with content safety and idempotency checks.

**PR2 - Turn Loop + Streaming + Route:** Build the turn loop engine, SSE streaming wrapper, and the `POST /api/run-bout` route handler. First LLM call.

## Why two PRs

- **Coherence rule:** Each PR is describable in one sentence and verifiable in isolation
- **PR1:** Pure types + validation + regex. No LLM, no DB writes, no external deps.
- **PR2:** LLM integration + streaming + route. Depends on PR1. Requires `ai`, `@ai-sdk/anthropic`.
- **Sequence:** PR1 merge, verify, then PR2 merge, verify (stacked PRs)

PR1 has zero new dependencies. PR2 adds the AI SDK. Keeping them separate means PR1 can be reviewed and merged without touching the LLM integration surface. One concern per PR.

## What exists (verified)

| Asset | File | State |
|-------|------|-------|
| DB schema (bouts table) | `db/schema.ts` | ✅ 11 tables, matches SPEC |
| Presets (4 JSON + loader) | `lib/bouts/presets.ts` | ✅ 9 tests |
| API utilities | `lib/common/api-utils.ts` | ✅ 10 tests |
| Rate limiter | `lib/common/rate-limit.ts` | ✅ 13 tests |
| Branded types | `lib/common/types.ts` | ✅ BoutId, UserId, etc. |
| Env validation | `lib/common/env.ts` | ✅ ANTHROPIC_API_KEY required |
| Middleware | `middleware.ts` | ✅ /api/run-bout listed as public |
| DB connection | `db/index.ts` | ✅ Neon Pool + Drizzle |

## What gets built

### PR1: Types + Validation (Plan 07)

**Creates:**
- `lib/bouts/types.ts` - BoutStatus enum, TranscriptEntry interface, SSEEventType union, BoutCreateRequestSchema (Zod)
- `lib/bouts/validation.ts` - validateBoutRequest, containsUnsafeContent
- `lib/bouts/validation.test.ts` - >=7 test cases

**Key decisions:**
- BoutCreateRequestSchema: `{ boutId: string(10-30), presetId: string, topic?: string(max 500), model?: string, length?: enum, format?: enum }`
- Validation sequence: parse body → resolve preset → check content → check idempotency
- Idempotency: query DB for existing boutId. Running/completed → 409. Error → allow retry.
- Content filter: basic regex (hate speech keywords, prompt injection patterns, excessive special chars). NOT a moderation system.
- Returns discriminated union: `{ valid: true, data, preset } | { valid: false, response }`

**Does NOT:**
- Rate limit (route handler concern)
- Check credits or auth (separate concerns)
- Persist anything to DB (read-only idempotency check)

**Dependencies added:** None.

**Gate:** `pnpm run typecheck && pnpm run lint && pnpm run test`

---

### PR2: Engine + Streaming + Route (Plans 08 + 09)

**Creates:**
- `lib/bouts/engine.ts` - executeTurnLoop, buildTurnMessages
- `lib/bouts/engine.test.ts` - >=6 test cases
- `lib/bouts/streaming.ts` - createBoutSSEStream
- `lib/bouts/streaming.test.ts` - >=6 test cases
- `app/api/run-bout/route.ts` - POST handler

**Installs:**
```
pnpm add ai @ai-sdk/anthropic
```

**Key decisions:**

1. **Turn loop** - Round-robin agent selection (`turnIndex % agents.length`). Each turn:
   - Build messages: system (safety preamble + agent systemPrompt) + conversation history
   - Call `streamText` from `ai` package (NOT `generateText`)
   - Invoke callbacks: onTurnStart → onTextDelta (1+ times) → onTurnEnd
   - Accumulate transcript entries

2. **Prompt construction** - Turn 0: user message = topic. Turn N>0: this agent's prior turns = "assistant", other agents' turns = "user" (prefixed with agent name). Safety preamble always present.

3. **SSE format** - Strict: `event: {type}\ndata: {json}\n\n`
   - Sequence per turn: `data-turn` → `text-start` → `text-delta`(s) → `text-end`
   - Final: `done`
   - Error: `error` event with `{ code, message }`
   - Every event includes `turnIndex` (enables client dedup on reconnect)

4. **Error handling:**
   - Client disconnect: `cancel()` callback on ReadableStream stops LLM calls
   - Server error mid-bout: error event emitted after successful turns, then close
   - `controller.close()` in ALL code paths (finally block)

5. **Route handler** - Thin. Validate, resolve model, create stream, return Response with SSE headers.

6. **Model resolution:**
   ```
   data.model || preset.defaultModel → anthropic("claude-3-5-haiku-latest" | "claude-3-5-sonnet-latest")
   ```

**Does NOT:**
- Persist bout to DB (plan 13)
- Preauth/settle credits (plan 13)
- Generate share line (plan 13)
- Add rate limiting (plan 17, tier-aware)
- Require authentication (route is public per SPEC)

**Dependencies added:** `ai`, `@ai-sdk/anthropic`

**Gate:** `pnpm run typecheck && pnpm run lint && pnpm run test`

## Credits: Stubbed

- **CREDITS_ENABLED** = false (default)
- **Plan 13** wires credits and persistence into the existing engine later
- **Bout engine** works without credits; feature flag guards all credit paths
- **Rationale:** Credits domain spans 4 files + 3 plans; including it here would double PR scope

Plan 13 is a separate PR that:
- Inserts bout row with `status='running'` before streaming
- Adds credit preauth/settle around the stream (guarded by CREDITS_ENABLED)
- Adds share line generation post-loop
- Persists transcript + status on completion/error

This is the correct boundary because the engine and streaming are pure - they don't touch the database or credit system. Plan 13 is the integration point.

## Dispatch plan

**Dispatch to:** @Architect

**Prime context:**
- `SPEC.md`
- `AGENTS.md`
- `plans/07-bout-validation.md`
- `plans/08-bout-turn-loop.md`
- `plans/09-bout-streaming.md`
- `lib/bouts/DOMAIN.md`
- `lib/bouts/presets.ts`
- `lib/common/api-utils.ts`
- `lib/common/types.ts`
- `db/schema.ts`

**Sequence:** PR1, gate, review (@Weaver), merge, then PR2, gate, review (@Weaver), merge

**Post-merge:** Verify gate on main, stain diff against watchdog taxonomy, advance

## Verification matrix

| Check | PR1 | PR2 |
|-------|-----|-----|
| Gate green | Required | Required |
| New tests pass | ≥7 | ≥12 |
| Existing tests unbroken | 49 remain | 49 remain |
| SPEC.md compliance | Request schema matches | SSE events match |
| No DB writes | ✓ (read-only idempotency) | ✓ (no persistence) |
| No credit operations | ✓ | ✓ |
| Branded types used | BoutId in validation | - |
| Error codes match SPEC | 400, 409 | SSE error event |
| Safety preamble | - | System prompt |

## Risk register

| Risk | Mitigation |
|------|-----------|
| AI SDK version incompatibility | Pin exact version in package.json |
| streamText API surface changes | Plan 08 specifies exact import: `{ streamText } from "ai"` |
| SSE format parser mismatch (client/server) | Strict format in tests, client built later (plan 14) |
| Idempotency race condition (two POSTs same boutId) | DB query + 409, but no INSERT yet - race is benign until plan 13 |
| Prompt injection via topic | containsUnsafeContent blocks obvious patterns; LLM-level injection is out of scope (SPEC: basic regex) |

## Backref

- Plans: `plans/07-bout-validation.md`, `plans/08-bout-turn-loop.md`, `plans/09-bout-streaming.md`
- SPEC: § API Contracts (POST /api/run-bout), § Core Workflows (Bout Flow), § Data Model (bouts table)
- PLAN.md: Phase 2 units 4 (maps to plans 07-09 combined)
- Epic map: `docs/decisions/epic-map.md` - E2 (Portfolio/Product)
- QA foundation: `docs/internal/weaver/qa-signoff-T001-T006.md` - verified ready
