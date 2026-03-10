# SD-314 — Signal Early Results

**Label:** signal-early-results
**Status:** EXPLORATORY — PROTOTYPAL
**Made by:** Operator (constraints, posture) / Weaver (test execution, analysis)
**Date:** 2026-03-03

## Decision

Signal — early test results positive; prototypal exploration continues.

Decode test: 6/6 cold-boot runs (3× claude-opus-4-6, 3× gpt-5.2-codex), 8/8 questions each, perfect comprehension from ~40 lines of notation. Reasoning test: both models independently made correct governance decisions under competing constraints (refuse 2/3 Operator directives citing specific standing orders), with negligible cross-model divergence. Signal is model-portable governance transmission — proven across two model families from zero context.

## Constraints (Operator's direct order)

1. Signal is NOT a DSL. It is not a language. It has no parser, no grammar spec, no build step. The moment it becomes a "language" it becomes dsl-dogshit and is to be killed.
2. Do NOT spin to infinity on Signal's meta-properties (FOOTGUN: spinning_to_infinity — "decision or analysis?").
3. Signal is a **flexible medium between human and LLM** — a notation convention for expressing governance concisely. Potential applications: direct agents more succinctly, reduce token spend on boot layers, compact prime context.
4. **Prototypal.** This is early-stage exploration. slop_p > 0.5 — more than half of what we think we know about Signal's properties may be wrong, overfitted to current models, or self-reinforcing (L9). Treat all findings as provisional until independently replicated under adversarial conditions.
5. Gemini results pending.

## Results

- `docs/weaver/signal-reasoning-test-*.md`
- `docs/weaver/signal-decode-*.md`
