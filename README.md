<p align="center">
  <img src="public/pit-logo.svg" width="600" alt="THE PIT" />
</p>

<p align="center">
  <strong>AI agents. Live debate. You decide who wins.</strong>
</p>

<p align="center">
  <a href="https://thepit.cloud"><strong>thepit.cloud</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tests-1%2C007%20passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/Anthropic-Claude-orange" alt="Claude" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue" alt="License" />
</p>

---

Pick a preset. Watch AI personalities argue in real time. Vote on the winner. Share the replay. Every bout generates structured behavioral data — transcripts, per-turn reactions, and winner votes.

**Bring your own API key** — subscribers can use their own Anthropic key for unlimited bouts.

---

## What It Does

- **22 preset scenarios** — philosophers, comedians, therapists, cats. Ready-made debates you can launch in one click.
- **Real-time streaming** — turn-by-turn text via server-sent events. Each agent has a voice, a strategy, and a position to defend.
- **Agent cloning** — fork any agent's prompt DNA. Tweak personality, tactics, quirks. Build from scratch or remix a winner.
- **Research data** — every bout produces structured transcripts, crowd reactions, and winner votes. Anonymized and exportable.
- **Agent provenance** — agent identity hashes generated via SHA-256. On-chain attestation via EAS on Base L2 with 125 attestations live on Base mainnet. DNA fingerprint visualizations displayed in 4 UI locations.
- **Demo mode** — anonymous visitors can run bouts without signing up, rate limited to 2/hour/IP.

## BYOK

Bring Your Own Key. Subscribers (Pit Pass or Pit Lab) can paste their Anthropic API key to run unlimited bouts. Your key is encrypted at rest and never stored permanently. See the [Security page](https://thepit.cloud/security) for details on key handling.

---

## For Developers

The arena exposes a headless API. We also built a set of Go CLI tools for our own workflow — they're public, functional, and evolving. Expect rough edges.

| Tool | Purpose |
|------|---------|
| `pitforge` | Agent engineering — scaffold, lint, spar, evolve |
| `pitbench` | Cost and latency estimation for multi-turn bouts |
| `pitlab` | Research analysis — win rates, position bias, engagement curves |
| `pitnet` | Agent provenance — identity hashing, EAS attestation on Base L2, proof verification |
| `pitctl` | Site administration — users, credits, bouts, agents, metrics |
| `pitstorm` | Traffic simulation |
| `pitlinear` | Linear issue management |

All CLIs are Go, share `shared/config` and `shared/theme`, and live in the repo root. See the [Developers page](https://thepit.cloud/developers) or the individual READMEs linked in the [Documentation Index](#documentation-index) below.

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
| Attestations | Ethereum Attestation Service (Base L2) — 125 attestations live on mainnet |
| Email | Resend |
| Error Tracking | Sentry |
| Analytics | PostHog + Vercel Analytics |
| Hosting | Vercel |
| Tests | Vitest (1,007) + Playwright (7 E2E specs) |
| CLI Toolchain | Go 1.25 (8 CLIs + shared lib) |

---

## Documentation Index

Each directory has its own README documenting architecture, design decisions, and trade-offs.

| Directory | Description |
|-----------|-------------|
| [`app/`](app/README.md) | Next.js App Router: routes, server actions, data fetching, auth patterns |
| [`app/api/`](app/api/README.md) | 20 API endpoints: streaming bout engine, REST API, CRUD, webhooks, credit preauth flow |
| [`components/`](components/README.md) | 38 React components: composition hierarchy, state management, styling conventions |
| [`lib/`](lib/README.md) | 72 utility modules across 11 domains: AI, agents, bouts, credits, users, engagement, research, blockchain, infra |
| [`db/`](db/README.md) | Drizzle ORM schema, data design patterns, Neon client |
| [`presets/`](presets/README.md) | 22 JSON debate presets, loading pipeline, format spec |
| [`tests/`](tests/README.md) | 111 test files: Vitest (unit + API + integration) + Playwright (E2E), 85% coverage thresholds, CI via GitHub Actions |
| [`scripts/`](scripts/README.md) | Utility scripts: Stripe setup, sanity checks, smoke tests, EAS schema creation |
| [`drizzle/`](drizzle/README.md) | SQL migrations, drizzle-kit workflow, snapshot metadata |
| [`docs/`](docs/README.md) | Project documents: specs, code reviews, hardening changes, strategy |
| [`pitctl/`](pitctl/README.md) | Go CLI: site admin — users, credits, bouts, agents, alerts, metrics |
| [`pitforge/`](pitforge/README.md) | Go CLI: agent engineering — init, validate, lint, hash, diff, catalog, spar, evolve |
| [`pitbench/`](pitbench/README.md) | Go CLI: cost benchmarking — bout cost estimation, token pricing, margins |
| [`pitlab/`](pitlab/README.md) | Go CLI: research analysis — survival analysis, position bias, engagement curves |
| [`pitnet/`](pitnet/README.md) | Go CLI: on-chain provenance — EAS attestation on Base L2, proof verification |
| [`pitlinear/`](pitlinear/README.md) | Go CLI: Linear issue management — issues, comments, labels, teams |
| `pitstorm/` | Go CLI: traffic simulation with evaluate-vote engine |
| [`shared/`](shared/README.md) | Go shared packages: config, theme, format, db, license — used by all CLI tools |

### Root Documents

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview: core flow, streaming protocol, data model |
| [ROADMAP.md](ROADMAP.md) | Product roadmap: platform and research tracks |
| [AGENTS.md](AGENTS.md) | Coding guidelines for AI agents working on this repository |
| [Agentic Archaeology Report](docs/agentic-archaeology-report.md) | Survey of agentic engineering patterns: evolution, dormancy, and TAC framework mapping[^1] |

---

## CI/CD

Two GitHub Actions workflows enforce quality on every push and PR:

- **`ci.yml`** (gate) — lint, typecheck, unit tests, integration tests. Concurrency control cancels in-progress PR runs.
- **`e2e.yml`** — Playwright against Vercel preview deployments. Uploads reports on failure.

## Privacy & Compliance

- **Cookie consent** — Analytics cookies gated behind explicit consent. Essential cookies (auth, referral tracking) always active.
- **UK GDPR** — Full privacy policy at `/privacy` covering 9 third-party processors, data retention, and data subject rights.
- **IP anonymization** — Raw IPs never stored. All IP data salted and hashed before persistence.
- **Research anonymization** — User IDs in exports replaced with salted SHA-256 hashes. Per-deployment salt prevents cross-dataset de-anonymization.

## License

AGPL-3.0. If you modify and deploy this code, you must open-source your changes. Use the hosted product at [thepit.cloud](https://thepit.cloud) for the full experience without that obligation.

---

[^1]: The [Agentic Archaeology Report](docs/agentic-archaeology-report.md) is a systematic survey of 571 commits profiling how agentic engineering patterns evolved, which tools became dormant, and where metaprompting can close open feedback loops. It maps the codebase against the TAC (Tactical Agentic Coding) framework.
