# Delegate

Route a task description to the correct agent(s), slash commands, and context files. This is the Captain's delegation matrix expressed as executable routing logic — a metaprompt that removes the need to memorize the 10-agent system.

## Usage

```
/delegate "fix the streaming bug where turns overlap"
/delegate "add a new API endpoint for user preferences"
/delegate "update all stale counts in documentation"
/delegate "harden the BYOK key storage"
/delegate "refactor the credit system to use a new pricing model"
```

The argument `$ARGUMENTS` is a natural language task description.

<principles>
  <principle>Route by expertise, not by keyword alone. Read the delegation matrix for semantic matching, not just string matching.</principle>
  <principle>Always include context files. An agent without context is blind. List the files they should read FIRST, before writing any code.</principle>
  <principle>Multi-agent tasks need sequencing. If a task spans multiple agents, specify the order: who goes first, what they produce, and who consumes it.</principle>
  <principle>Slash commands are accelerators. If a slash command covers the task, recommend it. The agent can always do more, but the command gives them structure.</principle>
  <principle>Self-healing triggers are post-conditions. After the task is done, list which triggers should be checked to verify nothing was missed.</principle>
</principles>

<process>
  <phase name="Load Routing Data" number="1">
    <commands>
```bash
cat .claude/data/delegation-matrix.yml
cat .claude/data/trigger-manifest.yml
```
    </commands>
  </phase>

  <phase name="Parse Task Description" number="2">
    <description>
      Analyze $ARGUMENTS to determine:
      - Task type (feature, bug fix, security, docs, refactor, infra, testing, observability, tooling)
      - Affected domain (bout engine, credits, UI, schema, API routes, prompts, CLI tools)
      - Scope (single file, single module, cross-cutting)
      - Urgency signals (words like "broken", "vulnerability", "production", "urgent")
    </description>
  </phase>

  <phase name="Match Routing Rules" number="3">
    <description>
      Compare the parsed task against routing_rules in delegation-matrix.yml.
      Score each rule by keyword overlap and semantic similarity.
      Select the best-matching rule(s).

      If multiple rules match equally:
      - Prefer the more specific rule over the general one
      - If still tied, use the merge_order to determine primary
    </description>
  </phase>

  <phase name="Determine Agent Assignment" number="4">
    <description>
      From the matched routing rule(s):
      - Identify the primary agent
      - Identify support agents and their specific roles
      - Identify relevant slash commands
      - Collect context files (union of all matched rules)
    </description>
  </phase>

  <phase name="Identify Post-Completion Triggers" number="5">
    <description>
      From trigger-manifest.yml, identify which triggers should be checked AFTER the task is complete.
      These act as post-conditions — verification that the change didn't break anything the agent system cares about.
    </description>
  </phase>

  <phase name="Output Delegation Plan" number="6">
    <output-format>
```
═══════════════════════════════════════════════════════════════════
  DELEGATION PLAN
  Task: <$ARGUMENTS>
═══════════════════════════════════════════════════════════════════

ASSIGNMENT
──────────
  Primary:  <agent name> — <role description>
  Support:  <agent name> — <specific contribution>
            <agent name> — <specific contribution>

SLASH COMMANDS
──────────────
  <list of recommended commands, or "None — implement directly">

CONTEXT FILES (read these first, in order)
──────────────────────────────────────────
  1. <file path> — <why this file matters for this task>
  2. <file path> — <why>
  3. ...

IMPLEMENTATION SEQUENCE
───────────────────────
  <If single agent>
  1. Read context files
  2. Implement changes
  3. Run gate: bin/gate
  4. Check post-completion triggers

  <If multi-agent>
  1. <Agent A>: <what they do first>
  2. <Agent B>: <what they do after Agent A>
  3. Merge order: <sequence>

POST-COMPLETION TRIGGERS
────────────────────────
  After this task is done, verify these triggers are satisfied:
  - <trigger.id>: <condition to check>
  - <trigger.id>: <condition to check>

═══════════════════════════════════════════════════════════════════
```
    </output-format>
  </phase>
</process>

<constraints>
  <constraint>Do not implement the task — only plan the delegation</constraint>
  <constraint>Do not modify any files</constraint>
  <constraint>Always read delegation-matrix.yml and trigger-manifest.yml from .claude/data/, never from memory</constraint>
  <constraint>If the task is ambiguous, state the ambiguity and provide two alternative delegation plans</constraint>
  <constraint>Always include bin/gate in the implementation sequence</constraint>
</constraints>

<edge-cases>
  <case trigger="Task spans more than 3 agents">Recommend breaking into sub-tasks, one per agent. Reference /create-worktree for isolation.</case>
  <case trigger="Task doesn't match any routing rule">Fall back to Captain as primary. State that the delegation matrix may need a new routing rule for this task type.</case>
  <case trigger="Task is purely exploratory (no code changes expected)">Assign to Quartermaster for analysis. No post-completion triggers needed.</case>
  <case trigger="Task mentions a specific agent by name">Honour the explicit assignment but still list support agents and triggers.</case>
</edge-cases>
