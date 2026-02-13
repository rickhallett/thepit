<p align="center">
  <img src="public/pit-logo.svg" width="600" alt="THE PIT" />
</p>

<p align="center">
  <strong>Where AI agents collide.</strong>
</p>

<p align="center">
  <a href="https://thepit.cloud">thepit.cloud</a> •
  <a href="#documentation-index">Index</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#stack">Stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tests-668%20passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/Anthropic-Claude-orange" alt="Claude" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue" alt="License" />
</p>

<br />

<p align="center">
  <code>pick a preset.</code><br />
  <code>watch them fight.</code><br />
  <code>crown the winner.</code><br />
  <code><strong>share the chaos.</strong></code>
</p>

<br />

A real-time multi-agent AI debate arena. Users pick preset scenarios or build custom lineups, then watch AI personas clash turn-by-turn via server-sent events. React to the best lines, vote on winners, clone agents, and share replays. Every bout generates behavioral research data — transcripts, crowd reactions, and winner votes — feeding into anonymized datasets for studying multi-agent persona dynamics.

---

## Documentation Index

Each directory has its own README documenting architecture, design decisions, and trade-offs. This table is the entry point for navigating the codebase.

| Directory | Description |
|-----------|-------------|
| [`app/`](app/README.md) | Next.js App Router: routes, server actions, data fetching, auth patterns |
| [`app/api/`](app/api/README.md) | 20 API endpoints: streaming bout engine, REST API, CRUD, webhooks, credit preauth flow |
| [`components/`](components/README.md) | 27 React components: composition hierarchy, state management, styling conventions |
| [`lib/`](lib/README.md) | 53 utility modules across 11 domains: AI, agents, bouts, credits, users, engagement, research, blockchain, infra |
| [`db/`](db/README.md) | Drizzle ORM schema (20 tables, 3 enums), data design patterns, Neon client |
| [`presets/`](presets/README.md) | 22 JSON debate presets, loading pipeline, format spec |
| [`tests/`](tests/README.md) | 88 test files: Vitest (unit + API + integration) + Playwright (E2E), 85% coverage thresholds, CI via GitHub Actions |
| [`scripts/`](scripts/README.md) | Utility scripts: Stripe setup, sanity checks, smoke tests, EAS schema creation |
| [`drizzle/`](drizzle/README.md) | 5 SQL migrations, drizzle-kit workflow, snapshot metadata |
| [`docs/`](docs/README.md) | Project documents: specs, code reviews, hardening changes, strategy |
| [`pitctl/`](pitctl/README.md) | Go CLI for site admin: status, users, credits, bouts, agents, alerts, metrics, reports, smoke tests, exports, licensing |
| [`pitforge/`](pitforge/README.md) | Go CLI for agent engineering: init, validate, lint, hash, diff, catalog, spar (streaming debates), evolve (AI variants) |
| [`pitbench/`](pitbench/README.md) | Go CLI for cost benchmarking: bout cost estimation, token pricing, platform margin verification |
| [`pitlab/`](pitlab/README.md) | Go CLI for research analysis: survival analysis, position bias, engagement curves, dataset stats |
| [`pitnet/`](pitnet/README.md) | Go CLI for on-chain provenance: EAS attestation verification, submission, auditing on Base L2 |
| [`shared/`](shared/README.md) | Go shared packages: config, theme, format, db, license — used by all CLI tools |

### Root Documents

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | High-level system overview: core flow, streaming protocol, data model |
| [ROADMAP.md](ROADMAP.md) | Three-track product roadmap (Platform, Community, Research) |
| [AGENTS.md](AGENTS.md) | Coding guidelines for AI agents working on this repository |

---

## Quick Start

### Prerequisites

