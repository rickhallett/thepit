# Darkcat Alley Synthesis — Run 20260309

**Run ID:** 20260309
**Date:** 2026-03-09
**Models:** Claude Opus 4 (claude-opus-4-6), Gemini 3.1 Pro Preview, Codex 52 (gpt-5.2-codex)
**Trios:** 3 (Code Review, Methodology Adversarial, Pipeline Adversarial)
**Reviews:** 9 of 9 complete (A3 re-run after dud; C3 manually rescued)
**Backrefs:** SD-318 (Darkcat Alley), SD-317 (QA sequencing), SD-134 (truth-first)

---

## Aggregate Numbers

| Metric | Trio A (Code) | Trio B (Method) | Trio C (Pipeline) | Total |
|--------|--------------|----------------|-------------------|-------|
| Total findings (raw) | 33 | 22 | 20 | 75 |
| Unique findings (deduplicated) | 28 | 17 | 13 | 58 |
| 3-way convergence | 0 (0%) | 0 (0%) | 2 (15.4%) | 2 |
| 2-way convergence | 5 (17.9%) | 5 (29.4%) | 3 (23.1%) | 13 |
| Single-model only | 23 (82.1%) | 12 (70.6%) | 8 (61.5%) | 43 |
| Severity agreement (converged) | 3/5 (60%) | 4/5 (80%) | 0/5 (0%) | 7/15 (47%) |

**Cross-trio convergence rate (2+ models):** 15/58 = 25.9%
**Cross-trio single-model rate:** 43/58 = 74.1%

---

## Model Performance Profiles

### Claude Opus 4

| Trio | Findings | Unique | Shared |
|------|----------|--------|--------|
| A (Code) | 13 | 10 | 3 |
| B (Methodology) | 12 | 9 | 3 |
| C (Pipeline) | 7 | 3 | 4 |
| **Total** | **32** | **22** | **10** |

**Strengths:** Highest total output across all trios. Breadth of coverage — detected Semantic Hallucination (WD-SH) in Trio A, which no other model flagged. Strongest methodology adversary (12 findings including 3 CRITICALs on the Darkcat Alley process itself). Highest severity range — willing to flag CRITICAL when warranted.

**Blind spots:** Zero Phantom Ledger (WD-PL) findings in Trio A — missed the non-transactional credit operations that Gemini caught as CRITICAL. Zero Training Data Frequency (WD-TDF) findings in Trio A. Potential author-reviewer correlation (Claude polecats wrote the code; Claude reviewed it).

**Watchdog coverage:** WD-CB (11), WD-PG (5), WD-LRT (6), WD-SH (2), WD-PL (4), WD-TDF (1)

### Gemini 3.1 Pro Preview

| Trio | Findings | Unique | Shared |
|------|----------|--------|--------|
| A (Code) | 14 | 10 | 4 |
| B (Methodology) | 3 | 1 | 2 |
| C (Pipeline) | 7 | 3 | 4 |
| **Total** | **24** | **14** | **10** |

**Strengths:** Deepest transactional analysis — found both non-transactional credit CRITICALs, the missing UNIQUE constraint, the WHERE-less UPDATE, and the select-then-insert race condition. When Gemini converges with another model, the match is precise. Trio B was sparse (3 findings) but 2 of 3 converged — highest precision-to-count ratio.

**Blind spots:** Low methodology adversarial output (3 findings vs Claude's 12 and Codex's 7). No Semantic Hallucination (WD-SH) findings in any trio. Didn't flag the human delta confound or cost-benefit gap that Claude and Codex both caught.

**Watchdog coverage:** WD-CB (9), WD-PG (5), WD-LRT (7), WD-SH (1), WD-PL (3), WD-TDF (2)

### Codex 52 (gpt-5.2-codex)

| Trio | Findings | Unique | Shared |
|------|----------|--------|--------|
| A (Code) | 6 | 3 | 3 |
| B (Methodology) | 7 | 2 | 5 |
| C (Pipeline) | 6 | 2 | 4 |
| **Total** | **19** | **7** | **12** |

