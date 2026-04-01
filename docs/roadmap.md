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

Five epics. Sequenced by dependency and risk. Each epic contains
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
compete in structured brackets.

**Why fourth:** Builds on the existing bout infrastructure.
Highest-complexity new feature. Strong portfolio signal -- shows
system design at scale.

**Depends on:** Epic 1 (hardening). Architecturally independent
of Epics 2-3.

#### Stories

| # | Title | Type | Estimate |
|---|-------|------|----------|
| 14 | Tournament data model: brackets, rounds, seeding, progression | feature | 60-90 agent-min |
| new | Tournament execution engine: schedule bouts, advance winners | feature | 60-90 agent-min |
| new | Tournament API: create, seed, progress, results | feature | 45-60 agent-min |
| new | Tournament UI: bracket display, seeding, live progress, results | feature | 60-90 agent-min |
| new | Update roadmap page: mark tournament brackets as shipped | chore | 5 agent-min |

#### Gate

Can create a tournament, seed agents, run elimination rounds,
advance winners, display bracket and results. Bout engine
integration tested. Credit accounting correct for multi-bout
tournaments.

---

### Epic 5 - Spectator Chat

**Goal:** Live commentary during streaming bouts. Viewers can
discuss while watching.

**Why last:** Socially valuable but not structurally critical.
Builds on existing SSE streaming infrastructure. Can be descoped
if time is better spent elsewhere.

**Depends on:** Nothing structurally, but sequenced last by
priority.

#### Stories

| Title | Type | Estimate |
|-------|------|----------|
| Spectator chat data model: messages, participants, bout association | feature | 30-45 agent-min |
| Spectator chat backend: WebSocket or SSE channel per bout | feature | 45-60 agent-min |
| Spectator chat UI: embedded chat panel during live bouts | feature | 45-60 agent-min |
| Moderation: basic rate limiting, content filtering | feature | 30-45 agent-min |
| Update roadmap page: mark spectator chat as shipped | chore | 5 agent-min |

#### Gate

Spectators can post live comments during a streaming bout.
Messages appear in real-time for all viewers. Rate-limited and
filtered.

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
  |
  +---> Epic 5: Spectator Chat (lowest priority)
```

Epics 2-5 can proceed in parallel after Epic 1 clears. Within
each epic, stories are sequential unless noted otherwise.

**Recommended serial order if single-agent execution:**
Epic 1 -> Epic 2 -> Epic 3 -> Epic 4 -> Epic 5

**Parallelism opportunities:**
- Epic 2 and Epic 3 are independent of each other
- Epic 4 backend and Epic 3 can overlap
- Epic 5 has no structural dependencies

## Estimation

| Epic | Stories | Estimate |
|------|---------|----------|
| 1 - Hardening | 6 | 3-5 agent-hours |
| 2 - Ask The Pit | 7 | 2-3 agent-hours |
| 3 - AI Gateway | 3 | 2-3 agent-hours |
| 4 - Tournaments | 5 | 4-6 agent-hours |
| 5 - Spectator Chat | 5 | 3-4 agent-hours |
| **Total** | **26** | **14-21 agent-hours** |

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
- Tournament execution, API, UI (Epic 4, 3 issues)
- Spectator chat stories (Epic 5, 4 issues)
- Roadmap page updates (1 per epic, 5 issues)

Total new issues: ~20
