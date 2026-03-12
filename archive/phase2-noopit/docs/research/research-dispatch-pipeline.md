# Research Dispatch Pipeline — Transcript Analysis

> Repeatable pipeline for bulk research dispatch across transcript sources.
> Each transcript is processed by parallel subagents (architect + analyst).
> Weaver aggregates and checks for compression loss before Operator review.
> 
> To re-run: dispatch subagents per transcript following the pipeline sequence below.
> Each step depends on the previous step's output.

## Pipeline Sequence

```signal
PIPELINE := foreach(transcript IN docs/research/transcripts/) -> dispatch(parallel)

-- Per transcript, ordered steps:
P1_CLUSTER :=
  input    := transcript(raw)
  task     := thematic_reduction(clustered, high_verbosity, preserve_subtlety)
  output   := thematic_clusters.md
  rule     := BEFORE(websearch) | reduce_from_source_only
  agent    := {architect, analyst} | parallel | below_decks

P2_RESEARCH :=
  input    := P1_CLUSTER.output
  task     := websearch(wide, deep) -> report(convergence, divergence, citations)
  output   := research_report.md + exec_summary_header
  rule     := high_verbosity | cite_sources | flag(convergence | divergence)
  agent    := {architect, analyst} | parallel | below_decks

P3_COMPARE :=
  input    := {P1_CLUSTER.output, P2_RESEARCH.output, current_principles}
  current_principles := {AGENTS.md, layer-model.md, lexicon.md, slopodar.yaml}
  task     := stain(findings, current_principles) -> delta_report
  output   := comparison_report.md + exec_summary
  rule     := highlight(similar, missing, convergence, divergence)
  agent    := {architect, analyst} | parallel | below_decks

P4_SUMMARY :=
  input    := {P1, P2, P3}.outputs
  task     := post_process(conclusions)
  output   := post_process_summary.md
  agent    := {architect, analyst} | parallel | below_decks

-- Weaver aggregation pass:
WEAVER_PASS :=
  input    := foreach(transcript) -> {P4_SUMMARY, P2.exec_summary, P3.exec_summary}
  task     := read(exec_summaries) -> check(compression_loss, against=full_reports)
  output   := distillation.md -> operator
  rule     := flag(compression_loss) | weave(cross_transcript_themes) | muster(operator)
```

## Transcripts (current inventory)

| # | File | Topic |
|---|------|-------|
| 1 | `amodei-end-of-exponential.txt` | Amodei on scaling, RL, end of exponential |
| 2 | `mitchell-hashimoto-hashistack.txt` | Hashimoto on AI tools, open source, agents |
| 3 | `engineering-anti-slop.txt` | Jim West on anti-slop agentic engineering |
| 4 | `jeremy-howard-on-vibes.txt` | Jeremy Howard on vibe coding, understanding, notebooks |

## Current Principles (comparison targets)

- `AGENTS.md` — standing orders, gate, HUD, layer model (compressed), slopodar (compressed), foot guns
- `docs/internal/layer-model.md` — L0-L12 agentic system model v0.3
- `docs/internal/lexicon.md` — operational vocabulary v0.21
- `docs/internal/slopodar.yaml` — anti-pattern taxonomy (18 entries)

## Output Directory

All outputs written to `docs/research/analysis/{transcript-slug}/`

## Provenance

Created: 2026-03-04, Weaver, by Operator's order.
Purpose: Encode external research insights before phase 2 product build.
