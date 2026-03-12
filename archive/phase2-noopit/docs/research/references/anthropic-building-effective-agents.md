# Building Effective Agents — Anthropic (December 2024)

> Source: https://www.anthropic.com/research/building-effective-agents
> Retrieved: 2026-03-04
> Classification: D2 reference (read when topic is relevant)
> Authors: Erik Schluntz, Barry Zhang

---

## Key Principle

"Start with simple prompts, optimize them with comprehensive evaluation, and add multi-step agentic systems only when simpler solutions fall short."

Three core principles for agents:
1. Maintain **simplicity** in design
2. Prioritize **transparency** by showing planning steps
3. Carefully craft agent-computer interface (ACI) through thorough tool **documentation and testing**

---

## Taxonomy of Agentic Patterns

### Definitions

- **Workflows**: LLMs and tools orchestrated through **predefined code paths**
- **Agents**: LLMs **dynamically direct** their own processes and tool usage

### Pattern 1: Prompt Chaining

Task decomposed into sequence of steps. Each LLM call processes output of previous one. Programmatic checks ("gates") on intermediate steps.

**When to use:** Task cleanly decomposes into fixed subtasks. Trade latency for accuracy.

**Examples:** Generate copy → translate. Write outline → check criteria → write document.

### Pattern 2: Routing

Classify input, direct to specialized followup. Separation of concerns.

**When to use:** Distinct categories better handled separately. Classification is accurate.

**Examples:** Customer service query types → different processes. Easy questions → small model, hard → capable model.

### Pattern 3: Parallelization

Two variations:
- **Sectioning:** Break task into independent subtasks, run in parallel
- **Voting:** Run same task multiple times, get diverse outputs

**When to use:** Subtasks are parallelizable, or multiple perspectives needed for confidence.

**Examples (Sectioning):** Guardrails (one instance processes, another screens). Eval (each call evaluates different aspect).
**Examples (Voting):** Code vulnerability review (multiple prompts flag). Content moderation (multiple prompts, vote threshold).

### Pattern 4: Orchestrator-Workers

Central LLM dynamically breaks down tasks, delegates to worker LLMs, synthesizes results.

**When to use:** Complex tasks where subtasks can't be predicted. Key difference from parallelization: subtasks aren't pre-defined.

**Examples:** Coding products changing multiple files. Multi-source search and analysis.

### Pattern 5: Evaluator-Optimizer

One LLM generates, another evaluates and provides feedback in a loop.

**When to use:** Clear evaluation criteria exist. Iterative refinement provides measurable value. Good fit when: (1) human feedback demonstrably improves responses, (2) LLM can provide equivalent feedback.

**Examples:** Literary translation with nuance. Complex search requiring multiple rounds.

### Pattern 6: Autonomous Agents

LLMs using tools based on environmental feedback in a loop. Key capabilities: understanding complex inputs, reasoning/planning, using tools reliably, recovering from errors.

**Critical:** Agents must gain "ground truth" from the environment at each step (tool call results, code execution) to assess progress.

**When to use:** Open-ended problems, unpredictable step count, can't hardcode path, sufficient trust in decision-making.

**Warning:** "Higher costs, and the potential for compounding errors. We recommend extensive testing in sandboxed environments, along with the appropriate guardrails."

---

## Tool Design (ACI — Agent-Computer Interface)

> "We actually spent more time optimizing our tools than the overall prompt."

Principles:
- Give the model enough tokens to "think" before it writes itself into a corner
- Keep format close to naturally occurring text
- No formatting overhead (accurate line counts, string escaping)
- **Invest as much in ACI as in HCI**

Practical:
- Put yourself in the model's shoes — is tool usage obvious from description + parameters?
- Include example usage, edge cases, input format requirements, boundaries from other tools
- Test extensively — run many inputs, see mistakes, iterate
- **Poka-yoke** — change arguments so mistakes are harder to make
- Example: relative filepaths → absolute filepaths eliminated a class of errors

---

## Key Quotes for Reference

> "Consistently, the most successful implementations weren't using complex frameworks or specialized libraries. Instead, they were building with simple, composable patterns."

> "You should consider adding complexity *only* when it demonstrably improves outcomes."

> "It is therefore crucial to design toolsets and their documentation clearly and thoughtfully."

> "Ground truth from the environment at each step."

---

## Mapping to Our Framework

| Anthropic Pattern | Our Equivalent | Notes |
|---|---|---|
| Prompt chaining | Polecat pipeline (Makefile targets) | Sequential, gated |
| Parallelization (sectioning) | Bulk dispatch (this research run) | Independent subtasks |
| Orchestrator-workers | Weaver dispatch model | Central coordination |
| Evaluator-optimizer | No direct equivalent | We use gate + human review, not LLM-evaluator loops |
| Autonomous agents | Interactive Claude Code sessions | HODL mode |
| ACI design | Tool definitions in agent files | We do this but haven't named it |
| "Ground truth at each step" | "Do not infer what you can verify" | Convergent principle |
