# Architecture

## Overview
The Pit is a Next.js App Router monolith built for real-time AI bouts. All game orchestration happens in a single API route (`/api/run-bout`), with UI streaming on the client. A companion Go CLI toolchain provides ops, research, and on-chain verification capabilities.

## Core Flow
1. User selects a preset or custom arena lineup.
2. A bout record is created in `bouts`.
3. The client opens `/bout/[id]` and starts streaming.
4. `/api/run-bout` (nodejs runtime, 120s max duration) runs a round-robin loop and streams tokens.
5. Transcript + share line are persisted, and replay is available at `/b/[id]`.

## Streaming Protocol
Custom JSON event stream (via `createUIMessageStream`):
- `start` — stream initialization
- `data-turn` — declares active agent metadata
- `text-start`, `text-delta`, `text-end` — streamed response
- `data-share-line` — generated one-liner for sharing
- `error` — terminal error

Client parsing happens in `lib/use-bout.ts` with `parseJsonEventStream`.

## Data Model (Drizzle)
20 tables (see `db/schema.ts`):
- `bouts` — status, transcript, owner, topic, response length, share line, updatedAt
- `agents` — system prompt, tier, DNA hashes, lineage, archived flag, attestation fields
- `credits` + `credit_transactions` — credit balance + append-only ledger
- `intro_pool` + `referrals` — launch credits and referral tracking
- `reactions` + `winner_votes` — audience engagement (deduped)
- `users` — Clerk user mirror, subscription tier, stripe customer
- `newsletter_signups` — email list
- `free_bout_pool` — daily free bout cap
- `agent_flags` — community moderation
- `paper_submissions` — arXiv paper submissions for research curation
- `feature_requests` + `feature_request_votes` — community feature voting
- `page_views` — server-side analytics (path, session, UTM, geo)
- `short_links` + `short_link_clicks` — shareable bout URLs with click analytics
- `remix_events` — agent clone/remix lineage with reward payouts
- `research_exports` — anonymized dataset snapshots for research downloads

## Subscription Tiers
Three user tiers controlled by `SUBSCRIPTIONS_ENABLED`:
- **free** — daily free bout pool, haiku model only
- **pass** — unlimited bouts, sonnet model access
- **lab** — unlimited bouts, all models including opus

Managed via Stripe subscriptions with webhook-driven tier updates.

## Bout Engine
The core bout execution logic lives in `lib/bout-engine.ts` (extracted from the API route). Two phases: `validateBoutRequest()` (parse, auth, tier, credits, idempotency) and `executeBout()` (turn loop, transcript persistence, share line generation, credit settlement). All LLM prompts are constructed via `lib/xml-prompt.ts` builders with XML safety boundaries.

## Presets + Agents
Presets live in `presets/*.json` and are normalized in `lib/presets.ts`. Agents can be preset-backed or user-created. Each agent has a DNA manifest hash (`lib/agent-dna.ts`) for lineage and verification. Optionally, agents can be attested on-chain via EAS (see below).

## Credits + Pricing
Credits are env-gated (`CREDITS_ENABLED`). Costs are estimated per bout and settled once the transcript is complete. Atomic preauthorization via conditional SQL `UPDATE WHERE balance >= amount` prevents races. BYOK keys are stashed in short-lived HTTP-only cookies via `/api/byok-stash`.

## Feature Flags
All features behind env-gated boolean flags (`=== 'true'`). The health endpoint (`/api/health`) reports active flags.