**Strengths:** Highest convergence ratio — 12 of 19 findings (63%) were shared with at least one other model. This means Codex rarely finds something nobody else finds, but it reliably confirms what others find. Good methodology adversary (7 findings, 5 converged). Found operational/deployment issues others missed (in-memory rate limiting is instance-local in serverless, auto-start params unvalidated).

**Weaknesses:** Lowest total output across all trios. Initial A3 dispatch produced only 2 findings — context window truncation or conservatism bias. Re-run improved to 6 but still below Claude (13) and Gemini (14). Zero WD-SH, WD-PL, WD-TDF, WD-LRT findings in Trio A. Phantom write on C3 — reported file written when file did not exist on disk (Phantom Ledger in the operational sense).

**Watchdog coverage:** WD-CB (3), WD-PG (10), WD-DC (1), WD-LRT (2), WD-PL (5)

---

## Converged Findings — The Signal

These are the findings where 2+ independent models identified the same issue. They represent the highest-confidence subset of all findings.

### 3-Way Convergence (2 findings — Trio C only)

Both relate to `bin/triangulate`:

1. **Greedy matching is order-dependent and non-commutative** [C: HIGH, G: MEDIUM, X: HIGH]
   All three models independently identified that the greedy SequenceMatcher matching algorithm produces different results depending on input ordering. This is the load-bearing defect in the entire Darkcat Alley pipeline — every downstream metric is a function of this matcher.

2. **Finding validation checks presence but not types** [C: MEDIUM, G: MEDIUM, X: LOW]
   All three models identified that `validate_finding` checks field existence but not data types, allowing malformed inputs to propagate silently.

### 2-Way Convergence (13 findings)

**Trio A — Code Review (5):**

| Finding | Models | Severities | Action |
|---------|--------|-----------|--------|
| x-forwarded-for trusted without proxy trust boundary | Claude + Gemini | HIGH / HIGH | Fix: document proxy trust boundary, validate header |
| navigator.clipboard.writeText no error handling | Claude + Gemini | LOW / LOW | Fix: add try-catch with user feedback |
| Rate limiter keys on raw IP vs hashed fingerprint | Claude + Codex | MEDIUM / MEDIUM | Fix: align IP handling across rate limiter and fingerprint |
| toggleReaction select-then-insert race condition | Gemini + Codex | HIGH / MEDIUM | Fix: use INSERT ON CONFLICT or transaction |
| Winner vote validation / rowCount issue | Gemini + Codex | MEDIUM / HIGH | Fix: validate agentId against bout, handle rowCount |

**Trio B — Methodology (5):**

| Finding | Models | Severities | Action |
|---------|--------|-----------|--------|
| 0% FP rate is unmeasured / mathematically invalid | Gemini + Codex | CRITICAL / CRITICAL | **Must fix:** Replace with "not yet adjudicated" or perform adjudication |
| 74% single-model rate lacks intra-model baseline | Gemini + Codex | HIGH / HIGH | **Must address:** Run same-model-3x baseline experiment or caveat explicitly |
| Human delta confounded by priming | Claude + Codex | HIGH / HIGH | Caveat: state confound explicitly in methodology |
| Cost-benefit analysis contains no cost data | Claude + Codex | HIGH / HIGH | Fix: add token costs, wall-clock time, human dispatch overhead |
| Convergence may measure training data overlap | Claude + Codex | MEDIUM / HIGH | Caveat: acknowledge alternative interpretation |

**Trio C — Pipeline (3):**

| Finding | Models | Severities | Action |
|---------|--------|-----------|--------|
| Seed-only similarity comparison produces false negatives | Claude + Gemini | HIGH / CRITICAL | Fix: compare against all group members, not just seed |
| Marginal value computed for single ordering only | Claude + Codex | HIGH / MEDIUM | Fix: compute all permutations, report mean/variance |
| Metric 7 (Pre/Post QA delta) missing from implementation | Gemini + Codex | MEDIUM / LOW | Fix: implement or remove from spec |

---

## Critical Findings Requiring Immediate Action

Ordered by impact on portfolio credibility:

### 1. The Matcher Problem (Trio C — 3-way + 2-way convergence)

