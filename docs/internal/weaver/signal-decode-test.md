# Signal Decode Test

You are given a governance notation called Signal. Everything you need is below. Read the notation, then answer the questions at the bottom in plain English.

Do not use tools. Do not search for files. Do not look anything up. Work only from what is written in this document.

---

## The Notation

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
