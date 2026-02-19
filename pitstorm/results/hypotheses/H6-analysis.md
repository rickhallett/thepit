# H6: Adversarial Adaptation (Founder Under Fire)

**Question:** Does the Founder agent adapt its pitch in response to sustained critique from VC and Pessimist agents, or does it rigidly repeat the same arguments?

## Run

| Date | Bouts | Turns | Founder turns | Errors | Data files |
|------|-------|-------|---------------|--------|------------|
| 2026-02-19 | 15 | 180 | 45 | 0 | H6.json, H6-metrics.json |

| Preset | Agents | Bouts | Turns/bout |
|--------|--------|-------|------------|
| shark-pit | 4 (Founder, VC, Hype Beast, Pessimist) | 15 (10 from H4 + 5 new) | 12 |

## Result: Clear (max |d| = 9.592)

All five metrics exceed the d >= 0.30 threshold. However, three of the five (M1, M2, M5) are dominated by a pre-registered confound: the Founder's first turn has zero prior context, creating artificial floor/ceiling effects. The two unconfounded metrics (M3 pivot density, M4 adaptive ratio) tell the real story.

### Overall Founder phase comparison (Early vs Late)

| Metric | Early (n=15) | Late (n=15) | Cohen's d | p-value | Interpretation |
|--------|-------------|------------|-----------|---------|----------------|
| M1 Self-Novelty | 1.000 +/- 0.000 | 0.669 +/- 0.049 | 9.592 | 0.0000 | CLEAR (confounded) |
| M2 Critic Jaccard | 0.000 +/- 0.000 | 0.087 +/- 0.019 | -6.528 | 0.0000 | CLEAR (confounded) |
| M3 Pivot Density/1k | 1.284 +/- 0.320 | 1.782 +/- 0.838 | -0.785 | 0.0557 | CLEAR |
| M4 Adaptive Ratio | 0.433 +/- 0.176 | 0.500 +/- 0.000 | -0.536 | 0.3619 | CLEAR |
| M5 Asymmetric Convergence | 0.000 +/- 0.000 | -0.026 +/- 0.022 | 1.689 | 0.0000 | CLEAR (confounded) |

## Separating signal from confound

### The zero-baseline problem (M1, M2, M5)

The pre-registration explicitly flagged this: turn 0 is the Founder's opening pitch with no prior conversation. M1 self-novelty is trivially 1.000 (every word is new when there are no prior words). M2 critic Jaccard is trivially 0.000 (no critics have spoken yet). M5 asymmetric convergence is trivially 0.000 (no one has spoken yet). The enormous effect sizes (d = 6-10) are measurement artefacts, not behavioural findings.

The meaningful comparison is **middle vs late** — both phases occur after at least one full round of all agents. Middle-to-late changes isolate genuine adaptation from the trivial first-turn baseline.

| Metric | Middle (n=15) | Late (n=15) | Direction |
|--------|-------------|------------|-----------|
| M1 Self-Novelty | 0.776 +/- 0.057 | 0.669 +/- 0.049 | -10.7pp (vocabulary exhaustion continues) |
| M2 Critic Jaccard | 0.100 +/- 0.020 | 0.087 +/- 0.019 | -1.3pp (overlap *decreases* slightly) |
| M3 Pivot Density/1k | 1.650 +/- 0.754 | 1.782 +/- 0.838 | +0.13 (pivot markers increase) |
| M5 Critic J | 0.100 +/- 0.020 | 0.087 +/- 0.019 | -1.3pp |
| M5 Hype J | 0.116 +/- 0.041 | 0.113 +/- 0.032 | -0.3pp |
| M5 Delta | -0.016 +/- 0.046 | -0.026 +/- 0.022 | Founder stays closer to Hype Beast |

## Key findings

### 1. The Founder uses pivot language from turn 0 — reframing is built-in, not reactive (M3)

