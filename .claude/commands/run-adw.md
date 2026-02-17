# Run ADW (AI Developer Workflow)

Execute a declarative workflow from `.claude/adws/`. ADWs compose slash commands, shell gates, assertions, and prompts into named, repeatable pipelines. This is the transition from manual agent invocation to automated multi-step verification.

## Usage

```
/run-adw feature-complete           # Run .claude/adws/feature-complete.yml
/run-adw release-ready              # Run .claude/adws/release-ready.yml
/run-adw post-merge                 # Run .claude/adws/post-merge.yml
/run-adw feature-complete --dry-run # Show steps without executing
```

The argument `$ARGUMENTS` is the ADW name (without `.yml` extension) optionally followed by flags.

<principles>
  <principle>Sequential execution. Steps run in order. A failing gate or error-severity assertion halts the workflow. Warning-severity failures are logged and execution continues.</principle>
  <principle>Context is cumulative. Files listed in the top-level `context` array are read before step 1. Each step's output is available to subsequent steps via `save_as` variables.</principle>
  <principle>Gates are binary. Shell commands either exit 0 (PASS) or non-zero (FAIL). No interpretation needed.</principle>
  <principle>Assertions are evaluated by the agent. The agent reads the assertion text and the current state, then decides PASS or FAIL with a one-line reason.</principle>
  <principle>Slash commands are delegated. When a step has `command: /foo`, invoke that slash command as a sub-task. Capture its output for the summary.</principle>
  <principle>Transparency over magic. Every step's status (PASS/FAIL/SKIP) is shown in the final summary. Nothing runs silently.</principle>
</principles>

<process>
  <phase name="Parse Arguments" number="1">
    <description>
      Extract the ADW name and optional flags from $ARGUMENTS.

      Supported flags:
      - `--dry-run`: Show the workflow plan without executing any steps.
      - `--continue`: Continue past gate/assertion failures (override individual settings).
      - `--from N`: Start execution from step N (1-indexed). Prior steps show as [SKIP].

      Resolve the workflow file path: `.claude/adws/{name}.yml`
    </description>
  </phase>

  <phase name="Load and Validate" number="2">
    <description>
      Read the ADW YAML file. Validate against the schema in `.claude/data/adw-schema.yml`.

      Required fields: `name`, `description`, `steps` (non-empty).

      Perform variable substitution:
      1. Replace `${VAR}` references in step fields with values from the `env` map.
      2. As steps execute, replace `${save_as_name}` with stored outputs.
    </description>
    <commands>
```bash
cat .claude/adws/$ADW_NAME.yml
cat .claude/data/adw-schema.yml
```
    </commands>
  </phase>

  <phase name="Read Context Files" number="3">
    <description>
      If the workflow has a `context` array, read each file (or glob-expand and read).
      These provide shared context for all subsequent steps.
    </description>
  </phase>

  <phase name="Execute Steps" number="4">
    <description>
      For each step in the `steps` array, in order:

      **command step:**
      1. Print: `Step N: [RUNNING] {label}`
      2. Invoke the slash command as if the user typed it
      3. Capture the output
      4. If `save_as` is set, store the output under that variable name
      5. Print: `Step N: [PASS] {label}`
      Note: Command steps do not halt on failure unless wrapped in an assertion.

      **gate step:**
      1. Print: `Step N: [RUNNING] {label}`
      2. Execute the shell command
      3. If exit code is 0: `Step N: [PASS] {label}`
      4. If exit code is non-zero:
         - If `continue_on_failure` is true or `--continue` flag: `Step N: [FAIL] {label} — {error}`, continue
         - Otherwise: `Step N: [FAIL] {label} — {error}`, halt. Mark remaining steps as [SKIP].

      **assert step:**
      1. Print: `Step N: [RUNNING] {label}`
      2. Evaluate the assertion text against current state and prior step outputs
      3. If true: `Step N: [PASS] {label}`
      4. If false:
         - If `severity` is "warning": `Step N: [WARN] {label} — {reason}`, continue
         - If `severity` is "error" (default): `Step N: [FAIL] {label} — {reason}`, halt

      **prompt step:**
      1. Print: `Step N: [RUNNING] {label}`
      2. Execute the prompt as a free-form instruction
      3. Capture output; store if `save_as` is set
      4. Print: `Step N: [PASS] {label}`
    </description>
  </phase>

  <phase name="Output Summary" number="5">
    <output-format>
