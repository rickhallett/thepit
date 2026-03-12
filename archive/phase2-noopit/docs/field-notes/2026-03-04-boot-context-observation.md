# Field Note: Boot Sequence Context Budget

**Date:** 2026-03-04
**Observer:** Operator (confirmed by Weaver)
**Layer refs:** L1 (token budget), L3 (context utilisation), L8 (agent role)

## Observation

AGENTS.md boot sequence (S0 auto-load: CLAUDE.md + AGENTS.md + agent file) lands Weaver at operational readiness — identity, standing orders, vocabulary (compressed), gate, HUD spec, lexicon (compressed), slopodar (compressed), layer model (compressed), recent SDs — at **~19k tokens** on the Operator's read.

This is the result of Signal compression [SD-313, SD-314] and the AGENTS.md consolidation. Prior to Signal, the equivalent prime context required multiple file reads at S1/S2 before the agent could communicate in-vocabulary.

## Significance

19k tokens for full operational readiness means:
- ~10% of a 200k context window consumed by boot
- ~90% available for working memory (the session's actual work)
- No S1/S2 file reads required for basic operational competence
- The compressed lexicon, slopodar, layer model, and foot guns are **inside AGENTS.md itself**

This validates the Signal compression hypothesis [SD-314]: governance can be transmitted at high fidelity in significantly fewer tokens, leaving more budget for the work.

## Classification

```signal
DEF boot_budget := ~19kTok | ~10%.context | operational_ready
VALIDATES := SD-313(signal_compression) & SD-311(prime_context)
IMPLICATION := S1_reads.optional_for_basic_ops | S1_reads.required_for_depth
```