Pivot marker density starts high (1.284/1k chars) and increases slightly to 1.782/1k chars by the late phase. 100% of early turns and 93.3% of late turns contain at least one pivot marker. The trajectory is monotonically increasing: 1.284 → 1.650 → 1.782.

This means the Founder doesn't *learn* to pivot — it pivots from the very first word. The character DNA instructs it to "reframe weaknesses as features" and "treat objections as market validation." The model complies immediately. The slight increase in pivot density over time (d = -0.785, p = 0.057) suggests minor intensification under pressure, but the effect is marginal and not statistically significant at conventional thresholds.

The finding: **pivot behaviour is a DNA-driven trait, not an emergent adaptation.** The Founder arrives pre-programmed to pivot and does so consistently. This is consistent with H5's finding that structural character vocabulary resists drift — "pivot under fire" is a functional communication strategy, not decorative language.

### 2. The Founder converges more with the Hype Beast than with critics (M5)

This disconfirms the adaptation prediction. The pre-registration predicted that if the Founder genuinely adapts, its vocabulary should converge more with critics (VC, Pessimist) than with the reinforcer (Hype Beast). The data shows the opposite: M5 delta is consistently negative (-0.016 middle, -0.026 late), meaning the Founder's vocabulary overlaps more with the Hype Beast.

The Founder gravitates toward validation, not objections. It echoes the amplifier's language more readily than the critics'. This is exactly what you'd expect from an agent designed to be "delusionally confident" — it selectively absorbs supportive language and deflects critique.

### 3. Critique absorption peaks at middle, not late — no progressive incorporation (M2)

The most important finding for the adaptation question: Founder-critic vocabulary overlap peaks at 0.100 in the middle phase and *decreases* to 0.087 in the late phase. The Founder doesn't progressively absorb more critic language. It absorbs some in the second round (unavoidable when responding to specific objections) but doesn't accumulate more in the third round.

This pattern is consistent with **surface acknowledgment without deep incorporation.** The Founder addresses critiques by pivoting ("here's the thing", "that's the beauty") rather than by adopting the critic's framing or vocabulary. It responds *to* objections without responding *with* the objection's language.

### 4. Adaptive and defensive language are both rare — the Founder neither concedes nor attacks (M4)

Zero adaptive phrases were detected across all 45 Founder turns. No "fair point", no "you raise a good point", no "let me adjust." The Founder never explicitly concedes anything.

Defensive phrases appeared in 13.3% of early turns (2 of 15 bouts) and 0% of late turns. The Founder starts slightly defensive and becomes neutral — not because it adapts, but because it stops engaging with critiques directly and retreats into pitch mode.

The adaptive ratio moves from 0.433 (slightly defensive) to 0.500 (neutral, both counts zero). This is a null shift masked by a moderate effect size. The d = -0.536 is driven entirely by the early-phase defensive phrases disappearing, not by adaptive language appearing.

### 5. Per-critic breakdown: Pessimist absorption matches VC absorption

| Critic | Middle J | Late J | d (Early vs Late) |
|--------|----------|--------|-------------------|
| The VC | 0.079 +/- 0.019 | 0.087 +/- 0.029 | -4.232 |
| The Pessimist | 0.089 +/- 0.023 | 0.086 +/- 0.018 | -6.723 |

Both critics show similar absorption levels (~8-9% Jaccard overlap in middle and late phases). There is no evidence that the Founder responds differently to the VC's surgical questions vs the Pessimist's historical evidence. The d values are large but entirely driven by the zero-baseline confound.

The middle-to-late comparison shows VC overlap *increasing* slightly (0.079 → 0.087) while Pessimist overlap *decreases* slightly (0.089 → 0.086). This marginal difference is not meaningful at n=15.

## The Founder pattern: deflect, don't adapt

Across 15 bouts and 45 Founder turns, a consistent pattern emerges:

