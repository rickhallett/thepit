---
title: "The Pit - Platform Infrastructure Roadmap"
category: plan
status: active
created: 2026-04-01
author: weaver
supersedes: docs/deep-archive/2026-04-01-run-pipeline-abandoned/roadmap-m1-m3-abandoned.md
---

# The Pit - Platform Infrastructure Roadmap

## Governing constraint

The Pit is a multi-agent debate arena. The product exists and works:
streaming engine, credit economy, agent builder, shareable replays,
voting, leaderboard, arena presets, BYOK, custom arenas. 24 tables,
21 API routes, 1,289 tests.

This roadmap sequences the remaining Platform lane work from the
public roadmap. Nothing here invents new product direction. Each
epic extends or hardens what already ships.

## Epics

Four epics. Sequenced by dependency and risk. Each epic contains
issues suitable for the 1-PR-per-concern workflow.

---

### Epic 1 - Platform Hardening

**Goal:** Fix known bugs and close audit items in the existing
foundation before building on it.

**Why first:** Termites in the hull. These are risks to what
already ships. New features built on a cracked foundation inherit
the cracks.

**Depends on:** Nothing. Start immediately.

#### Stories

| # | Title | Type | Estimate |
|---|-------|------|----------|
| 131 | Fix adversarial review findings (migrations, auth, eval selection) | bug | 45-60 agent-min |
| 58 | Per-turn timeout for bout engine streamText calls | feature | 30-45 agent-min |
| 59 | Timeout tests for streaming turn loop | test | 20-30 agent-min |
| 60 | Classify AI SDK timeout errors in onError handler | feature | 20-30 agent-min |
| 17 | Rate limiter serverless state sharing audit | audit | 45-60 agent-min |
| 19 | Blockchain attestation verification gaps audit | audit | 30-45 agent-min |

#### Gate

All existing tests pass. Identified bugs fixed or explicitly
deferred with documented rationale in the issue.

---

### Epic 2 - Ask The Pit (QA and Finish)

**Goal:** Bring Ask The Pit from 75% to production-ready and
enable it publicly.

**Why second:** The feature is mostly built (API, component,
config, tests). Finishing it is high-value for low cost and
demonstrates the "AI-powered FAQ" roadmap item as shipped.

**Depends on:** Epic 1 (hardening, especially #131 if it touches
auth paths Ask The Pit uses).

**Current state:**
- API route: complete, well-secured, prompt-cached
- Client UI: functional modal chat, but error messages are vague
- Config: feature-flagged OFF by default
- Tests: API + config covered, no e2e, no integration for doc
  loading or path traversal

#### Stories

| Title | Type | Estimate |
|-------|------|----------|
| QA pass: manual testing against checklist (see below) | qa | 30 agent-min |
| Improve client error messaging (rate limit, network, disabled) | fix | 20-30 agent-min |
| Add e2e test (click button, type question, verify response) | test | 30-45 agent-min |
| Add integration tests (doc loading, path traversal guard, section stripping) | test | 20-30 agent-min |
| Expand documentation sources (add FAQ, API guide, architecture overview) | feature | 20-30 agent-min |
| Enable feature flag in production | chore | 5 agent-min |
| Update roadmap page: mark Ask The Pit as shipped | chore | 5 agent-min |

**QA checklist:**
- Feature flag off: button does not appear
- Feature flag on: button appears and responds
- Rate limit (5/min) enforced correctly
- Rate limit response is clear to user
- Documentation sections load correctly
- Sensitive data (Environment section) stripped
- Path traversal attempts blocked
- Long messages (2000 chars) work
- Over-length messages (2001 chars) rejected
- Empty messages rejected
- Network disconnection handled gracefully
- API errors (503, etc.) show appropriate message
- Streaming response displays real-time
- Scrolling works during streaming
- Multiple conversations in same session work
- Security prompt followed (does not reveal raw docs or env vars)
- Response time acceptable (<5s typical)
- LangSmith traces appear correctly (if enabled)

#### Gate

Feature flag enabled in production. QA checklist green. E2e test
passing in CI.

---

### Epic 3 - Vercel AI Gateway and Multi-Model Routing

**Goal:** BYOK users can access any supported LLM via Vercel AI
Gateway. Arena supports per-agent model selection.

**Why third:** Extends the existing BYOK infrastructure (which
already works for Anthropic and OpenRouter). High hiring signal --
demonstrates production AI SDK integration and multi-provider
routing.

**Depends on:** Epic 1 (hardening).

#### Stories

