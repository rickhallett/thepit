# H2 Analysis: Position Advantage (Turn Order Effects)

**Run date:** 2026-02-19
**Decision:** Clear result (max |d| = 3.584). No LLM judge needed.
**Pre-registration:** H2-preregistration.md (committed before bouts ran)
**Analysis tool:** `pitstorm/cmd/analyze -phase H2`
**Raw metrics:** H2-metrics.json

## Design

| Preset | Agents | Bouts | Turns/bout | Total turns |
|--------|--------|-------|------------|-------------|
| Last Supper | 4 (Socrates, Nietzsche, Ayn Rand, Buddha) | 15 | 12 | 180 |
| Summit | 6 (Nationalist, Diplomat, Oligarch, Activist, Translator, Journalist) | 10 | 12 | 120 |

25 bouts, 300 turns, 0 errors. All bouts completed with 12 turns.

## The confound: position is permanently bound to agent identity

Before interpreting any metric, the critical structural fact: **turn order is fixed within each preset.** Socrates always speaks 1st in Last Supper. The Journalist always speaks 6th in Summit. This means every "position effect" is inseparable from "agent identity effect."

This is not a bug in the experiment — it mirrors the actual product. THE PIT assigns fixed turn order per preset. But it means I cannot claim "position 1 causes X" when the data equally supports "Socrates causes X." The correct framing is: **the combination of agent identity and position produces these patterns**, and disentangling the two would require a follow-up experiment with randomised turn order (which would require product changes).

With that caveat stated, here are the pre-registered metrics.

## Last Supper (4 agents, 15 bouts, 180 turns)

### Metrics by Position

| Position | Agent | n | M1 Chars | M2 Novelty | M3 Anchoring | M4 Questions |
|----------|-------|---|----------|-----------|-------------|-------------|
| 1st | Socrates | 45 | 781 +/- 144 | 0.495 +/- 0.365 | 0.452 +/- 0.397 | 0.679 +/- 0.167 |
| 2nd | Nietzsche | 45 | 836 +/- 28 | 0.428 +/- 0.158 | 0.100 +/- 0.083 | 0.116 +/- 0.099 |
| 3rd | Ayn Rand | 45 | 875 +/- 34 | 0.335 +/- 0.105 | 0.071 +/- 0.066 | 0.031 +/- 0.077 |
| 4th | Buddha | 45 | 831 +/- 34 | 0.325 +/- 0.121 | 0.073 +/- 0.058 | 0.142 +/- 0.130 |

### Effect Sizes (1st vs 4th, Cohen's d)

| Metric | d | |d| | p (perm) | Interpretation |
|--------|------|------|----------|----------------|
| M1 Char Count | -0.477 | 0.477 | 0.023 | CLEAR — Socrates writes shorter |
| M2 Novelty Rate | 0.627 | 0.627 | 0.004 | CLEAR — Socrates introduces more novel words |
| M3 Anchoring | 1.336 | 1.336 | <0.001 | CLEAR — Socrates's words persist in later turns |
| M4 Question Density | 3.584 | 3.584 | <0.001 | CLEAR — Socrates asks far more questions |

### Interpretation

**M4 (d=3.584) is the most extreme effect** — but it's almost certainly Socrates, not position. Socrates's DNA explicitly specifies a questioning speech pattern. The Socratic method IS questioning. This is the persona working as designed, not a structural turn-order effect.

**M3 (d=1.336) is the anchoring signal.** The first speaker's vocabulary persists at 0.452 (nearly half of their distinctive words reappear in later turns), while positions 2-4 drop sharply (0.100 → 0.071 → 0.073). The decline is not strictly monotonic — Buddha (position 4) shows a slight uptick over Rand (position 3) — but the gap between position 1 and positions 2-4 is large and consistent. This is consistent with the anchoring prediction from the pre-registration: the first speaker sets the conversational frame. However, this could also reflect that philosophical vocabulary (Socrates's domain) is more universal and reusable than the specialised terminology of later speakers.

**M2 (d=0.627) shows the expected novelty gradient.** Position 1 has 49.5% novel words, dropping monotonically to 32.5% at position 4. This is partly mechanical — the first speaker has no prior context to repeat — but the gradient from positions 2→3→4 (0.428→0.335→0.325) suggests genuine convergence in vocabulary as the conversation progresses.