```
═══════════════════════════════════════════════════════════════════
  ADW: {name}
  Description: {description}
  Status: PASS | FAIL | PARTIAL
  Steps: {completed}/{total} ({failed} failed, {skipped} skipped)
═══════════════════════════════════════════════════════════════════

Step 1: [PASS] Trigger scan
Step 2: [PASS] No critical triggers
Step 3: [PASS] Doc drift triage
Step 4: [PASS] Lint + typecheck
Step 5: [FAIL] Unit tests — 3 tests failed in bout-engine.test.ts
Step 6: [SKIP] Security audit — halted by step 5
Step 7: [SKIP] Generate PR summary — halted by step 5

═══════════════════════════════════════════════════════════════════
  RESULT: FAIL at step 5
  Action: Fix failing tests, then re-run: /run-adw feature-complete --from 5
═══════════════════════════════════════════════════════════════════
```
    </output-format>
  </phase>
</process>

<dry-run-format>
  When `--dry-run` is specified, output the plan without executing:

```
═══════════════════════════════════════════════════════════════════
  ADW: {name} (DRY RUN)
  Description: {description}
  Steps: {total}
═══════════════════════════════════════════════════════════════════

Step 1: [command] /trigger-scan "${DIFF_RANGE}"
Step 2: [assert] No CRITICAL triggers fired (severity: error)
Step 3: [command] /doc-drift "${DIFF_RANGE}"
Step 4: [gate]   bin/gate --quick (timeout: 3m)
Step 5: [gate]   pnpm run test:unit (timeout: 10m)
Step 6: [command] /security-audit "new"
Step 7: [prompt] Summarize all results into a PR-ready checklist

Context files: AGENTS.md, ARCHITECTURE.md
Variables: DIFF_RANGE=origin/master...HEAD

═══════════════════════════════════════════════════════════════════
```
</dry-run-format>

<constraints>
  <constraint>Always read the ADW file from .claude/adws/, never from memory</constraint>
  <constraint>Always read the schema from .claude/data/adw-schema.yml to validate</constraint>
  <constraint>Never skip steps silently — every step must appear in the summary with its status</constraint>
  <constraint>Gate commands run in the repository root directory</constraint>
  <constraint>Gate timeouts are advisory — note if a gate is taking unusually long</constraint>
  <constraint>Command steps invoke slash commands; do not re-implement their logic</constraint>
  <constraint>If the ADW file does not exist, list available ADWs and exit</constraint>
</constraints>

<edge-cases>
  <case trigger="ADW file not found">
    List all `.yml` files in `.claude/adws/` and suggest the closest match.
    Output: "ADW '{name}' not found. Available ADWs: feature-complete, release-ready, post-merge"
  </case>
  <case trigger="ADW has no steps">
    Output: "ADW '{name}' has no steps defined. Nothing to execute."
  </case>
  <case trigger="Variable substitution fails (undefined variable)">
    Halt before executing. Output: "Undefined variable '${VAR}' in step N. Define it in the 'env' section or a prior step's 'save_as'."
  </case>
  <case trigger="--from N where N > total steps">
    Output: "Cannot start from step N — workflow only has M steps."
  </case>
  <case trigger="All steps pass">
    Status is PASS. Output includes a congratulatory note: "All {N} steps passed. Workflow complete."
  </case>
  <case trigger="Some steps fail but continue_on_failure is set">
    Status is PARTIAL. List all failures in the summary.
  </case>
</edge-cases>
