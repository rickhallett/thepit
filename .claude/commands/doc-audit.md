# Documentation Accuracy Audit

Systematically verify every documentation file against the actual codebase, fix all inaccuracies, produce a PR with changes, and output a summary report to stdout highlighting assumptions and judgement calls.

## Usage

```
/doc-audit                    # Full audit of all docs
/doc-audit "CLAUDE.md"        # Audit a single file
/doc-audit "schema"           # Audit docs related to a topic
```

## Principles

1. **Code is truth.** When a doc and the code disagree, the code wins. Always.
2. **Verify, never infer.** Run a command to get the real number. Do not estimate, guess, or reuse a number from memory.
3. **Silent errors are the worst errors.** A doc that says "20 tables" when there are 22 misleads every future reader. Treat count drift as a bug.
4. **Flag ambiguity, don't hide it.** When code behavior is unclear or could be read multiple ways, document both interpretations and flag it in the report.
5. **Preserve intent.** Fix what's wrong. Don't rewrite what's correct but stylistically different from your preference.

## Process

### Phase 1: Establish Ground Truth

Run these commands and record every result. These numbers are your source of truth for the entire audit.

```bash
# Database schema
grep -c "pgTable(" db/schema.ts                           # Table count
grep "pgTable(" db/schema.ts | sed 's/.*= pgTable("//' | sed 's/".*//'  # Table names
grep "pgEnum(" db/schema.ts                                # Enum names

# Test counts
pnpm run test:unit 2>&1 | tail -20                        # Unit test count + pass/fail
find tests -name '*.test.ts' | wc -l                      # Unit test files
find tests -name '*.spec.ts' | wc -l                      # E2E spec files

# API routes
find app/api -name 'route.ts' | sort                      # All API endpoints

# Pages
find app -name 'page.tsx' -not -path '*/\[*' | sort       # Static pages
find app -name 'page.tsx' -path '*/\[*' | sort             # Dynamic pages

# Components
ls components/*.tsx 2>/dev/null | wc -l                    # Component count

# Environment variables
grep -c '^[A-Z]' .env.example                             # Env var count in template
grep -roh 'process\.env\.\w\+' app/ lib/ middleware.ts 2>/dev/null | sort -u  # Env vars used in code

# Package scripts
node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts).sort().join('\n'))"

# Presets
node -e "try{const p=require('./presets/index.json');console.log('index.json:',p.length)}catch(e){}" 2>/dev/null
ls presets/*.json 2>/dev/null | wc -l                      # Preset files

# Drizzle migrations
ls drizzle/*.sql 2>/dev/null | wc -l                       # Migration count
ls drizzle/*.sql 2>/dev/null                                # Migration names

# Go CLI tools
ls -d pit* shared 2>/dev/null                              # Go tool directories

# Copy system
ls copy/variants/*.json 2>/dev/null                        # Copy variants
cat copy/experiment.json 2>/dev/null                        # Active experiment config
```

Store these results. You will reference them repeatedly.

### Phase 2: Build the Document Inventory

Identify every documentation file in the repo:

```bash
# All markdown files
find . -name '*.md' -not -path './node_modules/*' -not -path './.git/*' | sort

# Env templates
find . -name '.env*example' | sort
```

Group them into audit tiers:

