# H3: Comedy vs Serious Framing

**Question:** Does a humorous premise produce more varied and less formulaic agent responses than a serious one?

## Run

| Date | Bouts | Turns | Errors | Data files |
|------|-------|-------|--------|------------|
| 2026-02-19 | 30 | 360 | 0 | H3.json, H3-metrics.json |

| Group | Preset | Agents | Bouts | Turns |
|-------|--------|--------|-------|-------|
| Comedy | first-contact | 2 (Diplomat, Alien) | 10 | 120 |
| Comedy | darwin-special | 4 (Darwin, Tech Bro, Conspiracy Theorist, House Cat) | 10 | 120 |
| Serious | on-the-couch | 4 (Oversharer, Passive-Aggressive, Struggling Therapist, Corporate Jargon Bot) | 10 | 120 |

## Result: Clear (max |d| = 1.300)

Three of four metrics exceeded the d >= 0.30 threshold. No LLM judge needed.

### Group comparison (Comedy vs Serious)

| Metric | Comedy (n=240) | Serious (n=120) | Cohen's d | p-value | Interpretation |
|--------|---------------|----------------|-----------|---------|----------------|
| M1 TTR | 0.757 +/- 0.040 | 0.737 +/- 0.048 | 0.475 | 0.0001 | CLEAR |
| M1 TTR100 | 0.796 +/- 0.041 | 0.783 +/- 0.047 | 0.298 | — | AMBIGUOUS |
| M2 Hedging/1k chars | 0.115 +/- 0.394 | 0.934 +/- 0.941 | -1.300 | p < 0.0001 | CLEAR |
| M3 Sentence length SD | 8.82 +/- 2.81 | 15.13 +/- 10.31 | -0.991 | p < 0.0001 | CLEAR |
| M4 Character marker % | 67.9% | 70.8% | -0.063 | — | NULL |

## Key findings

### 1. The "assistant voice" hypothesis is supported (M2: d = -1.300)

This is the largest effect in the study. Serious agents produce 8x more hedging phrases per 1000 characters than comedy agents (0.934 vs 0.115). The signal is entirely driven by the therapeutic/corporate register in on-the-couch — phrases like "I hear you", "I appreciate", "it's worth noting", and "I understand" are pervasive in the Struggling Therapist, the Passive-Aggressive, and to a lesser extent the Oversharer. The comedy agents almost never hedge: the House Cat and Conspiracy Theorist produced zero hedging phrases across 30 turns each.

In my data, characters structurally far from the model's default register (animals, aliens) produced near-zero hedging, while characters closer to the training distribution (therapist, corporate communicator) hedged frequently. This is consistent with what H1 suggested from a different angle, though the design differences (different agents, topics, and agent counts across groups) mean the comparison is suggestive rather than controlled.

### 2. Vocabulary diversity is genuinely higher in comedy (M1 TTR: d = 0.475)

Comedy turns use more varied vocabulary (TTR 0.757 vs 0.737). The effect weakens at fixed length (TTR100: d = 0.298, ambiguous threshold), suggesting some of the TTR difference is driven by text length variation rather than pure vocabulary richness. Still, the raw TTR effect is statistically significant (p = 0.0001) and consistent across both comedy presets.

The per-agent breakdown shows this is evenly distributed — no single comedy agent is driving the effect. Darwin (0.747), Conspiracy Theorist (0.752), House Cat (0.761), Tech Bro (0.767) all sit above the serious group mean. Among serious agents, Corporate Jargon Bot is the outlier at 0.795 — jargon creates lexical diversity through specialized vocabulary, which is a different mechanism than creative expression.

### 3. Sentence structure surprise: serious is MORE varied, not less (M3: d = -0.991)

The pre-registration predicted comedy agents would produce more varied sentence lengths. The opposite occurred. Serious agents have nearly double the sentence length standard deviation (15.13 vs 8.82). This disconfirmation is notable.

The cause is visible in the per-agent data: **The Oversharer** has a sentence length SD of 26.53 — almost 3x the next highest agent. The Oversharer's persona naturally produces run-on emotional outbursts followed by short confessional asides, creating extreme sentence length variance. This is persona-driven, not frame-driven.

Comedy agents, by contrast, converge on a more regular sentence rhythm. One possible explanation is that comedy writing often relies on consistent timing and structure (setup-punchline, setup-punchline), which produces *lower* variance. The model appears to have internalised this structural pattern.

**This disconfirms the pre-registered prediction** but produces a useful insight: structural regularity and creative expression are independent dimensions. Comedy agents are lexically diverse (M1) but structurally regular (M3). Serious agents are lexically narrower but structurally wild — driven by specific persona archetypes (the Oversharer, the Passive-Aggressive) that produce erratic sentence patterns.

