# Task 02: Research - Internal Project References

**Type:** Research (read-only)
**Parallelizable with:** Tasks 01, 03, 04, 05
**Blocks:** Tasks 06-16 (all write tasks)
**Output:** `docs/bootcamp/tasks/02-research-internal-refs/findings.md`

---

## Objective

Extract and summarise all internal project files referenced by the Bootcamp II outline.
These contain the novel concepts, vocabulary, anti-patterns, and operational models that
form the ~18% genuinely novel content. Write tasks need distilled summaries, not raw files.

## Input Files

Read in full:

- `AGENTS.md` - the canonical boot file. Extract:
  - The layer model (L0-L12) compressed section
  - The slopodar (anti-pattern taxonomy) compressed section
  - The HCI foot guns section
  - The lexicon compressed section
  - The gate definition
  - The engineering loop
  - The bearing check
  - The macro workflow
  - Standing orders relevant to agentic engineering concepts

- `docs/internal/layer-model.md` (~213 lines) - full verbose layer model. Extract:
  - Each layer's definition, failure modes, and controls
  - Cross-cutting concerns (calibration, temporal asymmetry)
  - The data flow (bottom-up) vs control flow (top-down) framing

- `docs/internal/lexicon.md` (~363 lines) - full verbose lexicon. Extract:
  - All terms with their established framework citations
  - The ~18% novel terms and their definitions
  - The context engineering cluster (working set, cold/hot pressure, compaction loss, dumb zone)

- `docs/internal/slopodar.yaml` (~1080 lines) - full anti-pattern taxonomy. Extract:
  - All 18+ named patterns with: name, category, trigger, detection heuristic, alternative
  - Group by category: prose, relationship/sycophancy, code, governance, analytical

- `docs/internal/dead-reckoning.md` (~126 lines) - recovery protocol. Extract:
  - The checkpoint recovery procedure
  - When to use it (context loss, session boundary)

## What to Produce

For each source file, produce a structured summary with:

1. **Key concepts** - name, one-line definition, established framework citation (if any)
2. **Novel concepts** - clearly marked as novel vs established
3. **Cross-references** - which Bootcamp II steps reference this concept
4. **Quotable passages** - specific phrases or definitions that should be used verbatim
   or near-verbatim in the step content (to maintain consistency with the project vocabulary)

## Cross-Reference Map

Build a table mapping each internal concept to the Bootcamp II step(s) that cover it:

| Concept | Source File | BC-II Steps |
|---------|-----------|-------------|
| Layer model L0-L5 | layer-model.md | 1 |
| Layer model L6 | layer-model.md | 2 |
| Layer model L7 | layer-model.md | 5 |
| Layer model L8 | layer-model.md | 3 |
| Layer model L9 | layer-model.md | 7 |
| Layer model L10-L11 | layer-model.md | 8 |
| Layer model L12 | layer-model.md | 7 |
| Working set (Denning) | lexicon.md | 4 |
| Cold/hot pressure | lexicon.md | 4, 9 |
| Compaction loss | lexicon.md | 4, 9 |
| Dumb zone | lexicon.md | 4, 7, 9 |
| Slopodar (all) | slopodar.yaml | 7 |
| Slopodar (code) | slopodar.yaml | 6 |
| Slopodar (governance) | slopodar.yaml | 9, 10 |
| HCI foot guns | AGENTS.md | 7, 9 |
| Quality gate | AGENTS.md | 6 |
| Engineering loop | AGENTS.md | 10 |
| Bearing check | AGENTS.md | 10 |
| HOTL/HODL | lexicon.md | 6, 10 |
| Verifiable/taste-required | lexicon.md | 6 |
| One-shot agent job | lexicon.md | 2 |
| Adversarial review | lexicon.md | 8 |
| Staining | lexicon.md | 8 |
| Oracle problem | lexicon.md | 6 |
| Checkpoint recovery | dead-reckoning.md | 9 |

## Output Format

Write as a structured markdown document suitable for loading as prime context by write
tasks. Organize by source file, then by concept. Keep summaries precise - the write
tasks will expand into pedagogical prose.
