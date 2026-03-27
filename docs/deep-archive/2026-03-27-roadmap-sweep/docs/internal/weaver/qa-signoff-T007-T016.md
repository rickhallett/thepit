# QA Signoff — T-007 through T-016

> Operator verification of bout engine and UI layer before engagement/credits development.
> Created: 2026-03-08, after T-016 landed.
> Covers: Phase 2 complete — core product loop works end-to-end (credits disabled).

## 1. Gate & Test Suite

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `pnpm run test` — 109 tests total: 100 pass, 9 skip
- [ ] Test files: 11 total (schema, auth/users, auth/referrals, common/api-utils, common/rate-limit, common/env, bouts/presets, bouts/validation, bouts/engine, bouts/streaming, bouts/use-bout)

## 2. Bout Types & Validation (T-007)

- [ ] Read `lib/bouts/types.ts` — BoutStatus enum has `running`, `completed`, `error`
- [ ] Read `lib/bouts/types.ts` — SSEEventType union includes all 7 event types
- [ ] Read `lib/bouts/types.ts` — `VALID_BOUT_MODELS` is `["claude-haiku", "claude-sonnet"]`
- [ ] Read `lib/bouts/types.ts` — BoutCreateRequestSchema validates boutId length 10–21
- [ ] Read `lib/bouts/validation.ts` — containsUnsafeContent checks hate keywords, injection patterns, special char ratio
- [ ] Run `pnpm run test -- lib/bouts/validation.test.ts` — 21 tests pass

## 3. Bout Engine (T-008)

- [ ] Read `lib/bouts/engine.ts` — SAFETY_PREAMBLE exists and is prepended to system prompts
- [ ] Read `lib/bouts/engine.ts` — buildTurnMessages: own turns = assistant, other turns = user (perspective trick)
- [ ] Read `lib/bouts/engine.ts` — executeTurnLoop: round-robin via `agents[turnIndex % agents.length]`
- [ ] Read `lib/bouts/engine.ts` — Uses `streamText` from `ai` SDK (not `generateText`)
- [ ] Run `pnpm run test -- lib/bouts/engine.test.ts` — 13 tests pass

## 4. SSE Streaming (T-009)

- [ ] Read `lib/bouts/streaming.ts` — Event format: `event: {type}\ndata: {json}\n\n`
- [ ] Read `lib/bouts/streaming.ts` — Double-close guarded with try/catch in finally block
- [ ] Read `lib/bouts/streaming.ts` — Known limitation comment about cancel not aborting LLM calls
- [ ] Run `pnpm run test -- lib/bouts/streaming.test.ts` — 12 tests pass
- [ ] Read `app/api/run-bout/route.ts` — MODEL_MAP has explicit mapping, unknown models return 400
- [ ] Read `app/api/run-bout/route.ts` — Header says credits/persistence deferred to task 13

## 5. useBout Hook (T-014)

- [ ] Read `lib/bouts/use-bout.ts` — has `"use client"` directive at top
- [ ] Read `lib/bouts/use-bout.ts` — Uses `fetch` + `ReadableStream.getReader()` (not EventSource)
- [ ] Read `lib/bouts/use-bout.ts` — SSE parsing: only `\n\n`-terminated frames parsed (chunk-safe)
- [ ] Read `lib/bouts/use-bout.ts` — JSON.parse wrapped in try/catch (malformed events skipped)
- [ ] Read `lib/bouts/use-bout.ts` — AbortController cleanup in useEffect return
- [ ] Read `lib/bouts/use-bout.ts` — Stream-end fallback: status → done if no explicit done/error
- [ ] Run `pnpm run test -- lib/bouts/use-bout.test.ts` — 14 tests pass (including chunk-splitting test)

## 6. Bout Viewer Page (T-015)

