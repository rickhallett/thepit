# Darkcat Alley — Process Definition & Numerical Pipeline

**Version:** 1.0
**Status:** STANDING (this run)
**Backrefs:** SD-318 (this process), SD-317 (QA sequencing), SD-309 (True North), L11 (cross-model validation)
**Parser:** `bin/triangulate`
**Review instructions:** `docs/internal/weaver/darkcat-review-instructions.md`

---

## What It Is

Darkcat Alley is the standardised 3-model cross-triangulation of a full codebase. Three independent darkcats (different model families) review the same code snapshot using structured instructions. The process runs **twice per QA cycle** — pre-QA and post-QA — and the delta between runs is itself a data product.

```signal
DEF darkcat_alley :=
  3_models.independent.review(same_snapshot)
  -> structured_findings(YAML) + narrative(markdown)
  -> triangulate(convergence, divergence, blind_spots)
  -> numerical_pipeline(metrics -> visualisations -> portfolio)

RUN := pre_QA(polecat_code) & post_QA(fixed_code)
DELTA := post_QA.findings - pre_QA.findings = residual_risk + fix_effectiveness
```

---

## The Process (Step by Step)

### Phase 1: Snapshot

1. Identify branches/commits to review
2. Freeze the snapshot — no changes until all reviews complete
3. Generate diffs: `git diff main..<branch>` for each branch
4. Record snapshot state in the run metadata

### Phase 2: Dispatch (3 Darkcats)

Dispatch 3 independent reviews using different model families. Each reviewer gets:
- The diff(s)
- The review instructions (`darkcat-review-instructions.md`)
- No access to other reviews

| Slot | Model family | Dispatch method |
|------|-------------|-----------------|
| R1 | Claude | Polecat (`claude -p`) or crew review |
| R2 | Gemini | External tool or API |
| R3 | OpenAI (Codex/GPT) | External tool or API |

**Rule:** Reviewer ≠ author. No model reviews its own output (if Claude polecats wrote the code, Claude darkcat is still valid — different context window, adversarial prompt, read-only).

### Phase 3: Collect

Wait for all 3 reviews. Each review MUST contain:
- Section 1: Narrative report (human-readable markdown)
- Section 2: Structured findings (machine-readable YAML block)

If a review arrives without the YAML block, it is still valuable as a qualitative artefact but cannot enter the numerical pipeline. Re-run with instructions if cost permits.

### Phase 4: Triangulate

Run the parser:

```bash
uv run bin/triangulate --run pre-qa-2026-03-09 \
  --r1 docs/internal/weaver/reviews/run-001-r1-claude.md \
  --r2 docs/internal/weaver/reviews/run-001-r2-gemini.md \
  --r3 docs/internal/weaver/reviews/run-001-r3-codex.md
```

The parser produces:
1. `data/alley/<run-id>/convergence.yaml` — the convergence matrix
2. `data/alley/<run-id>/metrics.yaml` — numerical summary
3. `data/alley/<run-id>/findings-union.yaml` — deduplicated union of all findings
4. stdout summary for human review

### Phase 5: Analyse

Human reviews the triangulation output. Key questions:
- What converged? (High confidence — fix these)
- What diverged? (Interesting signal — investigate)
- What did each model uniquely find? (Blind spot map)
- What is the marginal value of each additional review?

### Phase 6: Act

- Pre-QA run → batch fix confirmed issues → re-gate
- Post-QA run → measure residual risk → accept or iterate

---

## The Numerical Pipeline

These are the metrics the parser computes. Each feeds a specific visualisation for the portfolio.

### Metric 1: Finding Count by Model

```yaml
metric: finding_count
description: "Total findings per model, including shared"
schema:
  model: string
  total: int
  unique: int         # found only by this model
  shared_2: int       # found by this model + 1 other
  shared_3: int       # found by all 3
visualisation: "Grouped bar chart — total/unique/shared per model"
insight: "Which model finds the most? Which finds the most unique?"
```

### Metric 2: Convergence Rate

```yaml
metric: convergence_rate
description: "Fraction of findings independently identified by 2+ models"
schema:
  total_unique_findings: int
  converged_3: int    # all 3 models
  converged_2: int    # exactly 2 models
  single_model: int   # only 1 model
  rate_3: float       # converged_3 / total
  rate_2plus: float   # (converged_3 + converged_2) / total
  rate_single: float  # single_model / total
visualisation: "Stacked bar or pie — convergence distribution"
insight: "How much does each model miss? Is single-model review sufficient?"
```

### Metric 3: Marginal Value per Review

```yaml
metric: marginal_value
description: "Unique findings added by each successive review"
schema:
  order: list         # e.g. [R1, R2, R3]
  cumulative:
    - model: R1
      cumulative_unique: int
      new_unique: int
    - model: R2
      cumulative_unique: int
      new_unique: int      # findings R2 adds that R1 didn't have
    - model: R3
      cumulative_unique: int
      new_unique: int      # findings R3 adds that R1+R2 didn't have
visualisation: "Line chart — cumulative unique findings vs review count. The slope is the marginal value. When slope ≈ 0, you've hit diminishing returns."
insight: "At what point does an additional model review stop adding value? Is 3 enough? Would 4 add anything?"
```

### Metric 4: Severity Distribution by Model

```yaml
metric: severity_distribution
description: "Severity breakdown per model"
schema:
  model: string
  critical: int
  high: int
  medium: int
  low: int
visualisation: "Heatmap — models × severity levels, cell = count"
insight: "Do different models calibrate severity differently? Is there a systematic optimist/pessimist?"
```

