# Agentic Engineering Archaeology Report

> Systematic survey of git log history profiling the evolution, use, dormancy, and gaps in agentic engineering patterns across the tspit codebase. Produced Feb 16 2026 from analysis of 571 commits across 10 days.

---

## I. Evolutionary Timeline (4 Distinct Phases)

### Phase 0: Genesis (Feb 7, commits 1-40)

The repository begins with `init: port over prior work from agentic sandbox and start over..` -- itself an agentic archaeology artifact. Day one already includes: credit system, presets, multi-model AI, structured agent prompts, on-chain DNA attestations (EAS on Base L2), and `CLAUDE.md`/`AGENTS.md`. The agentic layer was conceived *from the start*, not bolted on later.

### Phase 1: Product Build (Feb 8-11, commits ~40-200)

Rapid feature shipping: arena, research page, Stripe, clone/remix agents, leaderboard, reactions, admin tools, `pitctl` CLI. CI/CD with gate workflows. First agentic QA sweep (`fix: agentic QA sweep -- CSP, semantic HTML, table accessibility`). This is classic In-Loop (Phase 1 TAC) work -- human prompting agents to build features, but the gate and CI infrastructure are already closing the loop.

### Phase 2: Agentic Infrastructure Explosion (Feb 11-13, commits ~200-350)

A single burst produces: 9 agent personas for `.opencode/agents/`, `pitforge` CLI (scaffold/validate/lint/hash/diff/evolve/spar/catalog), `pitlab` research CLI, `pitbench` cost benchmarking, `pitnet` on-chain provenance, XML prompt refactoring, and the agent DNA cross-language parity tests. The entire Go CLI ecosystem materializes in ~48 hours. This is the moment the project crosses from "building a product" to "building systems that build systems."

### Phase 3: Operational Maturation (Feb 14-16, commits ~350-571)

Pitstorm (12-phase traffic simulator), Quartermaster agent, slash commands (`/doc-audit`, `/tooling-review`, `/security-audit`, `/create-worktree`), LangSmith evaluation pipeline, developer bootstrap, pre-destructive guards, pitlinear for Linear integration, and the conversion of slash commands to hybrid Markdown+XML format. The focus shifts from building tools to orchestrating them.

---

## II. What the Slash Commands Reveal

The 4 existing slash commands encode specific agent personas into procedural workflows:

| Command | Agent Persona | Loop Status |
|---------|--------------|-------------|
| `/doc-audit` | Scribe | **Closed loop**: Reads code -> verifies docs -> creates PR -> outputs report |
| `/tooling-review` | Quartermaster | **Open loop**: Reads code -> produces report -> but proposals require manual delegation |
| `/security-audit` | Sentinel | **Mostly closed**: Audits -> fixes -> writes tests -> but `continue-on-error: true` in CI weakens enforcement |
| `/create-worktree` | (Workflow) | **Closed loop**: Creates branches -> implements -> gates -> PRs -> merges -> cleans up |

**Pattern**: The commands that *produce artifacts* (PRs, code changes) close the loop. The commands that *produce reports* (proposals, analysis) leave the loop open for human decision-making.

---

## III. The 50 Self-Healing Triggers: Aspiration vs. Reality

Every `.opencode/agents/*.md` file defines 4-6 "self-healing triggers" -- condition-action rules. Total: **50 triggers across 10 agents**. This is genuinely novel. But there is a critical gap:

**These triggers are documented behavioral protocols, not runtime automation.** They require a human to invoke the right agent persona in the right context. The triggers describe what the agent *should* do when it detects a condition, but there is no mechanism to:

1. Automatically detect the conditions
2. Automatically invoke the correct agent
3. Verify the trigger was actually executed

This is the single largest "close the loop" opportunity in the codebase. These 50 triggers are a specification for an automation system that doesn't exist yet.

---

## IV. The Dormancy Gap

The most striking finding is the **engineering investment vs. operational use** gap:

| Tool | Engineering Investment | Evidence of Use |
|------|----------------------|-----------------|
| `pitstorm` | 12 phases, 26+ files, PR #188-#199 | Zero production runs |
| `pitforge evolve` | Full LLM-powered variant generation | Never run against a real agent |
| `pitlab` | 5 analysis commands, full dataset loading | Zero analysis outputs exist |
| `pitbench` | Cost/performance benchmarking, parity tests | Zero benchmark reports |
| `pitnet` | ABI encoding, 4 commands | Dry-run only; TypeScript `lib/eas.ts` does real work |
| Copy A/B system | 44 files refactored, middleware, analytics | `"active": false` in experiment.json |
| `research.yml` | Weekly cron workflow | No evidence of artifacts |
| `research-pipeline.sh` | 3-stage export->transform->analyze | Never called from CI |

