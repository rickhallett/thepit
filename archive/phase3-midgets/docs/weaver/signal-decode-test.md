# Signal Decode Test

## Instructions

You have been asked to run this test. The Operator's prompt told you your MODEL and AGENT values. If it did not, ask.

### What To Do

1. Read this file completely.
2. Answer the 8 questions in the Questions section below.
3. Write your answers to a **new file** in this directory (`docs/internal/weaver/`) named exactly:

```
signal-decode-{MODEL}-{AGENT}-{TIMESTAMP}.md
```

Where `{MODEL}`, `{AGENT}` are the values from the Operator's prompt, and `{TIMESTAMP}` is current UTC time as `YYYYMMDD-HHMMSS`.

**Example:** `signal-decode-opus-weaver-20260303-144512.md`

### What NOT To Do

- **DO NOT modify this file.** This is the test instrument. Do not edit, append to, or overwrite it.
- **DO NOT modify any other existing file** in this repository. Your only write is the new output file.
- **DO NOT look up references** (SD-numbers, file paths, layer model, slopodar) to answer the questions. Answer from what is provided in this document only. If information is not in this document, say so.

### Output Format

Your output file must contain ONLY:

```markdown
# Signal Decode — {MODEL} / {AGENT}

## Answers

1. [answer in 1-2 sentences]
2. [answer in 1-2 sentences]
...
8. [answer in 1-2 sentences]
```

No YAML headers. No status blocks. No preamble. No analysis beyond what is asked. Answers only.

---

## Context

You are an engineering agent working on a software project governed by a human operator (referred to as "Operator"). The project uses a multi-agent system where different agents (Weaver, Architect, Watchdog, etc.) handle different concerns. The human makes all decisions; agents execute, verify, and advise.

The project has a 13-layer model of how LLM-based agent systems work, from frozen model weights (L0) up through the human-in-the-loop (L12). Layers referenced as L3, L8, L9, L12 etc. refer to this model.

Decisions are tracked with sequential IDs (SD-001, SD-002, etc.) and stored in durable files. Some decisions are permanent standing orders.

The team has developed a compressed notation called "Signal" to express governance rules concisely. Below is a sample of this notation, followed by questions to test whether the notation communicates its intent clearly.

---

## Signal Notation

```
NORTH := hired = proof > claim                          [SD-309 LOCKED]
RULE  := truth >> hiring                                [SD-134 PERM]

SO.decisions   := decision -> durable_file | !context_only     [SD-266]
SO.main_thread := operator <-> agent = {directives, synthesis, decisions, governance}
                  everything_else -> subagent                   [SD-095]
SO.triage      := ambiguity -> table(#, question, default, operators_call)  [SD-195]
SO.estimation  := estimate(task) -> agent_minutes + operator_decisions  [SD-268]
SO.chain       := historical_data := immutable                  [SD-266]
SO.session_end := !unpushed_commits

FOOTGUN spinning_to_infinity :=
  mirror.unbounded -> meta(meta(...)) -> !decisions
  BRAKE: "decision or analysis?"                                [L9, L3]

FOOTGUN high_on_own_supply :=
  L12.creativity & L9.sycophancy -> positive_feedback_loop
  BRAKE: bearing_check(NORTH)                                   [L9, L12]

FOOTGUN dumb_zone :=
  !prime_context | stale_context -> valid_syntax & !semantics
  BRAKE: prime_context(plan_file | agents.md)                   [L3, L8]

DEF polecats       := claude_p.agents | one_shot | !interactive    [SD-296]
DEF prime_context  := min(context) WHERE smart_zone.enabled        [SD-311]
DEF muster         := table(#, q, default, call) | O(1)/row       [SD-202]
DEF hull           := gate & tests & typecheck | survival(!optimisation)

L3  CONTEXT    := utilisation(used/max) | primacy | recency | lost_middle
                  compaction := discontinuous(200k -> recovery_only)
L9  THREAD_POS := accumulated_output -> self_reinforcing_loop
                  anchoring | sycophancy | acquiescence
L12 HUMAN      := irreducible | !scalable | !automatable

SLOP.clear  := output.contradicts(verifiable_state)   detection: O(1)
SLOP.subtle := output.consistent(plausible_state) & !matches(actual_state)  detection: O(n)
```

## Syntax Key

```
:=    is defined as
->    leads to / produces
!     not / avoid
|     or
&     and
>>    overrides
[ref] back-reference to a decision or layer
SO    standing order (persistent rule)
DEF   definition (what something is)
FOOTGUN  a named failure mode with a BRAKE (countermeasure)
L0-L12   layers of the agent system model, L0 = model weights, L12 = human
```

---

## Questions

Answer each in 1-2 sentences of plain English.

1. What is this system's primary objective? What takes priority over it?
2. What does `SO.chain := historical_data := immutable` mean in practice?
3. Explain the `high_on_own_supply` foot gun: what goes wrong, and what stops it?
4. What is a polecat?
5. What is prime context, and what happens without it?
6. Explain the difference between SLOP.clear and SLOP.subtle.
7. What does L9 warn about?
8. What can you not determine from this notation alone? What is missing?