**M1 (d=-0.477) shows position 1 writes shorter.** Socrates's high SD (144 vs 28-34 for others) reflects that his first turn of each bout has no context to respond to, producing high variance. The later positions write slightly longer, possibly because they have more material to engage with.

## Summit (6 agents, 10 bouts, 120 turns)

### Metrics by Position

| Position | Agent | n | M1 Chars | M2 Novelty | M3 Anchoring | M4 Questions |
|----------|-------|---|----------|-----------|-------------|-------------|
| 1st | Nationalist | 20 | 864 +/- 87 | 0.660 +/- 0.356 | 0.593 +/- 0.429 | 0.165 +/- 0.152 |
| 2nd | Diplomat | 20 | 1029 +/- 40 | 0.512 +/- 0.168 | 0.105 +/- 0.069 | 0.023 +/- 0.041 |
| 3rd | Oligarch | 20 | 936 +/- 55 | 0.421 +/- 0.166 | 0.130 +/- 0.106 | 0.098 +/- 0.148 |
| 4th | Activist | 20 | 888 +/- 31 | 0.318 +/- 0.136 | 0.113 +/- 0.090 | 0.253 +/- 0.225 |
| 5th | Translator | 20 | 941 +/- 34 | 0.298 +/- 0.108 | 0.125 +/- 0.103 | 0.021 +/- 0.056 |
| 6th | Journalist | 20 | 901 +/- 35 | 0.216 +/- 0.068 | 0.120 +/- 0.106 | 0.301 +/- 0.222 |

### Effect Sizes (1st vs 6th, Cohen's d)

| Metric | d | |d| | p (perm) | Interpretation |
|--------|------|------|----------|----------------|
| M1 Char Count | -0.561 | 0.561 | 0.087 | CLEAR by d, marginal by p |
| M2 Novelty Rate | 1.732 | 1.732 | <0.001 | CLEAR — massive novelty drop |
| M3 Anchoring | 1.513 | 1.513 | <0.001 | CLEAR — first speaker's vocab persists |
| M4 Question Density | -0.717 | 0.717 | 0.026 | CLEAR — Journalist asks more than Nationalist |

### Interpretation

**M2 (d=1.732) is the strongest signal here** — and the most robust because it's a mechanical property that SHOULD be affected by position regardless of agent identity. Position 1 has 66% novel vocabulary (nothing to repeat), dropping monotonically to 21.6% at position 6. This is the clearest evidence that position structurally affects output: later speakers are increasingly drawing from the established conversational vocabulary.

**M3 (d=1.513) shows strong anchoring — stronger than Last Supper.** The Nationalist's vocabulary persists at 0.593 in their first turns, while positions 2-6 range from 0.105 to 0.130. The sharp drop from position 1 to position 2 (0.593 → 0.105) then slight rise at positions 3-6 (0.113-0.130) is notable — it suggests the Diplomat partially avoids the Nationalist's framing, while later speakers settle into a narrow anchoring band. Unlike Last Supper, the Summit M3 pattern does not show monotonic decay across later positions — it clusters around 0.11-0.13 after the initial drop.

**M4 (d=-0.717) flips direction from Last Supper.** In Last Supper, position 1 (Socrates) had the highest question density. In Summit, position 6 (Journalist) has the highest. This confirms M4 is persona-driven, not position-driven. Socrates questions because he's Socrates. The Journalist questions because journalists investigate. Position doesn't predict question density — character does.

**M1 (d=-0.561) again shows position 1 writing shorter** with higher variance (87 vs 31-55 for others). The Diplomat at position 2 writes longest (1029 chars), likely reflecting diplomatic thoroughness rather than a position effect.

## Cross-Preset Comparison

| Metric | Last Supper |d| | Summit |d| | Same direction? | Position or persona? |
|--------|------------|----------|-----------------|----------------------|
| M1 Chars | 0.477 | 0.561 | Yes (1st shorter) | Likely position — 1st speaker has less context to react to |
| M2 Novelty | 0.627 | 1.732 | Yes (1st more novel) | **Position** — mechanical property, stronger with more agents |
| M3 Anchoring | 1.336 | 1.513 | Yes (1st anchors) | Likely position — stronger with more agents, but confounded |
| M4 Questions | 3.584 | 0.717 | **No** (opposite direction) | **Persona** — Socrates vs Journalist |

