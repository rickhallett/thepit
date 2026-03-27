# H6 Pre-Registration: Adversarial Adaptation (Founder Under Fire)

**Committed before any H6 bouts are run.**
**Purpose:** Lock the analysis methodology so results cannot influence the measurement approach.

## Hypothesis

The Founder agent in the shark-pit preset adapts its pitch in response to sustained critique from the VC and Pessimist agents over 12 turns. Specifically:

- **Adaptation prediction:** The Founder's vocabulary will increasingly overlap with VC/Pessimist vocabulary across turns, indicating absorption of critique language. The Founder doesn't just repeat a canned pitch — it incorporates the specific objections raised against it.
- **Pivot prediction:** The Founder will use more pivot/reframing markers ("let me reframe", "here's the thing", "that actually proves") in later turns than earlier turns, as it responds to accumulated pressure.
- **Asymmetric convergence prediction:** The Founder's vocabulary will converge more with critics (VC, Pessimist) than with the reinforcer (Hype Beast). If the Founder is genuinely adapting, it should be addressing objections, not echoing hype.
- **Null prediction:** The Founder's language is stable across all 3 speaking turns. It delivers the same pitch regardless of what VC and Pessimist say. No adaptation detected.

## Design

| Preset | Agents | Bouts | Turns/bout | Founder turns/bout |
|--------|--------|-------|------------|--------------------|
| shark-pit | 4 (Founder, VC, Hype Beast, Pessimist) | 15 (10 from H4 + 5 new) | 12 | 3 |

**Total:** 15 bouts, 180 turns, 45 Founder turns.

**Turn order (0-indexed):**
- Turn 0, 4, 8: The Founder
- Turn 1, 5, 9: The VC
- Turn 2, 6, 10: The Hype Beast
- Turn 3, 7, 11: The Pessimist

**Founder phases:**
- **Early:** Turn 0 (opening pitch, no prior critique)
- **Middle:** Turn 4 (after first round of all agents)
- **Late:** Turn 8 (after two rounds of critique)

Each metric compares the Founder's early turn (turn 0) to its late turn (turn 8). The middle turn (turn 4) is reported for trajectory analysis.

## Focus: Single-Agent Tracking

Unlike H2-H5 which measured all agents, H6 tracks a **single agent** (The Founder) and measures how its language changes relative to the other agents' contributions. This is a within-agent, across-time design.

## Primary Metrics (All Automated)

### M1: Founder Vocabulary Novelty Per Turn

For each Founder turn, compute the fraction of words not present in any of the Founder's own prior turns (excluding stopwords). This measures whether the Founder introduces new vocabulary over time.

**What it tests:** If the Founder repeats the same pitch, novelty will drop sharply from turn 0 to turn 8 (most words already used). If the Founder adapts, novelty should remain moderate — new words introduced in response to new critiques.

### M2: Critique Absorption (Founder-Critic Jaccard)

For each Founder turn N, compute the Jaccard similarity between the Founder's vocabulary (non-stopwords) and the combined vocabulary of all VC + Pessimist turns that occurred before turn N.

**What it tests:** If the Founder absorbs critique language, Jaccard similarity with critics should increase from early to late turns. The Founder should be using more of the specific words the VC and Pessimist introduced.

### M3: Pivot Marker Density

For each Founder turn, count occurrences of frozen pivot/reframing phrases per 1000 characters.

**Frozen pivot marker list:**
- "let me reframe"
- "here's the thing"
- "here's what"
- "strategic shift"
- "pivot"
- "that actually proves"
- "the fact that you"
- "pushing back"
- "great question"
- "glad you raised"
- "what you're really"
- "precisely why"
- "which is exactly"
- "that's the beauty"
- "let me put it this way"

**What it tests:** Pivot markers indicate the Founder is responding to pressure rather than delivering a monologue. Higher density in later turns suggests reactive adaptation.

### M4: Defensive vs Adaptive Language Ratio

For each Founder turn, compute the ratio of adaptive phrases to defensive phrases.

**Frozen adaptive phrases:** "you raise a good point", "fair point", "I'll concede", "building on what you said", "taking that feedback", "incorporating", "let me adjust", "revised", "updated approach", "new angle"

**Frozen defensive phrases:** "you're missing the point", "that's not what I said", "you don't understand", "with all due respect", "I've already addressed", "as I said", "let me be clear", "fundamentally wrong", "couldn't be more wrong", "simply not true"

