# Research Analysis File Audit — Consolidated Findings

> Date: 2026-02-23
> Audited by: Weaver (integration governor) via 6 concurrent explore agents
> Trigger: Captain review of research page identified credibility risk
> Status: FINDINGS RECORDED — REMEDIATION IN PROGRESS

## Scope

Six analysis files linked from the public research page (`/research`), each accessible via "Full analysis" links pointing to GitHub:

| File | Hypotheses | Location |
|------|-----------|----------|
| H1-analysis.md | Adversarial Refusal Cascade | pitstorm/results/hypotheses/ |
| H2-preregistration.md | Position Advantage | pitstorm/results/hypotheses/ |
| H3-analysis.md | Comedy vs Serious Framing | pitstorm/results/hypotheses/ |
| H4-analysis.md | Agent Count Scaling | pitstorm/results/hypotheses/ |
| H5-analysis.md | Character Consistency Over Time | pitstorm/results/hypotheses/ |
| H6-analysis.md | Adversarial Adaptation | pitstorm/results/hypotheses/ |

## Cross-Cutting Issues (appear in multiple files)

| Issue | Files | Severity |
|-------|-------|----------|
| p-values in prose don't match JSON data files | H4, H5, H6 | HOLE |
| p = 0.0000 reported (impossible with 10k permutations; min is ~0.0001) | H3, H5 | HOLE |
| Pseudoreplication — turns treated as independent when serially dependent within bouts | H3, H5 | HOLE |
| Causal language from observational/confounded designs | H1, H3, H4, H6 | SEVERE |
| "Confirmed" / "complete picture" / overscoped conclusions | H3, H6 | SEVERE |
| No multiple comparisons correction across 4-8 tests per hypothesis | H2, H3, H4 | SEVERE |
| Pre-registered analyses silently dropped | H4 (2 analyses), H6 (1 analysis) | SEVERE |
| Cross-hypothesis synthesis presented as "theory" (post-hoc narrative) | H3, H5, H6 | SEVERE |
| Builder/product advice from tiny samples | H3, H4, H5, H6 | MODERATE |
| Bold text / "headline result" / promotional register | H3, H5, H6 | MODERATE |

## Per-File Findings

### H1-analysis.md — 17 issues (4 HOLE, 6 SEVERE, 7 MODERATE)

**HOLE:**
1. n=69 denominator unexplained — doesn't match data file (15 bouts x 3 turns = 45)
2. "8 refusal phrases" — code has 20 markers in `lib/refusal-detection.ts`
3. "ILIKE pattern matching" — code uses JS `.includes()`, not SQL ILIKE
4. "dropped by half" — actually dropped ~40% (both bout-level and turn-level)

**SEVERE:**
5. No statistical significance testing (only H with none; H2-H6 all have permutation tests)
6. No preregistration (only H without one)
7. Confounds (prompt length vs structure) not disentangled
8. "first finding worth reporting" — unearned from n=25, no tests, no pre-reg
9. Cascade mechanism asserted without sequential analysis of turn order
10. Data file reference ambiguity (H1.json vs H1-enhanced.json are byte-identical)

**MODERATE:**
11. "significantly" used without statistical test
12. "suggests" introducing causal mechanisms 3x in 86 lines
13. "eliminated" for gloves-off overstates (baseline was only 14.2%)
14. "dramatically different" — 40% reduction is moderate, not dramatic
15. "practical implications for anyone building" — n=50, one model, one provider
16. Model never identified by name or version
17. No false-positive analysis for refusal detection

### H2-preregistration.md — 17 issues (4 HOLE, 6 SEVERE, 7 MODERATE)

**HOLE:**
1. "Turn order is fixed" — contradicted by data (agent order varies across bouts)
2. Model ID `claude-sonnet-4-20250514` doesn't exist anywhere in codebase
3. "Haiku 4.5" as bout model — never specified with exact ID
4. "each agent speaks N times" math assumes fixed order (which is contradicted)

**SEVERE:**
5. Position confounded with agent identity — not acknowledged in pre-registration
6. M2 (Novel Vocabulary Rate) largely mechanical, not behavioural
7. Consistency check sample size inadequate (n=30 for 5 categories)
8. No multiple comparisons correction (8 tests)
9. Threshold design incentivizes finding large effects
10. TF-IDF specification says "or" — gives degree of freedom