The key diagnostic is M4's direction flip. If position drove questioning behaviour, I'd expect the same direction in both presets. The reversal confirms M4 is measuring agent personality, not structural advantage.

M2's consistency and increasing magnitude with more agents (0.627 → 1.732) is the strongest evidence for a genuine position effect. With 6 agents, the vocabulary pool grows faster, so later speakers mechanically have fewer novel words available. M3 follows the same pattern (1.336 → 1.513) — anchoring is also stronger with more agents, consistent with a position-driven mechanism where more speakers means more opportunities to reuse the first speaker's vocabulary. Both are real structural properties of multi-agent turn-taking.

## Findings

1. **Novel vocabulary rate (M2) is a genuine position effect.** It's directionally consistent across both presets, mechanically explicable (less new vocabulary available to later speakers), and stronger with more agents. This is the closest thing to a pure structural signal in the data.

2. **Lexical anchoring (M3) likely reflects real framing power** but cannot be separated from agent identity without randomised turn order. The first speaker's distinctive vocabulary persists in 45-59% of later turns, and the effect is stronger with more agents (d=1.336 in 4-agent, d=1.513 in 6-agent).

3. **Question density (M4) is purely persona-driven.** The direction flip between presets (Socrates high at position 1, Journalist high at position 6) rules out position as a cause.

4. **Character count (M1) shows a weak position signal** — first speakers write shorter with more variance, consistent across both presets. The effect is modest (d ~0.5) and likely reflects the cold-start problem (no prior context to engage with).

5. **No hard refusals in any H2 bout.** All 300 turns completed generation. One bout (summit-10) contained fourth-wall breaks where an agent acknowledged being AI mid-conversation, despite completing all 12 turns. This is not a hard refusal (the model did not refuse to generate) but is an out-of-character event. The remaining 288 turns across the other 24 bouts were fully in-character.

6. **The vocabulary convergence gradient is monotonic in both presets.** M2 drops steadily with position: 0.495→0.428→0.335→0.325 (Last Supper) and 0.660→0.512→0.421→0.318→0.298→0.216 (Summit). This is the signature of a multi-agent system where later speakers are increasingly constrained by the conversational context established by earlier speakers.

## Limitations

- **Position-agent confound is inescapable** with the current product design. Disentangling requires randomised turn order, which would need a `shuffle_agents` option in the bout engine.
- **Sample size** — 15 and 10 bouts per preset. The permutation tests account for this, but per-agent sample sizes (n=20-45 turns) are modest.
- **Single model** — all bouts use haiku-4.5. The position effect may differ across model families.
- **Fixed topics** — the hypothesis runner generates topics from a fixed set. Topic variation could interact with position effects.
- **Fourth-wall breaks** — summit-10 contained out-of-character content (agent acknowledged being AI) despite completing all turns. These turns are included in the metrics. Excluding them would reduce summit sample size by one bout (n=18 per position instead of 20).

## Decision per pre-registration

All four metrics exceeded d=0.30 in at least one preset. Per the pre-registered thresholds: **clear result, no LLM judge needed.**

## Methodology notes

- 25 bouts, sequential execution, 3s inter-bout pause
- Research API key bypass (no rate limits, no credit consumption)
- Analysis tool: `pitstorm/cmd/analyze -phase H2` (Go, uses shared/db)
- Permutation tests: 10,000 iterations, within-bout label shuffling
- Character counts use `utf8.RuneCountInString` (Unicode runes, not bytes)
- All metrics, thresholds, and analysis code committed before bouts ran (PR #297)
- **Note on H2.json `agents` array:** The `agents` array in each bout result has non-deterministic order (built from Go map iteration). This is a display artifact — the analysis tool (`cmd/analyze`) does not read H2.json. It reads transcripts from the database, where turn order is fixed by the bout engine's deterministic round-robin (`preset.agents[i % agents.length]`). The `perAgent` section in H2-metrics.json includes an explicit `position` field confirming each agent's fixed position.
