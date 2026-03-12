# Task 07: Write - Step 2: Agent Architecture Patterns

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 03 (external refs for Step 2), Task 06 (Step 1 written - dependency per graph)
**Parallelizable with:** Task 08 (Step 3) - both depend only on Step 1
**Output:** `docs/bootcamp/step02-agent-architecture.md`

---

## Objective

Write the full Step 2 content: "Agent Architecture Patterns." This is ESTABLISHED -
Anthropic's "Building effective agents" paper covers the patterns well. The novel
contribution is the one-shot agent job pattern (polecat) and L6 harness layer
decomposition.

Estimated target: 35-45k characters (~1000-1300 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - L6 harness layer, one-shot agent job
3. `docs/bootcamp/tasks/03-research-tier1-external/findings.md` - Anthropic patterns, Swarm, LangGraph
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 181-244 - the Step 2 outline
5. `docs/bootcamp/step01-llm-mechanics.md` - Step 1 (to reference, not duplicate)

## Content Structure

### Mandatory Sections

1. **Why This is Step 2** - Architecture decisions are highest-leverage. Wrong architecture
   = wrong cost, latency, and auditability. Frame: most problems don't need agents.

2. **Workflows vs agents** - Anthropic's fundamental distinction. Workflows = predefined
   code paths using LLM calls as components. Agents = LLM directs its own process.
   Most enterprise tasks should be workflows.

3. **Five workflow patterns** - From Anthropic's paper. For each:
   - Prompt chaining: sequential LLM calls, output of one feeds input of next
   - Routing: classify input, dispatch to specialised handler
   - Parallelisation: sectioning (divide task) and voting (same task, multiple LLMs)
   - Orchestrator-workers: central LLM dynamically decomposes and delegates
   - Evaluator-optimizer: one LLM generates, another evaluates, iterate
   - When to use, when not to, code skeleton showing the pattern

4. **The agent loop** - LLM + tools + environment feedback in a cycle. Stopping
   conditions. Checkpoints. The danger of unconstrained loops.

5. **Single-agent vs multi-agent** - Supervisor/worker. Peer-to-peer. Hierarchical
   delegation. When multi-agent adds value (different specialisations) vs when it
   adds complexity (same model doing different roles).

6. **Handoffs** - OpenAI Swarm pattern. Transfer functions. Context passing at
   handoff boundaries. What gets lost, what must be explicitly transferred.

7. **The simplicity principle** - "Start with the simplest solution possible." Quote
   and expand. Augmented LLM > workflow > agent. Only escalate when needed.

8. **Framework landscape** - LangChain/LangGraph, CrewAI, AutoGen, Claude Agent SDK,
   OpenAI Agents SDK, Strands. What each abstracts. When abstraction helps vs
   when it obscures the mechanism.

9. **One-shot agent job pattern** - This project's "polecat" pattern. Fresh context,
   deterministic pipeline, no interactive steering. claude -p, one-shot, plan file
   is the only context. Why stateless > stateful for many tasks. Human reviews
   AFTER execution, not during.

### Layer Model Integration

- L6 harness: the orchestration layer. Four modes:
  - L6a direct: single LLM call
  - L6b dispatch: delegate to subagent
  - L6c override: human takes control
  - L6d bypass: direct tool access, skip LLM
- Frame: the harness is not one thing - it has modes, and recognising which
  mode you're in determines debugging strategy

### Challenges

Design 4-6 challenges:
- Identify the pattern (easy - given a description, name the workflow pattern)
- Implement prompt chaining (medium - build a 2-step chain with real API calls)
- Compare workflow vs agent (medium - same task, both approaches, compare cost/reliability)
- Build a handoff (hard - two-agent system with explicit context transfer)
- Design a one-shot pipeline (hard - plan file + Makefile + claude -p)

### Field Maturity

`> FIELD MATURITY: ESTABLISHED` - Most patterns well-documented by Anthropic and OpenAI.
Novel: one-shot agent job, L6 decomposition, "review after execution" principle.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Reference Anthropic paper by name, not just "the paper"
- Code examples should be runnable agent workflows, not pseudocode
- The simplicity principle should be genuinely persuasive, not just stated