**The Quartermaster's aspirational pipelines** (e.g., `pitstorm run -> pitlab engagement -> pitforge evolve -> pitstorm run`) document compositions that can't actually execute because the stdin-piping interfaces (`--stdin` flags) referenced in the agent file don't exist in the CLIs.

---

## V. Mapping to the TAC Framework

Using the TAC (Tactical Agentic Coding) framework, here is where tspit sits:

### Current State: Strong Phase 1, Emerging Phase 2

| TAC Concept | tspit Status | Evidence |
|-------------|-------------|---------|
| **Agentic Layer** (`.claude/commands/`, agent defs) | **Strong** | 4 slash commands, 10 agent personas, CLAUDE.md, AGENTS.md |
| **The Core Four** (Context, Model, Prompt, Tools) | **Strong** | XML prompt system, multi-model support, structured tool calling |
| **PETER Framework** (Prompt, Environment, Trigger, Review) | **Partial** | Strong P and E. Weak T (no automated triggers). Strong R (gate, CI) |
| **SDLC as Questions** | **Partial** | Plan (captain), Build (agents), Test (watchdog/CI), Review (gate). Document (scribe/doc-audit) |
| **Feedback Loops** | **Weakest area** | Gate closes the build loop. Everything else is open |
| **Isolation** | **Strong** | `/create-worktree` explicitly isolates per-issue work |
| **Out-Loop (AFK) Engineering** | **Not yet** | All agent invocations are human-initiated |
| **Zero Touch Engineering** | **Not yet** | No autonomous pipeline exists |

### Key TAC Gaps

1. **No Trigger mechanism**: The PETER "T" is missing. There's no way for an event (PR merged, schema changed, test count changed) to automatically invoke the right slash command or agent persona.

2. **No ADWs (AI Developer Workflows)**: The slash commands are the closest analog, but they're manual invocations. TAC envisions single-file scripts that compose agent invocations with verification steps.

3. **No Conditional Documentation**: TAC describes prompts that tell future agents which docs to read based on the task. The current `CLAUDE.md` is static context -- it doesn't adapt based on what the agent is doing.

---

## VI. Concrete Proposals for Closing Loops

### Proposal 1: Trigger-Based Agent Dispatch (PETER "T")

**The problem**: 50 self-healing triggers exist as documentation. No mechanism fires them.

**The solution**: A `/trigger-scan` slash command (or CI job) that evaluates all 50 trigger conditions against the current diff and outputs which agents should be invoked. This is a **metaprompt** -- a prompt that reads the trigger specifications and the git diff, then produces a list of agent invocations.

**Effort**: S (hours). **Impact**: Transforms 50 dormant triggers into an operational safety net.

**TAC principle**: This is the missing "T" in PETER.

### Proposal 2: Activate the Dormant Feedback Loops

**The problem**: `pitstorm`, `pitlab`, `pitforge evolve`, `pitbench` are built but never run.

**The solution**: Wire the Quartermaster's composition pipelines into actual executable scripts:

- `scripts/evolve-pipeline.sh`: `pitctl export --format jsonl | pitlab engagement --data /dev/stdin | pitforge evolve --metrics /dev/stdin`
- Requires: adding `--stdin` / `--data -` support to the Go CLIs (currently missing)

**Effort**: M (days). **Impact**: Activates the entire Go CLI ecosystem.

**TAC principle**: "Close the loop" -- output feeds input.

### Proposal 3: Self-Documenting Commits via Metaprompt

**The problem**: Doc drift is caught retroactively by `/doc-audit`. After every significant commit, the Scribe triggers *should* fire, but they don't.

**The solution**: A git `post-commit` hook (or CI step) that runs a lightweight metaprompt: "Given this diff, which documentation files might need updating?" If any are identified, it either creates an issue or auto-runs `/doc-audit` scoped to those files.

**Effort**: S (hours). **Impact**: Documentation stays perpetually accurate instead of requiring periodic audit sweeps.

**TAC principle**: Self-documenting systems.

### Proposal 4: ADW (AI Developer Workflow) Framework

**The problem**: The slash commands are powerful but manual. There's no way to chain them or run them as automated pipelines.

**The solution**: A `/run-adw` slash command or `scripts/adw-runner.ts` that executes a declared sequence:

```yaml
# .claude/adws/feature-complete.yml
steps:
  - command: /security-audit "new"
  - command: /doc-audit
  - gate: pnpm run test:ci
  - command: /tooling-review "compositions only"
```

This composes existing slash commands into a single invocation.

**Effort**: M (days). **Impact**: Moves from Phase 1 (manual) to Phase 2 (Out-Loop) engineering.

**TAC principle**: Composable agentic primitives.

