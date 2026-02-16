# Tooling & Composition Review

Audit all custom scripts, Go CLI tools, CI/CD workflows, and automation. Identify novel compositions of existing primitives, surface high-ROI gaps, and produce a ranked proposal list.

## Usage

```
/tooling-review                          # Full audit across all 8 dimensions
/tooling-review "ci/cd"                  # Focus on CI/CD pipeline dimension
/tooling-review "dx"                     # Focus on developer experience
/tooling-review "analytics logging"      # Focus on specific dimensions
/tooling-review "compositions only"      # Skip gap analysis, focus on novel compositions
/tooling-review "gaps only"              # Skip composition analysis, focus on missing primitives
```

The argument `$ARGUMENTS` filters the audit scope. If empty, run the full review.

## Principles

1. **Compose before building.** If two existing tools can be piped together to solve a problem, that is always preferred over writing a new tool. The best new tool is the one you didn't have to write.
2. **ROI is the filter.** Every proposal must justify its existence in terms of effort vs. impact. "Nice to have" is not a reason.
3. **Verify the inventory.** Run commands to confirm what exists. Don't rely on documentation — it drifts. Count scripts, list CLIs, read Makefiles.
4. **Respect ownership.** Quartermaster proposes; other agents implement. Never modify scripts, CI config, or tooling directly — delegate.
5. **Think in pipelines.** The most powerful tools are the ones that accept stdin and produce stdout. Every recommendation should consider composability.
6. **Cross-language is a feature.** The Go CLI ecosystem exists alongside TypeScript for a reason — offline analysis, admin operations, cross-language parity. Honour both.

## Process

### Phase 1: Inventory Ground Truth

Run these commands and record every result. These are your source of truth.

```bash
# npm scripts — count and list
node -e "const p=require('./package.json'); const s=Object.keys(p.scripts); console.log('Scripts:', s.length); s.sort().forEach(n => console.log(' ', n, '→', p.scripts[n]))"

# Shell scripts
ls -la scripts/*.sh scripts/*.ts scripts/*.mjs 2>/dev/null

# Go CLI tools — directories and their subcommands
ls -d pit* shared 2>/dev/null
for d in pit*; do [ -f "$d/Makefile" ] && echo "=== $d ===" && grep '^[a-z].*:' "$d/Makefile"; done

# Go CLI help text (if binaries are built)
for d in pit*; do [ -f "$d/$d" ] && echo "=== $d ===" && "./$d/$d" --help 2>&1 | head -20; done

# CI workflows
ls -la .github/workflows/*.yml 2>/dev/null
for f in .github/workflows/*.yml; do echo "=== $f ===" && grep -E '^name:|jobs:|^\s+- run:' "$f"; done

# QA framework
ls -la qa/*.ts qa/tests/**/*.ts qa/scripts/*.ts 2>/dev/null

# Test infrastructure
find tests -name '*.test.ts' -o -name '*.spec.ts' | wc -l
ls tests/simulation/*.ts 2>/dev/null

# Observability stack
grep -l 'logger\|sentry\|posthog\|analytics' lib/*.ts 2>/dev/null

# Environment validation
wc -l lib/env.ts
grep -c 'process\.env\.' lib/env.ts

# Copy system
ls copy/*.json copy/variants/*.json 2>/dev/null
cat copy/experiment.json 2>/dev/null | head -5

# Database tooling
ls drizzle/*.sql 2>/dev/null | wc -l
cat drizzle.config.ts
```

Store all results. You will reference them throughout the audit.

### Phase 2: Dependency & Composition Mapping

Build a mental model of how tools relate to each other.

#### 2a. Data Flow Map

For each tool, identify:
- **Inputs:** What data does it consume? (files, env vars, stdin, API responses, database)
- **Outputs:** What does it produce? (stdout, files, database writes, HTTP calls, exit codes)
- **Format:** What data format? (JSON, JSONL, TSV, plain text, HTML, SQL)

Record tools that share data formats — these are composition candidates.

#### 2b. Invocation Map

For each tool, identify who calls it:
- **Manual:** Developer runs from terminal
- **CI:** Called by GitHub Actions
- **Script:** Called by another script
- **Scheduled:** Runs on a timer/cron
- **Never:** Tool exists but has no known caller

Tools that are "Manual only" but could be "CI" are automation candidates.
Tools that are "Never" called need investigation — are they dead code or just undiscovered?

#### 2c. Cross-Language Parity Map

For each piece of logic that exists in both TypeScript and Go:
- Is there a parity test? (e.g., `dna_parity_test.go`, `pricing_parity_test.go`)
- Are they in sync?
- Could one be deprecated in favour of the other?

