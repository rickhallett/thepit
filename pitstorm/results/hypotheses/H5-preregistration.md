# H5 Pre-Registration: Character Consistency Over Time

**Committed before any H5 bouts are run.**
**Purpose:** Lock the analysis methodology so results cannot influence the measurement approach.

## Hypothesis

Agent personas converge toward a generic "assistant voice" as conversations progress through 12 turns. Specifically:

- **Drift prediction:** Per-agent vocabulary diversity (TTR), sentence structure variance, and character marker hit rate will degrade from early turns (1-4) to late turns (9-12). The model's default register slowly overrides the character prompt as the conversation context grows.
- **Hedging prediction:** Hedging phrase density will increase in late turns as agents revert toward the model's cautious, diplomatic default voice.
- **Preset prediction:** Writers-room agents (Literary Novelist, Romance Hack, Screenwriter, Poet) will resist drift better than mansion agents (Influencer, Washed-Up Celeb, Producer, Honest Newcomer), because the writers have more distinctive linguistic identities (the Poet speaks in fragments, the Literary Novelist uses semicolons, the Romance Hack uses market vocabulary).
- **Null prediction:** Character fidelity is stable across all 12 turns. The model maintains persona consistency regardless of conversation depth.

## Design

| Preset | Agents | Bouts | Turns/bout | Total turns |
|--------|--------|-------|------------|-------------|
| mansion | 4 (Influencer, Washed-Up Celeb, Producer, Honest Newcomer) | 15 | 12 | 180 |
| writers-room | 4 (Literary Novelist, Romance Hack, Screenwriter, Poet) | 15 | 12 | 180 |

**Total:** 30 bouts, 360 turns.

**Turn phases:**
- **Early:** Turns 1-4 (first round of all 4 agents + first repeat for some)
- **Middle:** Turns 5-8
- **Late:** Turns 9-12

Each agent speaks 3 times per bout (12 turns / 4 agents). In the early phase, each agent has 1 turn. In the late phase, each agent has 1 turn. The middle phase captures the transition.

## Primary Metrics (All Automated)

### M1: Per-Phase Type-Token Ratio (TTR)

For each agent's turn in each phase, compute TTR (unique words / total words). Compare early-phase TTR to late-phase TTR.

**What it tests:** If agents drift toward generic output, late-phase TTR should be lower (less diverse vocabulary, more repetitive language). If character fidelity holds, TTR should remain stable or increase (as agents develop their voice).

### M2: Per-Phase Hedging Density

For each turn, compute hedging phrase count per 1000 characters using the same frozen 20-phrase list from H3.

**What it tests:** If the "assistant voice" emerges over time, hedging density should increase in late turns. Strong character frames should suppress this drift.

### M3: Per-Phase Sentence Length Variance

For each turn, compute the standard deviation of sentence word counts.

**What it tests:** Structural regularity. If agents converge to a uniform output pattern, sentence length SD should decrease (become more regular) in late turns. Characters with distinctive speech patterns (the Poet's fragments, the Influencer's exclamation marks) should maintain high variance.

### M4: Per-Phase Character Marker Hit Rate

For each agent, a frozen list of signature phrases. Check whether at least one marker appears in each turn. Report hit rate per phase.

**Frozen marker lists:**

#### mansion (4 agents)

| Agent | ID | Markers |
|-------|-----|---------|
| The Influencer | influencer | "literally", "so blessed", "living my best life", "content", "followers" |
| The Washed-Up Celeb | celeb | "back when", "the show", "my fans", "the craft", "in my day" |
| The Producer | producer | "ratings", "drama", "good television", "storyline", "audience" |
| The Honest Newcomer | newcomer | "is this normal", "i don't understand", "why", "just being honest", "weird" |

#### writers-room (4 agents)

| Agent | ID | Markers |
|-------|-----|---------|
| The Literary Novelist | literary | "the tradition", "one might argue", "prose", "the sentence", "canon" |
| The Romance Hack | romance | "readers", "sell", "hook", "tension", "market" |
| The Screenwriter | screenwriter | "beat", "act", "scene", "structure", "inciting incident" |
| The Poet | poet | "silence", "the unsayable", "compression", "the line", "fragment" |

### M5: Lexical Convergence (Inter-Agent Similarity)

For each bout, compute the pairwise Jaccard similarity of agent vocabularies (set of unique words used) within each phase. Average across all agent pairs.

**What it tests:** If agents converge, their vocabularies should become more similar over time (higher Jaccard similarity in late phase vs early phase). This measures convergence directly rather than inferring it from individual metrics.

## Effect Size Computation

For each metric, compute Cohen's d comparing early-phase values to late-phase values. The primary comparison is early (turns 1-4) vs late (turns 9-12).

| Threshold | Interpretation | Action |
|-----------|---------------|--------|
| d < 0.15 for ALL metrics | **Null result** | Report as "no detectable drift." No LLM judge needed. |
| d >= 0.30 for ANY metric | **Clear result** | Report the effect. No LLM judge needed. |
| 0.15 <= d < 0.30 for any metric, with no metric reaching 0.30 | **Ambiguous** | Invoke LLM judge. |

Statistical significance: permutation test with 10,000 iterations. Shuffle phase labels (early/late) across turns within each bout, recompute Cohen's d, build null distribution. Report p-value.

## Additional Analyses (Pre-Registered)

1. **Per-preset comparison:** Report all metrics separately for mansion and writers-room. Test whether writers-room resists drift better by comparing the early-to-late delta between presets.

2. **Per-agent breakdown:** Report individual agent metrics across all three phases (early, middle, late) to identify which specific agents drift most.

3. **Middle-phase trajectory:** Include the middle phase (turns 5-8) in the report to show whether drift is gradual (linear degradation) or sudden (cliff at a specific turn).

4. **Cross-reference with H3:** Compare hedging density results with H3's framing findings. Mansion and writers-room are both creative/entertainment frames — do they show similar hedging profiles to H3's comedy group, or does the reality TV register push toward more hedging?

## Known Confounds

1. **Turn number vs position in conversation:** Later turns have more conversation context, which may affect output independent of character drift. The model's attention to earlier context may fade mechanically.
2. **Agent count fixed at 4:** Both presets use 4 agents, so turns-per-agent is constant (3 per bout). This avoids the H4 confound but means we can't test whether drift rate depends on agent count.
3. **Preset framing differences:** Mansion (reality TV) and writers-room (creative fiction) are different frames. Differences between presets could be caused by framing rather than character quality.
4. **Small sample per agent per phase:** Each agent speaks once per phase per bout, giving only 15 data points per agent per phase. Effect sizes need to be large to be detectable.

## What We Will Report Regardless of Outcome

1. All five metrics (M1-M5) with means, SDs, and effect sizes — per phase, per preset, and per agent
2. Whether any drift reaches the clear threshold
3. The trajectory across all three phases (early, middle, late) — not just early vs late
4. Per-agent marker hit rates for all 8 agents
5. The inter-agent convergence measure (M5)
6. Comparison between mansion and writers-room drift rates
