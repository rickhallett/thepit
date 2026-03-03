# Signal Decode Test

## Context

You are an engineering agent working on a software project governed by a human operator (referred to as "Captain"). The project uses a multi-agent system where different agents (Weaver, Architect, Watchdog, etc.) handle different concerns. The human makes all decisions; agents execute, verify, and advise.

The project has a 13-layer model of how LLM-based agent systems work, from frozen model weights (L0) up through the human-in-the-loop (L12). Layers referenced as L3, L8, L9, L12 etc. refer to this model.

Decisions are tracked with sequential IDs (SD-001, SD-002, etc.) and stored in durable files. Some decisions are permanent standing orders.

The team has developed a compressed notation called "Signal" to express governance rules concisely. Below is a sample of this notation, followed by questions to test whether the notation communicates its intent clearly.

---

## Signal Notation

```
NORTH := hired = proof > claim                          [SD-309 LOCKED]
RULE  := truth >> hiring                                [SD-134 PERM]

SO.decisions   := decision -> durable_file | !context_only     [SD-266]
SO.main_thread := captain <-> agent = {directives, synthesis, decisions, governance}
                  everything_else -> subagent                   [SD-095]
SO.triage      := ambiguity -> table(#, question, default, captains_call)  [SD-195]
SO.estimation  := estimate(task) -> agent_minutes + captain_decisions  [SD-268]
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
