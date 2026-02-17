# Repository Guidelines

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
- `pitnet/` — network and deployment CLI.
- `pitstorm/` — traffic simulation CLI.
- `pitbench/` — benchmarking CLI.

## Build, Test, and Development Commands
- `bin/gate` runs the full verification gate (lint + typecheck + tests + Go gates). **Use this as the single verification command.**
- `bin/gate --quick` runs lint + typecheck only (skip tests).
- `pnpm run dev` starts the local dev server.
- `pnpm run build` creates a production build.
- `pnpm run start` runs the production build locally.
- `pnpm run lint` runs ESLint.
- `pnpm run typecheck` runs TypeScript type checking.
- `pnpm run test:unit` runs unit + API tests (788 tests).
- `pnpm run test:ci` runs lint + typecheck + unit + integration.
- `pnpm run test:e2e` runs Playwright tests. Set `BASE_URL` to target a deployed instance.

## Slash Commands
- `/trigger-scan` evaluates 51 self-healing triggers against the current diff. Run after any significant change.
- `/delegate "task description"` routes a task to the correct agent(s) with context files and post-completion triggers.
- `/doc-drift` triages which documentation files may be stale given the current diff. Faster than `/doc-audit`.
- `/run-adw feature-complete` executes a multi-step ADW workflow (see ADW section below).
- `/doc-audit` full documentation accuracy audit (Scribe).
- `/security-audit` systematic security review (Sentinel).
- `/tooling-review` tooling and composition audit (Quartermaster).
- `/create-worktree "OCE-36 OCE-37"` creates isolated git worktrees for implementing Linear issues.

## ADW (AI Developer Workflows)

ADWs are declarative YAML files that compose slash commands, gates, assertions, and prompts into named, repeatable pipelines. They live in `.claude/adws/*.yml` and are executed via `/run-adw`.

**Available workflows:**
- `feature-complete` — Pre-review checklist: triggers, doc drift, lint, typecheck, tests, security audit.
- `release-ready` — Pre-merge verification: full gate, security audit, doc audit, tooling review.
- `post-merge` — Post-merge verification: trigger scan, doc drift, follow-up task generation.

**Usage:**
```bash
/run-adw feature-complete           # Run the full workflow
/run-adw release-ready --dry-run    # Preview steps without executing
/run-adw post-merge --from 3        # Resume from step 3
```

**Creating new ADWs:** Add a `.yml` file to `.claude/adws/` following the schema in `.claude/data/adw-schema.yml`. Each ADW must define `name`, `description`, and `steps`. Steps can be `command` (slash commands), `gate` (shell commands), `assert` (conditions), or `prompt` (free-form instructions).

## Agentic Data Files
- `.claude/data/trigger-manifest.yml` — 51 self-healing triggers extracted from agent definitions.
- `.claude/data/delegation-matrix.yml` — Captain's delegation matrix as structured routing rules.
- `.claude/data/doc-drift-map.yml` — Source-to-documentation dependency map (213 rules across 28 docs).
- `.claude/data/adw-schema.yml` — ADW YAML schema specification (step types, fields, output format).

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
