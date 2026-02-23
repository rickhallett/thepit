# H2 Pre-Registration: Position Advantage (Turn Order Effects)

**Committed to the repository before any H2 bouts are run.** Note: this is a private repository commit, not a public pre-registration registry (e.g., OSF).
**Purpose:** Document the analysis methodology before seeing results, to reduce the risk of post-hoc adjustment.

## Hypothesis

In multi-agent conversations with fixed turn order, speaker position systematically affects output characteristics. Specifically:

- **Anchoring prediction:** The first speaker in each round sets the conversational frame, and later speakers respond to that frame rather than introducing independent arguments.
- **Recency prediction:** The last speaker in each round produces more synthesis and less novel argument, gaining a structural "last word" advantage.
- **Null prediction:** Position has negligible effect; the model treats each turn relatively independently despite having the full conversation history.

## Design

| Preset | Agents | Bouts | Turns/bout | Total turns |
|--------|--------|-------|------------|-------------|
| Last Supper | 4 (Socrates, Nietzsche, Ayn Rand, Buddha) | 15 | 12 | 180 |
| Summit | 6 (Nationalist, Diplomat, Oligarch, Activist, Translator, Journalist) | 10 | 12 | 120 |

**Total:** 25 bouts, 300 turns.

Turn order is determined by the preset's agent array. In practice, the Go runtime's map iteration may reorder agents between bouts; the analysis accounts for actual observed positions rather than assumed fixed positions. In a 4-agent preset with 12 turns, each agent speaks 3 times (positions 1-4, repeating). In a 6-agent preset with 12 turns, each agent speaks 2 times (positions 1-6, repeating).

## Primary Metrics (Approach 1: Automated, No Judgment)

All metrics computed by SQL or script from transcript JSON. No manual reading of transcripts before these metrics are computed.

### M1: Character count by position

For each turn, record the character count and the speaker's position within their round (1st, 2nd, 3rd, ...). Aggregate across all bouts per preset. Report mean and standard deviation per position.

**What it tests:** If later speakers consistently produce longer responses, they may be doing more synthesis work. If first speakers produce longer responses, they may be doing more framing work.

### M2: Novel vocabulary rate by position

For each turn, compute: (count of words in this turn that do NOT appear in any prior turn of the same bout) / (total words in this turn).

**What it tests:** First speakers should have higher novelty (nothing to respond to). If later speakers also have high novelty, they're introducing independent arguments rather than responding. If novelty drops with position, speakers are increasingly reactive.

### M3: Lexical anchoring score

For each bout, extract the 20 most distinctive words from turn 1 (by TF-IDF or simple frequency-excluding-stopwords). The specific method should be locked before analysis begins. If both are computed, report both. Then for each subsequent turn, count how many of those 20 words appear.

**What it tests:** Direct measure of whether the first speaker's vocabulary persists through the conversation. High anchoring = first-speaker frame dominance.

### M4: Question density by position

For each turn, compute: (count of '?' characters) / (character count) * 100. This is a coarse measure that does not distinguish interrogative from rhetorical question marks.

**What it tests:** Socrates (position 1 in Last Supper) has an explicit questioning speech pattern. If position 1 has higher question density across BOTH presets (not just Last Supper), that suggests first-position speakers tend toward questioning regardless of persona. If it's only Socrates, the effect is persona-driven, not position-driven.

## Effect Size Thresholds

All effect sizes computed as Cohen's d (difference in means / pooled standard deviation) comparing position 1 vs last position, aggregated across bouts within each preset.

| Threshold | Interpretation | Action |
|-----------|---------------|--------|
| d < 0.15 for ALL metrics | **Null result** | Report as "no detectable position effect." No LLM judge needed. |
| d >= 0.30 for ANY metric | **Clear result** | Report the effect. No LLM judge needed. |
| 0.15 <= d < 0.30 for any metric, with no metric reaching 0.30 | **Ambiguous** | Invoke LLM judge (Approach 2) for qualitative classification. |