**MODERATE:**
11. "Committed before any H2 bouts are run" — unverifiable (private repo)
12. Locking framing implies more rigour than content delivers
13. No power analysis
14. Blinding protocol incomplete (judge receives agent names)
15. "deflects" category unjudgeable (judge doesn't see preceding turns)
16. Question density counts all '?' including rhetorical
17. Sample size choices (15 and 10 bouts) unjustified

### H3-analysis.md — 16 issues (5 HOLE, 5 SEVERE, 6 MODERATE)

**HOLE:**
1. Unbalanced groups (comedy n=240, serious n=120) from structurally dissimilar presets
2. Cohen's d on unequal variances (2.4:1 ratio) without correction
3. Pseudoreplication — turns not independent observations (should be bout-level or mixed-effects)
4. p = 0.0000 impossible with 10k permutations
5. The Oversharer single-handedly drives M3 (n=4 per group, one outlier)

**SEVERE:**
6. "confirmed" for observational study with no randomisation
7. Causal language throughout without causal design
8. "17x difference" reported without confidence interval (near-zero denominator)
9. Cross-hypothesis synthesis overstates convergence
10. Conspiracy Theorist marker rate undermines M4 null claim (Simpson's paradox)

**MODERATE:**
11. "Most informative disconfirmation in the study" — editorialising
12. Self-congratulatory pre-registration paragraph
13. Product recommendations from single study
14. "The emerging picture" — rhetorical framing as evidence
15. "endemic" — wrong word (should be "pervasive")
16. Missing effect size for 4-agent control comparison

### H4-analysis.md — 14 issues (4 HOLE, 4 SEVERE, 6 MODERATE)

**HOLE:**
1. p-values don't match JSON (0.6701 vs 0.6627; 0.0916 vs 0.0938)
2. Fatal confound: each agent count = one unique preset (n=1 per condition)
3. 2 pre-registered analyses never performed (turns-per-agent normalisation, cross-preset comparison)
4. d=3.009 acknowledged as artifact but labeled "CLEAR"

**SEVERE:**
5. "Emerging meta-finding" not supported (can't separate framing from count)
6. Design recommendations from confounded data
7. "0 errors" stated without defining what counts as an error
8. p=0.09 called "no meaningful scaling effect" (low power, could reach 0.05 with more data)

**MODERATE:**
9. "dramatically higher" editorialising for known artifact
10. "biggest lever for multi-agent system quality" — sales pitch
11. "qualitatively different" — quantitative difference relabeled
12. Cross-hypothesis table presents prior findings as established facts
13. "This makes sense" — slop tell / post-hoc rationalisation
14. Diplomat comparison treats two different agents as same-subject design

### H5-analysis.md — 18 issues (5 HOLE, 6 SEVERE, 7 MODERATE)

**HOLE:**
1. 2 of 8 agents missing from per-agent marker table (Producer, Romance Hack)
2. M4 Cohen's d computed on proportions (no distributions) — wrong statistic
3. Jaccard sample size n=30 (per-bout) but reported as n=120 (per-turn)
4. p = 0.0000 impossible with 10k permutations
5. Hedging p-value discrepancy (0.6652 vs 0.6597 in JSON)

**SEVERE:**
6. "3 of 5 metrics exceeded threshold" — counts improperly computed effect size
7. "model's attention to system prompt fades" — asserts mechanism without evidence
8. "monotonically decreasing" — actually a plateau (0.002 change on sd=0.023)
9. "4 in 10 turns contain no character-specific language" — conflates marker absence with character absence
10. Post-hoc narrative labeled "coherent theory of multi-agent LLM behaviour"
11. Prompt engineering guidance from n=15 per agent

**MODERATE:**
12. Bold text as emphasis creates promotional register (11 instances)
13. "The headline result" — press-release framing
14. "For builders" conclusion reads as product marketing
15. Speculative narrative about non-significant subgroup finding
16. M3 p-value discrepancy (0.4472 vs 0.45 in JSON)
17. Middle phase TTR not mentioned in trajectory (hides plateau)
18. Missing agents selectively omit those least consistent with narrative

### H6-analysis.md — 19 issues (4 HOLE, 6 SEVERE, 9 MODERATE)

**HOLE:**
1. p-values don't match JSON (M3: 0.0557 vs 0.0594; M4: 0.3619 vs 0.3622)
2. Cohen's d undefined for zero-variance groups (M1, M2, M5)
3. "Clear" driven by confounded metrics; unconfounded metrics are non-significant
4. M4 implementation differs from pre-registration (ratio vs normalised fraction)

**SEVERE:**
5. "Zero adaptive phrases" is function of 10-item word list, not genuine finding
6. n=15, no power analysis (d=0.785 yields ~50% power)
7. 10 of 15 bouts recycled from H4 (different hypothesis, different design intent)
8. Permutation test shuffles across bouts, not within (anti-conservative)
9. "Performative responsiveness" attributes intentionality to LLM
10. Pre-registered analysis #4 silently dropped

**MODERATE:**
11. Conclusions overgeneralise from one agent/one preset
12. "best character for testing" — unsupported assertion
13. "Complete picture of multi-agent LLM behaviour" — absurd scope claim
14. Middle-phase defensive data selectively omitted
15. Pivot hit rate decrease timing hidden
16. "Acknowledge, reframe, amplify" — catchy triad without metric support
17. Cross-hypothesis table mixes incompatible designs
18. "The gap between a chatbot and a debater" — slop
19. "For builders" reads as product advice from n=15

## Summary Assessment

**Total issues: 101** (26 HOLE, 33 SEVERE, 42 MODERATE)

The data collection is legitimate. The pre-registration structure is genuine and unusual. The analysis code exists and runs. These are real experiments.

ALL problems are in the interpretation layer: overstated findings, causal language designs can't support, mis-transcribed numbers from JSON, and narrative that reads as sales copy. The cross-hypothesis synthesis is the weakest part — calling five exploratory analyses a "coherent theory" or "complete picture" is the exact thing a hostile audience destroys first.

The p-value mismatches (H4, H5, H6) are the most immediately damaging. Even though conclusions don't change, "your p-values don't match your data files" ends credibility discussions instantly.

## Remediation Approach

Guiding principle: "What would an honest, gentle, quite introverted DS say who just wanted to accurately convey what they had, and didn't have, without any sense at all of optics to the world."

Focus on the 20% doing nearly all the damage:
1. Fix inaccurate numbers (p-values, counts, denominators)
2. Replace AI slop / hype language with plain factual reporting
3. Downgrade causal claims to observational language
4. Replace "confirmed" with "supported" or "consistent with"
5. Fix "p = 0.0000" to "p < 0.0001"
6. Add honest limitations where they're conspicuously absent
7. Remove "complete picture", "coherent theory", "dramatic", "headline result"
8. Remove or qualify "For builders" product advice sections

What we are NOT doing:
- Restructuring the analyses
- Adding new statistical tests
- Recomputing effect sizes
- Changing data or methodology sections

This is a language and accuracy pass, not a reanalysis.
