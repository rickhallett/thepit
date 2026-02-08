# Architecture

## Overview
The Pit is a Next.js App Router monolith built for real-time AI bouts. All game orchestration happens in a single API route (`/api/run-bout`), with UI streaming on the client.

## Core Flow
1. User selects a preset or custom arena lineup.
2. A bout record is created in `bouts`.
3. The client opens `/bout/[id]` and starts streaming.
4. `/api/run-bout` runs a round-robin loop and streams tokens.
5. Transcript + share line are persisted, and replay is available at `/b/[id]`.

## Streaming Protocol
Custom JSON event stream (via `createUIMessageStream`):
- `data-turn` — declares active agent metadata
- `text-start`, `text-delta`, `text-end` — streamed response
- `share-line` — generated one-liner for sharing
- `error` — terminal error

Client parsing happens in `lib/use-bout.ts` with `parseJsonEventStream`.

## Data Model (Drizzle)
Key tables (see `db/schema.ts`):
- `bouts` — status, transcript, owner, topic, response length, share line
- `agents` — system prompt, tier, DNA hashes, lineage
- `credits` + `credit_transactions` — credit balance + ledger
- `intro_pool` + `referrals` — launch credits and referral tracking
- `reactions` + `winner_votes` — audience engagement
- `users` — Clerk user mirror

## Presets + Agents
Presets live in `presets/*.json` and are normalized in `lib/presets.ts`. Agents can be preset-backed or user-created. Each agent has a DNA manifest hash for lineage and verification.

## Credits + Pricing
Credits are env-gated (`CREDITS_ENABLED`). Costs are estimated per bout and settled once the transcript is complete. BYOK and premium model toggles are controlled via env.

## Frontend
- Tailwind + `clsx`/`tailwind-merge`
- Brutalist aesthetic with streaming chat UI
- Header/footers and landing content live in `components/`

## Deployment
Deployed on Vercel. Environment variables mirror `.env.example`.
