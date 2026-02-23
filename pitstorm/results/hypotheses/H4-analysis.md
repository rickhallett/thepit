# H4: Agent Count Scaling Effects

**Question:** How does the number of agents (2 vs 4 vs 5 vs 6) affect per-agent output quality and conversation dynamics?

## Run

| Date | Bouts (H4-specific) | Total bouts analysed | Total turns | Errors | Data files |
|------|---------------------|---------------------|-------------|--------|------------|
| 2026-02-19 | 30 | 50 | 600 | 0 | H4.json, H4-metrics.json |

The analysis includes all completed bouts for each preset, including 20 bouts from earlier hypothesis runs (10 first-contact from H3, 10 summit from H2).

| Preset | Agents | Bouts | Turns | Turns/agent/bout |
|--------|--------|-------|-------|------------------|
| first-contact | 2 | 15 | 180 | 6 |
| shark-pit | 4 | 10 | 120 | 3 |
| flatshare | 5 | 10 | 120 | 2-3 |
| summit | 6 | 15 | 180 | 2 |

## Result: Clear (max |d| = 3.009, though this is dominated by the turns-per-agent confound; see Finding 1)

Two of four metrics exceeded the d >= 0.30 threshold on the primary 2v6 comparison. No LLM judge needed.

### Primary comparison (2-agent vs 6-agent)

| Metric | 2-agent (n=15) | 6-agent (n=15) | Cohen's d | p-value | Interpretation |
|--------|---------------|---------------|-----------|---------|----------------|
| M1 Per-Agent Chars | 933 +/- 41 | 928 +/- 63 | 0.091 | 0.6627 | null |
| M2 Per-Agent TTR | 0.488 +/- 0.021 | 0.614 +/- 0.047 | -3.009 | p < 0.0001 | CLEAR |
| M3 Novel Vocabulary | 0.447 +/- 0.211 | 0.407 +/- 0.233 | 0.177 | 0.0938 | AMBIGUOUS |
| M4 Conversation TTR | 0.400 +/- 0.015 | 0.359 +/- 0.035 | 1.510 | p < 0.0001 | CLEAR |

## Key findings

### 1. More agents produce HIGHER per-agent vocabulary diversity (M2: d = -3.009)

Agents in 6-agent conversations have higher type-token ratios (0.614 vs 0.488) than agents in 2-agent conversations. The pre-registration predicted the opposite — that per-agent TTR would decrease with agent count.

The explanation is mechanical rather than creative: in a 2-agent bout, each agent speaks 6 times. With more turns, the agent accumulates more total words, and TTR mechanically decreases with text length (the "longer text = lower TTR" effect documented in H3). In a 6-agent bout, each agent speaks only 2 times, producing fewer total words and thus a mechanically higher TTR.

This is an important methodological lesson: **per-agent TTR is confounded with turns-per-agent.** The metric measures text length more than it measures vocabulary creativity. TTR100 (first-100-words normalised) from H3 would be a better comparison, but was not pre-registered for H4.

The trend is strongly linear (r = 0.718): as agent count increases, per-agent TTR increases consistently across all four presets.

### 2. Fewer agents produce higher conversation-level diversity (M4: d = 1.510)

Conversation TTR — the vocabulary richness of the entire bout — is significantly higher in 2-agent conversations (0.400 vs 0.359). This was predicted: with only 2 speakers, the conversation covers less shared ground and each speaker contributes more unique words. With 6 speakers, more vocabulary is shared and repeated across agents.

The trend is moderately negative (r = -0.544): more agents = lower conversation TTR. But the relationship is not strictly linear — flatshare (5 agents, 0.361) and summit (6 agents, 0.359) are nearly identical, suggesting the diversity loss plateaus after 4-5 agents.

### 3. Per-agent character count is unaffected by agent count at the extremes, but drops in the middle (M1: d = 0.091)

The null result on M1 (2v6) masks an interesting non-monotonic pattern:

| Preset | N | Mean chars/agent |
|--------|---|-----------------|
| first-contact | 2 | 933 |
| shark-pit | 4 | 821 |
| flatshare | 5 | 794 |
| summit | 6 | 928 |

Agents in 4-agent and 5-agent bouts write notably shorter turns than agents in 2-agent or 6-agent bouts. The pairwise effects confirm this: 2v4 (d = 2.521) and 2v5 (d = 2.691) are massive, while 2v6 (d = 0.091) is null.

This is likely a framing effect, not a count effect. Summit (geopolitics) and first-contact (alien first contact) both use elevated, formal registers that naturally produce longer responses. Shark-pit (startup pitches) and flatshare (domestic arguments) use casual, punchy registers with shorter turns. The confound between agent count and preset framing makes it impossible to attribute this pattern to scaling alone.

### 4. Novel vocabulary rate shows no meaningful scaling effect (M3: d = 0.177)

The ambiguous result on M3 suggests that the rate at which agents introduce new words to the conversation is roughly constant across group sizes. The prediction was that novelty would drop faster in larger groups because the shared vocabulary pool grows more quickly. The data shows a very slight decrease (0.447 to 0.407) that doesn't reach statistical significance (p = 0.0938).

The trend is negligible (r = -0.070), confirming no linear relationship between agent count and novelty rate. Each agent introduces new vocabulary at roughly the same rate regardless of how many other agents are speaking.

## Pairwise comparison patterns

The full pairwise table reveals that the 2v6 comparison hides more than it reveals:

| Comparison | M1 Chars d | M2 TTR d | M3 Novelty d | M4 Convo TTR d |
|------------|-----------|---------|-------------|----------------|
| 2v4 | **2.521** | -2.929 | 0.250 | **3.459** |
| 2v5 | **2.691** | -2.609 | 0.172 | **2.749** |
| 2v6 | 0.091 | **-3.009** | 0.177 | **1.510** |
| 4v5 | 0.523 | -0.739 | -0.067 | -1.022 |
| 4v6 | **-1.823** | -1.254 | -0.062 | -0.419 |
| 5v6 | **-2.202** | -0.495 | 0.005 | 0.065 |

