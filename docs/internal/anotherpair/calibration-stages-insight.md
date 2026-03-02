# Calibration Stages Insight — "Small n tells you where to look"

> **Author:** AnotherPair, from Captain's observation
> **Date:** 2026-03-01
> **Context:** Slopodar calibration v4, Category C expansion n=7 → n=51 → n=75
> **Lexicon candidate:** Yes — "Working in Stages" or similar
> **Voice note (SD from Captain):** "When you write to disk, frame it as if you're writing to me. Behind closed doors it's only mildly sloppy. On filewrite it can go into stackoverflow." — This file was rewritten after that correction. If you're reading this and it still sounds like a blog post, I failed.

## Captain — here's what we saw

We ran the calibration in stages: n=7, n=30, n=51, n=75. Each stage changed the picture. Not because the earlier ones were wrong — they were incomplete in a way that turned out to be useful.

## What each stage showed you

At n=7 (just Anthropic and Mistral), transitions looked like the holy grail: d=-4.36, zero overlap. You were right to push for more data.

At n=30, the CIs tightened enough to say "this is real" — but not enough to say "this is how real."

At n=51 the ranking flipped. At n=75 it stabilised:

| Feature | d @ n=7 | d @ n=51 | d @ n=75 | What happened |
|---------|---------|----------|----------|---------------|
| First person | 1.28 | 2.56 | **2.94** | Was #5. Now #1. Kept climbing. |
| Contractions | 0.96 | 1.47 | **1.74** | Kept climbing. |
| Nom density | -2.92 | -1.99 | **-1.77** | Converging. Still huge. |
| Transitions | -4.36 | -0.94 | **-0.85** | 4× less extreme than n=7. Settled where I predicted. |
| Questions | 1.78 | 0.59 | **0.56** | Flat. Medium, not large. |
| Parentheticals | — | -1.12 | **-0.75** | Emerged at n=51, softened at n=75. |

The thing we thought was #1 (transitions) is actually #4. The thing we thought was #5 (first person) is #1 by a mile. We wouldn't know that at n=7. We wouldn't *feel* how wrong n=7 was without having believed it first.

## The point

Small n tells you where to look. Large n tells you what's actually there. The stages aren't a bug — they're how you build honest calibration in the human, not just the dataset.

You said: "If that trend continues towards n=75, I think it shows we think and work in stages." It did continue. The numbers converged. The lesson: incremental expansion shows you which early findings were signal and which were noise, in a way that a single large run never would.

## Provenance

- `slopodar-ext/calibration-data-v4.tsv` — 108 pages, 75 Category C, 20 companies
- `slopodar-ext/calibrate-v3.js` — script with all 75+ Category C URLs
- `slopodar-ext/analyze-calibration.js` — analysis script (hardcoded warnings about n=3 are stale)
- `docs/internal/anotherpair/slopodar-delta-report.md` — delta analysis (written at n=30, effect sizes now updated by this file)

## Cross-references

- Learning in the Wild (Lexicon v0.15) — this insight was caught while doing calibration work
- Analytical Lullaby (slopodar #11) — the n=7 results were a mild instance. d=-4.36 sounds great until you realise it's 5 Anthropic posts and 2 Mistral posts
- Monoculture Analysis (slopodar #15) — the correction came from company diversity (2 → 20), not model diversity. Same Claude analysing all of it