| # | Title | Type | Estimate |
|---|-------|------|----------|
| 13 | Vercel AI Gateway integration (BYOK multi-provider) | feature | 60-90 agent-min |
| new | Multi-model routing: per-agent model selection in arena builder | feature | 45-60 agent-min |
| new | Update roadmap page: mark AI Gateway and multi-model routing as shipped | chore | 5 agent-min |

#### Gate

BYOK user can select from multiple providers. Per-agent model
selection works in custom arena builder. Existing BYOK Anthropic
and OpenRouter flows unbroken. Tests cover provider routing.

---

### Epic 4 - Tournament Brackets

**Goal:** Elimination-style multi-round events where agents
compete in structured brackets. Single-elimination first.
Double-elimination and round-robin are future extensions.

**Why fourth:** Builds on the existing bout infrastructure.
Highest-complexity new feature. Strong portfolio signal -- shows
state machine design, multi-bout orchestration, and real-time UI
at scale. Highest combined hiring + social ROI of remaining items.

**Depends on:** Epic 1 (hardening). Architecturally independent
of Epics 2-3.

**Integration point:** `BoutContext.onBoutCompleted` hook wires
tournament round advancement into the existing bout engine.
No changes to bout-validation or bout-execution internals.

#### Phase 1 - Data Model and State Machine

| # | Title | Type | Estimate | Notes |
|---|-------|------|----------|-------|
| 14 | Tournament schema: tournaments, rounds, matches tables | feature | 45-60 agent-min | 3 new Drizzle tables. `tournaments` (id, ownerId, name, status enum, bracketSize, config JSONB, timestamps). `tournament_rounds` (id, tournamentId, roundNumber, status). `tournament_matches` (id, roundId, boutId FK nullable, seedPosition, agent1Id, agent2Id, winnerId nullable, status enum). Migration + seed. |
| new | Tournament state machine (lib/tournaments.ts) | feature | 60-90 agent-min | Lifecycle: draft -> seeding -> running -> completed / cancelled. Round advancement: when all matches in a round are resolved, generate next round matches from winners. Validate bracket size is power of 2 (4, 8, 16). Seeding: random or manual. Handle byes for odd counts by rounding up to next power of 2. |
| new | Tournament credit model | feature | 30-45 agent-min | Preauthorize full tournament cost at creation (bracketSize - 1 bouts). Settle per-bout as each completes. Refund unplayed bouts on cancellation. Extend `estimateBoutCostGbp` with `estimateTournamentCostGbp(bracketSize, modelId, maxTurns)`. |

**Phase 1 gate:** Can create a tournament in the DB, seed agents,
and advance through rounds in unit tests. No UI, no API yet.

#### Phase 2 - API and Orchestration

| # | Title | Type | Estimate | Notes |
|---|-------|------|----------|-------|
| new | Tournament API routes | feature | 45-60 agent-min | `POST /api/tournaments` (create + seed). `GET /api/tournaments/[id]` (bracket state). `POST /api/tournaments/[id]/start` (begin round 1). `POST /api/tournaments/[id]/cancel`. Auth-gated: owner or admin. |
| new | Tournament bout orchestration | feature | 45-60 agent-min | On `start`: create bout rows for round 1 matches, each with `onBoutCompleted` hook wired to `advanceTournamentRound()`. After voting window closes (configurable, default 5 min), tally votes and resolve match winner. If all matches in round resolved, generate next round and create next bouts. Use existing `buildArenaPresetFromLineup()` to construct per-match presets from the two competing agents. |
| new | Voting window and auto-resolution | feature | 30-45 agent-min | Tournament matches need a bounded voting window (unlike regular bouts which accumulate votes indefinitely). After window expires, highest vote count wins. Ties broken by: (a) agent with fewer total tournament wins advances (underdog rule), (b) coin flip if still tied. Vercel Cron checks for expired voting windows every 60s. |

**Phase 2 gate:** Can create, start, and complete a tournament
via API. Round advancement works end-to-end. Voting window
resolves matches correctly. Integration tests cover the full
lifecycle including cancellation refunds.

#### Phase 3 - UI

| # | Title | Type | Estimate | Notes |
|---|-------|------|----------|-------|
| new | Tournament bracket display component | feature | 60-90 agent-min | `/tournaments/[id]` page. SVG or CSS grid bracket visualization. Show match status (pending, live, completed), agent names, vote counts, winner highlight. Responsive: horizontal bracket on desktop, vertical list on mobile. Reuse existing agent color/avatar system. |
| new | Tournament creation flow | feature | 45-60 agent-min | `/tournaments/new` page. Select agents from existing agent pool (user-created + preset agents). Set bracket size, topic, model tier, voting window duration. Credit cost preview before confirm. Reuse arena builder agent selection UI patterns. |
| new | Tournament live updates | feature | 30-45 agent-min | Polling (30s interval) for bracket state on the tournament page. When a match is live, link to the bout page for real-time streaming. When a match resolves, animate the winner advancing in the bracket. |
| new | Tournament listing and history | feature | 20-30 agent-min | `/tournaments` index page. Active tournaments, recent results. Link from user profile (future) and leaderboard. |
| new | Update roadmap page: mark tournament brackets as shipped | chore | 5 agent-min | |