- [ ] Read `app/bout/[id]/page.tsx` — server component (no "use client")
- [ ] Read `app/bout/[id]/page.tsx` — Reads searchParams for autoStart (presetId, topic, model)
- [ ] Read `app/bout/[id]/page.tsx` — Status normalization: running→streaming, completed→done
- [ ] Read `components/arena/arena.tsx` — client component (has "use client")
- [ ] Read `components/arena/arena.tsx` — Auto-scroll via messagesEndRef + useEffect on messages.length
- [ ] Read `components/arena/arena.tsx` — Static transcript for completed bouts (isCompleted check)
- [ ] Read `components/arena/message-card.tsx` — data-testid="message-card" present
- [ ] Read `components/arena/message-card.tsx` — Colored left border via inline style (agentColor)
- [ ] Read `components/arena/message-card.tsx` — Blinking cursor animation during streaming

## 7. Arena Page (T-016)

- [ ] Read `app/arena/page.tsx` — server component, calls getAllPresets()
- [ ] Read `app/arena/page.tsx` — 2-column responsive grid (grid-cols-1 md:grid-cols-2)
- [ ] Read `components/arena/preset-card.tsx` — client component (has "use client")
- [ ] Read `components/arena/preset-card.tsx` — Model values match schema: `claude-haiku`, `claude-sonnet`
- [ ] Read `components/arena/preset-card.tsx` — nanoid(21) boutId generation
- [ ] Read `components/arena/preset-card.tsx` — router.push to /bout/{id} with searchParams

## 8. End-to-End Flow (Manual — requires dev server)

- [ ] `pnpm run dev` starts without errors
- [ ] Navigate to http://localhost:3000/arena — preset cards render
- [ ] Each preset card shows: name, description, agent badges with colors, turn count, tier
- [ ] Topic input accepts text, placeholder says "Custom topic (optional)"
- [ ] Model dropdown shows "Haiku (fast)" selected, "Sonnet (coming soon)" disabled
- [ ] Click "Start Debate" → URL changes to `/bout/{nanoid}?presetId=...&model=claude-haiku`
- [ ] Bout page shows "Streaming..." indicator with green pulse
- [ ] SSE events stream in: message cards appear with colored borders, agent names, turn numbers
- [ ] Content appears incrementally (streaming text deltas visible)
- [ ] Blinking cursor appears during active streaming
- [ ] After all turns: "Debate complete" text appears
- [ ] Page auto-scrolls as new messages arrive

## 9. Error Handling (Manual — requires dev server)

- [ ] Navigate to `/bout/nonexistent-id` without searchParams → shows "Waiting to start..."
- [ ] If ANTHROPIC_API_KEY is missing/invalid → error event appears in SSE → error message displayed

## 10. Darkcat Findings — Resolved

- [ ] T-009: Double-close on cancel (critical) — FIXED: try/catch in finally block
- [ ] T-009: Model validation (major) — FIXED: enum in schema, 400 on unknown
- [ ] T-014: SSE parsing of partial chunks (critical) — FIXED: parse only completed frames
- [ ] T-015: Status mismatch DB vs hook (major) — FIXED: normalization in page.tsx
- [ ] T-016: Model values mismatch (pre-emptive) — FIXED: claude-haiku not haiku

## 11. Known Limitations (Accepted, Documented)

- [ ] Cancel stops SSE emission but does not abort in-flight LLM calls (cost leak, deferred to T-013)
- [ ] No bout persistence — bouts are not saved to DB yet (deferred to T-013)
- [ ] No credits — all bouts are free (CREDITS_ENABLED=false, deferred to T-013)
- [ ] No `data-share-line` SSE event emitted (deferred to T-013)
- [ ] E2e test stubs only — no executable Playwright tests yet (deferred to Phase 6)

## 12. Code Conventions

- [ ] All new source files have header comments
- [ ] All new test files co-located beside their modules
- [ ] "use client" on all client components, absent on server components
- [ ] 2 spaces indentation throughout
- [ ] Conventional commit messages on all commits

## 13. Commit History (T-007 through T-016)

- [ ] T-007: `50c12dc` — feat: T-007 bout validation
- [ ] T-008: `7df99e5` — feat: T-008 bout turn loop
- [ ] T-009: `6c254e3` — feat: T-009 bout streaming
- [ ] T-014: `cd384a3` — feat: T-014 useBout hook
- [ ] T-015: `9d7e00d` — feat: T-015 bout viewer
- [ ] T-016: *(pending — awaiting walkthrough)*

---

## Signoff

```
Operator:
Date:
Findings:
Test run:
```
