# Build Order — noopit (The Pit v2)

Derived from SPEC.md dependency chain and EVAL.md success criteria. Each unit is one concern, verifiable in isolation, gate-green before advancing.

## Already complete

| # | Unit | Plan | Commit | What |
|---|------|------|--------|------|
| 0a | Next.js scaffold | 01 | `5af3e55` | App Router, TypeScript strict, Tailwind, Vitest, ESLint |
| 0b | Database schema | 02 | `219de37` | Drizzle: 4 enums, 11 tables, Neon connection |
| 0c | Auth middleware | 03 | `6daa92d` | Clerk middleware, sign-in/up pages, ClerkProvider |
| 1 | GET /api/health | 01 | `045ef8f` | DB connectivity + feature flags |
| 2 | User sync on first auth | 04 | `1a6c5f0` | ensureUserRecord, referral codes, onboarding orchestrator |
| — | API utils + rate limiter | 05 | `2622c65` | Branded types, error responses, sliding window rate limiter |
| 3 | Preset agent definitions | 06 | `0b1e03d` | 4 JSON presets, Zod-validated loader, frozen cache |
| 4a | Bout validation | 07 | `50c12dc` | BoutStatus enum, TranscriptEntry, SSEEventType, Zod schema, content safety, idempotency |
| 4b | Bout turn loop | 08 | `7df99e5` | executeTurnLoop, round-robin agents, AI SDK streaming, buildTurnMessages |
| 4c | Bout streaming + route | 09 | `6c254e3` | createBoutSSEStream (SSE), POST /api/run-bout, model enum validation, double-close guard |
| 5a | useBout hook | 14 | `cd384a3` | React hook: fetch POST → SSE parsing → state, chunk-safe, AbortController cleanup |
| 5b | Bout viewer page | 15 | `9d7e00d` | Server page + Arena client + MessageCard, auto-scroll, static/streaming modes |
| 5c | Arena page | 16 | *(pending)* | Preset grid, PresetCard, topic input, model selector, autoStart wiring |

**QA signoff:** T-001 through T-006 verified (`docs/internal/weaver/qa-signoff-T001-T006.md`). Gate green. Foundation ready. 49 tests (40 pass, 9 skipped — need live DB).
**T-007–T-009:** Phase 2 Unit 4 complete. Bout engine works end-to-end (without persistence/credits). 95 tests (86 pass, 9 skip). Darkcat-verified (2 rounds, critical double-close fixed).
**T-014–T-016:** Phase 2 Units 5+6 complete. Full UI loop: arena → preset → bout page → SSE stream → display. 109 tests (100 pass, 9 skip). QA pending (`docs/internal/weaver/qa-signoff-T007-T016.md`).

---

## Phase 2: The Bout (the product)

EVAL criterion 1: "A user can pick a preset → watch agents argue in real-time SSE."

| # | Unit | Touches | Depends on | Verifiable by |
|---|------|---------|------------|---------------|
| 4 | `POST /api/run-bout` — SSE streaming | `app/api/run-bout/route.ts`, `lib/bouts/engine.ts` | Presets (3), schema (0b) | Test: POST with preset → SSE stream of turns → bout persisted with status=completed. Credits OFF (feature flag). |
| 5 | `useBout` hook + `/bout/[id]` page | `lib/bouts/use-bout.ts`, `app/bout/[id]/page.tsx` | run-bout API (4) | Manual + test: page connects to SSE, renders turns with auto-scroll, shows share panel on complete |
| 6 | `/arena` page — preset grid | `app/arena/page.tsx` | Presets (3), bout page (5) | Manual: grid renders presets, click → generates boutId (nanoid 21) → navigates to `/bout/[id]` |

**Gate check.** After Phase 2 the core product loop works end-to-end with credits disabled. First deployable state.

---

## Phase 3: Engagement

EVAL criterion 1 continued: "react → vote → share → see leaderboard."

| # | Unit | Touches | Depends on | Verifiable by |
|---|------|---------|------------|---------------|
| 7 | `POST /api/reactions` | `app/api/reactions/route.ts`, `lib/engagement/reactions.ts` | Schema (0b), bouts exist (4) | Test: toggle heart/fire, anonymous via IP hash, idempotent, returns counts |
| 8 | Reactions UI on bout viewer | `app/bout/[id]/` components | Reactions API (7), bout page (5) | Manual: heart/fire buttons on each turn, count updates |
| 9 | `POST /api/winner-vote` | `app/api/winner-vote/route.ts`, `lib/engagement/votes.ts` | Schema (0b), auth (0c), bouts exist (4) | Test: one vote per user per bout (unique index), returns ok |
| 10 | Winner vote UI | `app/bout/[id]/` components | Vote API (9), bout page (5) | Manual: pick winner after bout completes |
| 11 | `POST /api/short-links` + share panel | `app/api/short-links/route.ts`, `lib/sharing/` | Schema (0b), bouts exist (4) | Test: create short link (nanoid 8), idempotent per bout |
| 12 | `/b/[id]` — short link replay | `app/b/[id]/page.tsx` | Short links (11), bout page (5) | Manual: read-only replay of completed bout |