| Flag | Purpose |
|------|---------|
| `SUBSCRIPTIONS_ENABLED` | Stripe subscription tiers (Free/Pass/Lab) |
| `CREDITS_ENABLED` | Credit economy, preauthorization, settlement |
| `CREDITS_ADMIN_ENABLED` | Admin credit grant UI in arena |
| `BYOK_ENABLED` | Bring Your Own Key — user-supplied Anthropic keys |
| `PREMIUM_ENABLED` | Legacy premium preset gating (pre-subscriptions) |
| `EAS_ENABLED` | On-chain agent attestations on Base L2 |
| `ASK_THE_PIT_ENABLED` | AI Q&A chatbot |
| `HELICONE_ENABLED` | AI cost/latency analytics proxy |
| `NEXT_PUBLIC_SOCIAL_X_ENABLED` | X/Twitter link in footer and share UI |
| `NEXT_PUBLIC_SOCIAL_REDDIT_ENABLED` | Reddit link |
| `NEXT_PUBLIC_SOCIAL_DISCORD_ENABLED` | Discord link |
| `NEXT_PUBLIC_SOCIAL_GITHUB_ENABLED` | GitHub link |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN_ENABLED` | LinkedIn link |

## EAS Attestations
On-chain agent identity verification using the Ethereum Attestation Service on Base L2, gated by `EAS_ENABLED`.

**Schema:** `agentId`, `name`, `presetId`, `tier`, `promptHash`, `manifestHash`, `parentId`, `ownerId`, `createdAt`.

**TypeScript** (`lib/eas.ts`): called during agent creation via `attestAgent()`. Connects to Base L2 via `ethers`, encodes the agent manifest with `SchemaEncoder`, and submits a non-expiring, non-revocable attestation. Returns `{ uid, txHash }`. If attestation fails, the agent is still created but flagged.

**Go** (`pitnet/`): CLI for verification. `verify <uid>` checks attestations on-chain, `audit` cross-references all attested agents against the database.

**DB fields:** `attestationUid`, `attestationTxHash`, `attestedAt` on the `agents` table.

## Ask the Pit
AI-powered Q&A chatbot (`ASK_THE_PIT_ENABLED`). Reads project docs (README, AGENTS.md) as context, answers user questions about the platform. RAG-lite pattern — no vector store, just file-based context injection.

- **Config:** `lib/ask-the-pit-config.ts` — doc paths, model, max tokens
- **API:** `POST /api/ask-the-pit` — rate limited (5 req/min), validates input, sanitizes docs (strips env sections, prevents path traversal), streams response
- **UI:** `components/ask-the-pit.tsx` — floating "?" button, chat panel with streaming responses. Lazy-loaded via `next/dynamic`.

## OpenAPI & API Docs
Interactive API documentation for developers and Lab-tier users.

- **Spec:** `lib/openapi.ts` — OpenAPI 3.1.0 definition documenting 7 endpoints across Bouts, Agents, Engagement, Sharing, Community, and System tags. Auth via Clerk session token.
- **JSON endpoint:** `GET /api/openapi` — authenticated, Lab-tier gated when subscriptions enabled, rate limited (10 req/min)
- **Interactive docs:** `GET /docs/api` — public Scalar API reference (purple theme), rendered via `@scalar/nextjs-api-reference`

## Frontend
- Tailwind + `clsx`/`tailwind-merge`
- Brutalist aesthetic with streaming chat UI
- Header/footers and landing content live in `components/`
- Skip-to-content link + `<main>` landmark for accessibility
- GDPR cookie consent banner gates analytics (see Privacy below)

## Privacy & Cookie Consent
GDPR-compliant cookie consent flow gating all analytics behind user choice.

1. `components/cookie-consent.tsx` renders a fixed bottom banner when `pit_consent` cookie is absent. Uses `useSyncExternalStore` for SSR-safe cookie reads.
2. On "Accept": sets `pit_consent=accepted` (1yr), reloads to allow PostHog init and middleware to set analytics cookies (`pit_sid`, `pit_utm`).
3. On "Decline": sets `pit_consent=declined`. PostHog never initializes.
4. `components/posthog-provider.tsx` checks consent state before initializing. No-ops when declined or pending.

**Cookie classification:**
- Essential (always active): `pit_consent`, Clerk auth, referral tracking
- Analytics (consent required): `pit_sid`, `pit_utm`, PostHog cookies

## Observability
Six-layer observability stack. All layers are conditional on env vars and degrade gracefully when unconfigured.

### Sentry (Error Tracking + Performance)
`@sentry/nextjs` with separate configs for client, server, and edge. 100% error capture, 10% performance traces. Session replay (1% normal, 100% on error). Client filters noisy browser errors (ad blockers, extensions). Root and page-level error boundaries call `Sentry.captureException`. Source maps uploaded at build time. Instrumentation hooks capture request errors and router transitions.

### PostHog (Product Analytics)
Consent-gated (see Privacy above). SPA page view tracking, Clerk identity sync, UTM super properties, auto-capture, dead click detection, session recording, `respect_dnt: true`. Typed events defined in `lib/analytics.ts` (16 event types). Engagement tracking (`lib/engagement.ts`) monitors scroll depth milestones, active time, and bout interaction depth.

### Helicone (AI Cost/Latency)
When `HELICONE_ENABLED=true`, platform-funded AI calls proxy through `https://anthropic.helicone.ai/v1`. BYOK calls bypass Helicone. Tagged with `Helicone-Property-Service: tspit`.