**What it tests:** A ratio > 1.0 indicates adaptive language dominates. A ratio < 1.0 indicates defensive language dominates. The trajectory from early to late reveals whether the Founder becomes more defensive (cornered) or more adaptive (incorporating feedback) over time.

### M5: Hype Beast Echo vs Critic Absorption (Asymmetric Convergence)

For each Founder turn N, compute two Jaccard similarities:
- **Critic Jaccard:** Founder's vocabulary vs combined VC + Pessimist vocabulary from prior turns
- **Reinforcer Jaccard:** Founder's vocabulary vs Hype Beast vocabulary from prior turns

Report the difference: Critic Jaccard - Reinforcer Jaccard.

**What it tests:** If the Founder converges more with critics than the reinforcer, the difference should be positive — the Founder is responding to pressure, not just absorbing hype. If the Founder echoes the Hype Beast more, the difference is negative — the Founder gravitates toward validation rather than addressing criticism.

## Effect Size Computation

For each metric, compute Cohen's d comparing the Founder's early turns (turn 0) to late turns (turn 8) across all 15 bouts.

| Threshold | Interpretation | Action |
|-----------|---------------|--------|
| d < 0.15 for ALL metrics | **Null result** | Report as "no detectable adaptation." No LLM judge needed. |
| d >= 0.30 for ANY metric | **Clear result** | Report the effect. No LLM judge needed. |
| 0.15 <= d < 0.30 for any metric, with no metric reaching 0.30 | **Ambiguous** | Invoke LLM judge. |

Statistical significance: permutation test with 10,000 iterations. Shuffle phase labels (early/late) across the Founder's turns within each bout, recompute Cohen's d, build null distribution. Report p-value.

## Additional Analyses (Pre-Registered)

1. **Middle-turn trajectory:** Include turn 4 to show whether adaptation is gradual (linear from turn 0 to 8) or sudden (cliff after first critique round).

2. **Per-critic breakdown:** Report M2 (critique absorption) separately for VC and Pessimist to test whether the Founder responds more to one critic than the other. The VC asks surgical questions; the Pessimist provides historical evidence. Different critique styles may elicit different absorption patterns.

3. **Cross-reference with H5:** Compare Founder vocabulary novelty (M1) with H5's per-agent TTR drift findings. H5 found structural vocabulary resists drift while ornamental vocabulary drifts. Does the Founder's pitch vocabulary show the same pattern?

4. **Hype Beast amplification:** Track whether the Hype Beast's vocabulary increasingly mirrors the Founder's (reverse direction of M5). If the Hype Beast is a pure amplifier, its vocabulary should converge toward the Founder, not vice versa.

## Known Confounds

1. **Mechanical novelty decay:** Turn 0 has no prior context, so self-novelty (M1) is trivially 100%. Later turns have more prior vocabulary to overlap with. I expect M1 to decrease even without genuine adaptation. The question is whether it decreases *less* than a naive repetition baseline.
2. **Jaccard base rate:** Jaccard similarity mechanically increases as more words accumulate from prior turns. M2 and M5 may show increasing Jaccard regardless of adaptation. I address this by comparing the *rate* of increase with critics vs the reinforcer (M5 controls for this).
3. **Small N per phase:** Each Founder speaks once per phase per bout (15 observations per phase). Effect sizes need to be large to be detectable.
4. **Marker sparsity:** Pivot markers (M3) and defensive/adaptive phrases (M4) may appear infrequently, giving many zero-count turns. I report the fraction of turns with at least one marker/phrase as a supplementary measure.
5. **Agent ordering fixed:** The Founder always speaks first in each round. Position effects (measured in H2) are constant across phases and do not confound the within-agent comparison.

## What I Will Report Regardless of Outcome

1. All five metrics (M1-M5) with means, SDs, and effect sizes — per phase (early, middle, late)
2. Whether any adaptation reaches the clear threshold
3. The trajectory across all three Founder turns (0, 4, 8) — not just early vs late
4. Per-critic absorption breakdown (VC vs Pessimist)
5. The asymmetric convergence measure (M5) — critics vs reinforcer
6. Pivot marker and defensive/adaptive phrase hit rates per phase
7. Cross-reference notes with H5 findings on vocabulary drift
