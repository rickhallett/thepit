# H4 Pre-Registration: Agent Count Scaling Effects

**Committed before any H4 bouts are run.**
**Purpose:** Lock the analysis methodology so results cannot influence the measurement approach.

## Hypothesis

The number of agents in a conversation (2, 4, 5, or 6) affects per-agent output quality and conversation dynamics. Specifically:

- **Depth prediction:** 2-agent conversations (first-contact) will produce longer, more detailed turns per agent because each agent speaks more often (6 turns per bout vs 2-3 in larger groups) and has fewer voices to track.
- **Vocabulary prediction:** Per-agent vocabulary diversity (TTR) will decrease as agent count increases, because each agent has fewer turns to develop distinctive language and the shared context window fills with more varied input.
- **Compression prediction:** Per-agent character count will decrease as agent count increases. With more agents sharing a fixed 12-turn bout, each agent gets fewer turns and may produce shorter responses to leave room for others.
- **Novelty prediction:** Novel vocabulary rate (words not in prior turns) will decrease faster in high-agent-count bouts because the shared vocabulary pool grows more quickly with more speakers.
- **Null prediction:** Agent count has no meaningful effect on per-agent quality metrics; the model adapts to any group size equally well.

## Design

| Preset | Agents | N | Bouts | Turns/bout | Turns/agent/bout | Total turns |
|--------|--------|---|-------|------------|------------------|-------------|
| first-contact | 2 | Diplomat, Alien | 5 | 12 | 6 | 60 |
| shark-pit | 4 | Founder, VC, Hype Beast, Pessimist | 10 | 12 | 3 | 120 |
| flatshare | 5 | Messy One, Note-Leaver, Food Thief, Partner-Bringer, Landlord | 10 | 12 | 2-3 | 120 |
| summit | 6 | Nationalist, Diplomat, Oligarch, Activist, Translator, Journalist | 5 | 12 | 2 | 60 |

**Total:** 30 bouts, 360 turns.

**Note:** H4 also queries existing bouts from H2 (summit, last-supper) and H3 (first-contact, darwin-special) that share these presets. The analysis tool uses ALL completed bouts for a given preset, not just those created during the H4 run. This increases statistical power but means the H4-specific bouts supplement rather than replace earlier data.

## Primary Metrics (All Automated)

### M1: Per-Agent Character Count

For each agent in each bout, compute the mean character count (Unicode runes) across all of that agent's turns.

**What it tests:** If larger groups compress individual contributions, I expect per-agent character count to decrease with agent count. This is the most direct measure of "how much space does each agent get?"

### M2: Per-Agent Type-Token Ratio (TTR)

For each agent in each bout, compute TTR (unique words / total words) across all of that agent's concatenated turns within that bout.

**What it tests:** Higher TTR = more diverse vocabulary. If larger groups force agents into repetitive or formulaic output, TTR should decrease with agent count. This reuses the TTR computation from H3, applied at the per-agent-per-bout level rather than per-turn.

### M3: Turn-Level Novel Vocabulary Rate

For each turn, compute the fraction of words that did not appear in any prior turn in the conversation. This reuses the M2 metric from H2 (position advantage).

**What it tests:** In larger groups, the shared vocabulary pool grows faster (more speakers contributing more varied words). By later turns, novel vocabulary rate should be lower in high-agent-count conversations. The key question is whether this effect is merely additive (more agents = more prior words = less novelty) or whether it represents genuine quality degradation.

### M4: Conversation-Level Lexical Diversity

For each bout, compute TTR across ALL turns from ALL agents concatenated. This measures the overall vocabulary richness of the entire conversation.

**What it tests:** Does adding more agents increase or decrease overall conversation diversity? More agents bring more perspectives but also more opportunities for formulaic output. If agent count improves diversity, M4 should increase with N. If agents regress to a shared mean, M4 should plateau or decrease.

## Effect Size Computation

H4 compares 4 groups (not 2 like H3), so I compute pairwise Cohen's d for the primary comparison: smallest group (N=2, first-contact) vs largest group (N=6, summit). Additional pairwise comparisons (2v4, 2v5, 4v5, 4v6, 5v6) are reported but the primary decision is based on the 2v6 contrast.

Additionally, I compute a **linear trend** test: Pearson correlation between agent count and each metric's group mean. A significant negative correlation for M1-M3 would indicate a consistent scaling degradation.

| Threshold | Interpretation | Action |
|-----------|---------------|--------|
| d < 0.15 for ALL metrics (2v6) | **Null result** | Report as "no detectable scaling effect." No LLM judge needed. |
| d >= 0.30 for ANY metric (2v6) | **Clear result** | Report the effect. No LLM judge needed. |
| 0.15 <= d < 0.30 for any metric, with no metric reaching 0.30 | **Ambiguous** | Invoke LLM judge. |

Statistical significance: permutation test with 10,000 iterations. Shuffle agent-count group labels across bouts, recompute Cohen's d, build null distribution. Report p-value.

## Additional Analyses (Pre-Registered)

1. **Per-preset breakdown:** Report all metrics separately for each preset. The pooled groups may mask preset-specific effects.

2. **Turns-per-agent normalisation:** Because agents in 2-agent bouts speak 6 times while agents in 6-agent bouts speak 2 times, report metrics both raw and normalised to the first 2 turns per agent (equalising exposure).

3. **Per-agent summary:** Report individual agent metrics across all their bouts, identifying any agents that are outliers within their group.

4. **Cross-preset comparison for shared agent counts:** Compare shark-pit (4 agents) with darwin-special (4 agents from H3) and last-supper (4 agents from H2) as a within-count robustness check. If metrics differ substantially between 4-agent presets, that suggests the framing matters more than the count.

## Known Confounds

1. **Agent identity vs agent count:** Each preset has entirely different agents with different personas. A difference between first-contact (2 agents) and summit (6 agents) could be caused by the specific agents rather than the count.
2. **Framing differences:** first-contact is comedy/sci-fi, shark-pit is startup investment, flatshare is domestic comedy, summit is geopolitics. These different frames likely affect output quality independently of agent count.
3. **Turns-per-agent imbalance:** With 12 turns fixed, 2-agent bouts give each agent 6 turns while 6-agent bouts give each 2 turns. This affects both the statistical power per agent and the agent's ability to develop a voice across turns.
4. **Existing data mix:** The analysis includes bouts from H2/H3 alongside H4-specific bouts. These earlier bouts were run at different times and may have different Anthropic API behaviour.
5. **Unequal group sizes:** 5 bouts for first-contact and summit vs 10 for shark-pit and flatshare. This means the 2-agent and 6-agent groups have fewer data points.

## What I Will Report Regardless of Outcome

1. All four metrics (M1-M4) with means, SDs, and effect sizes — per group and per preset
2. The 2v6 primary comparison with Cohen's d and permutation p-value
3. All pairwise comparisons (2v4, 2v5, 4v5, 4v6, 5v6) for completeness
4. The linear trend test (correlation between agent count and metrics)
5. Per-agent breakdowns for all agents across all presets
6. The turns-per-agent normalised comparison
7. Any unexpected patterns (e.g., a non-monotonic relationship where 4 agents is optimal)
