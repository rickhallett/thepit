# SD-313 — Signal Protocol

**Label:** signal-protocol
**Status:** DRAFT — awaiting Operator review
**Made by:** Operator (voice directive, naming constraints) / Weaver (design, PoC)
**Date:** 2026-03-03

## Decision

Signal — compressed governance protocol. PoC at `docs/weaver/signal-protocol-poc.md`.

Operator's voice directive (09:46:19): compress governance data into agentic-native format using pseudocode/FP/math syntax. Human-readable, agent-decodable, min-maxed for clarity. Named "Signal" (clear communications at sea — flags, lights, semaphore are compression protocols for maritime governance).

PoC compresses 6 governance sections from ~489 lines to ~108 (4.5:1 ratio): True North (4:1), Standing Orders (7.7:1), Crew Roster (1.25:1), Foot Guns (2.2:1), Lexicon 27 terms (3.9:1), Layer Model (6.5:1). Full governance corpus: ~83k tokens, estimated reducible to ~30k.

Signal is NOT a replacement for verbose versions (the chain, SD-266) — it is the agentic-native notation that lives alongside them. Pending: Operator review of PoC readability, agent decode test, deployment path.
