# Repository Guidelines

## Dead Reckoning — Harness Blowout Recovery

If `docs/internal/session-decisions.md` exists but you have no memory of it, your context window died. **Read `docs/internal/dead-reckoning.md` immediately.** It contains the full recovery sequence: session state, crew roster, file index, and standing orders. Do NOT read all files in `docs/internal/` at once (token budget risk). Lazy load: know what exists, read only when needed.

## Project Structure & Module Organization
- `app/` contains Next.js App Router routes, server actions, and API handlers.
- `components/` houses reusable UI components (e.g., `components/arena.tsx`).
- `lib/` holds shared utilities and configuration (e.g., AI provider config, presets).
- `db/` contains Drizzle schema and client setup.
- `tests/e2e/` contains Playwright end-to-end tests.
- `public/` is for static assets.
- `shared/` is the Go shared library (config, theme) used by all pit* CLIs.
- `pitctl/` — site administration CLI (users, credits, bouts, agents, alerts, metrics).
- `pitforge/` — agent creation and management CLI.
- `pitlab/` — experiment and analysis CLI.
- `pitlinear/` — Linear issue tracker CLI (see below).
- `pitnet/` — on-chain provenance CLI (EAS attestation on Base L2).
- `[REDACTED]/` — traffic simulation CLI.
- `pitbench/` — benchmarking CLI.

## Build, Test, and Development Commands
- `pnpm run dev` starts the local dev server.
- `pnpm run build` creates a production build.
- `pnpm run start` runs the production build locally.
- `pnpm run lint` runs ESLint.
- `pnpm run typecheck` runs TypeScript type checking.
- `pnpm run test:unit` runs unit + API tests (1,007 tests).
- `pnpm run test:ci` runs lint + typecheck + unit + integration.
- `pnpm run test:e2e` runs Playwright tests. Set `BASE_URL` to target a deployed instance.

### Local Gate Is The Authority

The **local gate** is the verification bar for merging:
```bash
pnpm run typecheck && pnpm run lint && pnpm run test:unit
```

Do NOT wait on remote CI (GitHub Actions) to merge during iteration. Remote CI and remote deployment are later-stage verification layers — they are earned after the product demonstrates working IP locally. E2E/Playwright tests are paused during high-iteration phases and reintroduced when the product stabilises.

## Coding Style & Naming Conventions
- TypeScript (strict) is the default; prefer typed objects over `any`.
- Indentation: 2 spaces.
- React components: PascalCase filenames and exports.
- Utilities and hooks: `camelCase` (e.g., `lib/use-bout.ts`).
- Keep Tailwind class lists readable; use `clsx` + `tailwind-merge` when combining.

## Testing Guidelines
- E2E tests use Playwright and live in `tests/e2e/`.
- Naming: `*.spec.ts` (e.g., `tests/e2e/bout.spec.ts`).
- Favor fast, behavior-driven checks (e.g., streaming emits text).

## Commit & Pull Request Guidelines
- Use atomic commits.
- Commit messages must follow Conventional Commits (e.g., `feat: ...`, `fix: ...`, `chore: ...`).
- Do not add LLM attribution or co-authorship lines in commit messages.
- PRs should include a clear summary, test evidence, and UI screenshots for visual changes.

## Go CLI Tools (pit* family)

All Go CLIs live in the workspace root (`go.work`) and share `shared/config` (env loading) and `shared/theme` (lipgloss Tokyo Night styling). They use Go 1.25.7, stdlib `flag` + hand-rolled switch dispatch (no cobra), and follow the pattern in `pitctl/main.go`.

### pitlinear — Linear Issue Management

**When to use:** Any task involving Linear issues — creating, updating, listing, commenting, or linking issues. Use `pitlinear` instead of raw GraphQL or curl against the Linear API.

**Environment:** Requires `LINEAR_API_KEY` (in `.env.local` or exported). Optional `LINEAR_TEAM_NAME` sets the default team key (e.g. `Oceanheartai`).

**Quick reference:**
```bash
# List / filter issues
pitlinear issues list --state Todo --limit 10
pitlinear issues --label Bug                     # implicit list

# CRUD
pitlinear issues create --title "Fix X" --priority urgent --label Bug --state Todo
pitlinear issues get OCE-22                      # by identifier or UUID
pitlinear issues update OCE-22 --state "In Progress"
pitlinear issues delete OCE-22

# Hierarchy
pitlinear issues set-parent OCE-22 OCE-35        # link child to parent

# Comments
pitlinear comments add OCE-22 --body "Starting work"
pitlinear comments list OCE-22

# Metadata
pitlinear teams                                  # list teams
pitlinear states                                 # list workflow states
pitlinear labels                                 # list labels

# Agent-friendly
pitlinear --json issues get OCE-22               # JSON output
printf 'long description' | pitlinear issues create --title "T" --desc -  # stdin
```

**Build/test:**
```bash
cd pitlinear && go vet ./... && go test ./... && go build .
```

## Security & Configuration Tips
- Local secrets live in `.env` (do not commit).
- Required env vars include `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
- When rotating keys, update local `.env` and deployment envs consistently.

### CRITICAL: Piping Values to CLI Tools
**NEVER use `echo` to pipe values to CLI tools** (e.g., `vercel env add`, `gh secret set`). `echo` appends a trailing newline (`\n`) that silently corrupts the value. This breaks API keys, secrets, DB connection strings, boolean flags, and any value compared with `===`.

**ALWAYS use `printf` instead:**
```bash
# WRONG — value becomes "true\n", which !== "true"
echo "true" | vercel env add MY_FLAG production

# CORRECT — value is exactly "true"
printf 'true' | vercel env add MY_FLAG production
```

After setting env vars, **always verify** they are clean:
```bash
vercel env pull .env.check --environment production
grep '\\n"' .env.check
rm .env.check
```

## Cursor Cloud specific instructions

### Node.js version
The project requires Node.js 24.x (see `.nvmrc` for exact version). The VM ships with Node 22 — the update script handles installing 24 via nvm on each boot.

### Services overview
| Service | Start command | Notes |
|---------|--------------|-------|
| Next.js dev server | `pnpm run dev` | Runs on `:3000`. Connects to Neon Postgres (cloud-hosted, no local DB setup needed). |
| Go CLIs | `make -C <pit*dir> build` | Built during dependency install. Not required for web app testing. |

### Local gate (lint + typecheck + tests)
```bash
pnpm run typecheck && pnpm run lint && pnpm run test:unit
```
See `AGENTS.md` "Build, Test, and Development Commands" section and `package.json` scripts for all available commands.

### Environment variables
Required secrets (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) are injected from the Cursor Secrets panel. The update script writes them into `.env` from environment variables automatically. Optional Stripe keys are also supported.

### Known gotchas
- Some unit tests (notably `tests/unit/brand.test.ts` and some API tests) may fail when cloud-injected env vars like `NEXT_PUBLIC_SOCIAL_GITHUB_ENABLED` override the empty defaults the tests expect. These are environment-specific, not code bugs.
- The database is Neon Serverless Postgres (cloud-hosted). No local database setup or Docker is needed.
- Demo mode allows running bouts without authentication — use this for quick smoke tests.
