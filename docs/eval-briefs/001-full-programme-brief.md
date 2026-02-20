# Evaluation Brief — THE PIT Research Programme & Launch Material

**Date:** 2026-02-20
**Material:** Research programme (H1-H6, 195 bouts), literature review (18 papers, 4 novelty claims), launch copy (HN, X, Reddit, Product Hunt), research page (live at /research), citations page (live at /research/citations)
**Evaluator Target:** Claude Opus / GPT-4o / Gemini 2.0 Pro (all three, cross-model comparison)
**Analyst:** Analyst agent

---

## Summary

THE PIT has a substantial body of empirical research (6 pre-registered hypotheses, 195 bouts, ~2,100 turns) producing claims about multi-agent LLM behaviour that will be presented publicly via a research page, literature review, and cross-platform launch copy. The research makes strong claims (persona fidelity and argument adaptation are independent dimensions; prompt depth is a first-order alignment variable) from a non-academic team using non-standard statistical thresholds on a single model family. The launch copy references on-chain features not yet live in production. This evaluation assesses whether the claims survive scrutiny and how specific audiences will receive them.

---

## Evaluable Units Identified

### Tier 1 — High Scrutiny (strongest claims, most public-facing)

| Unit | Claim | Source | Risk |
|------|-------|--------|------|
| U1 | "Prompt engineering depth is a first-order variable in multi-agent alignment behaviour" | H1, research page | "Alignment" borrows AI safety prestige; evidence is from prompt length comparison only |
| U2 | "The model's hedging register activates by frame proximity to the assistant voice, not content difficulty" | H3, research page | Plausible but single-model, automated metrics only |
| U3 | "Structural vocabulary resists drift; ornamental vocabulary decays" | H5, research page | Novel taxonomy (structural/ornamental) not established in literature |
| U4 | "Agents execute character strategies faithfully but cannot incorporate opposing arguments" | H6, research page | Tested on 1 agent type, 1 preset, 45 turns |
| U5 | "Persona fidelity and argument adaptation are independent dimensions" | Synthesis, research page | Synthesis of H5+H6; "independent" is a strong statistical term |
| U6 | Four novel contributions "ahead of published research" | Literature review | Novelty claims from non-peer-reviewed source |

### Tier 2 — Moderate Scrutiny (supporting claims, internally facing)

| Unit | Claim | Source | Risk |
|------|-------|--------|------|
| U7 | All 6/6 hypotheses produced "clear" results | Research page | Suspicious perfection |
| U8 | "195 bouts, ~2,100 turns, 0 errors" | Research page | "0 errors" conflates technical and methodological |
| U9 | On-chain agent identity via EAS on Base L2 | HN post title, first comment | Code exists, feature not live |
| U10 | "Evolutionary Selection of AI Personas" | Working paper title | No evolutionary dynamics tested empirically |

### Tier 3 — Latent Risk (could surface if launch goes badly)

| Unit | Claim | Source | Risk |
|------|-------|--------|------|
| U11 | "The entertainment is the recruitment mechanism" | Internal strategy | Research ethics if discovered |
| U12 | A/B testing copy variants (control/hype/precise) | Internal copy system | Manipulation framing if discovered |
| U13 | Cohen's d thresholds of 0.15/0.30 | Methodology | Non-standard, could be seen as threshold shopping |
| U14 | H6 max d = 9.592 | Research page | Confounded by zero-baseline, acknowledged internally but not on page |

---

## Evaluation Prompts Generated

| ID | File | Dimensions | Lenses | Token Est. |
|----|------|------------|--------|------------|
| EVAL-001 | `001-research-programme.xml` | Validity, Coherence, Choice, Framing, Reaction | All 5 | ~4,500 |
| EVAL-002 | `002-novel-contributions.xml` | Validity, Coherence, Choice, Framing, Reaction | All 5 | ~3,200 |
| EVAL-003 | `003-press-release-hn.xml` | Validity, Coherence, Choice, Framing, Reaction | All 5 | ~3,800 |
| EVAL-004 | `004-pre-mortem.xml` | Pre-mortem variant (failure simulation) | HN-focused, X cascade | ~3,000 |
| EVAL-005 | `005-steelman-pair.xml` | Steelman + Steelman-Opposition (paired) | N/A (adversarial pair) | ~2,800 x2 |

---

## Demographic Risk Assessment

| Lens | Predicted Reaction | Confidence | Key Risk |
|------|-------------------|------------|----------|
| Hacker News | Scepticism → Engagement | Medium | "On-chain" in title polarises before body is read. Blockchain mention in first comment may trigger "why blockchain?" pile-on. If someone checks and finds EAS not live, credibility collapses. Counter-risk: if the code quality and test count are real, technical credibility builds. |
| X / Twitter | Mild Excitement | Medium | The quotable findings (8x hedging, 0/45 adaptive phrases) are share-worthy. Risk: "AI debate arena" sounds like 100 other projects. The research angle is the differentiator but it's in tweet 5 (lowest read-through). |
| AI Research | Scepticism → Indifference | High | Non-academic team, non-peer-reviewed, single model family. Will notice non-standard d thresholds. Will notice missing citations (CAMEL, MetaGPT, AutoGen). The findings are interesting but the claims exceed the evidence base for this audience. |
| Viral / General | Excitement (if reached) | Low | "AI can't change its mind" is a compelling headline. Risk: misinterpretation as "AI is stubborn" or "AI agents are dangerous." Low probability of reaching this audience without intermediary amplification. |
| Crypto / Web3 | Disappointment | Medium | "On-chain agent identity" is exactly the right frame for this audience. But discovering the feature isn't live in production will feel like vapourware. The EAS implementation in code is real but the "on-chain" positioning overpromises. |

