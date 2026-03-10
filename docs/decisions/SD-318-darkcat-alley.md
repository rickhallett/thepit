# SD-318: Darkcat Alley — Standardised Cross-Model Triangulation

**Date:** 2026-03-09
**Status:** STANDING (this run)
**Agent:** Weaver (design) / Operator (naming, direction)
**Backrefs:** SD-317 (QA sequencing, data products), SD-309 (True North), SD-134 (truth-first), L11 (cross-model validation)

## Context

Cross-model code review (SD-317 Data Product 1) produced 31 unique findings from 3 model families with zero false positives. 74% of findings were caught by only one model. The process worked but was ad hoc — each model produced freeform reports in different formats, and synthesis was manual.

Operator's direction: standardise the process, name it, lexify it, make it repeatable, make it produce machine-readable data for numerical evidence and visualisations. The visualisations feed the portfolio (SD-309). This is mission-critical work.

## Decision

### Naming

**Darkcat Alley** — the standardised 3-model cross-triangulation of a full codebase. Run pre-QA and post-QA; the delta between runs is a data product. Lexified in Lexicon v0.25.

### Standardisation

1. **Review Instructions** (`docs/internal/weaver/darkcat-review-instructions.md` v1.0): Every darkcat reviewer receives the same structured instructions. Output MUST contain both a narrative report (human-readable) and a structured YAML findings block (machine-readable). Severity normalised to 4-level scale. Watchdog taxonomy ID and slopodar pattern name required on every finding.

2. **Process Definition** (`docs/internal/weaver/darkcat-alley.md` v1.0): Step-by-step process from snapshot to triangulation. Defines the file structure, dispatch protocol, and collection requirements.

3. **Numerical Pipeline**: 8 named metrics, each with schema and visualisation target:
   - Metric 1: Finding count by model
   - Metric 2: Convergence rate
   - Metric 3: Marginal value per review (diminishing returns curve)
   - Metric 4: Severity distribution by model
   - Metric 5: Watchdog category distribution
   - Metric 6: Severity calibration (inter-rater agreement)
   - Metric 7: Pre-QA vs Post-QA delta
   - Metric 8: False positive rate

4. **Parser** (`bin/triangulate`): Python CLI tool (uv run --script, pyyaml). Parses YAML findings blocks, matches findings across reviews by file + title similarity, computes all metrics, exports YAML data products. Commands: `parse`, `summary`, `metrics`, `convergence`, `export`.

5. **Visualisation Targets** (Python + hex.tech): 7 named charts for the portfolio:
   - The Alley Chart (grouped bar)
   - Diminishing Returns Curve (line, slope = marginal value)
   - Blind Spot Radar (Watchdog categories per model, overlaid)
   - Severity Heatmap (models × severity)
   - The Sankey (pre-QA → post-QA finding flow)
   - Convergence Donut (3-way / 2-way / single distribution)
   - Precision Bars (FP rate per model)

### No Retrofit

Existing R1/R2/R3 artifacts from the first alley run remain as historical artifacts. Fresh reviews with standardised instructions when the next alley run is needed. Cut losses, keep artifacts, run clean.

## Rationale

- **Repeatability**: The process can now be run on any codebase by any operator with the instructions + parser + 3 models
- **Numerical evidence**: Machine-readable output enables the diminishing returns analysis that answers "is cross-model review worth the cost?"
- **Portfolio**: The visualisations are direct evidence for the Anthropic red teaming case — this is how you build a verification fabric for probabilistic systems
- **Compound quality**: Each run adds a data point; over time the curves tell the story

## Artifacts

| File | Purpose |
|------|---------|
| `docs/internal/weaver/darkcat-review-instructions.md` | Standardised review prompt for any model |
| `docs/internal/weaver/darkcat-alley.md` | Process definition + numerical pipeline spec |
| `bin/triangulate` | Parser CLI (Python, uv run --script) |
| `data/alley/<run-id>/` | Per-run data products (metrics, convergence, union) |

## Implications

This is the measurement infrastructure for the verification fabric thesis. Without it, "cross-model review works" is a claim. With it, it's data.
