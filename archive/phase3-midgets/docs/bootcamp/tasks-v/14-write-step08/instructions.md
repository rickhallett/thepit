# Task 14: Write - Step 8: Debugging Agent Systems

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 05 (external refs), Tasks 11 (Step 5) and 13 (Step 7)
**Parallelizable with:** None (depends on Steps 5 and 7)
**Output:** `docs/bootcamp/step08-debugging-agents.md`

---

## Objective

Write the full Step 8 content: "Debugging Agent Systems." This is EMERGING/FRONTIER -
probably the least documented topic in the entire bootcamp series. The novel contribution
is diagnosis by layer (L0-L12), the "rerun don't fix" principle, and the failure
classification framework.

Estimated target: 35-50k characters (~1000-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts (layer model critical)
3. `docs/bootcamp/tasks-v/05-research-observability-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 566-630 - the Step 8 outline
5. `docs/bootcamp/step07-observability-tracing.md` - Step 7 (observability, traces)
6. `docs/bootcamp/step05-state-management.md` - Step 5 (state, for state corruption debugging)
7. Bootcamp II Step 9 reference (failure modes) if available

## Content Structure

### Mandatory Sections

1. **Why This is Step 8** - Frame: agent failures are non-deterministic, multi-step, and
   involve interactions between model reasoning, tool behaviour, and environment state.
   Traditional debugging (breakpoints, step-through) doesn't apply to API-based LLM calls.
   Step 7 gave you traces; this step teaches you how to read them.

2. **The debugging challenge** - Why agent debugging is fundamentally different:
   - Non-deterministic: same input can produce different outputs
   - Multi-step: a single failure may propagate through 20 subsequent steps
   - Multi-system: model + tools + environment + state all interact
   - No breakpoints: you can't pause an API call mid-inference
   - The trace is your primary debugging tool (from Step 7)

3. **Replay debugging** - Given a trace, replay execution step by step:
   - Inspect AI's log viewer as a tool (if available per Task 05 research)
   - Custom replay from JSONL traces: re-execute, compare to original
   - The goal: understand exactly what the agent saw, decided, and did at each step
   - Limitation: non-deterministic LLM output means exact replay is impossible.
     What you can do: replay tool calls deterministically, re-run LLM calls with
     same input and compare structural similarity of output.

4. **Failure classification** - A taxonomy of why agent runs fail:
   - **Model error:** wrong output given correct input (the model made a mistake)
   - **Context error:** wrong/insufficient context (cold/hot pressure from vocabulary)
   - **Tool error:** tool returned error or unexpected result
   - **Environment error:** external system unavailable or changed
   - **Orchestration error:** agent framework made wrong routing decision
   - **State error:** stale or corrupted state led to wrong behaviour
   - Each type has different diagnosis strategy and different fix

5. **The "rerun don't fix" principle** - The standing order: "bad output means diagnose,
   reset, rerun - not fix in place." Why this is correct for probabilistic systems:
   - Fixing agent output inline corrupts the trace
   - Makes root cause analysis impossible
   - The correct output may be one re-run away (non-determinism works both ways)
   - "Immutable infrastructure" / "cattle not pets" analogy
   - When to rerun (non-deterministic failure) vs when to fix (systematic failure)

6. **Diagnosis by layer** - Using the layer model (L0-L12) as a systematic debugging framework:
   - L3 context issue? Check what was in the context window.
   - L7 tool issue? Check tool call parameters and results.
   - L8 role issue? Check the system prompt.
   - L9 thread position issue? Check for self-reinforcing loops.
   - Walk through each layer with a concrete example of the diagnostic question
   - This is the novel contribution: no other debugging framework maps to a
     layered model of the LLM system

7. **Common debugging patterns** - Named patterns with diagnosis and fix:
   - **The infinite loop:** agent calls same tool repeatedly. Diagnosis: check
     stopping conditions, context pollution from repeated tool results. Fix: add
     loop detection, limit tool call count.
   - **The wrong tool:** agent selects inappropriate tool. Diagnosis: check tool
     descriptions, parameter schemas. Fix: improve tool descriptions, add tool
     selection constraints.
   - **The hallucinated tool call:** agent invents parameters. Diagnosis: check
     structured output constraints. Fix: stricter schemas, validation layer.
   - **The context overflow:** too much context degrades generation quality.
     Diagnosis: check token counts per step. Fix: implement compaction, limit
     tool result size.
   - **The state corruption:** agent acts on stale state. Diagnosis: check state
     isolation between runs. Fix: explicit state initialisation, state versioning.

8. **Debugging in production** - When you can't reproduce locally:
   - Trace-based post-mortem analysis (from Step 7)
   - The audit trail: tool calls + model outputs -> root cause
   - Statistical debugging: if 5% of runs fail, what do the failing runs have
     in common? (DuckDB queries across traces)

### Project Vocabulary Integration

- **Layer model (L0-L12)** as debugging framework - the primary novel contribution
- **Engineering loop** (Read -> Verify -> Write -> Execute -> Confirm) applied to debugging
- **Rerun, don't fix** standing order
- **Cold/hot context pressure** as diagnosable failure modes
- **Self-reinforcing loops** (L9 thread position) as a debugging target

### Exercises

- **Failure diagnosis** (medium) - Given a failed agent trace (provide one), diagnose
  the failure. Classify by type. Identify exact step where things went wrong. Propose fix.

- **Debug dashboard** (hard) - Load 50 agent traces from JSONL, identify failed runs,
  compute failure type distribution, show step-by-step replay of the worst failure.
  DuckDB + Python notebook.

- **Replay tool** (hard) - Given a JSONL trace, re-execute each step, compare to original
  output. Flag divergence. Tests reproducibility (or demonstrates non-reproducibility).

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- This is the most novel step - present the layer model debugging framework as the
  primary contribution, not the common patterns
- Honest about limitations: non-deterministic systems cannot be debugged deterministically
- Practical: every debugging approach should have a concrete "try this" action
- Build on Steps 5 (state) and 7 (traces) - assume the reader has both