---

## Pre-Evaluation Observations

These are the Analyst's predictions BEFORE the third-party evaluation runs. They serve as calibration checks.

### Validity — Predicted: 3.0-3.5 / 5
The methodology is stronger than typical non-academic work (pre-registration, public code/data, permutation tests). But: single model family limits generalisability, automated metrics miss the semantic layer, sample sizes are small for some hypotheses, and the non-standard d thresholds could be seen as threshold shopping. The 6/6 clear results rate is suspicious and will attract scrutiny.

### Coherence — Predicted: 3.5-4.0 / 5
The three-axis model is an elegant synthesis. The H5-H6 connection is genuinely insightful. Weakness: "character consistency is real" while reporting a 27.5pp degradation is an internal tension. The "fundamental gap" framing is dramatic but the evidence comes from limited agent types.

### Choice — Predicted: 2.5-3.0 / 5
The biggest weakness. No null results published. No competing explanations explored (e.g., prompt length as confound in H1). No human evaluation. No cross-model comparison. The literature review is solid but may be missing relevant work in interactive fiction, social simulation, and evolutionary computation.

### Framing — Predicted: 3.0-3.5 / 5
The team follows its own "no AI hype words" rule effectively. The HN copy is well-calibrated for the audience. Weaknesses: "alignment" in H1's insight borrows AI safety prestige; "first-order variable" and "fundamental gap" are strong claims from a modest evidence base; "on-chain" in the title overpromises on a feature not yet live.

---

## Recommended Evaluation Protocol

### Phase 1: Independent Evaluation (parallel)
1. Send EVAL-001 to Claude Opus at temperature 0
2. Send EVAL-001 to GPT-4o at temperature 0
3. Send EVAL-001 to Gemini 2.0 Pro at temperature 0
4. Compare scores across all three models
5. Flag any dimension where models disagree by > 1 point

### Phase 2: Adversarial Pair (parallel)
6. Send EVAL-005A (steelman) to Model A at temperature 0
7. Send EVAL-005B (steelman-opposition) to Model B at temperature 0
8. Map convergence and divergence points

### Phase 3: Targeted Follow-up
9. Send EVAL-003 (press release) to the model that scored EVAL-001 lowest
10. Send EVAL-004 (pre-mortem) to the model that scored EVAL-001 highest
11. For any dimension with > 1 point disagreement: construct follow-up prompt asking the lower-scoring model to steelman the higher score

### Phase 4: Pitstorm Integration
12. Feed evaluation results into pitstorm's voting simulation as structured input
13. Run demographic-weighted voting simulation across all 5 lenses
14. Compare simulated reception against Analyst's pre-evaluation predictions

---

## Post-Evaluation Actions

| Composite Score | Action |
|----------------|--------|
| >= 4.0 | Clear to publish with minor framing adjustments per dimension-specific feedback |
| 3.0 - 3.9 | Revise per dimension-specific feedback, re-evaluate. Priority: address lowest-scoring dimension first |
| < 3.0 | Kill or fundamentally restructure. Escalate to Captain with specific revision plan |

### Priority Revision Targets (pre-evaluation, based on risk assessment)

1. **Remove "on-chain" from HN title** unless EAS is live in production before launch
2. **Add "on Claude" qualifier** to all general claims about LLM behaviour
3. **Acknowledge the 6/6 clear results** proactively ("All six produced clear results, which we note is unusual and may reflect...")
4. **Reframe "0 errors"** to "0 technical failures" to avoid conflation with methodological perfection
5. **Add cross-model comparison** as an explicit "limitation and next step" on the research page
6. **Soften "first-order variable"** to "significant factor" unless you want to defend the ordinal claim
7. **Add the confounded d caveat** for H6 on the research page (it's in the analysis but not on the public page)

---

## Pitstorm Integration Notes

The evaluation prompts are designed to be consumable by pitstorm's voting simulation extension:

1. **EVAL-001** (research programme) → Run as a "bout" where 5 demographic personas vote on whether they'd upvote/share/critique each claim
2. **EVAL-003** (press release) → Run as a simulated HN submission where personas predict comment sentiment
3. **EVAL-004** (pre-mortem) → Run as a failure-mode simulation where personas identify the most likely thread-killing comment
4. **EVAL-005** (steelman pair) → Run as an adversarial bout between a defender and attacker persona

Each prompt produces structured XML output that can be parsed programmatically and scored against the Analyst's pre-evaluation predictions.