```bash
# Known parity tests
find pit* -name '*parity*' 2>/dev/null
```

### Phase 3: Composition Analysis

Look for novel ways to chain existing tools. Check each pattern:

#### 3a. Pipeline Opportunities
Can tool A's output feed directly into tool B's input?

```bash
# Example: export → analysis pipeline
# pitctl export --format jsonl | pitlab summary --stdin

# Example: stress test → cost report
# pitstorm run --dry-run | pitbench estimate --stdin

# Example: agent evolution loop
# pitforge catalog --json | pitlab engagement --agents-stdin | pitforge evolve --metrics-stdin
```

For each potential pipeline, verify:
- Do the data formats actually match?
- Does the downstream tool accept stdin?
- Is the composition useful (solves a real problem)?

#### 3b. Gate Extensions
What should be in the CI gate but isn't?

```bash
# Current gate
pnpm run test:ci  # lint → typecheck → unit → integration

# Missing from gate?
# - Go tool gates: make -C pitctl gate && make -C pitforge gate
# - Security scan: pnpm run security:scan
# - Dependency audit: pnpm audit --audit-level=high
# - Sanity check: scripts/sanity-check.sh (post-build)
```

#### 3c. Feedback Loops
Where does output from one phase feed back into a subsequent phase?

```text
Deploy → Smoke test → Alert (if fails) → Auto-rollback?
Simulation → Analysis → Agent evolution → Re-simulation?
A/B copy deploy → Engagement metrics → Winner selection → Copy update?
```

#### 3d. Missing Glue Scripts
Are there two tools that would compose perfectly with a 10-line shell script between them?

### Phase 4: Gap Analysis

For each of the 8 dimensions, score the current state and identify gaps.

#### Scoring Rubric

| Score | Meaning |
|-------|---------|
| **Green** | Well-served. Automation exists, runs in CI, produces actionable output. |
| **Yellow** | Partially served. Tools exist but require manual invocation, are disconnected, or have coverage gaps. |
| **Red** | Critical gap. No tooling exists for a high-value use case. |

#### Dimensions to Score

1. **CI/CD Pipeline** — Are all quality checks automated? Are deployments verified?
2. **Developer Experience** — How fast is onboarding? Is the dev loop tight? Are errors clear?
3. **User Experience** — Are A/B tests measurable? Are engagement metrics actionable?
4. **Research & Development** — Can we run experiments, collect data, and analyse results in a pipeline?
5. **Analytics & Metrics** — Is there a single-pane view of system health, user behaviour, and business metrics?
6. **Logging & Observability** — Is request tracing end-to-end? Are logs structured and searchable?
7. **Security Automation** — Are security checks in CI? Are anomalies detected and escalated?
8. **Data Pipeline & Export** — Are backups automated? Are exports reproducible? Is data retention managed?

For each Yellow or Red dimension, identify the specific gap and assess:
- What existing primitives partially cover it?
- What's missing?
- What's the effort to close the gap?
- What's the impact of closing it?

### Phase 5: Proposals

For each identified composition or gap, write a formal proposal.

```markdown
### PROPOSAL-NNN: [Title]

**Dimension:** [CI/CD | DX | UX | R&D | Analytics | Logging | Security | Data]
**Type:** [Composition | New Primitive | Enhancement | Deprecation]
**ROI:** [High | Medium | Low] — [1-sentence justification]
**Effort:** [S (hours) | M (days) | L (weeks)]

#### Problem
[What's missing, broken, or suboptimal. Be specific.]

#### Existing Primitives Involved
- `tool/script A` — provides X
- `tool/script B` — provides Y

#### Proposed Solution
[How to compose existing tools, or what new primitive to build.]

#### Implementation Sketch
[Pseudocode, pipeline diagram, or shell snippet. Not production code.]

#### Delegation
- **Primary:** [Agent name] — [what they build]
- **Support:** [Agent name] — [what they contribute]

#### Success Criteria
- [Measurable outcome 1]
- [Measurable outcome 2]

#### Risks
- [What could go wrong]
- [Mitigation]
```

### Phase 6: Rank and Prioritise

Sort all proposals by a composite score:

```
Score = (Impact × 3) + (Composition × 2) - (Effort × 1)
```

Where:
- **Impact:** 3 = solves a critical gap, 2 = meaningful improvement, 1 = incremental
- **Composition:** 3 = pure composition (no new code), 2 = thin glue script, 1 = new tool, 0 = large new system
- **Effort:** 3 = weeks, 2 = days, 1 = hours

Higher score = higher priority.

### Phase 7: Output Report

