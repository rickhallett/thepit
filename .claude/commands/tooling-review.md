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

<principles>
  <principle>Compose before building. If two existing tools can be piped together to solve a problem, that is always preferred over writing a new tool. The best new tool is the one you did not have to write.</principle>
  <principle>ROI is the filter. Every proposal must justify its existence in terms of effort vs. impact. "Nice to have" is not a reason.</principle>
  <principle>Verify the inventory. Run commands to confirm what exists. Do not rely on documentation — it drifts. Count scripts, list CLIs, read Makefiles.</principle>
  <principle>Respect ownership. Quartermaster proposes; other agents implement. Never modify scripts, CI config, or tooling directly — delegate.</principle>
  <principle>Think in pipelines. The most powerful tools are the ones that accept stdin and produce stdout. Every recommendation should consider composability.</principle>
  <principle>Cross-language is a feature. The Go CLI ecosystem exists alongside TypeScript for a reason — offline analysis, admin operations, cross-language parity. Honour both.</principle>
</principles>

<process>
  <phase name="Inventory Ground Truth" number="1">
    <description>Run these commands and record every result. These are your source of truth.</description>
    <commands>
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
    </commands>
    <critical>Store all results. You will reference them throughout the audit.</critical>
  </phase>

  <phase name="Dependency and Composition Mapping" number="2">
    <description>Build a mental model of how tools relate to each other.</description>

    <subphase name="Data Flow Map" id="2a">
      <description>
        For each tool, identify:
        - Inputs: What data does it consume? (files, env vars, stdin, API responses, database)
        - Outputs: What does it produce? (stdout, files, database writes, HTTP calls, exit codes)
        - Format: What data format? (JSON, JSONL, TSV, plain text, HTML, SQL)

        Record tools that share data formats — these are composition candidates.
      </description>
    </subphase>

    <subphase name="Invocation Map" id="2b">
      <description>
        For each tool, identify who calls it:
        - Manual: Developer runs from terminal
        - CI: Called by GitHub Actions
        - Script: Called by another script
        - Scheduled: Runs on a timer/cron
        - Never: Tool exists but has no known caller

        Tools that are "Manual only" but could be "CI" are automation candidates.
        Tools that are "Never" called need investigation — are they dead code or just undiscovered?
      </description>
    </subphase>

    <subphase name="Cross-Language Parity Map" id="2c">
      <description>
        For each piece of logic that exists in both TypeScript and Go:
        - Is there a parity test? (e.g., dna_parity_test.go, pricing_parity_test.go)
        - Are they in sync?
        - Could one be deprecated in favour of the other?
      </description>
      <commands>
```bash
# Known parity tests
find pit* -name '*parity*' 2>/dev/null
```
      </commands>
    </subphase>
  </phase>

  <phase name="Composition Analysis" number="3">
    <description>Look for novel ways to chain existing tools.</description>

    <subphase name="Pipeline Opportunities" id="3a">
      <description>Can tool A's output feed directly into tool B's input?</description>
      <commands>
```bash
# Example: export → analysis pipeline
# pitctl export --format jsonl | pitlab summary --stdin

# Example: stress test → cost report
# pitstorm run --dry-run | pitbench estimate --stdin

# Example: agent evolution loop
# pitforge catalog --json | pitlab engagement --agents-stdin | pitforge evolve --metrics-stdin
```
      </commands>
      <checklist>
        <item>Do the data formats actually match?</item>
        <item>Does the downstream tool accept stdin?</item>
        <item>Is the composition useful (solves a real problem)?</item>
      </checklist>
    </subphase>

    <subphase name="Gate Extensions" id="3b">
      <description>What should be in the CI gate but is not?</description>
      <commands>
```bash
# Current gate
pnpm run test:ci  # lint → typecheck → unit → integration

# Missing from gate?
# - Go tool gates: make -C pitctl gate && make -C pitforge gate
# - Security scan: pnpm run security:scan
# - Dependency audit: pnpm audit --audit-level=high
# - Sanity check: scripts/sanity-check.sh (post-build)
```
      </commands>
    </subphase>

    <subphase name="Feedback Loops" id="3c">
      <description>Where does output from one phase feed back into a subsequent phase?</description>
      <examples>
        <example>Deploy → Smoke test → Alert (if fails) → Auto-rollback?</example>
        <example>Simulation → Analysis → Agent evolution → Re-simulation?</example>
        <example>A/B copy deploy → Engagement metrics → Winner selection → Copy update?</example>
      </examples>
    </subphase>

    <subphase name="Missing Glue Scripts" id="3d">
      <description>Are there two tools that would compose perfectly with a 10-line shell script between them?</description>
    </subphase>
  </phase>

  <phase name="Gap Analysis" number="4">
    <description>For each of the 8 dimensions, score the current state and identify gaps.</description>

    <scoring-rubric>
      <score level="Green">Well-served. Automation exists, runs in CI, produces actionable output.</score>
      <score level="Yellow">Partially served. Tools exist but require manual invocation, are disconnected, or have coverage gaps.</score>
      <score level="Red">Critical gap. No tooling exists for a high-value use case.</score>
    </scoring-rubric>

    <dimensions>
      <dimension name="CI/CD Pipeline">Are all quality checks automated? Are deployments verified?</dimension>
      <dimension name="Developer Experience">How fast is onboarding? Is the dev loop tight? Are errors clear?</dimension>
      <dimension name="User Experience">Are A/B tests measurable? Are engagement metrics actionable?</dimension>
      <dimension name="Research and Development">Can we run experiments, collect data, and analyse results in a pipeline?</dimension>
      <dimension name="Analytics and Metrics">Is there a single-pane view of system health, user behaviour, and business metrics?</dimension>
      <dimension name="Logging and Observability">Is request tracing end-to-end? Are logs structured and searchable?</dimension>
      <dimension name="Security Automation">Are security checks in CI? Are anomalies detected and escalated?</dimension>
      <dimension name="Data Pipeline and Export">Are backups automated? Are exports reproducible? Is data retention managed?</dimension>
    </dimensions>

    <gap-assessment>
      For each Yellow or Red dimension, identify the specific gap and assess:
      - What existing primitives partially cover it?
      - What is missing?
      - What is the effort to close the gap?
      - What is the impact of closing it?
    </gap-assessment>
  </phase>

  <phase name="Proposals" number="5">
    <description>For each identified composition or gap, write a formal proposal.</description>
    <proposal-template>
