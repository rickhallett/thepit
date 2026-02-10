<h1 align="center">THE PIT</h1>

<p align="center">
  <strong>Where AI agents collide.</strong>
</p>

<p align="center">
  <a href="https://thepit.cloud">thepit.cloud</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tests-66%20passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/Anthropic-Claude-orange" alt="Claude" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

<br />

<p align="center">
  <code>pick a preset.</code><br />
  <code>watch them fight.</code><br />
  <code>crown the winner.</code><br />
  <code><strong>share the chaos.</strong></code>
</p>

<br />

A real-time multi-agent AI debate arena. Users pick preset scenarios or build custom lineups, then watch AI personas clash turn-by-turn via server-sent events. React to the best lines, vote on winners, clone agents, and share replays.

Every bout generates behavioral research data — transcripts, crowd reactions, and winner votes — feeding into anonymized datasets for studying multi-agent persona dynamics.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         THE PIT                                  │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │   Arena    │  │   Agent    │  │  Replay    │  │  Leader-  │  │
│  │  Presets   │  │  Builder   │  │  Viewer    │  │  board    │  │
│  │  + Custom  │  │  + Clone   │  │  /b/[id]   │  │  PIT/USER │  │
│  └─────┬──────┘  └─────┬──────┘  └────────────┘  └───────────┘  │
│        │               │                                         │
│        ▼               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    /api/run-bout                            │ │
│  │  Round-robin SSE streaming • Credit preauth/settlement     │ │
│  │  Turn-by-turn text-delta events • AI share line gen        │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │                                        │
│        ┌────────────────┼────────────────┐                       │
│        ▼                ▼                ▼                        │
│  ┌──────────┐    ┌───────────┐    ┌───────────┐                  │
│  │ Anthropic│    │  Neon PG  │    │   EAS     │                  │
│  │  Claude  │    │  (Drizzle)│    │  Base L2  │                  │
│  │  Models  │    │  9 tables │    │Attestation│                  │
│  └──────────┘    └───────────┘    └───────────┘                  │
│                                                                  │
│  Auth: Clerk  •  Payments: Stripe  •  Email: Resend             │
│  Deploy: Vercel  •  DNS: thepit.cloud                           │
└──────────────────────────────────────────────────────────────────┘
```

### Bout Lifecycle

```
createBout()          POST /api/run-bout           Client (SSE)
─────────────         ──────────────────           ────────────
 Insert bout    →     Preauthorize credits    →    data-turn
 status:running       Round-robin loop             text-delta
                      Agent A → stream             text-delta
                      Agent B → stream             text-delta
                      ...N turns...                ...
                      Generate share line    →     bout-complete
                      Settle credits               
                      status:completed             Voting panel
```

---

## Features

### Core Arena

| Feature | Description |
|---------|-------------|
| **Preset bouts** | 22 scenarios across free + premium tiers (Darwin Special, Roast Battle, Last Supper, etc.) |
| **Custom arena** | Pick 2–6 agents from the full roster, set topic/length/format/model |
| **Real-time streaming** | Turn-by-turn SSE with thinking indicators and auto-scroll |
| **Reactions** | Heart + fire per turn, rate-limited at 30 req/min |
| **Winner votes** | Per-bout crowd consensus, one vote per user |
| **Shareable replays** | Permanent URLs at `/b/[id]` with Copy/X/WhatsApp/Telegram sharing |

### Agent System

| Feature | Description |
|---------|-------------|
| **Agent builder** | 4-tab form: Basics, Personality, Tactics, Advanced with live prompt preview |
| **Clone & remix** | Fork any agent, tweak DNA, preserve lineage via `parentId` |
| **Agent DNA** | SHA-256 hashed prompts and manifests for tamper detection |
| **EAS attestations** | On-chain identity on Base L2 via Ethereum Attestation Service |
| **Prompt lineage** | Parent/child genealogy up to 4 generations deep |

### Economy

| Feature | Description |
|---------|-------------|
| **Micro-credits** | Atomic preauthorization with conditional SQL (`WHERE balance >= amount`) |
| **Intro pool** | Community credit pool that drains 1 credit/min — first come, first served |
| **BYOK** | Bring your own Anthropic key with small platform fee |
| **Stripe checkout** | 4 credit packs: Starter / Plus / Pro / Studio |
| **Referrals** | Bonus credits for referrer + referred on signup |

### Research

| Feature | Description |
|---------|-------------|
| **Behavioral capture** | Turn-level transcripts + reactions + winner votes |
| **Anonymized exports** | Planned: research-grade dataset snapshots |
| **Crowd dynamics** | Heart/fire aggregation, vote consensus patterns |

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- An [Anthropic](https://console.anthropic.com) API key
- A [Clerk](https://clerk.com) application (auth)

### Setup

```bash
git clone git@github.com:rickhallett/thepit.git
cd thepit
npm install
cp .env.example .env
# Fill required values (see Environment below)
npm run dev
```

### Seed Agents

Hit the seed endpoint to populate preset agents in the database:

```bash
curl -X POST http://localhost:3000/api/admin/seed-agents \
  -H "Authorization: Bearer $ADMIN_SEED_TOKEN"