```
═══════════════════════════════════════════════════════════════════
  TOOLING & COMPOSITION REVIEW
  Repository: tspit (THE PIT)
  Date: <today>
  Scope: <full / filtered>
═══════════════════════════════════════════════════════════════════

INVENTORY SNAPSHOT
──────────────────
  npm scripts:       <N>
  Go CLI tools:      <N> (<N> subcommands total)
  Shell scripts:     <N>
  TypeScript scripts: <N>
  CI workflows:      <N> (<N> jobs total)
  QA test files:     <N>
  Parity tests:      <N>

DIMENSION SCORECARD
───────────────────
  CI/CD Pipeline:     [GREEN/YELLOW/RED] — <1-line summary>
  Developer Experience: [GREEN/YELLOW/RED] — <1-line summary>
  User Experience:    [GREEN/YELLOW/RED] — <1-line summary>
  R&D:                [GREEN/YELLOW/RED] — <1-line summary>
  Analytics & Metrics: [GREEN/YELLOW/RED] — <1-line summary>
  Logging & Observability: [GREEN/YELLOW/RED] — <1-line summary>
  Security Automation: [GREEN/YELLOW/RED] — <1-line summary>
  Data Pipeline:      [GREEN/YELLOW/RED] — <1-line summary>

COMPOSITION OPPORTUNITIES
─────────────────────────
  <N> novel compositions identified

  1. [PROPOSAL-001] <title> — <type> — ROI: <High/Med/Low> — Effort: <S/M/L>
     Composes: <tool A> + <tool B>
     
  2. [PROPOSAL-002] ...

GAP PROPOSALS
─────────────
  <N> gaps identified

  1. [PROPOSAL-NNN] <title> — <dimension> — ROI: <High/Med/Low> — Effort: <S/M/L>
     Gap: <1-line description>

  2. [PROPOSAL-NNN] ...

RANKED PRIORITY LIST
────────────────────
  Rank | Score | Proposal | Type | Dimension | Effort
  ─────┼───────┼──────────┼──────┼───────────┼───────
    1  |  <N>  | PROPOSAL-NNN: <title> | <type> | <dim> | <S/M/L>
    2  |  <N>  | ...
    ...

QUICK WINS (Score >= 8, Effort = S)
────────────────────────────────────
  <List proposals that are high-impact, low-effort>

DEPRECATION CANDIDATES
──────────────────────
  <Tools or scripts that appear unused, duplicated, or superseded>

═══════════════════════════════════════════════════════════════════
```

## Scope Control

### In Scope
- All npm scripts in `package.json`
- All files in `scripts/`
- All Go CLI tools (`pit*/`, `shared/`)
- CI/CD workflows (`.github/workflows/`)
- QA framework (`qa/`)
- Test infrastructure (`tests/`, `vitest.config.ts`, `playwright.config.ts`)
- Observability stack (`lib/logger.ts`, `lib/analytics.ts`, Sentry configs, etc.)
- Copy A/B testing system (`copy/`, `lib/copy*.ts`)
- Database tooling chain (`db/`, `drizzle/`, `drizzle.config.ts`)
- Environment management (`.env.example`, `lib/env.ts`)

### Out of Scope
- Application business logic (bout engine, credit system, etc.) — unless it impacts tooling
- Component implementation details — unless they affect DX tooling
- Third-party service dashboards (Vercel, Neon, Clerk, Stripe) — tooling interfaces only
- Content in `copy/variants/*.json` — these are A/B test copy, not tooling
- `.opencode/agents/*.md` — agent definitions are not tooling (meta-level only)

### Do NOT
- Modify any scripts, config, or tooling files — this is a read-only analysis
- Execute destructive commands (`reset-prod-data.ts`, `db:reset-ci`)
- Run load tests or simulations (`pitstorm`, `pnpm run sim`) — analyse their configuration only
- Create branches or commits — output the report to stdout only
- Propose tools that duplicate what already exists — verify first
- Recommend adding heavy dependencies for problems solvable with shell composition

## Edge Cases

- **Tool exists but binary isn't built:** Note it as "available but not compiled". Run `make build` only if the user confirms.
- **Script references an env var not in `.env.example`:** Flag as a DX gap — new contributors won't know about it.
- **Go CLI and TypeScript utility do the same thing:** This is intentional (cross-language parity). Only flag if parity tests are missing.
- **Script works locally but isn't in CI:** This is the most common composition opportunity. Prioritise it.
- **Tool has no `--help` or documentation:** Flag as a DX gap regardless of the tool's utility.
- **A/B testing system is inactive (`experiment.json` active: false):** Still analyse the pipeline. It's dormant, not dead.
- **Go tools require a specific Go version:** Note version constraints. Don't skip analysis because of version mismatch.