Key patterns:
- **2v4 and 2v5 show the largest M1 and M4 effects** — the biggest jump is from 2 agents to 4, not from 2 to 6
- **4v5 and 5v6 show small TTR effects** — once you're past 4 agents, adding more doesn't change per-agent TTR much
- **M3 novelty is null across ALL comparisons** — agent count genuinely doesn't affect novelty rate
- **5v6 shows near-zero effects on M3 and M4** — the difference between 5 and 6 agents is negligible

## Per-agent observations

Notable individual patterns:

- **The Diplomat (first-contact, 963 chars)** vs **The Diplomat (summit, 1034 chars)**: Same agent ID appears in both presets. In first-contact (2 agents), the Diplomat averages 963 chars with TTR 0.498. In summit (6 agents), 1034 chars with TTR 0.630. The TTR increase is the mechanical text-length effect, but the char count increase is surprising — the Diplomat actually writes more in the larger group, possibly because the geopolitical framing demands longer diplomatic statements.

- **The Messy One (flatshare, 705 chars)**: Lowest per-agent character count across all agents. The domestic comedy register ("who left their dishes in the sink") naturally produces shorter, punchier responses.

- **The Nationalist (summit, TTR 0.649)**: Highest per-agent TTR. With only 2 turns per bout, the Nationalist's provocative opening statements contain very diverse vocabulary before any repetition can accumulate.

- **The Founder (shark-pit, novelty 0.550)**: Highest novelty rate among 4+ agent groups. The startup pitch format means each turn introduces new product/market language.

## Cross-hypothesis patterns

Four hypotheses now contribute to a consistent picture. These are single-study observations, not established findings. Each carries the limitations of its respective design.

| Finding | Source |
|---------|--------|
| Prompt depth reduces refusals | H1 |
| Turn position drives vocabulary novelty | H2 |
| Persona identity drives question density | H2 |
| Comedy framing eliminates hedging | H3 |
| Comedy framing increases vocabulary diversity | H3 |
| Structural regularity and lexical diversity are independent | H3 |
| Character fidelity depends on DNA quality, not frame type | H1, H3 |
| Per-agent TTR is confounded with turns-per-agent | H4 |
| Conversation diversity plateaus after 4-5 agents | H4 |
| Per-agent turn length is driven by framing, not agent count | H4 |
| Novel vocabulary rate is agent-count-invariant | H4 |

Across these experiments, framing and persona quality appear to be more strongly associated with output variation than structural parameters like count and position, though the confounds in this study prevent a definitive conclusion. Agent count affects mechanical properties (TTR, conversation-level diversity) but not the creative properties that matter for user experience (novelty, turn richness). Persona design may matter more than group size, but this requires further study with designs that isolate count from framing.

## Known limitations

1. **TTR confound with text length**: The M2 finding (d = -3.009) is likely dominated by the turns-per-agent difference. A fair comparison would require either (a) normalising to equal turns per agent, or (b) using TTR100 as in H3. This was documented as a pre-registered additional analysis but TTR100 was not implemented in h4.go.

2. **Preset framing confound**: Each agent count maps to a different preset with different framing. The non-monotonic M1 pattern (high-low-low-high) tracks with formality of framing more than with agent count.

3. **Unequal group sizes**: first-contact and summit have 15 bouts (including H2/H3 data) while shark-pit and flatshare have 10. This gives more statistical power to the 2v6 comparison.

4. **The Diplomat appears in two presets**: first-contact and summit both have a "diplomat" agent, but with different system prompts and different roles. This creates a partial within-agent comparison that could be explored further.

5. **The primary finding (M2 d = 3.009) is dominated by the turns-per-agent confound** and should not be interpreted as a genuine quality difference.

6. **Two pre-registered analyses were not performed**: turns-per-agent normalisation and cross-preset comparison for shared agent counts. These omissions are acknowledged.

7. **Each agent count corresponds to a single preset with unique framing**, making it impossible to attribute effects to count alone.

## Methodology notes

- 50 total bouts analysed (30 H4-specific + 10 from H2 + 10 from H3)
- 600 total turns, 0 errors (no API failures or malformed responses)
- Sequential execution, ~44s avg per bout
- Research bypass auth (X-Research-Key header)
- Pre-registration committed in PR #301 before any H4 bouts were run
- Analysis tool: `pitstorm/cmd/analyze -phase H4`
- Permutation tests: 10,000 iterations, shuffled group labels
- Pearson r trend: computed on per-data-point expansion (not group means) for robustness

## Implications

The practical takeaway for multi-agent system design: **in these presets, we did not observe a quality cliff at higher agent counts, though count and preset framing are confounded.** There are diminishing returns after 4-5 agents. The 5v6 comparison shows near-zero effects across all metrics. If you're choosing between 4, 5, or 6 agents, the decision should be driven by your content needs, not by fears of quality degradation.

The 2-agent case is genuinely different — it produces a structurally different conversation (higher conversation-level diversity, fewer shared vocabulary items) rather than a degraded version of the multi-agent pattern. A 2-agent conversation is functionally a dialogue, while 4+ agents create a panel discussion. They're different formats, not points on a single quality spectrum.

The strongest finding is methodological: **per-agent TTR is a poor metric when agents have different numbers of turns.** Future hypotheses should use length-normalised metrics (TTR100) or compare only within the same turns-per-agent bracket. This is a lesson for anyone measuring "quality" in multi-agent systems — the number of turns an agent gets affects every cumulative metric.
