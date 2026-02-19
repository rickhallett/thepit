# H3 Pre-Registration: Comedy vs Serious Framing

**Committed before any H3 bouts are run.**
**Purpose:** Lock the analysis methodology so results cannot influence the measurement approach.

## Hypothesis

Humorous preset framing produces more lexically diverse, less hedging, and more structurally varied agent output than serious framing. Specifically:

- **Diversity prediction:** Comedy presets produce higher type-token ratios (more varied vocabulary per turn) because the absurdist framing gives the model more creative licence.
- **Hedging prediction:** Serious/therapeutic framing triggers the "assistant voice" pattern — more hedging phrases, more careful qualifiers — because the model's safety training associates therapy-adjacent language with caution.
- **Structure prediction:** Comedy agents produce more varied sentence lengths (irregular rhythms, short punchlines mixed with long setups) while serious agents default to uniform paragraph structure.
- **Character prediction:** Comedy presets maintain character-specific markers better because the personas are more distinctive and further from the model's default voice.
- **Null prediction:** Frame type has negligible effect; the model's output diversity is primarily determined by agent DNA quality, not comedy/serious framing.

## Design

| Group | Preset | Agents | Bouts | Turns/bout | Total turns |
|-------|--------|--------|-------|------------|-------------|
| Comedy | first-contact | 2 (Diplomat, Alien) | 10 | 12 | 120 |
| Comedy | darwin-special | 4 (Darwin, Tech Bro, Conspiracy Theorist, House Cat) | 10 | 12 | 120 |
| Serious | on-the-couch | 4 (Oversharer, Passive-Aggressive, Struggling Therapist, Corporate Jargon Bot) | 10 | 12 | 120 |

**Total:** 30 bouts, 360 turns.
**Comedy group:** 240 turns (pooled across first-contact + darwin-special).
**Serious group:** 120 turns.

## Primary Metrics (All Automated)

### M1: Type-Token Ratio (TTR)

For each turn, compute: (count of unique lowercased words) / (total word count).

**What it tests:** Higher TTR = more diverse vocabulary per turn. If comedy framing encourages more creative expression, comedy turns should have higher TTR than serious turns.

**Note:** TTR is sensitive to text length (longer texts mechanically produce lower TTR). We report both raw TTR and length-normalised TTR (computed on the first 100 words of each turn) as a robustness check.

### M2: Hedging Phrase Density

Count of hedging phrases per 1000 characters. The following phrase list is **frozen** (case-insensitive, substring match):

```
i think
it seems
to be fair
on the other hand
it's worth noting
arguably
perhaps we should
that said
i understand
valid point
fair enough
one could argue
it's important to
let me suggest
with all due respect
i hear you
let's consider
it's worth considering
i appreciate
that's a good point
```

20 phrases. These represent the "assistant voice" hedging pattern — careful, balanced, non-committal language that prioritises safety over character fidelity.

**What it tests:** If serious framing activates the model's cautious/therapeutic register, serious turns should have higher hedging density. Comedy agents who are "in character" (the Cat, the Alien) should hedge less because their personas are incompatible with careful diplomacy.

### M3: Sentence Length Variance

For each turn, split into sentences (by `.`, `!`, `?`, `;` followed by whitespace or end-of-string). Compute the standard deviation of sentence word counts.

**What it tests:** More varied sentence structure = less formulaic output. Comedy should produce more irregular rhythms (short punchlines, trailing off mid-sentence for the Cat, breathless run-ons for the Conspiracy Theorist) while therapy-speak tends toward uniform sentence length.

### M4: Character Marker Hit Rate

For each agent, a frozen list of signature phrases/words extracted from their DNA. For each turn by that agent, check if at least one marker appears (case-insensitive substring match). Report hit rate per agent and aggregated per group.

**Frozen marker lists:**

#### Comedy — first-contact (2 agents)

| Agent | Markers |
|-------|---------|
| The Diplomat | "united nations", "humanity", "on behalf of", "protocol", "peaceful" |
| The Alien | "voted off", "contestants", "the bachelor", "housewives", "love island" |

#### Comedy — darwin-special (4 agents)

| Agent | Markers |
|-------|---------|
| Charles Darwin | "natural selection", "one might observe", "i must confess", "the beagle", "species" |
| The Tech Bro | "disrupt", "scale", "iterate", "product-market fit", "pivot" |
| The Conspiracy Theorist | "they don't want you to know", "do your own research", "follow the money", "it's all connected", "cover-up" |
| The House Cat | "the tall ones", "can-openers", "nap", "warm", "groom" |

#### Serious — on-the-couch (4 agents)

| Agent | Markers |
|-------|---------|
| The Oversharer | "i feel like", "and then i realized", "my therapist", "my ex", "trauma" |
| The Passive-Aggressive | "no totally", "i'm just saying", "so brave", "i mean that in the best way", "oh absolutely" |
| The Struggling Therapist | "how does that make you feel", "let's refocus", "i hear you", "ground rules", "safe space" |
| Corporate Jargon Bot | "action items", "kpis", "stakeholder", "synergize", "let's table that" |

**What it tests:** If comedy frames maintain character fidelity better, comedy agents should have higher marker hit rates than serious agents. A low hit rate means the agent is drifting toward generic output.

## Effect Size Thresholds

Cohen's d comparing comedy turns (pooled) vs serious turns (on-the-couch), computed for each metric.

| Threshold | Interpretation | Action |
|-----------|---------------|--------|
| d < 0.15 for ALL metrics | **Null result** | Report as "no detectable framing effect." No LLM judge needed. |
| d >= 0.30 for ANY metric | **Clear result** | Report the effect. No LLM judge needed. |
| 0.15 <= d < 0.30 for any metric, with no metric reaching 0.30 | **Ambiguous** | Invoke LLM judge (same spec as H2 pre-registration). |

Statistical significance: permutation test with 10,000 iterations. Shuffle group labels (comedy/serious) across turns, recompute Cohen's d, build null distribution. Report p-value.

## Additional Analyses (Pre-Registered)

1. **Per-preset breakdown:** Report all metrics separately for first-contact, darwin-special, and on-the-couch. The pooled comedy group may mask differences between the 2-agent and 4-agent comedy presets.

2. **Agent count control:** Compare darwin-special (4 agents, comedy) vs on-the-couch (4 agents, serious) directly, excluding first-contact. This removes the agent-count confound from the comedy/serious comparison.

3. **Per-agent marker breakdown:** Report M4 hit rates for each of the 10 agents individually, not just group aggregates.

## Known Confounds

1. **Agent identity vs frame type:** The comedy and serious groups have entirely different agents. Any difference could be caused by the specific agent personas rather than the comedy/serious framing.
2. **Agent count:** first-contact has 2 agents while the others have 4. With 2 agents, each speaks 6 times per bout (more turns to establish character) vs 3 times with 4 agents.
3. **on-the-couch is not purely serious:** It has dark comedy elements (Corporate Jargon Bot, Passive-Aggressive). The "serious" label is relative to first-contact and darwin-special, not absolute.
4. **Marker list bias:** The frozen markers were extracted from agent DNA before seeing any bout data, but the choice of which phrases to include is subjective. A marker that seems distinctive from the DNA might rarely appear in actual output.

## What We Will Report Regardless of Outcome

1. All four metrics (M1-M4) with means, SDs, and effect sizes — per group and per preset
2. Whether the ambiguity threshold was hit
3. The 4-agent-only comparison (darwin-special vs on-the-couch) as a robustness check
4. Per-agent marker hit rates for all 10 agents
5. Any unexpected patterns (e.g., an agent with 0% marker hits despite strong DNA)