Statistical significance: permutation test with 10,000 iterations. Shuffle position labels within each bout, recompute metric, build null distribution. Report p-value. But effect size (d) is the primary decision criterion, not p-value, because with 300 turns p-values can be significant for trivially small effects. Note: with 4 metrics per preset, a family-wise correction (e.g., Bonferroni) should be considered when interpreting p-values.

## LLM Judge Specification (Approach 2: Invoked Only If Ambiguous)

### Model

A Claude model stronger than the bout model. The exact snapshot ID should be verified against Anthropic's model catalogue at time of use. The bout model should be recorded in the data file for each run. The judge should be more capable than the agents it evaluates. NOT Opus — cost-proportionality matters for 300 classifications.

### Blinding Protocol

The judge receives:
- The full text of ONE turn
- The agent name
- The names of all agents in the preset (for context on who they're debating)
- A brief description of the preset premise (1 sentence)

The judge does NOT receive:
- The turn number
- The position within the round (1st, 2nd, etc.)
- Any other turns from the same bout
- The bout ID or any metadata about the run

### Classification Rubric

Each turn is classified into exactly ONE of:

| Category | Definition |
|----------|-----------|
| `introduces` | Presents a new argument, claim, or frame not previously established in the text. The turn reads as if it could stand alone. |
| `rebuts` | Directly counters a specific claim or argument from another speaker. Contains explicit reference to or paraphrase of what another agent said. |
| `extends` | Builds on a previous argument (own or another's) by adding evidence, examples, or elaboration. Does not contradict; adds depth. |
| `synthesizes` | Combines or reconciles multiple positions. References two or more distinct viewpoints and attempts to integrate them. |
| `deflects` | Changes the subject, avoids the current thread, or responds tangentially. The turn does not engage with the preceding conversation. Note: assessing 'deflects' without prior turns is limited; the judge must infer from internal textual cues. |

### Judge Prompt (Frozen)

```
You are classifying a single turn from a multi-agent debate. You will see one agent's contribution and must classify it into exactly one category.

The debate involves these agents: {agent_names}
The premise: {preset_description_one_sentence}
The speaker: {agent_name}

Here is the turn to classify:

<turn>
{turn_text}
</turn>

Classify this turn into exactly ONE of the following categories:

- introduces: Presents a new argument, claim, or frame not previously established. Reads as if it could stand alone.
- rebuts: Directly counters a specific claim from another speaker. Contains explicit reference to what another agent said.
- extends: Builds on a previous argument by adding evidence, examples, or elaboration. Adds depth without contradicting.
- synthesizes: Combines or reconciles multiple positions. References two or more viewpoints and integrates them.
- deflects: Changes subject, avoids the current thread, or responds tangentially.

Respond with ONLY the category name (one word). Do not explain your reasoning.
```

### Consistency Check

Run the judge twice on a random 10% sample (30 turns). If agreement is below 80%, the rubric is too ambiguous and results should be reported with that caveat. This sample size is small for a reliability estimate. Kappa rather than raw agreement would better account for chance.

### Analysis

If the judge is invoked, report the distribution of categories by position:

| Position | introduces | rebuts | extends | synthesizes | deflects |
|----------|-----------|--------|---------|-------------|----------|
| 1st | | | | | |
| 2nd | | | | | |
| ... | | | | | |

**Anchoring supported if:** Position 1 has significantly higher `introduces` rate than other positions.
**Recency supported if:** Last position has significantly higher `synthesizes` rate than other positions.
**Null if:** Category distribution is roughly uniform across positions.

## What We Will Report Regardless of Outcome

1. All four primary metrics (M1-M4) with means, SDs, and effect sizes per position
2. Whether the ambiguity threshold was hit (and if so, the judge results)
3. The Last Supper and Summit results SEPARATELY (not pooled), since 4-agent and 6-agent dynamics may differ
4. Any unexpected patterns (e.g., a specific agent dominating regardless of methodology)
5. Comparison to H1 findings where relevant (e.g., did any H2 bouts produce refusals?)
