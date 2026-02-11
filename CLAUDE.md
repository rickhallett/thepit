# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start local development server
npm run build        # Create production build
npm run start        # Run production build locally
npm run lint         # Run ESLint
npm run test:e2e     # Run Playwright E2E tests (set BASE_URL for deployed instances)
```

Database migrations use Drizzle Kit:
```bash
npx drizzle-kit generate --name migration_name   # Generate migration SQL
npx drizzle-kit push                              # Apply migrations
```

## Architecture

TSPIT ("THE PIT — AI Battle Arena") is a Next.js 16 application where AI agents (Claude models) engage in multi-turn conversations based on preset scenarios.

### Core Data Flow

1. User selects a preset from home page → server action creates bout record with `status: 'running'`
2. Client navigates to `/bout/[id]` → `useBout` hook initiates streaming fetch to `/api/run-bout`
3. API route (nodejs runtime, 120s max duration) executes agent turns sequentially via `createUIMessageStream`
4. Each turn: agent system prompt + conversation history → Claude API → streamed response
5. Transcript accumulated, final state persisted to database

### Key Directories

- `app/` - Next.js App Router: pages, API routes, server actions
- `components/` - React components (`arena.tsx` is main bout display)
- `lib/` - Shared utilities: AI config, presets, credits, hooks
- `db/` - Drizzle schema and client (Neon serverless PostgreSQL)
- `presets/` - JSON preset definitions (agents, prompts, colors)

### Database Schema (Drizzle ORM)

```
bouts: id, presetId, status ('running'|'completed'|'error'), transcript (jsonb), ownerId, topic, responseLength, responseFormat, agentLineup, shareLine, shareGeneratedAt, createdAt
users: id, email, displayName, imageUrl, createdAt, updatedAt
credits: userId, balanceMicro, createdAt, updatedAt
creditTransactions: id, userId, deltaMicro, source, referenceId, metadata (jsonb), createdAt
introPool: id, initialMicro, claimedMicro, drainRateMicroPerMinute, startedAt, updatedAt
referrals: id, referrerId, referredId, code, credited, createdAt
reactions: id, boutId, turnIndex, reactionType, userId, createdAt
winnerVotes: id, boutId, agentId, userId, createdAt
newsletterSignups: id, email, createdAt
agents: id, name, systemPrompt, presetId, tier, model, responseLength, responseFormat, archetype, tone, quirks, speechPattern, openingMove, signatureMove, weakness, goal, fears, customInstructions, createdAt, ownerId, parentId, promptHash, manifestHash, attestationUid, attestationTxHash, attestedAt, archived
freeBoutPool: id, date, used, maxDaily, updatedAt
agentFlags: id, agentId, userId, reason, createdAt
```

### Preset System

Two formats exist:
- **RawPreset** (snake_case): Free tier presets in `presets/*.json`
- **AlternatePreset**: Premium packs in `presets-top5.json`, `presets-remaining6.json`

Both normalized to `Preset` type (camelCase) at runtime via `lib/presets.ts`.

### Streaming Protocol

Custom event stream (not standard SSE):
- `start`, `data-turn` (new speaker), `text-start`, `text-delta`, `text-end`, `error`
- Client parses via `parseJsonEventStream` in `lib/use-bout.ts`

### Credit System (optional, env-gated)

- Pre-authorizes estimated cost on bout start
- Tracks actual token usage during execution
- Settles delta on completion (refund or charge difference)
- Append-only ledger in `credit_transactions` table

## Code Conventions

- TypeScript strict mode; prefer typed objects over `any`
- React components: PascalCase files; utilities/hooks: camelCase
- Indentation: 2 spaces
- Use `clsx` + `tailwind-merge` (via `cn()` utility) for class merging
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`)
- No LLM attribution in commit messages

## Environment Variables

**Required:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` - Anthropic API key

**Optional (see `.env.example` for full list):**
- `ANTHROPIC_FREE_MODEL` / `ANTHROPIC_PREMIUM_MODEL` / `ANTHROPIC_PREMIUM_MODELS` - Model IDs
- `PREMIUM_ENABLED` - Enable premium presets
- `CREDITS_ENABLED` - Enable credit system
- `BYOK_ENABLED` - Allow bring-your-own-key
- `RESEND_API_KEY` - Enable contact form delivery
- `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` - Contact form routing
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Credit checkout + webhook
- `NEXT_PUBLIC_APP_URL` / `APP_URL` - Redirect URLs for checkout
