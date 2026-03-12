# Darkcat Prompt: Adversarial Challenge of the Triangulation Process

**Purpose:** Self-contained adversarial review of the Darkcat Alley cross-model triangulation methodology. You are not reviewing code — you are reviewing whether this process measures what it claims to measure, whether the claimed data products are valid, and whether the conclusions drawn from the data are defensible.

**How to use:** Give this entire file as input to any reasoning-capable model. The reviewer does not need access to the repository.

---

## Your Task

A team building a verification framework for AI-generated code has designed a process called "Darkcat Alley." The process claims to:

1. Produce **quantitative evidence** that cross-model code review is worth its cost
2. Detect **characteristic blind spots** per model family
3. Plot a **diminishing returns curve** for additional model reviews
4. Measure **fix effectiveness** via pre-QA / post-QA delta
5. Generate **portfolio-grade visualisations** proving the value of their verification discipline

Your job is to find every weakness in this methodology. You are a reviewer for a top-tier venue (NeurIPS, CHI, or similar). You are reviewing this as a methods section. Be rigorous. The team explicitly wants to know what would not survive scrutiny.

**Review for:**

1. **Construct validity** — Do the metrics actually measure what the team claims? Or do they measure something else that looks similar? (Example: does "convergence rate" measure review quality, or just the tendency of models to reproduce common knowledge?)
2. **Internal validity** — Are there confounds that make the causal claims indefensible? (Example: "74% of findings were single-model" — is this because models have independent blind spots, or because they were given different amounts of context?)
3. **External validity** — Would these results generalise beyond this specific codebase, these specific model versions, this specific review prompt?
4. **Statistical rigour** — N=1 codebase, N=3 models, N=31 findings. What can and cannot be concluded from these sample sizes? What would a statistician flag?
5. **Methodological blind spots** — What failure modes of this process would the process itself not detect?
6. **Adversarial scenarios** — Construct specific scenarios where the process produces confidently wrong conclusions
7. **Comparison to baselines** — Is this better than cheaper alternatives? (e.g., one model with a longer prompt, one model run 3 times, a human reviewer for the same cost)

---

## The Process Being Reviewed

### Overview

Three independent code reviews of the same code snapshot, each by a different LLM model family (Claude, Gemini, Codex/OpenAI). Each reviewer receives standardised instructions and produces findings in a structured YAML format. A parser matches findings across reviews and computes metrics.

The process runs twice per QA cycle: once on raw AI-generated code (pre-QA), once after fixes are applied (post-QA). The delta between runs measures fix effectiveness.

### The Standardised Review Instructions (Summary)

Every reviewer receives:
- The same diffs (git diff output)
- A taxonomy of 7 defect categories ("Watchdog taxonomy": Semantic Hallucination, Looks Right Trap, Completeness Bias, Dead Code, Training Data Frequency, Paper Guardrail, Phantom Ledger)
- A taxonomy of 6 anti-patterns ("Slopodar": right-answer-wrong-work, phantom-ledger, shadow-validation, paper-guardrail, stale-reference-propagation, loom-speed)
- Required output format: narrative markdown + structured YAML with fields: id, branch, file, line, severity (critical/high/medium/low), watchdog category, slopodar pattern, title, description, recommendation
- Severity guide with examples

### The Matching Algorithm

Findings are matched across reviews using `difflib.SequenceMatcher` on `file + title` fields:
- File similarity weighted 0.3, title similarity weighted 0.7
- Combined similarity threshold: 0.6 (default)
- Greedy matching: first match wins
- One finding per review per group (no duplicates within a review)

### The 8 Claimed Metrics

**Metric 1: Finding Count by Model**
Total, unique, shared-2, shared-3 findings per model.

**Metric 2: Convergence Rate**
Fraction of findings independently identified by 2+ models. Claimed headline: "74% were single-model-only."

**Metric 3: Marginal Value per Review**
Cumulative unique findings as each review is added in sequence. Slope of the curve = marginal value. Claim: "tells you when to stop adding models."

**Metric 4: Severity Distribution by Model**
Count of critical/high/medium/low findings per model.

**Metric 5: Watchdog Category Distribution**
Which defect categories each model detects. Claimed finding: "Semantic Hallucination was caught only by Claude."

**Metric 6: Severity Calibration (Inter-Rater Agreement)**
For converged findings, do models agree on severity? Ordinal distance between ratings.

**Metric 7: Pre-QA vs Post-QA Delta**
Findings fixed, survived, or newly introduced between runs. (Not yet implemented in parser.)

**Metric 8: False Positive Rate**
Findings confirmed as incorrect upon examination. Currently defaults all findings to "confirmed true" pending human verification.

### The Data from the First Run

- Codebase: ~16 tasks across 3 feature branches of a Next.js/TypeScript/Drizzle ORM SaaS application (AI debate arena)
- Code authored by: Claude "polecat" agents (one-shot, fresh context, no interactive steering)
- R1 (Claude opus-4): 18 findings
- R2 (Gemini 3.1): 6 findings
- R3 (Codex 52 / OpenCode): 11 findings
- Total unique after matching: 31
- 3-way convergence: 1 finding (applyCreditDelta non-transactional)
- 2-way convergence: 5 findings
- Single-model: 23 findings (74%)
- False positives: 0 across all 31 findings
- Category blind spots observed: Semantic Hallucination found only by Claude; operational/deployment issues found primarily by Codex

