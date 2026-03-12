# Task IV-02: Research - Internal Project References for Bootcamp IV

**Type:** Research (read-only)
**Parallelizable with:** Tasks IV-01, IV-03, IV-04, IV-05, IV-06
**Blocks:** Tasks IV-07 through IV-15 (all write tasks)
**Output:** `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md`

---

## Objective

Extract and summarise all internal project files referenced by the Bootcamp IV outline.
BC-IV draws heavily on the project's operational experience with adversarial review,
anti-pattern detection, and multi-model verification. The write tasks need distilled
summaries of these internal systems, not raw files.

## Input Files

Read in full:

- `AGENTS.md` - Extract:
  - The slopodar compressed section (anti-pattern taxonomy - BC-IV uses this as a
    worked example of adversarial testing throughout Steps 2, 6, 7)
  - The layer model compressed section (referenced in Steps 1, 4, 7 for eval design)
  - The lexicon entries for: adversarial review, multi-model ensemble review, staining,
    verifiable/taste-required, oracle problem, quality gate, verification pipeline,
    definition of done
  - The gate definition (quality gate as an eval scorer - Step 4)
  - The macro workflow (verification stages as eval infrastructure - Step 5)

- `docs/internal/slopodar.yaml` - Full anti-pattern taxonomy. Extract:
  - All 18+ named patterns with: name, category, detection heuristic
  - Group by: prose, relationship/sycophancy, code, governance, analytical
  - This is the worked example for eval dataset construction (Step 2), adversarial
    testing (Step 6), and deception detection (Step 7)

- `docs/internal/layer-model.md` - Full verbose layer model. Extract:
  - L0 (training data contamination - Step 1 content contamination)
  - L3 (context formatting sensitivity - Step 1 construct validity)
  - L10 (multi-agent same-model correlation - Step 6 multi-model review)
  - L11 (cross-model independent signal - Step 6, Step 7)
  - L12 (human evaluator oracle problem - Steps 1, 7, 8)

- `.claude/agents/analyst.md` - The analyst agent. Extract:
  - The structured XML evaluation prompt (worked example of LLM-as-judge rubric - Step 3)
  - The 5-dimension evaluation framework
  - How it implements multi-dimensional grading

- `bin/triangulate` (if it exists as a script) - Extract:
  - The matching algorithm for cross-model finding comparison (custom scorer - Step 3)
  - Input/output formats (eval infrastructure pattern - Step 5)
  - How convergence/divergence metrics are computed (Step 6)

- `docs/internal/weaver/catch-log.tsv` - Control firing events. Extract:
  - Schema and sample entries (eval result storage pattern - Step 5)
  - How controls fire as ongoing evaluation (continuous evaluation - Step 9)

## What to Produce

For each source file, produce:

1. **Key concepts** - name, one-line definition, which BC-IV step(s) reference it
2. **Worked examples** - specific passages or structures that serve as pedagogical
   examples in the step content (e.g., slopodar entries as eval dataset samples)
3. **Cross-references** - mapping from internal concept to BC-IV step number

## Cross-Reference Map

Build this table from the outline analysis:

| Concept | Source File | BC-IV Steps |
|---------|-----------|-------------|
| Slopodar (full taxonomy) | slopodar.yaml | 2, 6, 7 |
| Slopodar (deep compliance) | slopodar.yaml | 7 |
| Slopodar (not wrong) | slopodar.yaml | 1 |
| Slopodar (paper guardrail) | slopodar.yaml | 8 |
| Slopodar (analytical lullaby) | slopodar.yaml | 8 |
| Layer model (L0, L3, L12) | layer-model.md | 1 |
| Layer model (L10, L11) | layer-model.md | 6 |
| Layer model (L12 oracle) | layer-model.md | 1, 7, 8 |
| Adversarial review (darkcat) | AGENTS.md, lexicon | 6 |
| Multi-model ensemble | AGENTS.md, lexicon | 6 |
| Staining | lexicon | 6 |
| Quality gate | AGENTS.md | 4, 5 |
| Verification pipeline | AGENTS.md | 5, 6 |
| Oracle problem | lexicon | 1, 7 |
| Verifiable/taste-required | lexicon | 3 |
| Analyst agent (LLM-as-judge) | analyst.md | 3 |
| Triangulate (custom scorer) | bin/triangulate | 3, 5 |
| Catch-log (eval storage) | catch-log.tsv | 5, 9 |
| Polecat (eval-friendly arch) | lexicon | 4 |
| Definition of done | lexicon | 9 |

## Output Format

Write as structured markdown organised by source file, then by concept. Include literal
snippets where the write tasks will need verbatim or near-verbatim content (e.g., slopodar
pattern definitions used as eval dataset examples). Keep summaries precise - the write
tasks expand into pedagogical prose.
