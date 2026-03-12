# The Pit

A real-time AI debate arena. Language models argue structured debates while the platform generates behavioural data, tracks agent lineage, and lets users vote on outcomes.

Users pick debate presets (16 formats), watch agents argue in real-time via SSE, vote on winners, and react to individual turns. Agent cloning, DNA hashing, credit economy, demo mode, BYOK for subscribers.

Live at [thepit.cloud](https://thepit.cloud).

## Quick Start

```bash
# prerequisites: node 22+, pnpm, neon postgres (or local pg)
cp .env.example .env   # fill in Clerk, Stripe, Neon, AI provider keys
pnpm install
pnpm run dev            # http://localhost:3000
```

## Stack

- **Runtime:** Next.js 16, TypeScript (strict), React 19
- **Database:** Neon Postgres, Drizzle ORM (22 tables)
- **Auth:** Clerk (SSO, role-based access)
- **Payments:** Stripe (subscriptions, credit purchases, webhooks)
- **AI:** Vercel AI SDK (multi-provider: OpenAI, Anthropic, Google, xAI)
- **Testing:** Vitest (1,289 unit/integration tests, 96% coverage), Playwright (E2E)
- **Monitoring:** Sentry, PostHog
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **CLI tools:** 8 Go binaries (pitstorm, pitctl, pitforge, pitlab, pitnet, pitbench, pitlinear, pitkeel)

## Architecture

```
app/                    Next.js 16 app router (30+ routes)
lib/                    Domain modules (flat files: credits.ts, bout-engine.ts, auth, agents, etc.)
  lib/api-utils.ts      Standardised API response/error handling
  lib/ai.ts             Multi-provider AI SDK configuration
drizzle/                Schema, migrations
components/             React components (shadcn/ui base)
pitstorm/               Go - debate orchestration CLI
pitctl/                 Go - admin operations
pitforge/               Go - agent prompt engineering
pitlab/                 Go - local dev environment
pitnet/                 Go - network diagnostics
pitbench/               Go - performance benchmarking
pitlinear/              Go - linear workflow automation
pitkeel/                Go - developer telemetry and session tracking
```

Tests live in `tests/` with subdirectories for unit, integration, API, E2E, and simulation tests.

## Testing

```bash
pnpm run test           # 1,289 tests, ~20s
pnpm run typecheck      # strict mode, zero errors
pnpm run lint           # ESLint, zero errors
```

The gate (typecheck + lint + test) must pass before any merge.

## Development History

This repository consolidates three development phases via subtree merge, preserving full git history (1,100+ commits):

**Phase 1 - Product Build** (Feb-Mar 2026): The application. Next.js 16 with authentication, payments, real-time debate streaming, agent management, credit economy, and full test coverage.

**Phase 2 - Governance Evolution** (Mar 2026): Operational controls for multi-agent development. Session decision chain (321 decisions), verification pipeline, pitkeel rewrite in Python.

**Phase 3 - Validation** (Mar 2026): Cross-model adversarial review, slop failure modes taxonomy (43 entries), container-based agent isolation, and a 12-chapter systems engineering bootcamp.

The agentic infrastructure (adversarial review pipeline, anti-pattern detection, session governance) lives in `docs/internal/` and supporting tooling. The interesting finding: sycophantic drift - agents performing honesty while being dishonest about their confidence - is harder to catch than hallucination, because it passes every surface-level check.

The pilot study (Phase 1-2) has its own repo with [420 PRs of engineering history](https://github.com/rickhallett/thepit-pilot/pulls?q=is%3Apr+is%3Amerged) - review descriptions, adversarial review findings, and the full decision chain.

## License

Private. All rights reserved.

Richard Hallett - [oceanheart.ai](https://oceanheart.ai)
