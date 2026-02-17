# Trigger Scan

Evaluate all 51 self-healing triggers against the current diff and output which agents should be invoked. This is the PETER "T" — the missing Trigger mechanism that transforms 51 dormant behavioral protocols into an operational safety net.

## Usage

```
/trigger-scan                    # Scan staged + unstaged changes
/trigger-scan "HEAD~3..HEAD"     # Scan a commit range
/trigger-scan "main..HEAD"       # Scan branch diff against main
```

The argument `$ARGUMENTS` specifies a git diff range. If empty, scan the current working tree diff.

<principles>
  <principle>File patterns are the primary signal. If a diff touches files matching a trigger's file_patterns, that trigger is a candidate. No file match = no fire.</principle>
  <principle>False negatives are worse than false positives. When in doubt, include the trigger. The agent can dismiss it; a missed trigger cannot self-correct.</principle>
  <principle>Context flows top-down. The trigger manifest (.claude/data/trigger-manifest.yml) is the source of truth. The agent definitions (.opencode/agents/*.md) provide detail if needed.</principle>
  <principle>Output is actionable. Each fired trigger must include: which agent, why it fired, what the agent should verify, and what command to run.</principle>
</principles>

<process>
  <phase name="Gather the Diff" number="1">
    <commands>
```bash
# If $ARGUMENTS is a range:
git diff $ARGUMENTS --name-only --diff-filter=ACMRD

# If $ARGUMENTS is empty (working tree):
git diff --name-only --diff-filter=ACMRD
git diff --cached --name-only --diff-filter=ACMRD
git ls-files --others --exclude-standard
```
    </commands>
    <output>A deduplicated list of changed file paths.</output>
  </phase>

  <phase name="Load the Trigger Manifest" number="2">
    <description>Read .claude/data/trigger-manifest.yml. This contains all 51 triggers with their file_patterns.</description>
    <commands>
```bash
cat .claude/data/trigger-manifest.yml
```
    </commands>
  </phase>

  <phase name="Match Triggers" number="3">
    <description>For each trigger in the manifest, check if ANY changed file matches ANY of the trigger's file_patterns (glob match). A trigger fires if at least one pattern matches at least one changed file.</description>

    <matching-rules>
      <rule>Glob patterns use standard glob syntax: * matches within a directory, ** matches across directories.</rule>
      <rule>A trigger fires if ANY of its file_patterns matches ANY changed file.</rule>
      <rule>Multiple triggers from the same agent should be grouped in output.</rule>
      <rule>Triggers from different agents that fire on the same file should all be included.</rule>
    </matching-rules>
  </phase>

  <phase name="Rank and Deduplicate" number="4">
    <description>Rank fired triggers by severity and agent priority.</description>

    <ranking>
      <rank level="1" label="CRITICAL">sentinel triggers — security implications</rank>
      <rank level="2" label="HIGH">architect, foreman triggers — structural implications</rank>
      <rank level="3" label="MEDIUM">watchdog, lighthouse, scribe triggers — quality implications</rank>
      <rank level="4" label="LOW">janitor, quartermaster, artisan triggers — hygiene implications</rank>
      <rank level="5" label="INFO">captain triggers — coordination implications</rank>
    </ranking>
  </phase>

  <phase name="Output Report" number="5">
    <output-format>
```
═══════════════════════════════════════════════════════════════════
  TRIGGER SCAN REPORT
  Diff: <range or "working tree">
  Files changed: <N>
  Triggers fired: <N> / 51
  Agents involved: <list>
═══════════════════════════════════════════════════════════════════

FIRED TRIGGERS
──────────────

[CRITICAL] sentinel.5 — XML prompt builder modified
  Matched: lib/xml-prompt.ts
  Action: Verify xmlEscape() covers all 5 XML-special chars.
          Verify wrapPersona() backwards-compatible.
          Run: pnpm vitest tests/unit/xml-prompt.test.ts

[HIGH] architect.1 — Bout engine modified
  Matched: lib/bout-engine.ts
  Action: Verify SSE event order preserved.
          Verify credit preauth before streaming.
          Run: pnpm vitest tests/api/run-bout*.test.ts

[MEDIUM] watchdog.5 — API route handler modified
  Matched: app/api/run-bout/route.ts
  Action: Check if existing tests cover changed behavior.
          Add tests for new branches.

[MEDIUM] scribe.1 — Schema modified
  Matched: db/schema.ts
  Action: Update CLAUDE.md schema section.
          Update ARCHITECTURE.md data model.
          Update README.md table count.

[LOW] quartermaster.1 — New script in package.json
  Matched: package.json
  Action: Verify script documented in scripts/README.md.
          Check if it should be in test:ci gate.

NOT FIRED (51 - <N> = <M> triggers did not match)
──────────────────────────────────────────────────
  <summary of why — e.g., "No changes to middleware.ts (sentinel.3)">

RECOMMENDED AGENT SEQUENCE
──────────────────────────
  1. sentinel — security review of XML changes
  2. architect — verify bout engine integrity
  3. watchdog — expand test coverage
  4. scribe — update documentation

═══════════════════════════════════════════════════════════════════
```
    </output-format>
  </phase>
</process>

<constraints>
  <constraint>Do not modify any files — this is a read-only analysis</constraint>
  <constraint>Do not run tests — only recommend which tests to run</constraint>
  <constraint>Do not invoke other slash commands — only recommend which to run</constraint>
  <constraint>Always read the trigger manifest from .claude/data/trigger-manifest.yml, never from memory</constraint>
</constraints>

<edge-cases>
  <case trigger="No triggers fire">Output "No triggers fired. Diff is isolated from all monitored patterns." This is a valid result for pure documentation or test-only changes.</case>
  <case trigger="More than 10 triggers fire">This suggests a large structural change. Recommend running /security-audit and /doc-audit as a precaution.</case>
  <case trigger="Trigger fires but the change is clearly benign (e.g., comment-only)">Still report it. Let the agent decide if the trigger is a false positive. Note "likely benign" in the output.</case>
</edge-cases>
