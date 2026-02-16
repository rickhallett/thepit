# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm run dev          # Start local development server (Next.js)
pnpm run build        # Create production build — the primary build gate
pnpm run start        # Run production build locally
```

### Verification Gate
The gate is: **lint + typecheck + unit tests + build**. You are not done until all four pass.

```bash
pnpm run lint         # ESLint
pnpm run typecheck    # tsc --noEmit (strict mode)
pnpm run test:unit    # Vitest — 788+ unit/API tests with coverage
pnpm run build        # Next.js production build — catches server/client boundary errors
```

Combined CI gate:
```bash
pnpm run test:ci      # lint + typecheck + unit + integration (all-in-one)
```

### Testing
```bash
pnpm run test:unit         # Unit + API tests (Vitest, ~788 tests)
pnpm run test:integration  # Integration tests (requires TEST_DATABASE_URL)
pnpm run test:watch        # Vitest in watch mode
pnpm run test:loop         # Repeated test runner (node scripts/test-loop.mjs)
pnpm run test:e2e          # Playwright E2E — uses BASE_URL env or starts dev server
```

### Database
```bash
pnpm exec drizzle-kit generate --name migration_name   # Generate migration SQL
pnpm exec drizzle-kit push                              # Apply migrations
pnpm run db:reset-ci                                    # Reset CI test branch (Neon)
```

### QA Runner
```bash
pnpm run qa              # Full QA suite
pnpm run qa:dry          # Dry run (list checks, don't execute)
pnpm run qa:api          # API-tier checks only
pnpm run qa:browser      # Browser-tier checks only
pnpm run qa:security     # Security checks (SEC-* filters)
pnpm run qa:single       # Single check by filter
```

### Copy A/B Testing
```bash
pnpm run copy:generate   # LLM-powered variant generation (scripts/copyGenerate.ts)
```

### Simulation
```bash
pnpm run sim             # Run traffic simulation (tests/simulation/run.ts)
pnpm run sim:dry         # Dry run simulation
```

## Deployment & Preview

### How Deployment Works
- **Vercel** auto-deploys on every push:
  - Push to `master` → **Production** deployment
  - Push to any other branch → **Preview** deployment
- Preview URLs follow pattern: `tspit-git-{branch}-rick-halletts-projects.vercel.app`
- Each preview deployment also gets a unique URL: `tspit-{hash}-rick-halletts-projects.vercel.app`

### CI Workflows (GitHub Actions)

**CI** (`.github/workflows/ci.yml`) — runs on push to master + all PRs:
- `gate` job: lint → typecheck → test:unit
- `integration` job: test:integration (requires TEST_DATABASE_URL secret)

**E2E** (`.github/workflows/e2e.yml`) — runs on Vercel `deployment_status` events:
- Triggers **only** when a Preview deployment succeeds
- Runs Playwright against the deployed preview URL
- `BASE_URL` is set automatically from `github.event.deployment_status.target_url`

### Preview E2E Script
```bash
./scripts/preview-e2e.sh              # Push, wait for Vercel preview, run Playwright
./scripts/preview-e2e.sh --url        # Push, wait, print preview URL only (no e2e)
./scripts/preview-e2e.sh --skip-push  # Don't push, wait for latest preview of HEAD
```

Safety: refuses to run on master/main/production branches. Bails if it ever matches a Production deployment.

### Smoke Testing
```bash
./scripts/sanity-check.sh                     # Smoke test major routes (starts dev server)
./scripts/sanity-check.sh --url http://...    # Smoke test an already-running server
./scripts/smoke-http.sh                       # Quick HTTP status check on all routes
BASE_URL=https://preview.vercel.app ./scripts/smoke-http.sh  # Against a deployed instance
```

### Production Safety Rules
- **NEVER** run `preview-e2e.sh` on master/main — it will refuse and exit
- **NEVER** modify Vercel env vars on Production via scripts — always verify the target environment
- **NEVER** force push to master unless explicitly asked and confirmed
- Vercel env var changes: always use `printf` (not `echo`) to avoid trailing newlines
- After setting env vars, verify: `vercel env pull .env.check --environment production && grep '\\n"' .env.check && rm .env.check`

### E2E Test Constraints
- Playwright runs headless Chromium against deployed preview URLs
- Clerk auth **does not hydrate** on preview domains (only configured for thepit.cloud)
- Tests that require authentication (bout streaming) are skipped on preview via `BASE_URL` check
- The `bout.spec.ts` streaming test only runs against localhost or production domain

## Go CLI Tools (pit* family)

Seven Go CLIs live in the workspace root (`go.work`), sharing `shared/config` and `shared/theme`. All use Go 1.25.7, stdlib `flag`, hand-rolled switch dispatch (no cobra).

| CLI | Purpose |
|-----|---------|
| `pitctl` | Site administration (users, credits, bouts, agents, alerts, metrics) |
| `pitforge` | Agent creation and management |
| `pitlab` | Experiment and analysis |
| `pitlinear` | Linear issue tracker (see below) |
| `pitnet` | Network and deployment |
| `pitstorm` | Traffic simulation |
| `pitbench` | Benchmarking |

### pitlinear — Linear Issue Management

Use `pitlinear` for **all Linear issue operations** instead of raw GraphQL or curl. Requires `LINEAR_API_KEY` (in `.env.local` or exported). Optional `LINEAR_TEAM_NAME` for default team.

```bash
pitlinear issues list --state Todo --limit 10    # list with filters
pitlinear issues --label Bug                     # implicit list
pitlinear issues create --title "Fix X" --priority urgent --label Bug --state Todo
pitlinear issues get OCE-22                      # by identifier or UUID
pitlinear issues update OCE-22 --state "In Progress"
pitlinear issues delete OCE-22
pitlinear issues set-parent OCE-22 OCE-35        # link child to parent
pitlinear comments add OCE-22 --body "Starting work"
pitlinear comments list OCE-22
pitlinear teams                                  # list teams
pitlinear states                                 # list workflow states
pitlinear labels                                 # list labels
pitlinear --json issues get OCE-22               # JSON output for agents
printf 'long desc' | pitlinear issues create --title "T" --desc -  # stdin
```

Build/test: `cd pitlinear && go vet ./... && go test ./... && go build .`

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
- `copy/` - A/B testing copy system (schema, base JSON, variant JSONs)
- `scripts/` - Operational scripts (preview-e2e, sanity-check, smoke-http, etc.)
- `pitctl/`, `pitforge/`, `pitlab/`, `pitlinear/`, `pitnet/`, `pitstorm/`, `pitbench/` - Go CLI tools
- `shared/` - Go shared library (config, theme) for pit* CLIs
- `tests/e2e/` - Playwright E2E tests
- `tests/unit/` - Vitest unit tests
- `tests/integration/` - Vitest integration tests (require DB)

### Copy A/B Testing System

```
copy/base.json          → Source of truth for all user-facing text
copy/variants/*.json    → Variant-specific overrides (deep-merged with control)
copy/schema.ts          → 36 TypeScript interfaces defining all copy keys
copy/experiment.json    → Traffic allocation config (active flag, weights)
lib/copy-edge.ts        → Edge-safe: selectVariant(), getExperimentConfig()
lib/copy.ts             → Server-only: getCopy(), getCopyForVariant() — uses next/headers
lib/copy-client.tsx     → Client-only: CopyProvider, useCopy() hook
```

**Import rules:**
- Server Components → `import { getCopy } from '@/lib/copy'`
- Client Components → `import { useCopy } from '@/lib/copy-client'`
- Edge Middleware → `import { ... } from '@/lib/copy-edge'`
- **Client components MUST NOT import from `@/lib/copy`** — it pulls in `next/headers` and breaks the build

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

## Git Workflow

- Each feature gets its own branch off `master` and its own PR
- **Merge strategy: merge commit (no squash)** — preserves full commit history for auditability
- Merge PRs with: `gh pr merge <N> --admin --merge --delete-branch`
- After merge: `git checkout master && git pull`
- Use atomic commits with descriptive Conventional Commit messages

## Environment Variables

**Required:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` - Anthropic API key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth (client)
- `CLERK_SECRET_KEY` - Clerk auth (server)

**Optional (see `.env.example` for full list):**
- `ANTHROPIC_FREE_MODEL` / `ANTHROPIC_PREMIUM_MODEL` / `ANTHROPIC_PREMIUM_MODELS` - Model IDs
- `PREMIUM_ENABLED` - Enable premium presets
- `CREDITS_ENABLED` - Enable credit system
- `BYOK_ENABLED` - Allow bring-your-own-key
- `RESEND_API_KEY` - Enable contact form delivery
- `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` - Contact form routing
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Credit checkout + webhook
- `NEXT_PUBLIC_APP_URL` / `APP_URL` - Redirect URLs for checkout
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics
- `PV_INTERNAL_SECRET` - Page view recording middleware secret
- `LINEAR_API_KEY` - Linear API key (in `.env.local`, used by pitlinear)
- `LINEAR_TEAM_NAME` - Default Linear team name/key (in `.env.local`, used by pitlinear)

### CRITICAL: Piping Values to CLI Tools
**NEVER use `echo` to pipe values to CLI tools.** `echo` appends a trailing newline that silently corrupts values.

```bash
# WRONG
echo "true" | vercel env add MY_FLAG production

# CORRECT
printf 'true' | vercel env add MY_FLAG production
```

## Known Quirks

- **Phantom LSP errors**: `app/page.tsx`, `app/recent/page.tsx`, `app/research/page.tsx`, `app/developers/page.tsx`, `tests/unit/rate-limit.test.ts`, `components/site-footer.tsx` show LSP errors that do not appear in `pnpm run typecheck`. Ignore them.
- **Clerk on preview domains**: Clerk auth only hydrates on `thepit.cloud`. On Vercel preview URLs (`*.vercel.app`), `<SignedIn>/<SignedOut>` wrappers never render their children. This is expected.
- **Untracked files**: `.gemini/`, `.vscode/`, `archive-mPIpSK/` are intentionally not committed.