### Structured Logger
`lib/logger.ts` — zero-dep structured logging. JSON lines in production (`level`, `msg`, `ts`, `service: 'tspit'`), human-readable in dev. Configurable level via `LOG_LEVEL`. Auto-sanitizes API keys (`sk-ant-*`, `sk_live_*`, `sk_test_*`).

### Anomaly Detection
`lib/anomaly.ts` — in-memory sliding window analysis (per serverless instance). Detects burst traffic (>100 req/min/IP), credential probing (>20 auth failures/5min), error rate spikes (>50% per route), and suspicious user-agents. Best-effort logging only; enforcement handled by `lib/rate-limit.ts` and DB constraints.

### Vercel Analytics
Web Vitals reporting via `vitals.vercel-insights.com`.

## Go CLI Toolchain
Five CLI tools and a shared library, organized as a Go workspace under `github.com/rickhallett/thepit/`. Go 1.25.7. Each tool has `make gate` (vet + build + test). Premium commands require a Lab-tier Ed25519 license token (`~/.pit/license.jwt`).

### shared/ (Library)
Consumed by all tools. Modules: `config/` (.env parsing, env var schema), `db/` (PostgreSQL via `lib/pq`), `license/` (Ed25519 JWT-like token create/verify, 7-day expiry), `format/` (number/time/credit formatting), `theme/` (Tokyo Night palette via `charmbracelet/lipgloss`).

### pitctl/ (Site Administration)
Ops Swiss army knife. Commands: `status`, `env`, `db [ping|stats]`, `users [inspect|set-tier]`, `credits [balance|grant|ledger|summary]`, `bouts [inspect|stats|purge-errors]`, `agents [inspect|archive|restore]`, `alerts`, `watch`, `metrics [24h|7d|30d]`, `report [daily|weekly]`, `smoke`, `export [bouts|agents]`, `license [generate-keys|issue|verify]`, `version`. Global flags: `--env`, `--yes`, `--json`. No license required.

### pitforge/ (Agent Development)
Agent scaffolding, validation, prompt engineering, and AI-powered iteration. Free commands: `init`, `validate`, `lint`, `hash`, `diff`, `catalog`. Premium: `spar` (local bout between agents), `evolve` (prompt mutation/sweep/ablation), `lineage` (ancestry visualization). Uses Anthropic API for premium features.

### pitlab/ (Research Analysis)
Statistical analysis of exported bout data. Commands: `summary` (dataset overview), `survival` (persona win rates), `position` (first-mover bias), `engagement` (reaction curves), `codebook` (research codebook generation). Requires `--data <export.json>` from `/api/research/export`. Premium except `codebook`.

### pitnet/ (On-Chain Provenance)
EAS attestation verification on Base L2. Free: `status` (connectivity check). Premium: `submit` (encode attestation payload), `verify <uid>` (on-chain verification), `audit` (cross-reference all attested agents). Uses raw JSON-RPC over HTTP (no heavy Ethereum libs).

### pitbench/ (Cost Benchmarking)
AI model cost and performance analysis. Free: `models` (pricing comparison table). Premium: `estimate` (hypothetical bout cost), `cost` (exact token cost), `margin` (platform margin verification).

## QA Framework
Custom test automation framework in `qa/`. Parses user stories from `docs/qa-report.md` and orchestrates execution.

- **Runner** (`qa/runner.ts`): CLI orchestrator — parses args, checks connectivity, filters by category/tier/ID, executes tests, writes results
- **Parser** (`qa/parser.ts`): extracts test IDs, categories, descriptions, and status flags (`qa:x`, `func:x`, `broken:x`) from markdown
- **Writer** (`qa/writer.ts`): updates `docs/qa-report.md` with results, generates JSON for CI
- **Registry** (`qa/registry.ts`): test self-registration with `setup?`/`run`/`teardown?` lifecycle
- **Tiers** (`qa/tiers.ts`): maps tests to automation tiers — `api` (~93), `browser` (~125), `partial` (~21), `human` (6)
- **69 security tests implemented** across auth bypass, injection, IDOR, credit edge cases, race conditions, payment webhooks, subscriptions, and rate limiting
- **CLI:** `pnpm run qa`, `pnpm run qa:dry`, `pnpm run qa:setup`, `pnpm run qa:teardown`, `pnpm run qa:single <ID>`

## Deployment
Deployed on Vercel. Environment variables mirror `.env.example`. CSP configured in `next.config.ts` for Clerk, PostHog, Sentry, Helicone, and EAS domains. Sentry source maps uploaded at build. Go tools are built and run locally or in CI.
