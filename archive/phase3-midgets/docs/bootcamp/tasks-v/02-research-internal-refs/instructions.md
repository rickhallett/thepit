# Task 02: Research - Internal Project References for Bootcamp V

**Type:** Research (read-only)
**Parallelizable with:** Tasks 01, 03, 04, 05, 06
**Blocks:** Tasks 07-15 (all write tasks)
**Output:** `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md`

---

## Objective

Extract and summarise all internal project files referenced by the Bootcamp V outline.
Bootcamp V draws heavily on operational experience: file-based state architecture,
pitkeel observability, the boot sequence, events.yaml, session-decisions chain, BFS
depth rule, and the context engineering vocabulary. Write tasks need distilled summaries.

## Input Files

Read in full:

- `AGENTS.md` - the canonical boot file. Extract:
  - The filesystem awareness section (BFS depth map) - directly relevant to Step 3
    (RAG as automated BFS)
  - The gate definition - relevant to Step 9 (production patterns)
  - The engineering loop - relevant to Step 8 (debugging)
  - Standing order SD-266 "write to durable file" - relevant to Step 5 (state management)
  - The context engineering cluster from the lexicon (working set, cold/hot pressure,
    compaction loss, dumb zone) - relevant to Steps 1, 4, 5, 6
  - The slopodar entries for "stale reference propagation" - relevant to Step 1 (outdated
    indices) and Step 5 (state corruption)
  - Alert fatigue / naturalist's tax - relevant to Step 7 (observability)
  - The macro workflow - relevant to Step 9

- `docs/internal/lexicon.md` - full verbose lexicon. Extract:
  - Working set (Denning 1968) - the outline explicitly applies this to retrieval (Step 1)
    and state (Step 5)
  - Cold context pressure - retrieval failure produces this (Step 1)
  - Hot context pressure - context overflow in RAG (Step 3)
  - Compaction loss - applied to memory summarisation (Step 6)
  - Checkpoint recovery - relevant to Step 5 (state restoration)
  - Context quality loop - applied to RAG (Step 3: clean docs -> better retrieval)
  - One-shot agent job - relevant to Step 5 (stateless as deliberate choice)

- `docs/internal/layer-model.md` - full verbose layer model. Extract:
  - L3 CONTEXT - retrieval constructs context (Steps 1-4)
  - L7 TOOLS - retrieval and state as agent tools (Steps 2, 5)
  - L9 THREAD POS - relevant to Step 8 (debugging self-reinforcing loops)
  - All layers - relevant to Step 8 (diagnosis by layer)

- `docs/internal/slopodar.yaml` - full anti-pattern taxonomy. Extract:
  - "stale reference propagation" - stale index as same pattern (Step 1)
  - "right answer wrong work" - retrieval returns plausible but wrong doc (Step 1)
  - "shadow validation" - RAG abstraction covers easy cases, skips critical path (Step 3)
  - "phantom ledger" - audit trail doesn't match actual operation (Step 7, observability)

- `pitkeel/pitkeel.py` - the project's observability tool. Read to understand:
  - What it tracks (session duration, scope drift, velocity, context depth)
  - How it stores and queries state
  - Its architecture as a worked example for Step 7

- State files (read structure, not full content):
  - `docs/internal/events.yaml` - event log structure (Step 5, event sourcing example)
  - `.keel-state` (if exists) - runtime state file (Step 5, flock-protected state)
  - `docs/internal/session-decisions-index.yaml` - decision chain index (Step 5, append-only)
  - `docs/internal/weaver/catch-log.tsv` - control firing events (Step 7, logging example)

## What to Produce

For each source, a structured summary with:

1. **Key concepts** - name, one-line definition, established framework citation
2. **Novel concepts** - clearly marked as novel vs established
3. **BCV step mapping** - which Bootcamp V step(s) reference this concept
4. **Quotable passages** - specific definitions to use verbatim for vocabulary consistency
5. **Worked examples** - concrete project artifacts that serve as examples in the steps

## Cross-Reference Map

| Concept | Source File | BCV Steps |
|---------|-----------|-----------|
| Working set (Denning 1968) | lexicon.md | 1, 3, 5 |
| Cold context pressure | lexicon.md | 1, 4 |
| Hot context pressure | lexicon.md | 3, 6 |
| Compaction loss | lexicon.md | 6 |
| Context quality loop | lexicon.md | 3 |
| Stale reference propagation | slopodar.yaml | 1, 5 |
| Right answer wrong work | slopodar.yaml | 1, 3 |
| Shadow validation | slopodar.yaml | 3 |
| Phantom ledger | slopodar.yaml | 7 |
| Alert fatigue (naturalist's tax) | lexicon.md | 7 |
| Checkpoint recovery | lexicon.md, dead-reckoning.md | 5 |
| BFS depth rule | AGENTS.md | 3 |
| SD-266 durable writes | AGENTS.md | 5 |
| One-shot agent job | lexicon.md | 5 |
| The gate | AGENTS.md | 9 |
| Engineering loop | AGENTS.md | 8 |
| Layer model (full L0-L12) | layer-model.md | 8 |
| pitkeel architecture | pitkeel/pitkeel.py | 7 |
| File-based state (boot sequence) | AGENTS.md | 5 |
| events.yaml (event log) | events.yaml | 5, 7 |
| catch-log.tsv (control log) | weaver/catch-log.tsv | 7 |

## Output Format

Write as a structured markdown document suitable for loading as prime context by write
tasks. Organise by source file, then by concept. Keep summaries precise - the write
tasks will expand into pedagogical prose.