---

## Phase 4: Economy

EVAL criterion 2: "Credits and Stripe work."

| # | Unit | Touches | Depends on | Verifiable by |
|---|------|---------|------------|---------------|
| 13 | Credit preauth/settle in run-bout | `lib/credits/`, modify `lib/bouts/engine.ts` | User sync (2), run-bout (4) | Test: enable `CREDITS_ENABLED` → preauth deducts → settle reconciles (refund overestimate or charge underestimate) → error = full refund |
| 14 | `POST /api/credits/webhook` — Stripe | `app/api/credits/webhook/route.ts`, `lib/credits/stripe.ts` | Credits (13) | Test: 6 webhook events → correct tier change + credit grant, idempotent via reference_id |
| 15 | Subscription checkout flow | `/arena` checkout integration | Webhook (14), arena (6) | Manual: subscribe button → Stripe Checkout → webhook fires → tier + credits updated |

---

## Phase 5: Discovery & Creation

The browse layer. None of this blocks the core loop.

| # | Unit | Touches | Depends on | Verifiable by |
|---|------|---------|------------|---------------|
| 16 | `/agents` + `/agents/[id]` | `app/agents/` | Schema (0b), presets (3) | Manual: catalog with search/filter, detail shows prompt hash |
| 17 | `POST /api/agents` + `/agents/new` | `app/api/agents/route.ts`, `app/agents/new/page.tsx` | Auth (0c), schema (0b) | Test: create agent → SHA-256 prompt hash, rate limit 10/hr |
| 18 | `/arena/custom` | `app/arena/custom/page.tsx` | Agent creation (17), run-bout (4) | Manual: build custom lineup → run bout |
| 19 | `/leaderboard` | `app/leaderboard/page.tsx` | Bouts + votes exist (4, 9) | Manual: aggregated rankings render |
| 20 | `/recent` | `app/recent/page.tsx` | Bouts exist (4) | Manual: paginated list of recent bouts |

---

## Phase 6: Ship

EVAL criterion 6: "Deployed to Vercel. Live URL, smoke test passes."

| # | Unit | Touches | Depends on | Verifiable by |
|---|------|---------|------------|---------------|
| 21 | `/` landing page | `app/page.tsx` | Presets (3), arena (6) | Manual: hero, preset preview, pricing table |
| 22 | Vercel deployment | `vercel.json`, env config | Everything | Smoke test: health check + run one bout on live URL |
| 23 | E2e user journey | Playwright | Everything | Automated: sign up → preset → SSE bout → react → vote → share → leaderboard |

---

## Dependency graph (critical path)

```
0a,0b,0c (done)
    │
    ├─ 1 (health)
    ├─ 2 (user sync)
    └─ 3 (presets)
         │
         4 (run-bout) ◄── THE CRITICAL PATH
         │
    ┌────┼────┬────┐
    5    7    9   11
    │    │    │    │
    6    8   10   12
    │
    ├─ 13 (credits)
    │    │
    │   14 (stripe webhook)
    │    │
    │   15 (checkout)
    │
    ├─ 16,17,18,19,20 (discovery — parallel)
    │
    21 (landing)
    │
    22 (deploy)
    │
    23 (e2e)
```

**Critical path:** 3 → 4 → 5 → 6. Everything else fans out from a working bout. Unit 4 (`run-bout`) is the load-bearing commit — SSE streaming, LLM integration, turn loop, persistence. Biggest single unit, cannot be decomposed further without losing coherence.

---

## Estimates (agentic minutes)

| Phase | Units | Est. agent-minutes | Notes |
|-------|-------|--------------------|-------|
| 1: Foundation | 1–3 | 30–45 | Straightforward wiring |
| 2: The Bout | 4–6 | 90–120 | Unit 4 is 60–80 alone (SSE + LLM + persistence) |
| 3: Engagement | 7–12 | 60–90 | Six small atomic units |
| 4: Economy | 13–15 | 60–90 | Stripe webhook is fiddly but well-specified |
| 5: Discovery | 16–20 | 45–60 | Mostly UI, schema already exists |
| 6: Ship | 21–23 | 30–45 | Landing page + deploy + e2e |
| **Total** | **23 units** | **315–450** | ~5–7.5 agent-hours |
