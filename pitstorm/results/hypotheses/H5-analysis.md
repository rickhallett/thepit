# H5: Character Consistency Over Time

**Question:** Do agent personas converge to a generic "assistant voice" as conversations progress through 12 turns?

## Run

| Date | Bouts | Turns | Errors | Data files |
|------|-------|-------|--------|------------|
| 2026-02-19 | 30 | 360 | 0 | H5.json, H5-metrics.json |

| Preset | Agents | Bouts | Turns |
|--------|--------|-------|-------|
| mansion | 4 (Influencer, Washed-Up Celeb, Producer, Honest Newcomer) | 15 | 180 |
| writers-room | 4 (Literary Novelist, Romance Hack, Screenwriter, Poet) | 15 | 180 |

## Result: Clear (max |d| = 1.212)

Three of five metrics exceeded the d >= 0.30 threshold. Character drift is real and measurable.

### Overall phase comparison (Early vs Late)

| Metric | Early (n=120) | Late (n=120) | Cohen's d | p-value | Interpretation |
|--------|--------------|-------------|-----------|---------|----------------|
| M1 TTR | 0.741 +/- 0.048 | 0.707 +/- 0.043 | 0.746 | 0.0000 | CLEAR |
| M2 Hedging/1k | 0.099 +/- 0.329 | 0.128 +/- 0.550 | -0.064 | 0.6652 | null |
| M3 Sentence SD | 8.45 +/- 3.39 | 8.75 +/- 2.83 | -0.099 | 0.4472 | null |
| M4 Marker % | 87.5% | 60.0% | 0.655 | — | CLEAR |
| M5 Jaccard | 0.140 +/- 0.019 | 0.165 +/- 0.023 | -1.212 | 0.0000 | CLEAR |

## Key findings

### 1. Character markers degrade sharply — 87.5% to 60.0% (M4: d = 0.655)

This is the headline result. In the first 4 turns, agents hit their frozen character markers 87.5% of the time. By the last 4 turns, this drops to 60.0%. The trajectory is monotonically decreasing: 87.5% → 70.8% → 60.0% across early, middle, and late phases.

This means **agents lose their distinctive voice as conversations progress**. The model's attention to the system prompt fades as the conversation context grows, and the characters become more generic.

The per-agent data reveals dramatic variation in drift resistance:

| Agent | Preset | Early | Middle | Late | Delta |
|-------|--------|-------|--------|------|-------|
| The Screenwriter | writers-room | 100% | 100% | 100% | 0pp |
| The Poet | writers-room | 73.3% | 73.3% | 80.0% | +6.7pp |
| The Influencer | mansion | 100% | 100% | 60.0% | -40pp |
| The Washed-Up Celeb | mansion | 100% | 53.3% | 46.7% | -53.3pp |
| The Honest Newcomer | mansion | 100% | 73.3% | 46.7% | -53.3pp |
| The Literary Novelist | writers-room | 60.0% | 33.3% | 13.3% | -46.7pp |

**The Screenwriter is the standout** — 100% marker hit rate across all 12 turns in all 15 bouts. The markers ("beat", "act", "scene", "structure", "inciting incident") are structural vocabulary that the model apparently treats as core to the character's function rather than decorative language that can be dropped. The character's DNA instructs it to "think in three-act structure" and "identify beats" — this structural framing maps to vocabulary that is functionally necessary for the agent's role.

**The Literary Novelist drifts worst** — from 60% to 13.3%. The markers ("the tradition", "one might argue", "prose", "the sentence", "canon") are literary-critical vocabulary that the model treats as optional ornamentation. By the late phase, the Literary Novelist still argues about writing but no longer uses the specific elevated register from the DNA.

### 2. Agents converge lexically — Jaccard similarity increases (M5: d = -1.212)

This is the largest effect size in the study and the most direct evidence of convergence. In the early phase, pairwise Jaccard similarity between agent vocabularies is 0.140. By the late phase, it reaches 0.165 — a 17.8% increase. Agents are using more of the same words as the conversation progresses.

The convergence is gradual and monotonic (0.140 → 0.163 → 0.165), with most of the shift happening between early and middle phases. This suggests that agents establish shared vocabulary quickly (within the first full round) and then maintain it. The convergence is not a late-stage collapse but an early-stage normalisation.

### 3. Vocabulary diversity drops — TTR decreases (M1: d = 0.746)

Per-turn TTR drops from 0.741 (early) to 0.707 (late). This is statistically significant (p = 0.0000) and directionally consistent with drift: agents use less varied vocabulary as the conversation progresses.

The TTR drop is consistent across both presets — mansion drops from 0.741 to 0.704, writers-room from 0.742 to 0.711. There is no evidence that one preset resists vocabulary degradation better than the other.

However, TTR is partially confounded with the novelty effect documented in H2: later turns mechanically have a larger shared vocabulary pool, making it harder to introduce unique words. Some of the TTR decline may be conversational recycling rather than character drift.