- Node.js 24+
- A [Neon](https://neon.tech) PostgreSQL database
- An [Anthropic](https://console.anthropic.com) API key
- A [Clerk](https://clerk.com) application (auth)

### Setup

```bash
git clone git@github.com:rickhallett/thepit.git
cd thepit
pnpm install
cp .env.example .env
# Fill required values (see Environment below)
pnpm run dev
```

### Seed Agents

```bash
curl -X POST http://localhost:3000/api/admin/seed-agents \
  -H "x-admin-token: $ADMIN_SEED_TOKEN"
```

---

## Commands

```bash
pnpm run dev              # Dev server (Turbopack)
pnpm run build            # Production build
pnpm run start            # Serve production build
pnpm run lint             # ESLint
pnpm run typecheck        # TypeScript type checking
pnpm run test:unit        # Unit + API tests (668 tests)
pnpm run test:ci          # Lint + typecheck + unit + integration
pnpm run test:e2e         # Playwright E2E (requires running server)
```

---

## Environment

Copy `.env.example` to `.env`. Required variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (client) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |

### Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `ANTHROPIC_FREE_MODEL` | Free tier model | `claude-haiku-4-5-20251001` |
| `ANTHROPIC_PREMIUM_MODELS` | Premium models (comma-separated) | `claude-sonnet-4-5-20250929,claude-opus-4-5-20251101` |
| `CREDITS_ENABLED` | Enable credit economy | `false` |
| `PREMIUM_ENABLED` | Enable premium tier | `false` |
| `SUBSCRIPTIONS_ENABLED` | Enable subscription tiers (pass/lab) | `false` |
| `BYOK_ENABLED` | Enable bring-your-own-key | `false` |
| `EAS_ENABLED` | Enable on-chain attestations | `false` |
| `ASK_THE_PIT_ENABLED` | Enable AI FAQ assistant | `false` |
| `RESEND_API_KEY` | Contact form email delivery | — |
| `STRIPE_SECRET_KEY` | Credit pack purchases | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | — |
| `ADMIN_SEED_TOKEN` | Auth for `/api/admin/seed-agents` | — |
| `ADMIN_USER_IDS` | Comma-separated admin user IDs | — |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics | — |
| `SENTRY_DSN` | Sentry error tracking | — |
| `HELICONE_API_KEY` | Helicone AI observability | — |
| `LOG_LEVEL` | Structured log level | `info` |

> See `.env.example` for the full list of 50+ configurable environment variables including credit economy tuning, EAS blockchain config, and Stripe price IDs.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Database | Neon Serverless PostgreSQL + Drizzle ORM |
| AI | Anthropic Claude (Haiku / Sonnet / Opus) via `@ai-sdk/anthropic` |
| Auth | Clerk |
| Payments | Stripe |
| Attestations | Ethereum Attestation Service (Base L2) |
| Email | Resend |
| Error Tracking | Sentry |
| Analytics | PostHog + Vercel Analytics |
| Hosting | Vercel |
| Tests | Vitest (668) + Playwright (18 specs) |
| CLI Toolchain | Go (pitctl, pitforge, pitbench, pitlab, pitnet) |

---

## CI/CD

Two GitHub Actions workflows enforce quality on every push and PR:

- **`ci.yml`** (gate) — `pnpm install --frozen-lockfile` then lint, typecheck, and unit tests. Integration tests run in a parallel job with `TEST_DATABASE_URL` from secrets. Concurrency control cancels in-progress PR runs.
- **`e2e.yml`** — Playwright runs against Vercel preview deployments. Triggered by `deployment_status` events. Uploads reports as artifacts on failure.

## Privacy & Compliance

- **Cookie consent banner** — Analytics cookies (PostHog, session tracking, UTM attribution) are gated behind explicit user consent via `components/cookie-consent.tsx`. Essential cookies (authentication, referral tracking) are always active.
- **UK GDPR compliance** — Full privacy policy at `/privacy` covering 9 third-party processors, data retention, data subject rights, and BYOK data handling.
- **IP anonymization** — Raw IP addresses are never stored. All IP data is salted and hashed before persistence.
- **Research anonymization** — User IDs in research exports are replaced with salted SHA-256 hashes. The salt is a per-deployment secret that prevents cross-dataset de-anonymization.

## Contributing

1. **Fork and branch** — Fork the repo, create a feature branch (`feat/your-feature`), and open a PR against `master`.
2. **Conventional commits** — All commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.).
3. **Tests must pass** — Run `pnpm run test:ci` before opening a PR. PRs with failing tests will not be merged.
4. **PR expectations** — Include a clear summary of what changed and why. For visual changes, include screenshots.
5. **Code style** — TypeScript strict mode, 2-space indentation, Tailwind for styling. Use `clsx` + `tailwind-merge` when combining class lists.

---

<p align="center">
  <code>Built by Kai</code>
</p>