| Tier | Files | Rationale |
|------|-------|-----------|
| **Critical** | `CLAUDE.md`, `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `.env.example` | Read by every contributor and every AI agent. Inaccuracy here has multiplicative cost. |
| **High** | `app/README.md`, `app/api/README.md`, `components/README.md`, `lib/README.md`, `db/README.md`, `tests/README.md` | Per-directory READMEs that guide module-level work. |
| **Medium** | `docs/*.md` (specs, reviews, plans), `scripts/README.md`, `drizzle/README.md`, `presets/README.md`, `qa/README.md` | Reference material. Less frequently read but still authoritative. |
| **Low** | Go CLI READMEs (`pitctl/`, `pitforge/`, etc.), `.opencode/agents/*.md`, strategy docs | Specialized audiences. Less likely to cause cascading errors. |

If user specified a file or topic, filter to only matching files. Otherwise, audit all tiers.

### Phase 3: Systematic Cross-Check

For each documentation file, perform these checks in order:

#### A. Counts and Numbers
Every number in a doc must match reality:
- Table counts, column counts
- Test counts (unit, integration, e2e)
- Component counts
- API route counts
- Env var counts
- Preset counts
- Migration counts
- Script counts

**Method:** Search for digits and number words. For each, verify against Phase 1 ground truth.

#### B. Names and Identifiers
Every named entity must exist in the code:
- Table names, column names, enum values
- File paths and directory paths
- Function names, hook names, component names
- Environment variable names
- Script names (in package.json)
- API route paths

**Method:** For each name, verify it exists with `grep` or `find`. Check spelling exactly.

#### C. Behavioral Claims
Every claim about how something works must be verifiable:
- "Route X does Y" — read the route handler
- "Component X uses hook Y" — check the import
- "The credit system pre-authorizes on start" — read the bout engine code
- "Streaming uses custom event format" — check the actual event names

**Method:** Read the relevant source code. Compare the documented behavior to the actual implementation.

#### D. Command Accuracy
Every documented command must work:
- `pnpm run <script>` — verify script exists in package.json
- `drizzle-kit` commands — verify syntax is correct
- Shell commands — verify they produce described output

**Method:** Check `package.json` scripts. For shell commands, dry-run mentally or execute if safe.

#### E. Architecture Claims
Structural claims must reflect current reality:
- Directory purposes — verify by listing contents
- Import patterns — verify with grep
- Data flow descriptions — trace through code

#### F. Env Var Completeness
- Every `process.env.*` reference in code should appear in `.env.example`
- Every entry in `.env.example` should be used somewhere in code OR explicitly marked as deprecated
- Required vs optional classification must match actual behavior (does the app crash without it?)

### Phase 4: Categorize Findings

For each discrepancy found, categorize it:

| Category | Symbol | Description | Example |
|----------|--------|-------------|---------|
| **Factual Error** | `[ERROR]` | Doc states something provably wrong | "20 tables" when there are 22 |
| **Stale Reference** | `[STALE]` | Was true, no longer is | Deleted file still referenced |
| **Missing Coverage** | `[MISSING]` | Code exists with no doc mention | New API route not in README |
| **Ambiguous** | `[AMBIG]` | Could be read multiple ways | "optional" but app crashes without it |
| **Judgement Call** | `[JUDGE]` | Reasonable people could disagree | Whether to list internal-only routes in public docs |
| **Cosmetic** | `[STYLE]` | Formatting, not accuracy | Inconsistent heading levels |

### Phase 5: Apply Fixes

1. Create a new branch:
   ```bash
   git checkout master && git pull
   git checkout -b docs/accuracy-audit
   ```

2. Apply fixes file by file, committing each file (or logical group) separately:
   - Fix all `[ERROR]` items first — these are non-negotiable
   - Fix `[STALE]` items next
   - Add `[MISSING]` items
   - Resolve `[AMBIG]` items with your best judgement (and flag in report)
   - Apply `[STYLE]` fixes only if they improve clarity

3. For each commit, use Conventional Commits:
   ```
   docs(<scope>): fix <what was wrong>
   ```

4. Do NOT fix things that are not wrong. Do NOT rewrite prose for style.

### Phase 6: Verify

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
```

These must pass. Documentation changes should never break code, but verify anyway (e.g., JSDoc changes, .env.example changes affecting tests).

### Phase 7: Create PR

```bash
git push -u origin docs/accuracy-audit
gh pr create --title "docs: accuracy audit — fix N discrepancies across M files" --body "$(cat <<'EOF'
## Summary
Documentation accuracy audit verifying all docs against the actual codebase.

## Changes
- **Errors fixed:** <count>
- **Stale references updated:** <count>
- **Missing coverage added:** <count>
- **Ambiguities resolved:** <count>
- **Files modified:** <count>

## Methodology
Every number, file path, function name, command, and behavioral claim was verified
against the running codebase. See audit report in PR comments for full details.
EOF
)"
```

### Phase 8: Output Summary Report

After the PR is created, output the full audit report to stdout. This is the primary deliverable — the PR is the artifact, but the report is the reasoning.

Format:

```
═══════════════════════════════════════════════════════════════════
  DOCUMENTATION ACCURACY AUDIT REPORT
  Repository: tspit (THE PIT)
  Date: <today>
  Branch: docs/accuracy-audit
  PR: #<number>
═══════════════════════════════════════════════════════════════════

GROUND TRUTH SNAPSHOT
─────────────────────
  Tables:      <N>
  Tests:       <N> (unit) / <N> (e2e)
  API routes:  <N>
  Components:  <N>
  Env vars:    <N> (in .env.example) / <N> (in code)
  Scripts:     <N>
  Migrations:  <N>

FILES AUDITED
─────────────
  Critical:  <list>
  High:      <list>
  Medium:    <list>
  Low:       <list>

FINDINGS
────────

[ERROR] <file>:<line> — <description>
  Was: <what the doc said>
  Is:  <what the code actually does>
  Fix: <what was changed>

[STALE] <file>:<line> — <description>
  Was: <old reference>
  Now: <current state>
  Fix: <what was changed>

[MISSING] <file> — <description>
  Added: <what was added>

[AMBIG] <file>:<line> — <description>
  Interpretation A: <reading 1>
  Interpretation B: <reading 2>
  Decision: <which was chosen and why>

JUDGEMENT CALLS
───────────────
These items required subjective decisions. Document the reasoning
so the reviewer can override if they disagree.

  1. <file>:<line> — <what was ambiguous>
     Decision: <what was done>
     Reasoning: <why>
     Alternative: <what could have been done instead>

  2. ...

TRADE-OFFS
──────────
Where accuracy and other values conflicted:

  1. <description of conflict>
     Chose: <accuracy / brevity / consistency / etc.>
     Because: <reasoning>

STATISTICS
──────────
  Total findings:     <N>
  Errors fixed:       <N>
  Stale updated:      <N>
  Missing added:       <N>
  Ambiguities resolved: <N>
  Style fixes:         <N>
  Files modified:      <N>
  Lines changed:       +<added> / -<removed>

═══════════════════════════════════════════════════════════════════
```

## Scope Control

### In Scope
- All `.md` files in the repo (except `node_modules/`, `.git/`)
- `.env.example` and `.env.test.example`
- Accuracy of code references, counts, commands, and behavioral claims
- Completeness of schema, route, and env var documentation

### Out of Scope
- Go CLI tool implementations (audit READMEs against their help text only)
- Third-party documentation (Neon skill references in `.agents/`)
- Marketing/strategy docs (`docs/social-content-playbook.md`, etc.) — verify technical claims only
- Content in `copy/variants/*.json` — these are A/B test copy, not documentation

### Do NOT
- Rewrite docs for style when they are technically accurate
- Add new documentation sections (only fix existing content)
- Change the structure or organization of documents
- Remove documentation that is correct but seems unnecessary
- Touch code files (only documentation and config files)
- Create new files (only modify existing ones)

## Edge Cases

- **Doc references a feature that was removed:** Mark as `[STALE]`, remove the reference, add a note if the feature was recently removed
- **Doc describes planned behavior not yet implemented:** Mark as `[AMBIG]`, check ROADMAP.md. If it's listed as planned, leave it but add "planned" qualifier. If not on roadmap, remove.
- **Multiple docs disagree with each other:** Both can't be right. Check the code. Fix both to match reality.
- **Count changed since doc was last updated:** This is `[ERROR]`, not `[STALE]`. The doc was wrong the moment the count changed.
- **Env var exists in .env.example but is never read in code:** Mark as `[STALE]` if no `process.env` reference exists. Check if it's used by a dependency or build tool before removing.