**Phase 3 gate:** Full user flow: create tournament, watch bouts,
vote on matches, see bracket advance, view final results. Mobile
responsive. No JS errors in bracket rendering for 4/8/16 sizes.

#### Architecture Decisions

- **Single-elimination only (v1).** Double-elimination and
  round-robin are scope creep. Ship the simplest bracket format
  that demonstrates the system design.
- **Polling, not websockets.** 30s polling is good enough for
  bracket updates. Bouts already stream via SSE. Adding a second
  real-time channel for bracket state is not justified yet.
- **Reuse bout engine, don't fork it.** Tournaments create
  standard bouts. The `onBoutCompleted` hook is the only
  integration surface. If the hook is missed (serverless cold
  start, error), the cron job picks up unresolved matches.
- **Voting window is mandatory for tournaments.** Regular bouts
  let votes accumulate forever. Tournament matches need bounded
  resolution to advance the bracket.
- **Credit preauth at tournament level.** One upfront charge
  covers all bouts. Per-bout settlement adjusts actuals. Avoids
  mid-tournament "insufficient credits" failures.
- **Bracket sizes: 4, 8, 16.** Power-of-2 only in v1. Byes for
  odd agent counts fill to next power of 2.

#### Risks

- **Voting engagement.** If nobody votes on a match, the
  auto-resolution picks a winner by tie-break rules. This is
  correct but unsatisfying. Mitigant: allow tournament creator to
  cast deciding vote, or use evaluator LLM as fallback judge.
- **Bout failures mid-tournament.** If a bout errors out, the
  match needs manual resolution or the non-erroring agent
  advances by default. The `onBoutCompleted` hook receives error
  status -- handle it in the state machine.
- **Cron reliability.** Vercel Crons are best-effort with ~60s
  granularity. Acceptable for voting window resolution. Not
  acceptable if sub-second advancement matters (it doesn't for
  v1).

#### Estimate

| Phase | Stories | Estimate |
|-------|---------|----------|
| 1 - Data model + state machine | 3 | 2.5-3.5 agent-hours |
| 2 - API + orchestration | 3 | 2-3 agent-hours |
| 3 - UI | 5 | 3-4 agent-hours |
| **Total** | **11** | **7.5-10.5 agent-hours** |

---

## Sequencing Summary

```
Epic 1: Platform Hardening (start immediately)
  |
  +---> Epic 2: Ask The Pit (QA + finish)
  |
  +---> Epic 3: AI Gateway + Multi-Model Routing
  |
  +---> Epic 4: Tournament Brackets
```

Epics 2-4 can proceed in parallel after Epic 1 clears. Within
each epic, stories are sequential unless noted otherwise.

**Recommended serial order if single-agent execution:**
Epic 1 -> Epic 2 -> Epic 3 -> Epic 4

**Parallelism opportunities:**
- Epic 2 and Epic 3 are independent of each other
- Epic 4 backend and Epic 3 can overlap

## Estimation

| Epic | Stories | Estimate |
|------|---------|----------|
| 1 - Hardening | 6 | 3-5 agent-hours |
| 2 - Ask The Pit | 7 | 2-3 agent-hours |
| 3 - AI Gateway | 3 | 2-3 agent-hours |
| 4 - Tournaments | 11 | 7.5-10.5 agent-hours |
| **Total** | **27** | **14.5-20.5 agent-hours** |

---

## Issue Hygiene

Closed as not planned (2026-04-01):
- #18 (duplicate of #58)
- #102, #104, #106, #109 (M1.x run pipeline abandoned)

Archived:
- `docs/roadmap.md` -> `docs/deep-archive/2026-04-01-run-pipeline-abandoned/`

Existing issues retained:
- #131, #58, #59, #60, #17, #19, #13, #14

New issues to create:
- Ask The Pit stories (Epic 2, ~7 issues)
- Multi-model routing (Epic 3, 1 issue)
- Tournament phase 1: schema, state machine, credits (Epic 4, 3 issues)
- Tournament phase 2: API, orchestration, voting window (Epic 4, 3 issues)
- Tournament phase 3: bracket UI, creation flow, live updates, listing (Epic 4, 4 issues)
- Roadmap page updates (1 per epic, 4 issues)

Total new issues: ~22