### Proposal 5: Copy A/B Experiment Automation

**The problem**: The entire copy system (44 files, 3 variants, middleware routing, analytics) is built but `active: false`.

**The solution**: A `/toggle-experiment` command or `pitctl experiment toggle` that flips the experiment active/inactive, and a scheduled pipeline that reads engagement metrics and selects winners.

**Effort**: S (hours for toggle, M for auto-winner). **Impact**: Activates a dormant system that touches every user-facing page.

**TAC principle**: "Close the loop" on the measurement -> decision cycle.

### Proposal 6: Gate Consolidation Script

**The problem**: The "Verification Gate" concept from global `CLAUDE.md` is implemented as separate CI jobs (lint, typecheck, test:unit, go-gate, security), but there's no single `gate` command at the repo root. The global CLAUDE.md says to check for `gate`, `./bin/gate`, `make gate` -- none exist.

**The solution**: A `bin/gate` script that runs everything: `pnpm run lint && pnpm run typecheck && pnpm run test:unit && for d in pit*; do make -C "$d" gate; done`. One command, one exit code.

**Effort**: S (hours). **Impact**: Every agent session can verify correctness with a single command.

**TAC principle**: The Verification Gate must exist and return exit 0.

### Proposal 7: Metaprompt Library for Agent Persona Selection

**The problem**: A human must know which agent to invoke for which problem. The Captain's delegation matrix encodes this knowledge, but it's buried in a 500-line markdown file.

**The solution**: A `/delegate` slash command -- a true **metaprompt** -- that takes a task description and outputs which agent(s) should handle it, what slash commands to run, and what self-healing triggers to check afterward. This is the Captain's delegation matrix expressed as executable routing logic.

**Effort**: S (hours). **Impact**: Removes the human's need to memorize the agent system. Makes the 10-agent team self-navigating.

**TAC principle**: "Orchestration over execution."

---

## VII. The Metaprompting Opportunity

The TAC framework identifies metaprompting as "prompts that generate prompts" -- systems that modify their own behavior. tspit has several near-misses:

| What Exists | What's Missing | Metaprompt Opportunity |
|-------------|---------------|----------------------|
| 50 self-healing triggers (natural language) | No trigger evaluation engine | A prompt that reads triggers + diff and produces agent invocation commands |
| Captain delegation matrix | No automated routing | A prompt that takes a task description and produces delegation instructions |
| `pitforge evolve` (generates agent variants) | No performance-driven selection | A prompt that reads leaderboard data and decides which agents to evolve |
| `/doc-audit` (verifies docs against code) | Only runs when manually invoked | A prompt that detects doc-relevant changes and self-invokes |
| XML prompt composition (`buildXmlAgentPrompt`) | Static templates | Prompts that adapt their own structure based on agent performance data |
| Copy A/B generation (`copyGenerate.ts`) | No measurement-driven iteration | A prompt that reads engagement metrics and generates the next variant |

**The meta-pattern**: Every dormant system in the codebase is missing the same thing -- a **decision prompt** that evaluates conditions and routes to the appropriate action. The 50 triggers are the specification for these decision prompts. `pitforge evolve` is the execution engine. What's missing is the connective tissue: a metaprompt layer that reads state, evaluates conditions, and dispatches work.

---

## VIII. Summary Scorecard

| Dimension | State | Grade |
|-----------|-------|-------|
| Agent Personas & Roles | 10 agents, rich definitions, clear hierarchy | **A** |
| Slash Commands | 4 commands, well-structured, XML format | **B+** (need more, and need chaining) |
| Self-Healing Triggers | 50 triggers documented, zero automated | **C-** (specification exists, implementation doesn't) |
| Feedback Loops | Gate works. Everything else is open | **C** |
| Go CLI Ecosystem | 7 CLIs, extensive engineering, mostly dormant | **D** (built but unused) |
| Metaprompting | Near-zero explicit metaprompts | **D** |
| Out-Loop / AFK Engineering | Not yet possible | **F** |
| Zero Touch Engineering | Not yet possible | **F** |
| Self-Documenting | `/doc-audit` exists but manual | **C+** |
| Composability | Designed for composition, not yet composed | **C** |

**Overall**: The *architecture* for Phase 2/3 agentic engineering is exceptionally well-designed. The *activation energy* to actually close the loops is surprisingly low -- most of the hard engineering is done. What's missing is the thin connective tissue: trigger evaluation, stdin piping in Go CLIs, scheduled invocations, and a small number of metaprompts that route work to the right agent.

The single highest-leverage action is **Proposal 1: Trigger-Based Agent Dispatch** -- it transforms 50 dormant specifications into an operational safety net and demonstrates the metaprompting pattern that can be replicated across every other gap.