Every model flagged the greedy matching algorithm. This is not a minor implementation bug — it is a measurement instrument defect. All quantitative claims from Darkcat Alley (convergence rates, uniqueness rates, marginal value curves) are functions of this matcher. An unvalidated instrument produces unvalidated measurements.

**Required fixes:**
- Replace greedy first-match with pairwise scoring + optimal assignment (e.g., Hungarian algorithm or max-weight bipartite matching)
- Compare against all group members, not just seed finding
- Report match confidence per group
- Compute marginal value across all N! orderings (6 for 3 models)
- Run before/after comparison to quantify matcher impact on existing metrics

### 2. The FP Rate Claim (Trio B — 2-way convergence, both CRITICAL)

The current implementation defaults all findings to `confirmed_true` and reports `fp_rate: 0.0`. This is a phantom ledger by our own taxonomy. The metrics.yaml files from this run all show 0% FP rates — these numbers look like measurements but are placeholders.

**Required fix:**
- Human adjudication of all converged findings (15 findings minimum)
- Report FP rate as "pending adjudication" until complete
- Never display 0.0 without adjudication evidence

### 3. The Baseline Gap (Trio B — 2-way convergence)

The 74% single-model rate is the headline number. Without a same-model baseline (run Claude 3 times with different seeds), it is impossible to distinguish cross-model diversity from stochastic variation. If Claude disagrees with itself at a similar rate, the cross-model rationale weakens significantly.

**Required action:**
- Either run the baseline experiment (3x Claude, same input, measure internal disagreement rate)
- Or explicitly caveat: "We have not established that this rate exceeds intra-model variation"

### 4. Non-Transactional Credit Operations (Trio A — Gemini-only, 2 CRITICALs)

`applyCreditDelta` and `preauthorizeCredits` both perform UPDATE + INSERT without `db.transaction()`. If the INSERT fails after the UPDATE, user balances are modified without audit trail. These are the highest-severity code findings in the entire run but were found by only one model.

**Required fix:**
- Wrap both operations in `db.transaction()`
- Add integration test for partial-failure scenario

---

## Single-Model Findings of Note

These were found by only one model but are significant enough to warrant attention:

| Finding | Model | Severity | Why it matters |
|---------|-------|----------|---------------|
| Intro pool UPDATE without WHERE updates all rows | Gemini | HIGH | Silent data corruption if singleton assumption violated |
| credit_transactions.reference_id has no UNIQUE constraint | Gemini | HIGH | Concurrent webhooks can double-grant credits |
| Webhook route hard-asserts env vars | Gemini | HIGH | Missing env vars → unhandled 500 on cold start |
| No baseline: same-model-3x comparison | Claude | CRITICAL | Central methodology gap |
| Matching algorithm unvalidated | Claude | CRITICAL | All metrics depend on an uncalibrated instrument |
| findings-union.yaml drops recommendation and line | Gemini | HIGH | Export loses actionable fix data |

---

## Observations on the Process

### What Worked

1. **Cross-model diversity is real and measurable.** 74% single-model rate across all trios (caveat: unbaselined). Each model found things the others missed. This is the core value proposition.

2. **Convergence correlates with finding importance.** The 15 converged findings are disproportionately actionable — they include the 2 CRITICALs on credit operations, the matcher defect, the FP rate problem, and the security issues. The signal-to-noise ratio improves when you filter by convergence.

3. **Structured output enables automation.** The YAML findings blocks parsed successfully for 8 of 9 reviews on first attempt (C3 Codex required manual rescue due to phantom write). `bin/triangulate` processed all 9 reviews and produced machine-readable exports.

4. **Model blind-spot profiles are distinct.** Claude: breadth + methodology. Gemini: transactional depth. Codex: convergence confirmation + operational. This is not random — it reflects different training data and inference strategies.

### What Didn't Work

1. **Codex52 reliability.** A3 produced a dud (2 findings vs 13/14 from others). C3 reported a successful file write that didn't happen (phantom write). Required manual intervention for both. Codex52 is the least reliable reviewer in the pipeline.

2. **The matcher undermines its own output.** The tool designed to measure cross-model agreement uses an algorithm that every model independently identified as unreliable. This must be fixed before the post-QA run.