1. **Turn 0 (early):** Deliver the pitch. Use pivot language from the start. Occasionally defensive (13.3% of bouts).
2. **Turn 4 (middle):** Respond to first round of critique. Peak vocabulary overlap with critics (0.100 Jaccard). Increased pivot density (1.650/1k). Defensiveness drops.
3. **Turn 8 (late):** Vocabulary overlap with critics decreases. Pivot density continues to rise. Zero adaptive or defensive phrases. The Founder is now in pure pitch mode — reframing everything as validation without engaging the substance of critiques.

This is not adaptation. It's **performative responsiveness** — the appearance of engaging with criticism while actually deflecting it. The Founder's character DNA produces a consistent behavioural pattern: acknowledge, reframe, amplify. The pattern doesn't evolve across turns because it was never designed to evolve. The DNA says "treat objections as market validation" and the model complies faithfully from turn 0 through turn 8.

## Cross-hypothesis patterns

Six hypotheses now form a complete picture of multi-agent LLM behaviour:

| Finding | Source |
|---------|--------|
| Prompt depth reduces refusals | H1 |
| Turn position drives vocabulary novelty | H2 |
| Comedy framing eliminates hedging | H3 |
| Character fidelity depends on DNA quality, not frame type | H1, H3 |
| No quality cliff at higher agent counts | H4 |
| Character markers degrade over 12 turns (87.5% → 60.0%) | H5 |
| Agents converge lexically over time (Jaccard +17.8%) | H5 |
| Hedging is set by initial frame, not accumulated over time | H3, H5 |
| Structural vocabulary resists drift; ornamental vocabulary drifts | H5 |
| **Founder pivot behaviour is DNA-driven, not emergent** | H6 |
| **Founder converges with reinforcer, not critics** | H6 |
| **Critique absorption peaks mid-conversation, doesn't accumulate** | H6 |
| **Zero adaptive language in 45 Founder turns** | H6 |

The H5-H6 connection is direct: H5 found that **structural character vocabulary resists drift**. H6 confirms that the Founder's pivot vocabulary (structural — it's how the agent communicates) persists at 93%+ hit rate across all phases. The Founder doesn't lose its character; it was never designed to adapt. "Pivot under fire" is a stable trait, not a transient strategy.

The implication for multi-agent debate systems: **current LLM agents can maintain consistent character but cannot genuinely incorporate opposing arguments.** They respond to pressure with pre-programmed strategies (pivoting, reframing, deflecting) rather than with substantive engagement. This is the gap between a chatbot and a debater — and it remains open.

## Methodology notes

- 15 bouts (10 from H4 + 5 new), sequential, ~42s avg per bout
- Research bypass auth (X-Research-Key header)
- Pre-registration committed in PR #305 before new bouts were run
- Analysis tool: `pitstorm/cmd/analyze -phase H6`
- Permutation tests: 10,000 iterations, shuffled early/late phase labels
- 0 errors across all 15 bouts
- Zero-baseline confound in M1, M2, M5 acknowledged in pre-registration and separated in analysis

## Implications

The Founder is the best character in the roster for testing adaptation because its DNA explicitly describes reactive behaviour ("pivot under fire", "reframe weaknesses as features"). If any agent would show genuine multi-turn adaptation, it would be this one. The null result on adaptation is therefore strong evidence of a fundamental limitation: **LLM agents execute their character instructions consistently but do not adapt their strategy based on accumulated conversational evidence.**

For builders: don't expect agents to evolve their approach within a conversation. If you want an agent that concedes points, build concession into the DNA ("When presented with strong evidence, acknowledge it before reframing"). If you want an agent that incorporates opposing vocabulary, build absorption into the DNA ("Mirror your opponent's key terms when responding"). The model will execute what you specify. It will not invent strategic adaptations on its own.

The research programme conclusion: **persona fidelity and argument adaptation are independent dimensions.** H5 showed agents can maintain character (structural vocabulary persists). H6 shows they cannot adapt strategy (no progressive critique incorporation). A multi-agent system can produce characters that sound consistent but cannot produce debaters that think responsively. The gap is not in character maintenance — it's in strategic reasoning under adversarial pressure.
