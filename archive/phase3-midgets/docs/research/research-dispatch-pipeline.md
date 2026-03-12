# Research Dispatch Pipeline - Transcript Analysis

> Repeatable pipeline for bulk research dispatch across transcript sources.
> Each transcript is processed by parallel subagents (architect + analyst).
> Weaver aggregates and checks for compression loss before Operator review.
> 
> To re-run: dispatch subagents per transcript following the pipeline sequence below.
> Each step depends on the previous step's output.

## Pipeline Sequence

**Pipeline:** For each transcript in `docs/research/transcripts/`, dispatch parallel subagents.

**Per transcript, ordered steps:**

**P1 - CLUSTER**
- **Input:** Raw transcript
- **Task:** Thematic reduction (clustered, high verbosity, preserve subtlety)
- **Output:** `thematic_clusters.md`
- **Rule:** Before websearch; reduce from source only
- **Agent:** architect + analyst, parallel, below decks

**P2 - RESEARCH**
- **Input:** P1 output
- **Task:** Websearch (wide, deep), then report on convergence, divergence, citations
- **Output:** `research_report.md` + exec summary header
- **Rule:** High verbosity, cite sources, flag convergence and divergence
- **Agent:** architect + analyst, parallel, below decks

**P3 - COMPARE**
- **Input:** P1 output, P2 output, current principles (AGENTS.md, layer-model.md, lexicon.md, slopodar.yaml)
- **Task:** Stain findings against current principles, produce delta report
- **Output:** `comparison_report.md` + exec summary
- **Rule:** Highlight similar, missing, convergence, divergence
- **Agent:** architect + analyst, parallel, below decks

**P4 - SUMMARY**
- **Input:** P1, P2, P3 outputs
- **Task:** Post-process conclusions
- **Output:** `post_process_summary.md`
- **Agent:** architect + analyst, parallel, below decks

**WEAVER PASS (aggregation)**
- **Input:** For each transcript: P4 summary, P2 exec summary, P3 exec summary
- **Task:** Read exec summaries, check for compression loss against full reports
- **Output:** `distillation.md` for Operator
- **Rule:** Flag compression loss, weave cross-transcript themes, muster for Operator

## Transcripts (current inventory)

| # | File | Topic |
|---|------|-------|
| 1 | `amodei-end-of-exponential.txt` | Amodei on scaling, RL, end of exponential |
| 2 | `mitchell-hashimoto-hashistack.txt` | Hashimoto on AI tools, open source, agents |
| 3 | `engineering-anti-slop.txt` | Jim West on anti-slop agentic engineering |
| 4 | `jeremy-howard-on-vibes.txt` | Jeremy Howard on vibe coding, understanding, notebooks |

## Current Principles (comparison targets)

- `AGENTS.md` - standing orders, gate, HUD, layer model (compressed), slopodar (compressed), foot guns
- `docs/internal/layer-model.md` - L0-L12 agentic system model v0.3
- `docs/internal/lexicon.md` - operational vocabulary v0.21
- `docs/internal/slopodar.yaml` - anti-pattern taxonomy (18 entries)

## Output Directory

All outputs written to `docs/research/analysis/{transcript-slug}/`

## Provenance

Created: 2026-03-04, Weaver, by Operator's order.
Purpose: Encode external research insights before phase 2 product build.