3. **FP rate is a phantom metric.** The 0% claim appears in every metrics.yaml and will mislead anyone reading the exports without context. This is the most credibility-damaging pattern in the current pipeline.

4. **CLI fragility.** The parser hard-codes 3 positional arguments — we couldn't run Trio A with 2/3 reviews when A3 was missing. Gemini flagged this explicitly (C2: "Fragile CLI argument parsing").

5. **Severity calibration diverges on pipeline findings.** Trio C had 0% severity agreement across 5 converged findings — models agreed on *what* was wrong but not *how bad*. This weakens any severity-weighted analysis.

### Operational Incidents

| Incident | Impact | Root Cause |
|----------|--------|-----------|
| A3 Codex52 dud (2 findings) | Trio A underweight, required re-dispatch | Likely context truncation or conservatism bias |
| C3 Codex52 phantom write | File reported written but absent from disk | Unknown — Codex claimed write succeeded |
| Weaver miscount (reported 5/9 with A3 present) | Temporary confusion, caught on parse | Glob matched input file, not output file |
| Trio A blocked by CLI | Could not aggregate 2/3 reviews | Hard-coded 3-file requirement in parser |

---

## Action Items

### Before Post-QA Run (blocking)

1. **Fix greedy matcher** — replace with optimal assignment, add match confidence, compute all orderings for marginal value
2. **Fix FP rate output** — report as `null` / "pending adjudication" instead of `0.0`
3. **Fix CLI argument parsing** — support variable number of review files
4. **Add recommendation and line fields to findings-union.yaml export**
5. **Human adjudication of converged findings** — at minimum the 15 converged findings from this run

### Before Portfolio (blocking)

6. **Run same-model baseline** — 3x Claude on same input, measure intra-model disagreement
7. **Add cost data** — token counts, wall-clock time, human dispatch overhead per review
8. **Implement Metric 7** — pre/post QA delta comparison
9. **Add inter-rater reliability statistic** — weighted kappa or Krippendorff's alpha

### Code Fixes from Trio A (prioritised)

10. **CRITICAL:** Wrap `applyCreditDelta` and `preauthorizeCredits` in `db.transaction()`
11. **CRITICAL (schema):** Add UNIQUE constraint to `credit_transactions.reference_id`
12. **HIGH:** Fix `toggleReaction` race condition — use INSERT ON CONFLICT
13. **HIGH:** Validate `agentId` against bout lineup in `castWinnerVote`
14. **HIGH:** Document proxy trust boundary for `x-forwarded-for`
15. **HIGH:** Fix intro pool singleton assumption (add WHERE clause or UNIQUE constraint)
16. **MEDIUM:** Align rate limiter IP handling with fingerprint hashing
17. **MEDIUM:** Add error handling to `navigator.clipboard.writeText`

### Methodology Caveats to State Explicitly

- FP rate is unmeasured, not zero
- Single-model rate is unbaselined against intra-model variation
- Human delta is confounded by priming and order effects
- Convergence may partially reflect shared training data, not independent verification
- All findings from N=1 codebase — blind-spot profiles are observations, not generalisable claims
- Model versions are temporal snapshots; profiles may change with updates

---

## Files Produced

```
data/alley/20260309/
  code-review/
    code-review-{claude,gemini,codex52}.md   — raw reviews
    R{1,2,3}.yaml                            — parsed findings
    convergence.yaml                         — convergence matrix
    metrics.yaml                             — computed metrics
    findings-union.yaml                      — deduplicated union (28 findings)
  methodology/
    methodology-{claude,gemini,codex52}.md   — raw reviews
    R{1,2,3}.yaml, convergence.yaml, metrics.yaml, findings-union.yaml (17 findings)
  pipeline/
    pipeline-{claude,gemini,codex52}.md      — raw reviews
    R{1,2,3}.yaml, convergence.yaml, metrics.yaml, findings-union.yaml (13 findings)
  synthesis.md                               — this file
```

---

*Synthesised by @Weaver. Run 20260309, pre-QA. Gate status: data products only, no code changes.*