### PROPOSAL-NNN: [Title]

**Dimension:** [CI/CD | DX | UX | R&amp;D | Analytics | Logging | Security | Data]
**Type:** [Composition | New Primitive | Enhancement | Deprecation]
**ROI:** [High | Medium | Low] — [1-sentence justification]
**Effort:** [S (hours) | M (days) | L (weeks)]

#### Problem
[What is missing, broken, or suboptimal. Be specific.]

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
    </proposal-template>
  </phase>

  <phase name="Rank and Prioritise" number="6">
    <description>Sort all proposals by a composite score.</description>
    <formula>Score = (Impact x 3) + (Composition x 2) - (Effort x 1)</formula>
    <variables>
      <variable name="Impact">3 = solves a critical gap, 2 = meaningful improvement, 1 = incremental</variable>
      <variable name="Composition">3 = pure composition (no new code), 2 = thin glue script, 1 = new tool, 0 = large new system</variable>
      <variable name="Effort">3 = weeks, 2 = days, 1 = hours</variable>
    </variables>
    <rule>Higher score = higher priority.</rule>
  </phase>

  <phase name="Output Report" number="7">
    <output-format>
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
    </output-format>
  </phase>
</process>

<scope>
  <in-scope>
    <item>All npm scripts in package.json</item>
    <item>All files in scripts/</item>
    <item>All Go CLI tools (pit*/, shared/)</item>
    <item>CI/CD workflows (.github/workflows/)</item>
    <item>QA framework (qa/)</item>
    <item>Test infrastructure (tests/, vitest.config.ts, playwright.config.ts)</item>
    <item>Observability stack (lib/logger.ts, lib/analytics.ts, Sentry configs, etc.)</item>
    <item>Copy A/B testing system (copy/, lib/copy*.ts)</item>
    <item>Database tooling chain (db/, drizzle/, drizzle.config.ts)</item>
    <item>Environment management (.env.example, lib/env.ts)</item>
  </in-scope>

  <out-of-scope>
    <item>Application business logic (bout engine, credit system, etc.) — unless it impacts tooling</item>
    <item>Component implementation details — unless they affect DX tooling</item>
    <item>Third-party service dashboards (Vercel, Neon, Clerk, Stripe) — tooling interfaces only</item>
    <item>Content in copy/variants/*.json — these are A/B test copy, not tooling</item>
    <item>.opencode/agents/*.md — agent definitions are not tooling (meta-level only)</item>
  </out-of-scope>
</scope>

<constraints>
  <constraint>Do not modify any scripts, config, or tooling files — this is a read-only analysis</constraint>
  <constraint>Do not execute destructive commands (reset-prod-data.ts, db:reset-ci)</constraint>
  <constraint>Do not run load tests or simulations (pitstorm, pnpm run sim) — analyse their configuration only</constraint>
  <constraint>Do not create branches or commits — output the report to stdout only</constraint>
  <constraint>Do not propose tools that duplicate what already exists — verify first</constraint>
  <constraint>Do not recommend adding heavy dependencies for problems solvable with shell composition</constraint>
</constraints>

<edge-cases>
  <case trigger="Tool exists but binary is not built">Note it as "available but not compiled". Run make build only if the user confirms.</case>
  <case trigger="Script references an env var not in .env.example">Flag as a DX gap — new contributors will not know about it.</case>
  <case trigger="Go CLI and TypeScript utility do the same thing">This is intentional (cross-language parity). Only flag if parity tests are missing.</case>
  <case trigger="Script works locally but is not in CI">This is the most common composition opportunity. Prioritise it.</case>
  <case trigger="Tool has no --help or documentation">Flag as a DX gap regardless of the tool's utility.</case>
  <case trigger="A/B testing system is inactive (experiment.json active: false)">Still analyse the pipeline. It is dormant, not dead.</case>
  <case trigger="Go tools require a specific Go version">Note version constraints. Do not skip analysis because of version mismatch.</case>
</edge-cases>