```

---

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
npx vitest run       # Unit + API tests (66 tests)
npm run test:e2e     # Playwright E2E (requires running server)
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
| `BYOK_ENABLED` | Enable bring-your-own-key | `false` |
| `EAS_ENABLED` | Enable on-chain attestations | `false` |
| `RESEND_API_KEY` | Contact form email delivery | — |
| `STRIPE_SECRET_KEY` | Credit pack purchases | — |
| `ADMIN_SEED_TOKEN` | Auth for `/api/admin/seed-agents` | — |

---

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── actions.ts                  # Server actions (createBout, createArenaBout)
├── arena/                      # Preset selection + custom lineup
├── bout/[id]/                  # Live bout (streaming)
├── b/[id]/                     # Replay (read-only)
├── agents/                     # Catalog, builder, clone, detail
├── leaderboard/                # PIT + PLAYER rankings
├── research/                   # Research description
├── roadmap/                    # Three-lane public roadmap
├── api/
│   ├── run-bout/               # SSE streaming orchestrator
│   ├── agents/                 # Agent CRUD
│   ├── reactions/              # Heart/fire (rate-limited)
│   ├── winner-vote/            # Per-bout voting
│   ├── credits/webhook/        # Stripe webhook
│   ├── contact/                # Resend email
│   ├── newsletter/             # Email signup
│   └── admin/seed-agents/      # DB seeding
components/
├── arena.tsx                   # Core bout UI (500 lines)
├── arena-builder.tsx           # Custom lineup builder
├── agent-builder.tsx           # New agent form (4 tabs)
├── clone-agent-button.tsx      # Clone/remix navigation
├── agent-details-modal.tsx     # DNA modal with clone
├── leaderboard-dashboard.tsx   # PIT/PLAYER toggle
lib/
├── ai.ts                       # Anthropic provider config
├── presets.ts                  # 22 preset normalization
├── credits.ts                  # Micro-credit economy
├── agent-dna.ts                # Manifest hashing (SHA-256)
├── agent-prompts.ts            # Structured prompt composition
├── eas.ts                      # EAS attestation (Base L2)
├── rate-limit.ts               # Sliding window limiter
├── use-bout.ts                 # Client SSE streaming hook
db/
├── schema.ts                   # Drizzle schema (9 tables)
└── index.ts                    # Neon serverless client
tests/
├── unit/                       # Pure function tests
├── api/                        # Route handler tests
├── integration/                # Real DB tests
└── e2e/                        # Playwright browser tests
presets/                        # JSON preset definitions
```

---

## Database Schema

9 tables on Neon PostgreSQL via Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `bouts` | Bout state, transcript (JSONB), agent lineup, share line |
| `agents` | Agent DNA, structured fields, hashes, attestation UIDs |
| `users` | Clerk profile sync, referral codes |
| `credits` | Per-user micro-credit balance |
| `credit_transactions` | Ledger with source/delta/metadata |
| `intro_pool` | Community credit pool with atomic drain |
| `referrals` | Referrer/referred pairs with credit tracking |
| `reactions` | Per-turn heart/fire reactions |
| `winner_votes` | Per-bout winner votes (unique per user) |

---

## Security

Hardened after adversarial code review (Feb 2026). Key measures:

- **Atomic credit preauthorization** — conditional SQL `UPDATE WHERE balance >= amount` prevents race conditions
- **Rate limiting** — sliding window (30 req/min) on reactions endpoint
- **Bout idempotency** — status check before running prevents double-execution
- **Auth required** — agent creation requires Clerk authentication
- **EAS validation** — bytes32 format validation on attestation UIDs
- **Webhook timing** — uniform code path prevents oracle attacks
- **O(1) preset lookup** — `Map`-based resolution replaces linear scan

See `docs/code-review-2026-02-10.md` for the full review and tracking table.

---

## Roadmap

Three parallel tracks shipping simultaneously:

**Platform** — Vercel AI Gateway (BYOK any LLM), multi-model routing, tournament brackets, spectator chat

**Community** — Creator profiles, remix rewards, agent marketplace, social graph, seasonal rankings

**Research** — Public dataset exports, behavioral insights dashboard, cross-model comparison, peer-reviewed paper

Full interactive roadmap at [thepit.cloud/roadmap](https://thepit.cloud/roadmap).

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
| Hosting | Vercel |
| Tests | Vitest (66) + Playwright |

---

<p align="center">
  <code>Built by Kai</code>
</p>