### Metric 5: Watchdog Category Distribution

```yaml
metric: watchdog_distribution
description: "Which Watchdog categories each model detects"
schema:
  model: string
  categories:
    WD-SH: int        # Semantic Hallucination
    WD-LRT: int       # Looks Right Trap
    WD-CB: int         # Completeness Bias
    WD-DC: int         # Dead Code
    WD-TDF: int        # Training Data Frequency
    WD-PG: int         # Paper Guardrail
    WD-PL: int         # Phantom Ledger
visualisation: "Radar chart per model — category coverage. Overlay all 3 to show complementarity."
insight: "Do models have characteristic blind spots by category? (Preliminary: yes — Semantic Hallucination is Claude-only.)"
```

### Metric 6: Severity Calibration (Inter-Rater Agreement)

```yaml
metric: severity_calibration
description: "For converged findings, do models agree on severity?"
schema:
  finding_id: string
  r1_severity: string
  r2_severity: string
  r3_severity: string
  agreement: bool     # all match?
  max_delta: int      # ordinal distance between highest and lowest (critical=4, high=3, medium=2, low=1)
visualisation: "Scatter or table — finding × model severity. Highlights disagreements."
insight: "When models converge on existence, do they converge on severity? (Preliminary: yes for critical, diverges for low.)"
```

### Metric 7: Pre-QA vs Post-QA Delta

```yaml
metric: alley_delta
description: "Findings that survived vs were fixed between pre-QA and post-QA runs"
schema:
  pre_qa_total: int
  post_qa_total: int
  fixed: int          # in pre, not in post
  survived: int       # in both
  new: int            # in post, not in pre (regressions or new areas reviewed)
  fix_rate: float     # fixed / pre_qa_total
visualisation: "Sankey diagram — pre-QA findings flowing to fixed/survived/new"
insight: "How effective is the fix batch? What class of finding survives? Are fixes introducing new issues?"
```

### Metric 8: False Positive Rate

```yaml
metric: false_positive_rate
description: "Findings determined to be incorrect upon closer examination"
schema:
  model: string
  total_findings: int
  confirmed_true: int
  confirmed_false: int
  disputed: int
  fp_rate: float      # confirmed_false / total_findings
visualisation: "Bar chart — precision (1 - fp_rate) per model"
insight: "Can you trust a model's findings? (Preliminary: yes — 0% FP across 3 models, 31 findings.)"
```

---

## Data Products (What This Feeds)

| # | Data Product | Source | Portfolio Use |
|---|-------------|--------|---------------|
| DP-1 | Cross-Model Triangulation Report | Darkcat Alley pre-QA | "We ran 3 independent model reviews and here's what they found" |
| DP-2 | Fix Quality Assessment | Alley delta (pre vs post) | "Here's what we fixed and what survived" |
| DP-3 | Human Delta | Operator walkthrough vs all model findings | "Here's what humans catch that 3 models miss" |
| DP-4 | Cost-Benefit Analysis | Marginal value curve | "Here's where diminishing returns kicks in for cross-model review" |
| DP-5 | Model Blind Spot Map | Watchdog category distribution | "Different models have characteristic, predictable blind spots" |
| DP-6 | Severity Calibration Study | Inter-rater agreement on converged findings | "Models agree on what's critical but diverge on what's low-severity" |

---

## Visualisation Targets (Python + hex.tech)

These are the charts we will produce for the portfolio. Each maps to a metric above.

1. **The Alley Chart** — Grouped bar: findings per model (total, unique, shared). The hero visual.
2. **Diminishing Returns Curve** — Line: cumulative unique findings vs review count. Slope = marginal value. Multiple runs overlay to show if the curve is stable.
3. **Blind Spot Radar** — Radar chart: Watchdog categories per model, overlaid. Shows complementarity.
4. **Severity Heatmap** — Models × severity, cell = count. Shows calibration differences.
5. **The Sankey** — Pre-QA → Post-QA finding flow. Fixed / survived / new.
6. **Convergence Donut** — 3-way / 2-way / single-model distribution. "74% single-model-only" is the headline.
7. **Precision Bars** — FP rate per model. "Zero false positives across 31 findings" is the headline.

---

## File Structure

```
data/alley/
├── run-001-pre-qa/           # First pre-QA run (noopit calibration)
│   ├── metadata.yaml         # Snapshot state, branches, dates
│   ├── r1-claude.yaml        # Parsed findings from R1
│   ├── r2-gemini.yaml        # Parsed findings from R2
│   ├── r3-codex.yaml         # Parsed findings from R3
│   ├── convergence.yaml      # Convergence matrix
│   ├── metrics.yaml          # All computed metrics
│   └── findings-union.yaml   # Deduplicated union
├── run-002-post-qa/          # Post-QA run (same structure)
│   └── ...
└── delta-001-002.yaml        # Pre vs post comparison
```

---

## Repeatable After QA

This process is designed to be run on any codebase, at any point, by any operator who has:
1. The review instructions (`darkcat-review-instructions.md`)
2. Access to 3 different model families
3. The parser (`bin/triangulate`)

Each run adds a data point. Over time, the diminishing returns curve tells you when to stop adding models. The Watchdog distribution tells you which models to use for which categories. The alley delta tells you whether your fixes actually fixed things.

The cost per run is ~10 minutes of human time (dispatching 3 reviews, collecting results) + model API costs. The value is permanent, auditable, portfolio-grade evidence of verification discipline.
