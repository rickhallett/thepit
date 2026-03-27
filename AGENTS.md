# Agent's Orders

This file is the boot contract for agents working in this repo.
Read this first. Use linked references only when the task needs them.

## True North

- **Primary objective:** get hired - proof over claims [SD-309]
- **Override:** truth over hiring signal [SD-134]

If proof and spin conflict, choose truth.

## Boot Rules

These apply in every session unless the Operator explicitly overrides them.

- Write decisions to durable files, not context only [SD-266]
- Historical records are append-only; do not rewrite the chain [SD-266]
- Estimates use agent-minutes, not human-speed guesses [SD-268]
- Change is ready only when the gate is green
- Open every address to the Operator with the YAML HUD below
- Read back your understanding before acting [SD-315]
- Use `printf`, never `echo`, when piping literal values to the CLI
- Python uses `uv` exclusively [SD-310]
- New tasks go through `backlog add "title" --priority P [--epic E] [--tag T]`
- Notable events append to `docs/internal/events.yaml`
- Commendations append to `docs/internal/weaver/commendations.log`
- Bad output means diagnose, reset, and rerun. Do not patch around unknown causes
- One action = one instruction set = one agent
- Weigh marginal value against cost before dispatching extra review or agent rounds
- No em dashes, ever [SD-319]
- No emojis, ever [SD-319]
- No interactive git commands
- No `git stash`, ever [SD-325]
- End the session with no unpushed commits

## YAML HUD

Every address to the Operator opens with:

```yaml
watch_officer: <agent>
weave_mode: <tight|loose>
register: <formal|exploration|execution>
tempo: <full-sail|sustainable-pace|tacking|stop-the-line|SEV-1>
true_north: "hired = proof > claim"
bearing: <current heading>
last_known_position: <last completed task>
```

## Engineering Loop

**Read -> Verify -> Write -> Execute -> Confirm**

- Do not infer what you can verify
- Keep commits atomic
- Spec or plan before implementation
- Human review happens after execution, not during, unless the task is taste-bound

## Work Tracking

Use the backlog CLI instead of editing YAML directly.

```bash
backlog
backlog add "title" -p high
backlog list -s open
backlog show BL-001
backlog edit BL-001 -s blocked -r "reason"
backlog close BL-001 -r "reason"
```

Data lives in `docs/internal/backlog.yaml`.

## GitHub Workflow

GitHub Issues and PRs are the external record of engineering discipline.

### Issues

- External-facing work gets a GitHub issue
- Issue bodies include: problem, acceptance criteria, scope boundary
- Estimates use complexity and risk, never time
- Labels: `feature`, `bug`, `refactor`, `chore`, `tech-debt`, `infra`, `portfolio`, `research`, `platform`, `community`, `blocked`, `needs-audit`

### Branches

- Never commit directly to `main`
- Branches use `feat/`, `fix/`, `refactor/`, `chore/`
- Branch names include the issue number, for example `feat/42-custom-arena-builder`
- Default to `git worktree` for parallel work

Example:

```bash
git worktree add -b feat/42-arena-builder ../thepit-42-arena-builder main
```

### PRs

- 1 PR = 1 concern
- Squash merge to keep history clean
- PR description is written for an external reader
- Include what changed, why, what was tested, and follow-up limits
- Add screenshots or GIFs for UI changes
- Review attestation belongs in the PR body or comments

### Sequence

```text
issue -> worktree -> develop -> gate -> PR -> review -> squash merge -> post-merge verify -> close issue -> remove worktree
```

## Gate

The gate is survival, not optimisation.

```bash
pnpm run test:ci
```

If the gate fails, the change is not ready.

## Pitcommit

Invocation:

```bash
python3 scripts/pitcommit.py <command>
```

Core commands:

```bash
pitcommit status
pitcommit tier --set <full|docs|wip|sudo>
pitcommit attest <step> [--tree H] [--verdict V] [--log P]
pitcommit verify
pitcommit invalidate
pitcommit trailer
sudo pitcommit walkthrough
```

Required tiers:

- `full`: `gate`, `dc-claude`, `dc-openai`, `pitkeel`, `walkthrough`
- `docs`: `gate`, `pitkeel`
- `wip`: `gate`, `pitkeel`
- `sudo`: `gate`

Typical flow:

1. Stage changes
2. Set tier if needed
3. Run `just gauntlet` or the relevant review target
4. Run walkthrough when required
5. Commit with `git commit -m "..."`

Key behavior:

- Attestations are tied to the staged tree hash
- If staged content changes, attestations go stale
- `.gauntlet/` is ephemeral and gitignored
- `--no-verify` is emergency-only

## Conventions

- TypeScript, Next.js 16, Tailwind, Drizzle ORM, Neon Postgres
- Tests live under `tests/`
- Use JSDoc for behavior and short header comments for file purpose when needed
- YAML is the default structured-data format [SD-258]
- Use 2-space indentation

## Filesystem Map

Read depth 1 every session. Read deeper only when relevant.

```text
/                       repo root
|- AGENTS.md            boot contract
|- CLAUDE.md            symlink to AGENTS.md
|- justfile             automation targets
|- package.json         scripts and dependencies
|- app/                 Next.js app router
|- lib/                 source code
|- components/          React components
|- shared/              shared types and utilities
|- db/                  schema and database config
|- drizzle/             migrations
|- tests/               unit, integration, API, e2e
|- scripts/             pitcommit and review tooling
|- bin/                 CLI tools
|- docs/                specs, decisions, internal docs
|  |- decisions/        session-scoped decision files
|  |- internal/         operational references and logs
|- .github/workflows/   CI
```

BFS rule [SD-195]:

- Depth 1: every session
- Depth 2: when topic-relevant
- Depth 3+: deliberate research only
- Read `docs/internal/session-decisions-index.yaml`, not the full chain, for orientation

## Recent Orientation

Standing:

- SD-134 truth first
- SD-266 immutable chain
- SD-268 agentic estimation
- SD-278 pilot over
- SD-286 slopodar boot
- SD-297 forward-ref decision collisions
- SD-309 hired = proof > claim
- SD-310 `uv` only
- SD-315 readback before acting
- SD-318 darkcat alley
- SD-319 no em dashes, no emojis
- SD-325 no stash
- SD-326 discipline beats swarm
- SD-328 tech-debt exposure through layered review

Use `docs/internal/session-decisions-index.yaml` for current summaries.

## Reference Modules

These are not part of the first-pass boot load. Read them only when needed.

- `docs/internal/session-decisions-index.yaml` - current standing orders and recent decisions
- `docs/internal/session-decisions.md` - full historical chain and provenance
- `docs/internal/lexicon.md` - full vocabulary
- `docs/internal/layer-model.md` - full operational model
- `docs/internal/slopodar.yaml` - anti-pattern taxonomy
- `scripts/darkcat.md` and `docs/internal/weaver/` - adversarial review materials
- `.claude/agents/*.md` - role-specific instructions

## What This File Is Not

This file is not the full theory of operation, not the anti-slop prompt, and not the project narrative.
It is the minimum contract required to start work correctly.
