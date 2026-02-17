# Doc Drift

Lightweight triage of which documentation files may be stale given the current diff. Faster than /doc-audit — this identifies WHAT to check, not HOW to fix it.

## Usage

```text
/doc-drift                       # Scan staged + unstaged changes
/doc-drift "HEAD~3..HEAD"        # Scan a commit range
/doc-drift "main..HEAD"          # Scan branch diff against main
```

The argument `$ARGUMENTS` specifies a git diff range. If empty, scan the current working tree diff.

<principles>
  <principle>Speed over completeness. This is a 30-second triage, not a 30-minute audit. Flag potential drift, don't verify it.</principle>
  <principle>File patterns are deterministic. If a source file changed and it maps to a doc, the doc is potentially stale. No judgement needed.</principle>
  <principle>Tier by impact. Critical docs (README.md, CLAUDE.md, AGENTS.md, ARCHITECTURE.md) get flagged first.</principle>
  <principle>Actionable output. For each flagged doc, state WHY it might be stale and what to check.</principle>
</principles>

<process>
  <phase name="Gather the Diff" number="1">
    <commands>
```bash
# If $ARGUMENTS is a range:
git diff $ARGUMENTS --name-only --diff-filter=ACMRD

# If $ARGUMENTS is empty:
git diff --name-only --diff-filter=ACMRD
git diff --cached --name-only --diff-filter=ACMRD
git ls-files --others --exclude-standard
```
    </commands>
  </phase>

  <phase name="Load the Doc Drift Map" number="2">
    <commands>
```bash
cat .claude/data/doc-drift-map.yml
```
    </commands>
  </phase>

  <phase name="Match Patterns" number="3">
    <description>For each changed file, check if it matches any trigger pattern in the doc-drift-map. Collect all matching docs with their reasons.</description>
  </phase>

  <phase name="Output Report" number="4">
    <output-format>
```text
═══════════════════════════════════════════════════════════════════
  DOC DRIFT TRIAGE
  Diff: <range or "working tree">
  Files changed: <N>
  Docs potentially stale: <N>
═══════════════════════════════════════════════════════════════════

CRITICAL
────────
  README.md
    - db/schema.ts changed → table count may be stale
    - tests/unit/foo.test.ts added → test count badge may be stale

  CLAUDE.md
    - db/schema.ts changed → schema section may need column updates
    - package.json changed → commands section may be stale

HIGH
────
  app/api/README.md
    - app/api/preferences/route.ts added → endpoint inventory needs new entry

MEDIUM
──────
  ROADMAP.md
    - (no matches)

LOW
───
  pitctl/README.md
    - (no matches)

RECOMMENDATION
──────────────
  <N> docs flagged. Run /doc-audit "<list>" for a full accuracy check.
  Or manually verify the specific claims listed above.

═══════════════════════════════════════════════════════════════════
```
    </output-format>
  </phase>
</process>

<constraints>
  <constraint>Do not modify any files — this is read-only triage</constraint>
  <constraint>Do not verify whether the doc is actually stale — only flag that it MIGHT be</constraint>
  <constraint>Do not run /doc-audit automatically — only recommend it</constraint>
  <constraint>Always read the doc-drift-map from .claude/data/doc-drift-map.yml</constraint>
  <constraint>Complete in under 30 seconds — no code reading, no test running</constraint>
</constraints>

<edge-cases>
  <case trigger="No docs are potentially stale">Output "No documentation drift detected. Diff is isolated from documented claims." This is common for test-only or internal refactoring changes.</case>
  <case trigger="More than 5 critical docs flagged">This suggests a large structural change. Recommend a full /doc-audit.</case>
  <case trigger="A new file is created that has no mapping">Note it as "unmapped — consider adding to doc-drift-map.yml if this file type should trigger doc reviews."</case>
</edge-cases>
