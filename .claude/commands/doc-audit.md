# Documentation Accuracy Audit

Systematically verify every documentation file against the actual codebase, fix all inaccuracies, produce a PR with changes, and output a summary report to stdout highlighting assumptions and judgement calls.

## Usage

```
/doc-audit                    # Full audit of all docs
/doc-audit "CLAUDE.md"        # Audit a single file
/doc-audit "schema"           # Audit docs related to a topic
```

<principles>
  <principle>Code is truth. When a doc and the code disagree, the code wins. Always.</principle>
  <principle>Verify, never infer. Run a command to get the real number. Do not estimate, guess, or reuse a number from memory.</principle>
  <principle>Silent errors are the worst errors. A doc that says "20 tables" when there are 22 misleads every future reader. Treat count drift as a bug.</principle>
  <principle>Flag ambiguity, do not hide it. When code behavior is unclear or could be read multiple ways, document both interpretations and flag it in the report.</principle>
  <principle>Preserve intent. Fix what is wrong. Do not rewrite what is correct but stylistically different from your preference.</principle>
</principles>

<process>
  <phase name="Establish Ground Truth" number="1">
    <description>Run these commands and record every result. These numbers are your source of truth for the entire audit.</description>
    <commands>
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
    </commands>
    <critical>Store these results. You will reference them repeatedly.</critical>
  </phase>

  <phase name="Build the Document Inventory" number="2">
    <description>Identify every documentation file in the repo.</description>
    <commands>