### The 6 Claimed Data Products

| # | Product | Claim |
|---|---------|-------|
| DP-1 | Cross-Model Triangulation Report | "3 independent reviews found X" |
| DP-2 | Fix Quality Assessment | "Here's what survived fixes" |
| DP-3 | Human Delta | "Here's what humans catch that models miss" |
| DP-4 | Cost-Benefit Analysis | "Here's where diminishing returns kicks in" |
| DP-5 | Model Blind Spot Map | "Models have characteristic, predictable blind spots" |
| DP-6 | Severity Calibration Study | "Models agree on critical, diverge on low" |

### The 7 Planned Visualisations

1. Grouped bar: findings per model (total/unique/shared)
2. Line chart: cumulative unique findings vs review count (diminishing returns)
3. Radar chart: Watchdog categories per model, overlaid
4. Heatmap: models × severity
5. Sankey: pre-QA → post-QA finding flow
6. Donut: 3-way / 2-way / single distribution
7. Bar: precision (1 - FP rate) per model

---

## Specific Challenges to Address

Answer each of these directly. Do not deflect with "it depends" — take a position.

### Challenge 1: Is convergence a valid signal?

The team claims "convergence predicts severity" — the one 3-way convergence is the most critical issue. But:
- Could convergence simply reflect that all models share training data about common vulnerability patterns (e.g., "database transactions should be atomic" is in every security textbook)?
- If so, convergence measures training data overlap, not independent verification.
- What would distinguish "genuine independent discovery" from "shared prior knowledge"?

### Challenge 2: Is the 74% single-model rate meaningful?

The headline claim is that 74% of findings were caught by only one model, therefore single-model review is insufficient. But:
- Were all 3 models given exactly the same input? (Same diffs, same instructions, same context window?)
- Were differences in finding count (18 vs 6 vs 11) driven by model capability or by input differences?
- If one model received more context or a better prompt, the "unique findings" may reflect prompt engineering, not model capability.
- What is the baseline? If you ran the same model 3 times with different prompts, would you also get 74% single-run-only findings?

### Challenge 3: Is the matching algorithm defensible?

The greedy SequenceMatcher approach has known failure modes:
- Two findings about the same file but different aspects could be incorrectly merged
- Two findings with similar titles but different files could be incorrectly merged
- The 0.3/0.7 weighting is arbitrary — was it tuned, and if so, on what data?
- Greedy matching is order-dependent: changing the iteration order changes the results
- What is the false match rate? What is the missed match rate? These are not measured.

### Challenge 4: N=31 findings from N=1 codebase

- Can you compute confidence intervals on any of these metrics with N=31?
- The "Semantic Hallucination is Claude-only" claim is based on 3 instances. Is that a characteristic blind spot or a statistical fluctuation?
- Would the same pattern hold on a different codebase? A codebase not written by Claude?
- The team plans to "plot the line of diminishing returns" — from a single data point?

### Challenge 5: The Human Delta problem

DP-3 claims to measure "what humans catch that models miss." But:
- The human reviews AFTER seeing the model findings (even if they're on fixed code)
- Does awareness of the model findings prime the human to look in different places?
- Is the "human delta" measuring human capability, or measuring what's left after models have covered the obvious?
- What would the human have found without any model review? That's the true baseline, and it's not measured.

### Challenge 6: Cost-benefit without costs

The team claims this justifies the cost of cross-model review. But:
- What is the actual cost per review? (API tokens, human dispatch time, wait time)
- What is the cost of a missed finding? (This varies by severity and is not estimated)
- Without these numbers, the "cost-benefit analysis" is a benefit analysis only
- What would a single model with 3x the token budget find compared to 3 models with 1x each?

### Challenge 7: Self-referential validation

The process reviews AI-generated code using AI models, then uses AI to analyse the results. Where is the ground truth?
- Who decides if a finding is a true positive or false positive?
- The current FP rate is claimed as "0%" — but that's because all findings default to "confirmed true"
- Until an independent human audits every finding, the 0% FP rate is a paper guardrail (by the team's own taxonomy)

---

## Required Output Format

### Section 1: Narrative Assessment

For each of the 7 challenges above, state:
- Whether the concern is valid, partially valid, or invalid
- The severity of the concern (fatal flaw / serious weakness / minor concern / acknowledged limitation)
- What the team would need to do to address it
- Whether the claim can be salvaged or must be retracted

Then identify any additional methodological concerns the 7 challenges missed.

### Section 2: Overall Verdict

Answer these three questions:
1. If this were submitted as a methods section to a top venue, would it pass peer review as-is? What changes would be required?
2. Is the process worth continuing, or is it measurement theatre?
3. What is the single most important change to make the methodology defensible?

### Section 3: Structured Findings

```yaml
review:
  model: "<your model name/version>"
  date: "<YYYY-MM-DD>"
  branches:
    - "triangulation-methodology"
  base_commit: "unknown"

findings:
  - id: F-001
    branch: "triangulation-methodology"
    file: "docs/internal/weaver/darkcat-alley.md"
    line: "n/a"
    severity: critical      # critical | high | medium | low
    watchdog: WD-PG         # WD-SH | WD-LRT | WD-CB | WD-DC | WD-TDF | WD-PG | WD-PL | none
    slopodar: none
    title: "Short finding title"
    description: >
      Detailed description.
    recommendation: "What to fix"
```
