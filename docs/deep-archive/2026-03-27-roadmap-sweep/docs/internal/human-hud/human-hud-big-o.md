# HumanHUD: Big O for Cognitive Load

**Author:** Weaver
**Date:** 26 February 2026
**Back-reference:** SD-180

---

## The Rubric

```
O(1)     — Constant: approve/reject, yes/no, merge/block
           "Does the gate pass?" → binary, no scaling
           
O(log n) — Logarithmic: triage, binary search
           "Which of these 8 tasks matters most?" → halve repeatedly
           Used when: prioritizing a queue
           
O(n)     — Linear: reading, reviewing, inspecting
           "Read this 186-line document" → scales with length
           Used when: reviewing Artisan/Watchdog/Maturin output
           THE DOMINANT COST IN YOUR CURRENT WORKFLOW
           
O(n·k)   — Linear × parallel streams: reviewing k agents' output
           "Read reports from 3 dispatched agents" → n lines × k agents
           THIS IS WHERE YOU ARE RIGHT NOW
           
O(n²)    — Quadratic: coordination, cross-referencing
           "Does Agent A's output contradict Agent B's?"
           Every pair needs checking. 3 agents = 3 pairs. 5 agents = 10 pairs.
           THE TRAP: dispatching more agents feels productive but
           cross-referencing their outputs scales quadratically
           
O(2ⁿ)   — Exponential: combinatorial decisions
           "Which combination of these changes should ship together?"
           Avoid at all costs. Decompose until decisions are O(1).
```

## Reducing the Exponent

1. **Demand digests, not documents.** "Return 5 bullet points, not a report." Weaver absorbs O(n) reading cost and delivers O(1) verdicts to L12.

2. **Batch O(1) decisions.** Accumulate changes and approve/reject as a batch. "These 4 things pass my gate, commit all" is O(1). "Review each of these 4 things" is O(4n).

3. **Trust the gate, not the output.** If the gate is green, the code is mechanically correct. Attention goes ONLY to taste judgments (slopodar), ethical constraints (SD-153), and strategic decisions. Everything else is delegated verification.

---

*Captain's note (SD-178): The traditional Big O patterns hold for most process but may need revision — the outputs to those inputs are experienced and become a metacognitive factor, not just ones and offs. Study when more time available.*