```bash
# All markdown files
find . -name '*.md' -not -path './node_modules/*' -not -path './.git/*' | sort

# Env templates
find . -name '.env*example' | sort
```
    </commands>

    <tiers>
      <tier level="Critical" rationale="Read by every contributor and every AI agent. Inaccuracy here has multiplicative cost.">
        CLAUDE.md, AGENTS.md, README.md, ARCHITECTURE.md, .env.example
      </tier>
      <tier level="High" rationale="Per-directory READMEs that guide module-level work.">
        app/README.md, app/api/README.md, components/README.md, lib/README.md, db/README.md, tests/README.md
      </tier>
      <tier level="Medium" rationale="Reference material. Less frequently read but still authoritative.">
        docs/*.md (specs, reviews, plans), scripts/README.md, drizzle/README.md, presets/README.md, qa/README.md
      </tier>
      <tier level="Low" rationale="Specialized audiences. Less likely to cause cascading errors.">
        Go CLI READMEs (pitctl/, pitforge/, etc.), .opencode/agents/*.md, strategy docs
      </tier>
    </tiers>

    <rule>If user specified a file or topic, filter to only matching files. Otherwise, audit all tiers.</rule>
  </phase>

  <phase name="Systematic Cross-Check" number="3">
    <description>For each documentation file, perform these checks in order.</description>

    <check name="Counts and Numbers" id="A">
      <description>Every number in a doc must match reality: table counts, column counts, test counts (unit, integration, e2e), component counts, API route counts, env var counts, preset counts, migration counts, script counts.</description>
      <method>Search for digits and number words. For each, verify against Phase 1 ground truth.</method>
    </check>

    <check name="Names and Identifiers" id="B">
      <description>Every named entity must exist in the code: table names, column names, enum values, file paths, directory paths, function names, hook names, component names, environment variable names, script names (in package.json), API route paths.</description>
      <method>For each name, verify it exists with grep or find. Check spelling exactly.</method>
    </check>

    <check name="Behavioral Claims" id="C">
      <description>Every claim about how something works must be verifiable: "Route X does Y" — read the route handler. "Component X uses hook Y" — check the import. "The credit system pre-authorizes on start" — read the bout engine code. "Streaming uses custom event format" — check the actual event names.</description>
      <method>Read the relevant source code. Compare the documented behavior to the actual implementation.</method>
    </check>

    <check name="Command Accuracy" id="D">
      <description>Every documented command must work: pnpm run scripts — verify script exists in package.json. drizzle-kit commands — verify syntax is correct. Shell commands — verify they produce described output.</description>
      <method>Check package.json scripts. For shell commands, dry-run mentally or execute if safe.</method>
    </check>

    <check name="Architecture Claims" id="E">
      <description>Structural claims must reflect current reality: directory purposes — verify by listing contents. Import patterns — verify with grep. Data flow descriptions — trace through code.</description>
    </check>

    <check name="Env Var Completeness" id="F">
      <checklist>
        <item>Every process.env.* reference in code should appear in .env.example</item>
        <item>Every entry in .env.example should be used somewhere in code OR explicitly marked as deprecated</item>
        <item>Required vs optional classification must match actual behavior (does the app crash without it?)</item>
      </checklist>
    </check>
  </phase>

  <phase name="Categorize Findings" number="4">
    <categories>
      <category symbol="[ERROR]" name="Factual Error">Doc states something provably wrong. Example: "20 tables" when there are 22.</category>
      <category symbol="[STALE]" name="Stale Reference">Was true, no longer is. Example: Deleted file still referenced.</category>
      <category symbol="[MISSING]" name="Missing Coverage">Code exists with no doc mention. Example: New API route not in README.</category>
      <category symbol="[AMBIG]" name="Ambiguous">Could be read multiple ways. Example: "optional" but app crashes without it.</category>
      <category symbol="[JUDGE]" name="Judgement Call">Reasonable people could disagree. Example: Whether to list internal-only routes in public docs.</category>
      <category symbol="[STYLE]" name="Cosmetic">Formatting, not accuracy. Example: Inconsistent heading levels.</category>
    </categories>
  </phase>

  <phase name="Apply Fixes" number="5">
    <steps>
      <step>Create a new branch: git checkout master and git pull, then git checkout -b docs/accuracy-audit</step>
      <step>Fix all [ERROR] items first — these are non-negotiable</step>
      <step>Fix [STALE] items next</step>
      <step>Add [MISSING] items</step>
      <step>Resolve [AMBIG] items with your best judgement (and flag in report)</step>
      <step>Apply [STYLE] fixes only if they improve clarity</step>
      <step>Commit each file or logical group separately using Conventional Commits: docs(scope): fix what-was-wrong</step>
    </steps>
    <constraints>
      <constraint>Do NOT fix things that are not wrong</constraint>
      <constraint>Do NOT rewrite prose for style</constraint>
    </constraints>
  </phase>

  <phase name="Verify" number="6">
    <commands>
```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
```
    </commands>
    <rule>These must pass. Documentation changes should never break code, but verify anyway (e.g., JSDoc changes, .env.example changes affecting tests).</rule>
  </phase>

  <phase name="Create PR" number="7">
    <commands>
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
    </commands>
  </phase>

  <phase name="Output Summary Report" number="8">
    <description>After the PR is created, output the full audit report to stdout. This is the primary deliverable — the PR is the artifact, but the report is the reasoning.</description>
    <output-format>
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
    </output-format>
  </phase>
</process>

<scope>
  <in-scope>
    <item>All .md files in the repo (except node_modules/, .git/)</item>
    <item>.env.example and .env.test.example</item>
    <item>Accuracy of code references, counts, commands, and behavioral claims</item>
    <item>Completeness of schema, route, and env var documentation</item>
  </in-scope>

  <out-of-scope>
    <item>Go CLI tool implementations (audit READMEs against their help text only)</item>
    <item>Third-party documentation (Neon skill references in .agents/)</item>
    <item>Marketing/strategy docs (docs/social-content-playbook.md, etc.) — verify technical claims only</item>
    <item>Content in copy/variants/*.json — these are A/B test copy, not documentation</item>
  </out-of-scope>
</scope>

<constraints>
  <constraint>Do not rewrite docs for style when they are technically accurate</constraint>
  <constraint>Do not add new documentation sections (only fix existing content)</constraint>
  <constraint>Do not change the structure or organization of documents</constraint>
  <constraint>Do not remove documentation that is correct but seems unnecessary</constraint>
  <constraint>Do not touch code files (only documentation and config files)</constraint>
  <constraint>Do not create new files (only modify existing ones)</constraint>
</constraints>

<edge-cases>
  <case trigger="Doc references a feature that was removed">Mark as [STALE], remove the reference, add a note if the feature was recently removed.</case>
  <case trigger="Doc describes planned behavior not yet implemented">Mark as [AMBIG], check ROADMAP.md. If listed as planned, leave it but add "planned" qualifier. If not on roadmap, remove.</case>
  <case trigger="Multiple docs disagree with each other">Both cannot be right. Check the code. Fix both to match reality.</case>
  <case trigger="Count changed since doc was last updated">This is [ERROR], not [STALE]. The doc was wrong the moment the count changed.</case>
  <case trigger="Env var exists in .env.example but is never read in code">Mark as [STALE] if no process.env reference exists. Check if it is used by a dependency or build tool before removing.</case>
</edge-cases>
