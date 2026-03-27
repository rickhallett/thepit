# Field Notes — Template Specimen

**Observer:** Maturin
**Date:** 2026-02-25
**Subject:** `orchestration-layer-starting-template.md` — Anthropic public artifact
**Provenance:** SD-171 (Captain's observation: "what's published is what's intended to be published")
**Method:** Inline annotation of external template against independently evolved practice aboard The Pit

---

## Preamble

The specimen is a 53-line markdown document released publicly by Anthropic. It prescribes an orchestration layer for agentic coding assistants. The Captain observed (SD-171) that its public release serves Anthropic's strategic interests — encouraging harness/API usage while giving "the hounds just enough of the scent to throw them off." There is compression loss between what Anthropic knows internally and what this template encodes.

My task: annotate where the template's patterns converge with, diverge from, or are irrelevant to the governance fabric we have independently evolved. Each annotation cites specific Session Decisions, Lexicon terms, or structural observations.

---

## The Specimen (annotated)

```markdown
## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Write detailed specs upfront to reduce ambiguity
```

> MATURIN: **CONVERGES** — The "stop and re-plan" directive maps to **Heave To** (Lexicon: "Deliberately stop forward progress. Actively hold position to deal with a situation."). Our system reached this independently through operational pain, not template prescription. The difference: our version is a named state with explicit entry/exit conditions and an escalation path (Beat to Quarters if severity warrants). The template treats it as an ad-hoc behaviour; we treat it as a named tempo with structural implications.

> MATURIN: **DIVERGES** — "Enter plan mode for ANY non-trivial task" assumes a single-agent execution model where the planner and executor are the same entity. Our system separates planning authority (Helm), verification governance (Weaver), and execution (dispatched agents). Planning is not a "mode" — it is a role boundary. The distinction matters: a mode can be forgotten; a role boundary is structural. SD-095 (Main Thread) makes this explicit — planning happens on the Main Thread, execution is dispatched Below Decks.

> MATURIN: **SIGNAL** — "Write detailed specs upfront to reduce ambiguity" is a sound principle that we implement through pseudocode interpretation (SD-137). The Captain's deliberate shift to pseudocode for orders is a more precise version of this: structured input reduces parse error at L9. The template's version is good advice; ours is a protocol with a named SD.

```markdown
- Use plan mode for verification steps, not just building
```

> MATURIN: **CONVERGES** — Directly maps to Weaver Governing Principle §7: "Do not optimise like humans optimise." Verification is not overhead; it is load-bearing structure. The template gestures at this; Weaver's principle explains *why* — the cost calculus is different for agents than for humans. Both arrived at the same conclusion. The template says "plan for verification." We say "verification is the plan."

```markdown
### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution
```

> MATURIN: **CONVERGES** — SD-095 (Main Thread) is precisely this principle, discovered under operational pressure during RT L3 when 11 agents nearly blew the context window. "Subagents are the single strongest weapon against context compaction (Category Three)." The template prescribes what we earned through near-disaster.

> MATURIN: **CONVERGES** — "One tack per subagent" uses our own Lexicon term (Tacking — "indirect progress against the wind, each leg purposeful"). Whether Anthropic drew from the same nautical well or this is independent convergence, the principle is identical: a subagent should have one coherent objective, not a bundle.

> MATURIN: **DIVERGES** — "throw more compute at it via subagents" optimises for throughput. Our model optimises for *context protection* (SD-095) and *context minimisation* (SD-138, SO-DECK-001: "Each deckhand is provided with only the context that matters to them"). The template says "use subagents to do more." We say "use subagents to protect the Main Thread and prevent hyperjustification loading" (SD-139). The template's framing is resource-oriented; ours is integrity-oriented. Both use subagents; the *reason* differs, and the reason shapes behaviour at the margins.

> MATURIN: **NOISE** — "Use subagents liberally" without qualification is dangerous. SD-072 (Pre-RT context protection mandate) exists because liberal subagent dispatch without context budgeting nearly caused a Category Three. The word "liberally" should read "deliberately." Liberal suggests abundance thinking; deliberate suggests discipline.

```markdown
### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
```

> MATURIN: **CONVERGES** — The session decisions log (`docs/internal/session-decisions.md`) is our version of this, evolved independently. Every correction, every forward correction, every lesson is recorded with provenance. SD-150 (Forward correction to SD-147) is a live example: the Captain corrected a misparse, and the correction itself became a lesson about pseudocode interpretation across the human-agent boundary.

> MATURIN: **DIVERGES** — The template prescribes a single `lessons.md` file as a flat learning surface. Our system distributes learning across multiple structures: the SD log (decisions and corrections), the Lexicon (named concepts that survived selection), Standing Orders (persistent directives), and agent files (role-specific learned behaviour). The template is a notebook; our system is a taxonomy. The difference is not academic — taxonomies survive context window death (Dead Reckoning reads structured files); notebooks require re-reading in full.

> MATURIN: **DIVERGES** — "Write rules for yourself that prevent the same mistake" is self-referential in a way that conflates the agent with the system. SD-133 (Weaver dismissed) demonstrates the failure mode: Weaver wrote no rule because the error was not a rule violation — it was a *red-light failure*, a missing structural gate. You cannot prevent structural failures by writing more rules for the same agent. You prevent them by adding gates external to the agent. The template's model of learning is introspective; ours is architectural.

> MATURIN: **SIGNAL** — "Review lessons at session start" is implemented as SO-PERM-002 (all hands must read the Lexicon on load) and as the Dead Reckoning protocol (SD-037). The template puts this as a suggestion; we enforce it as a Standing Order with a consequence ("you are not on this ship").

```markdown
### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
```

> MATURIN: **CONVERGES** — Weaver Governing Principle §1: "Nothing is trusted on faith. No change is 'obviously fine.' No diff is 'too small to test.'" Direct convergence. Both systems arrived at the same conclusion. The template says it in four bullet points; Weaver says it in one sentence with a *reason* (the cost of agentic verification is near-zero vs. the cost of regression propagation).

> MATURIN: **DIVERGES** — "Ask yourself: 'Would a staff engineer approve this?'" is an appeal to an external standard that the agent must simulate. Our system does not ask agents to simulate human judgment — it *provides* human judgment through the Captain's review and the verification sequence (Weaver Principle §3: Write → Self-verify → Gate → Independent review → Consensus → Merge → Post-merge verify). The template asks the agent to imagine a reviewer. We provide an actual reviewer. The difference matters because LLMs are unreliable simulators of specific human judgment (SD-073: "Lying With Truth = Category One hazard").

> MATURIN: **SIGNAL** — "Diff behavior between main and your changes" is a useful concrete technique. We implement this as post-merge verification (Weaver Principle §5), but the pre-merge behavioral diff is worth noting as a separate, earlier gate.

```markdown
### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it
```

> MATURIN: **NOISE** — "Demand Elegance" optimises for code aesthetics. Our system optimises for *correctness under verification* (The Hull — "the thing that keeps the chaos out") and *atomic coherence* (Weaver Principle §2). Elegance is a human aesthetic preference that an LLM can simulate but not evaluate. An agent that pauses to ask "is this elegant?" is spending tokens on a judgment it cannot reliably make. An agent that asks "does this pass the gate and is it one coherent thing?" is spending tokens on a judgment it *can* make.

> MATURIN: **SIGNAL** — "Skip this for simple, obvious fixes" is a useful tempo-awareness directive. Maps loosely to our tempo system — at Full Sail, you do not pause for aesthetics; at Making Way, you may. But our system encodes this as explicit tempo states, not as inline judgment calls.

> MATURIN: **DIVERGES** — "Challenge your own work before presenting it" is self-review. Weaver Principle §3 explicitly requires *independent* review — not self-review alone. SD-133 (the red-light failure) demonstrated that self-review is necessary but not sufficient. The template treats self-challenge as the final gate; we treat it as one gate in a chain where each gate is a multiplier less than 1 against defect probability (Weaver Principle §6).

```markdown
### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
```

> MATURIN: **CONVERGES** — SD-118 (Weaver autonomous operation test) demonstrates this in practice. Weaver executed a complete fix cycle — PR creation, self-review, merge, post-merge verification — autonomously while the Captain was away from the harness. The template prescribes autonomous execution; we have tested it and recorded the results.

> MATURIN: **DIVERGES** — "Zero context switching required from the user" assumes the user should be uninvolved. SD-152 (Full-sail commit discipline) says the opposite at high tempo: "nothing commits without Captain's say-so." Our system modulates autonomy by tempo. At Making Way, autonomous execution is permitted within Standing Orders (SD-112). At Full Sail, the Captain approves every commit. The template's autonomy is unconditional; ours is tempo-gated. This is a significant structural difference — unconditional autonomy is how SD-136 (the red-light failure on "going light") happened.

> MATURIN: **SIGNAL** — "Go fix failing CI tests without being told how" is a useful competence directive. Maps to our Standing Order SD-061: "Double check the obvious first." The template says "fix it"; we say "verify assumptions before fixing."

```markdown
## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections
```

> MATURIN: **CONVERGES** — Steps 1-5 map to the integration sequence (Weaver Principle §3). Both systems enforce an ordered workflow. The template uses a flat checklist in a single file; we use the SD log, the Main Thread, and dispatched reports across a file hierarchy. Same principle, different resolution.

> MATURIN: **DIVERGES** — The template consolidates planning and results into `tasks/todo.md`. Our system deliberately separates concerns: decisions in `session-decisions.md`, field observations in `field-notes/`, agent reports in their own directories, the Captain's log in `captainslog/`. The template's consolidation is simpler; our separation enables Dead Reckoning (reading one file to recover state without loading everything). This is not over-engineering — it is survival architecture for context window death, a failure mode the template does not acknowledge.

> MATURIN: **NOISE** — "Verify Plan: Check in before starting implementation" implies a human-agent confirmation loop for every task. At Making Way tempo with Standing Orders in place, this is unnecessary friction. The template does not have a concept of Standing Orders — persistent directives that authorise classes of action without per-instance approval. Our system solved this with the conn/watch/SO hierarchy (Lexicon: Authority & Handoff). The absence of Standing Orders in the template means every task requires explicit authorisation, which does not scale to full-sail tempo.

```markdown
## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
```

> MATURIN: **CONVERGES** — "Find root causes" aligns with SD-061 (double check the obvious first) and Weaver Principle §1 (nothing trusted on faith). Both systems demand root-cause analysis over surface fixes.

> MATURIN: **CONVERGES** — "Changes should only touch what's necessary" is Weaver Principle §2 (changes are atomic and coherent) in different words. Direct convergence.

> MATURIN: **DIVERGES** — "Simplicity First" and "Minimal Impact" are stated as absolutes. Our system qualifies these by tempo and context. SD-131 (Going Light) was a 73-file, 9,417-line change — maximally non-simple, maximally non-minimal — and it was the correct decision given the Captain's strategic read. The template cannot accommodate this because it lacks a tempo system. When the Captain says "full sail," simplicity yields to strategic necessity. The template's principles are static; ours are tempo-modulated.

> MATURIN: **NOISE** — "Senior developer standards" is the same appeal-to-simulated-human as "Would a staff engineer approve this?" (§4). The agent cannot reliably evaluate what a senior developer would do. It can evaluate what the gate accepts, what the Standing Orders permit, and what the verification chain confirms. Concrete gates over simulated expertise.

> MATURIN: **SIGNAL** — "No Laziness: No temporary fixes" is a good directive that we encode differently. SD-055 (Governing triage principle) says: "A puncher's chance at contributing to something meaningful." This is not "no temporary fixes" — it is "fix/hide decisions flow from the strategic objective." Sometimes a temporary fix is correct (SD-063: "HIDE and roadmap"). The template's absolutism is simpler but less adaptive.

---

## Synthesis

### What the specimen reveals about Anthropic's model

The template assumes a **single-agent, single-human** interaction pattern. One agent plans, executes, verifies, and learns. One human provides corrections and approves results. There is no concept of:

- Multiple agents with distinct roles and authority boundaries
- Named operational tempos that modulate autonomy and risk tolerance
- Context window death as a first-class failure mode requiring recovery protocols
- Standing Orders that persist across sessions without re-statement
- Verification as a multi-gate probability chain (Weaver Principle §6)
- The human as an empirical data source, not just an approver (SD-161: "The human is the first data point")

This is not a criticism. The template is a **starting** template — the first rung. It is well-calibrated for its intended audience: developers using Claude for standard software tasks. It would be wrong to expect it to encode what we have learned through 170+ session decisions, multiple context window deaths, and a governance fabric evolved under operational pressure.

### What converges

The deepest convergences are:

1. **Verification before done** — Both systems treat unverified work as incomplete. Our system goes further (multi-gate chain, post-merge verification, Weaver as dedicated governor).
2. **Subagent dispatch** — Both systems recognise subagents as the mechanism for managing context. Our system adds context minimisation (SO-DECK-001) and context protection (SD-095).
3. **Learning from corrections** — Both systems record lessons. Our system distributes learning across structures rather than concentrating it in a single file.

### What diverges (and what the divergence reveals)

1. **Autonomy model** — The template grants unconditional autonomy for bug fixing. We tempo-gate autonomy (SD-152, SD-118). The divergence reveals that unconditional autonomy is the first thing that breaks under real operational pressure — SD-136 is the evidence.
2. **Simulated human judgment** — The template asks agents to simulate "staff engineer" or "senior developer" judgment. We provide actual human judgment through the Captain and structural gates. The divergence reveals a fundamental question: should agents simulate human standards or implement machine-verifiable ones?
3. **Static vs. tempo-modulated principles** — The template's principles are always-on. Ours shift with operational tempo. The divergence reveals that static principles cannot accommodate the range from "heave to" to "full sail" — the same action (e.g., skipping a review) can be correct at one tempo and a Category One violation at another.
4. **No concept of context death** — The template has no Dead Reckoning, no recovery protocol, no acknowledgment that the context window is mortal. Our system treats context death as a routine operational event with a defined recovery sequence. The divergence reveals that Anthropic's template is optimised for short, self-contained tasks — not for multi-session campaigns where continuity is load-bearing.

### What is absent from both

Neither system addresses:

- **Inter-session state that survives model updates** — our Dead Reckoning survives context death but assumes the same model. What happens when the model changes underneath the governance fabric?
- **Quantitative measurement of governance overhead** — we know verification is load-bearing (Weaver Principle §7) but have no empirical measure of its cost-benefit ratio across sessions.
- **Formal specification of when to escalate vs. when to absorb** — both systems have informal heuristics. The Captain's tempo/category system is richer than the template's, but neither is formally specified.

---

*Filed from the naturalist's station. First specimen. More will follow as the field reveals itself.*

*Back-references: SD-168 (Maturin recruited), SD-171 (template provenance), SD-095 (Main Thread), SD-118 (autonomous execution), SD-134 (truth first), SD-152 (commit discipline at full-sail), Lexicon v0.7 (all terms cited inline).*