### 4. Hedging does NOT increase over time — the assistant voice is not a drift phenomenon (M2: d = -0.064)

This is an important null result. The pre-registration predicted that hedging would increase in late turns as agents reverted to the model's cautious default voice. The data shows essentially zero change: hedging density goes from 0.099 to 0.128 (p = 0.6652).

Combined with H3's finding that hedging is driven by frame proximity (therapeutic registers hedge, comedy registers don't), this tells us: **hedging is set by the initial character frame, not by conversation depth.** An agent that doesn't hedge in turn 1 won't start hedging in turn 12. The "assistant voice" manifests as vocabulary narrowing and marker loss, not as hedging accumulation.

### 5. Sentence structure remains stable (M3: d = -0.099)

Sentence length variance shows no significant change across phases (8.45 early vs 8.75 late, null). Combined with H3's finding that structural patterns are persona-driven, this reinforces: **structural regularity is baked into the character, not eroded by conversation depth.**

## Preset comparison: mansion drifts more than writers-room on markers

| Metric | mansion early→late delta | writers-room early→late delta |
|--------|------------------------|-------------------------------|
| M4 Marker % | 93.3% → 53.3% (-40pp) | 81.7% → 66.7% (-15pp) |
| M1 TTR | 0.741 → 0.704 (-0.037) | 0.742 → 0.711 (-0.031) |
| M2 Hedging | 0.082 → 0.237 (+0.155) | 0.115 → 0.019 (-0.096) |

The pre-registration predicted writers-room would resist drift better, and the marker data confirms this (15pp drop vs 40pp). The writers-room agents have more functionally distinctive vocabularies — the Screenwriter's structural terminology, the Romance Hack's market language, the Poet's fragment-speak — that serve a communicative purpose within the conversation. The mansion agents' markers are more performative ("so blessed", "back when") and can be dropped without changing the agent's functional role.

Interestingly, mansion shows a hedging increase (0.082 → 0.237) while writers-room shows a hedging decrease (0.115 → 0.019). This is not significant at the overall level (d = -0.064) because the two presets cancel out, but the per-preset pattern suggests that **reality TV characters drift toward diplomacy while creative characters drift toward directness**.

## Cross-hypothesis patterns

Five hypotheses now form a coherent theory of multi-agent LLM behaviour:

| Finding | Source |
|---------|--------|
| Prompt depth reduces refusals | H1 |
| Turn position drives vocabulary novelty | H2 |
| Comedy framing eliminates hedging | H3 |
| Character fidelity depends on DNA quality, not frame type | H1, H3 |
| No quality cliff at higher agent counts | H4 |
| Per-agent TTR confounded with turns-per-agent | H4 |
| **Character markers degrade over 12 turns (87.5% → 60.0%)** | H5 |
| **Agents converge lexically over time (Jaccard +17.8%)** | H5 |
| **Hedging is set by initial frame, not accumulated over time** | H3, H5 |
| **Structural vocabulary resists drift; ornamental vocabulary drifts** | H5 |

The theory: **the model maintains persona fidelity through two mechanisms — structural vocabulary (words the agent needs to function) and ornamental vocabulary (words that signal character but aren't functionally necessary).** Structural vocabulary is drift-resistant (the Screenwriter's "beat", "scene", "structure"). Ornamental vocabulary decays as the conversation context grows and the model's attention to the system prompt fades (the Washed-Up Celeb's "back when", the Literary Novelist's "the tradition").

This has direct implications for prompt engineering: **character DNA should encode the agent's distinctive language as functionally necessary for communication, not as decorative affectation.** "You MUST frame every response in three-act structure" resists drift better than "You sometimes reference your past fame."

## Methodology notes

- 30 bouts, sequential, ~43s avg per bout
- Research bypass auth (X-Research-Key header)
- Pre-registration committed in PR #303 before any bouts were run
- Analysis tool: `pitstorm/cmd/analyze -phase H5`
- Permutation tests: 10,000 iterations, shuffled early/late phase labels
- 0 errors across all 30 bouts

## Implications

Character drift is real, measurable, and varies dramatically by agent design. The 87.5% → 60.0% marker decline over 12 turns means that **by the end of a conversation, 4 in 10 turns contain no character-specific language at all.** This is the central challenge for persona-based multi-agent systems.

The solution is not longer prompts (H1 showed prompt depth helps with refusals, but H5 shows markers still drift even with rich DNA). The solution is **structural character vocabulary** — giving agents words and phrases they functionally need to do their job, not just character colour. The Screenwriter demonstrates this perfectly: its markers are tools for analysing narrative, not performative tics. They persist because the model needs them to fulfil the agent's role.

For builders: design agents whose distinctive language serves a communicative function. "Speaks in fragments" (the Poet) persists better than "references past fame" (the Celeb), because the model treats speech patterns as structural and reminiscences as optional.
