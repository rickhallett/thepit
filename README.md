# The Pit

![CI](https://github.com/rickhallett/thepit/actions/workflows/ci.yml/badge.svg)

A multi-agent AI evaluation platform. Structured contests between agent configurations with observable traces, explicit scoring, failure tagging, and cost visibility. Built to make agent performance legible, comparable, governable, and economically inspectable.

Define tasks, run agent configurations against them, evaluate outputs with explicit rubrics, record failures by taxonomy, and inspect cost and latency per run. Real-time streaming via SSE, side-by-side comparisons, trace replay, and audit logs.

**1,289 tests | 96% coverage | TypeScript strict | zero lint errors**

Live at [thepit.cloud](https://thepit.cloud).

## What This Proves

The Pit operates on two layers:

1. **In-product governance** - how agents inside the platform are constrained, evaluated, and compared
2. **On-product governance** - how development itself is measured, reviewed, and traceable

Seven skill domains demonstrated end-to-end:
- Specification precision
- Evaluation and quality judgment
- Decomposition and orchestration
- Failure pattern recognition
- Trust and guardrail design
- Context architecture
- Token and cost economics

The development process is itself an instrumented agentic system - spec-first tasks, evaluated changes, failure taxonomy on build, context versioning, and cost logging. Portfolio evidence comes from real traces, not retrospective storytelling.

## Quick Start

```bash
# prerequisites: node 22+, pnpm, neon postgres (or local pg)
cp .env.example .env   # fill in Clerk, Stripe, Neon, AI provider keys
pnpm install
pnpm run dev            # http://localhost:3000
```

Standard tooling works without the Go CLI layer or the governance infrastructure.

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

## Architecture

```
app/                    Next.js 16 app router (30+ routes)
lib/                    Domain modules (flat files: credits.ts, bout-engine.ts, auth, agents, etc.)
  lib/api-utils.ts      Standardised API response/error handling
  lib/ai.ts             Multi-provider AI SDK configuration
drizzle/                Schema, migrations
components/             React components (shadcn/ui base)
tests/                  Unit, integration, API, E2E, and simulation tests
docs/
  the-pit-spec.md       Product and portfolio specification
  the-pit-skills-and-governance-notes.md
```

## Testing

```bash
pnpm run test           # 1,289 tests, ~20s
pnpm run typecheck      # strict mode, zero errors
pnpm run lint           # ESLint, zero errors
```

The gate (typecheck + lint + test) must pass before any merge.

## Optional CLI Toolchain

Nine Go binaries for orchestration, admin, and dev tooling. These are supplementary - the application runs without them.

```
pitstorm/               Debate orchestration CLI
pitctl/                 Admin operations
pitforge/               Agent prompt engineering
pitlab/                 Local dev environment
pitnet/                 Network diagnostics
pitbench/               Performance benchmarking
piteval/                Evaluation tooling
pitlinear/              Linear workflow automation
pitkeel/                Developer telemetry and session tracking
```

## Development History

This repository consolidates three development phases via subtree merge, preserving full git history (1,100+ commits):

**Phase 1 - Product Build** (Feb-Mar 2026): The application. Next.js 16 with authentication, payments, real-time debate streaming, agent management, credit economy, and full test coverage.

**Phase 2 - Governance Evolution** (Mar 2026): Operational controls for multi-agent development. Session decision chain (321 decisions), verification pipeline, pitkeel rewrite in Python.

**Phase 3 - Validation** (Mar 2026): Cross-model adversarial review, slop failure modes taxonomy (49 entries), container-based agent isolation, and a 12-chapter systems engineering bootcamp.

**Current direction:** Multi-agent debate arena with real-time streaming, agent identity (DNA hashing, on-chain attestation), credit economy, and community features. Platform infrastructure: AI gateway for multi-provider BYOK, tournament brackets. The dual-layer governance thesis (in-product and on-product) continues as the engineering methodology, not a product feature.

The agentic infrastructure (adversarial review pipeline, anti-pattern detection, session governance) lives in `docs/internal/` and supporting tooling. The interesting finding: sycophantic drift - agents performing honesty while being dishonest about their confidence - is harder to catch than hallucination, because it passes every surface-level check.

The pilot study (Phase 1-2) has its own repo with [420 PRs of engineering history](https://github.com/rickhallett/thepit-pilot/pulls?q=is%3Apr+is%3Amerged) - review descriptions, adversarial review findings, and the full decision chain.

The Pit is not just an agentic product. It is an instrumented environment for building, evaluating, and demonstrating agentic engineering competence in public.

## License

Private. All rights reserved.

Richard Hallett - [oceanheart.ai](https://oceanheart.ai)