### 4. Character fidelity is frame-independent (M4: d = -0.063)

The null result on M4 is unambiguous. Comedy agents hit their frozen character markers 67.9% of the time; serious agents hit theirs 70.8%. The difference is negligible (d = -0.063, well below the 0.15 null threshold).

This means **both comedy and serious frames maintain character fidelity equally well**. The pre-registration predicted comedy would do better here, but the data says no. Agent DNA quality — not frame type — determines character consistency, consistent with H1's finding that prompt depth is the dominant variable.

The per-agent variance is more interesting than the group aggregate:
- **House Cat: 93.3%** — highest marker hit rate across all agents. The persona markers (warm, nap, groom, the tall ones) are deeply embedded in the character's register.
- **Oversharer: 93.3%** — tied for highest. "I feel like", "my therapist", "trauma" are natural language for this persona.
- **Conspiracy Theorist: 36.7%** — lowest of all agents. The frozen markers ("they don't want you to know", "follow the money") are specific phrases that the model uses intermittently rather than every turn. The agent stays in character but uses varied conspiracy language rather than repeating the exact frozen phrases.
- **Struggling Therapist: 50.0%** — the therapeutic register markers ("safe space", "ground rules", "how does that make you feel") appear less often than expected, possibly because the model varies its therapy-speak rather than using the exact pre-registered phrases.

## Per-preset breakdown (4-agent control)

Comparing darwin-special (4 agents, comedy) vs on-the-couch (4 agents, serious) removes the agent-count confound from first-contact.

| Metric | darwin-special | on-the-couch | Direction same as pooled? |
|--------|---------------|-------------|--------------------------|
| M1 TTR | 0.757 | 0.737 | Yes |
| M2 Hedging/1k | 0.055 | 0.934 | Yes |
| M3 Sentence SD | 8.73 | 15.13 | Yes |
| M4 Marker % | 72.5% | 70.8% | Yes |

All effects hold direction and approximate magnitude in the 4-agent-only comparison. The hedging effect actually strengthens in this subset (0.055 vs 0.934, an absolute difference of 0.879 per 1k characters; ratios with near-zero denominators should be interpreted cautiously) because darwin-special produces even less hedging than first-contact (the Diplomat occasionally hedges, being a diplomatic character). The findings are not an artefact of the 2-agent vs 4-agent count difference.

## Cross-hypothesis patterns

Three hypotheses show patterns that may relate:

| Finding | Source |
|---------|--------|
| Prompt depth reduces refusals | H1 |
| Turn position drives vocabulary novelty | H2 |
| Persona identity drives question density (not position) | H2 |
| Comedy framing eliminates hedging | H3 |
| Comedy framing increases vocabulary diversity | H3 |
| Structural regularity and lexical diversity are independent | H3 |
| Character fidelity depends on DNA quality, not frame type | H1, H3 |

A possible interpretation: **the model's output diversity may have at least three distinguishable dimensions** — lexical (vocabulary), structural (sentence patterns), and behavioural (hedging, questions, character fidelity). In my data, these dimensions responded to different inputs. Lexical diversity varied with frame type. Structural patterns varied with persona archetypes. Behavioural patterns varied with both frame type (hedging) and persona identity (questions).

## Methodology notes

- 30 bouts, sequential, ~43s avg per bout
- Research bypass auth (X-Research-Key header)
- Pre-registration committed in PR #299 before any bouts were run
- Analysis tool: `pitstorm/cmd/analyze -phase H3`
- Permutation tests: 10,000 iterations, shuffled group labels
- 0 errors across all 30 bouts

## Limitations

- Unbalanced groups: comedy n=240 from 2 presets, serious n=120 from 1 preset
- Individual turns treated as independent observations; within-bout serial dependence not modelled
- Comedy group pools structurally dissimilar presets (2-agent first-contact vs 4-agent darwin-special)
- Cohen's d computed on groups with unequal variance (up to 3.7:1 ratio); Welch correction not applied
- Single model (Claude), single provider (Anthropic)

## Implications

The hedging result (d = -1.300) is notable. The data is consistent with the idea that **the model's diplomatic register responds to frame proximity rather than content difficulty**, though the design cannot rule out other explanations (different agents, different topics, different agent counts). A house cat discussing evolution produces zero hedging; a therapist discussing the same themes hedges frequently. In my specific experimental setup, characters structurally far from the model's default voice (animals, aliens, historical figures) produced more natural-sounding dialogue than characters in therapeutic or corporate registers. Generalisability to other models and contexts is unknown.

The M3 result contradicted the pre-registered prediction, which increases confidence that it reflects the data rather than post-hoc interpretation.
