# Phase 2 Artifact Manifest — What Was Stripped and What's Reusable

**Date:** 2026-03-10
**Context:** Strategic pivot from noopit (The Pit SaaS) to Phase 3 (composable agent tooling). This manifest documents what was removed from main and what patterns are worth carrying forward.
**Preserved at:** `phase2` branch, commit `5acd344` (274/274 green, phases 4+5 code-complete)

---

## Stripped (Pit-Specific)

### Product Code
| Path | What | Size | Reusable Pattern |
|------|------|------|-----------------|
| `lib/bouts/` | AI debate engine (turn loop, streaming, persistence) | ~80K | Multi-agent turn-taking pattern, streaming SSE architecture |
| `lib/credits/` | Credit economy (preauth, balance, catalog) | ~60K | Transactional debit/credit pattern with Stripe |
| `lib/auth/` | Clerk auth integration (mirror, middleware) | ~40K | Clerk→Drizzle user mirroring pattern |
| `lib/engagement/` | Reactions, sharing | ~40K | — |
| `lib/stripe/` | Stripe checkout, webhooks | ~50K | Stripe webhook verification + checkout flow |
| `lib/sharing/` | Bout sharing, OG images | ~30K | — |
| `lib/agents/` | Agent presets, prompt engineering | ~40K | Agent preset/config pattern |
| `lib/common/` | Shared utilities, API utils | ~60K | `api-utils.ts` error handling pattern (cited throughout AGENTS.md) |
| `app/` | Next.js 15 App Router pages | 88K | App Router + RSC patterns |
| `components/` | React components (arena, viewer, panels) | 68K | — |
| `db/` | Drizzle ORM schema + migrations | 20K | Drizzle schema-as-code pattern |
| `tests/` | 274 tests (vitest, co-located + integration) | 36K | Co-located test pattern, live DB test setup |
| `presets/` | Agent personality presets (JSON) | 16K | Structured agent config format |

### Plans & Specs
| Path | What | Reusable Pattern |
|------|------|-----------------|
| `SPEC.md` | Product spec — 12 tables, API contracts | Spec-as-contract format |
| `PLAN.md` | Implementation plan with completed table | Plan format with dependency tracking |
| `EVAL.md` | Success/failure criteria, confounds | Eval criteria format |
| `plans/01-19` | Per-unit implementation plans | Polecat plan file format (prime context) |
| `docs/decisions/E2-bout-engine-spec.md` | Bout engine detailed spec | — |
| `docs/decisions/epic-map.md` | Epic→unit decomposition | Epic decomposition format |

### Config
| Path | What |
|------|------|
| `drizzle.config.ts` | Drizzle ORM config (Neon connection) |
| `next.config.ts` | Next.js config |
| `postcss.config.mjs` | PostCSS/Tailwind |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Vitest config |
| `eslint.config.mjs` | ESLint flat config |
| `middleware.ts` | Clerk auth middleware |
| `package.json` / `pnpm-lock.yaml` | Node dependencies |
| `tasks.yaml` | Task tracking |
| `weaver-code-review-gemini31.md` | One-off review artifact |

### Data
| Path | What | Size |
|------|------|------|
| `data/alley/` | Darkcat Alley run data (diffs, reviews, metrics) | 6.9M |

---

## Reusable Patterns (Carry Forward)

### Architecture Patterns Worth Repeating
1. **Co-located tests** — `*.test.ts` beside the module. Simple, discoverable, enforced by convention.
2. **Polecat plan files** — Single markdown file IS the agent's prime context. Plan→execute→review. No interactive steering.
3. **DOMAIN.md per directory** — Architectural boundaries documented at the boundary.
4. **Spec-as-contract** — `SPEC.md` tables with exact types, enums, and API shapes. Agents implement to spec, not to vibes.
5. **api-utils.ts pattern** — Centralized error handling: every API route wraps in the same try/catch/response pattern. Cited as exemplar throughout AGENTS.md.
6. **Live DB test setup** — `tests/setup-env.ts` loads `.env` for vitest, enabling real DB integration tests alongside unit tests.
7. **Credit preauth pattern** — Reserve→use→release transactional model. Applicable to any resource economy.

### Governance Artifacts (KEPT — these are the product)
- `AGENTS.md` — Full governance system, standing orders, Signal notation
- `docs/internal/lexicon.md` — v0.26, 3rd distillation
- `docs/internal/slopodar.yaml` — 18 anti-patterns caught in the wild
- `docs/internal/layer-model.md` — 12-layer human-AI stack
- `docs/internal/session-decisions.md` — Full SD chain (SD-001 through SD-318)
- `docs/research/` — All research artifacts (taxonomy, priorities, convergence analyses)
- `docs/operator/` — Voice logs and transcripts
- `docs/weaver/` — Signal protocol PoC and reasoning tests
- `.claude/agents/` — All agent identity files
- `pitkeel/` — Session monitoring tool
- `midgets/` — Container POC (10/10 proven)
- `bin/` — Tooling (triangulate, qa-progress, etc.)
- `Makefile` + `mk/` — Polecat pipeline definitions
- `sites/oceanheart/` — Hugo site (CV, slopodar, research)

---

## What the Phase 2 Branch Contains (Frozen)

```
phase2 @ 5acd344
├── 274/274 green test suite
├── Next.js 15 + Drizzle ORM + Clerk + Stripe
├── 8 domain modules (bouts, credits, auth, engagement, stripe, sharing, agents, common)
├── 19 implementation plans
├── Full darkcat alley run data
├── Neon DB: noopit-dev branch (schema intact)
└── Complete commit history from SD-001
```

The code works. The tests pass. The product is parked, not abandoned. The governance system that built it is the actual output.
