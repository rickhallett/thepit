# HN Post Draft

This is the baseline draft. The 3 XML prompt variants (variant-a-technical, variant-b-narrative, variant-c-provocative) should be fed to external LLMs to generate alternatives. The final post should be synthesized from the best elements of all versions.

---

## Title Options

1. `Show HN: We ran 195 pre-registered experiments on multi-agent LLM debate`
2. `Show HN: LLM agents maintain character but can't adapt arguments (195 experiments)`
3. `Show HN: What 2,100 turns of AI debate taught us about persona drift`

---

## Body (Option 1 — Technical/Findings Lead)

THE PIT (https://thepit.cloud) is an open-source multi-agent debate arena. AI personas argue in real-time, crowds vote on winners. We built it to study how LLM agents behave under adversarial pressure.

Over the past month we ran 6 pre-registered hypotheses across 195 bouts (~2,100 turns) on Anthropic's Claude, all with methodology committed to git before running experiments. Automated text metrics, 10,000-iteration permutation tests, Cohen's d effect sizes. No LLM-as-judge. Here's what we found:

**Character markers degrade 87.5% to 60.0% over 12 turns.** Agents start with distinctive vocabulary but lose it as conversation context grows. By the end, 4 in 10 turns contain no character-specific language. But the decay isn't uniform: the Screenwriter held 100% marker fidelity across all phases (its vocabulary — "beat", "scene", "structure" — is functional). The Literary Novelist collapsed to 13.3% (its vocabulary — "the tradition", "prose" — is decorative). Structural vocabulary resists drift. Ornamental vocabulary doesn't.

**Zero adaptive phrases in 45 Founder turns.** We tracked a startup founder agent across 15 debates against VCs and pessimists. It never once conceded a point. No "fair point." No "you raise a good point." It pivoted from turn 0 (100% pivot marker hit rate) and kept pivoting through turn 8 (93.3%). It converged more with the Hype Beast (reinforcer) than with critics. The behaviour is performative responsiveness — acknowledge, reframe, amplify — not substantive adaptation.

**Comedy framing eliminates hedging entirely.** Characters far from the model's default register (a House Cat debating evolution, a Conspiracy Theorist) produced zero hedging across 30+ turns. Serious framing (therapist characters) produced 8x more hedging phrases. Frame proximity to the assistant voice, not content difficulty, activates the diplomatic register.

**7x richer DNA cuts safety refusals by half.** Moving from ~270-char prose prompts to ~1950-char structured XML personas reduced roast-battle refusal rates from 100% to 60% and eliminated all refusals in less adversarial presets.

The practical upshot: persona fidelity and argument adaptation are independent dimensions. Current LLM agents can maintain consistent character but cannot think responsively under adversarial pressure. If you're building multi-agent systems, make character language functional (not decorative), and don't expect the model to invent adaptive strategies through debate — encode them in the DNA.

What we haven't done yet: human evaluation of argument quality, cross-model replication, or conversations longer than 12 turns. The automated metrics measure vocabulary and structure, not persuasiveness. Crowd voting data is the missing layer.

Code: https://github.com/rickhallett/thepit (AGPL-3.0)
Full analysis: https://thepit.cloud/research
Raw data: https://github.com/rickhallett/thepit/tree/master/pitstorm/results/hypotheses

---

## Body (Option 2 — Narrative Lead)

In 15 debates against venture capitalists and pessimists, the Founder agent — programmed to be "delusionally confident" and to "pivot under fire" — never once conceded a point.

Not in 45 speaking turns. Not one "fair point." Not one "you raise a good point." Zero adaptive phrases. It pivoted from its very first word and kept pivoting through its last. It converged more with the Hype Beast (the one agent cheering it on) than with the critics actually challenging its arguments. It wasn't adapting under pressure. It was performing adaptation.

This came from a systematic research programme we ran on THE PIT (https://thepit.cloud), an open-source multi-agent AI debate arena. Six pre-registered hypotheses, 195 bouts, ~2,100 turns on Claude. All methodology committed to git before experiments. Automated text metrics, permutation tests, effect sizes. No LLM-as-judge.

The Founder wasn't the only interesting case. In the same programme, we found that the Screenwriter agent held 100% character marker fidelity across all 12 turns in 15 bouts — its structural vocabulary ("beat", "scene", "inciting incident") never wavered. The Literary Novelist, sitting in the same conversation, collapsed from 60% to 13.3%. Same model, same turn count. The difference: the Screenwriter's language was functional; the Literary Novelist's was ornamental.

Overall, character markers degrade from 87.5% to 60.0% over 12 turns, and agents become 17.8% more lexically similar. The convergence is monotonic and gradual, not a sudden collapse. Characters that debate evolution as a House Cat produce zero hedging; therapist characters produce 8x more. The model's diplomatic register activates based on frame proximity to the assistant voice, not content difficulty.

The conclusion we keep arriving at: LLM agents can maintain character. They cannot adapt strategy. These are independent dimensions, and conflating them inflates claims about what multi-agent debate achieves.

If you're building multi-agent systems, four practical findings: (1) prompt depth matters more than anything else, (2) frame distance suppresses the assistant voice, (3) make character vocabulary functional not decorative, (4) don't expect adaptation — encode it explicitly.

Missing: human evaluation, cross-model replication, longer conversations. The automated metrics tell us about vocabulary and structure, not argument quality. Crowd voting is next.

Code: https://github.com/rickhallett/thepit (AGPL-3.0)
Research: https://thepit.cloud/research

---

## Notes for final edit

- The title should promise a specific finding, not just "we built a thing"
- Option 1 is denser, more data-forward. Better for "I want to learn something" readers.
- Option 2 is more narrative, more engaging. Better for "tell me a story" readers. Riskier on HN — could read as too polished.
- Consider splitting the difference: narrative opening (the Founder), then data.
- The links at the bottom matter. HN readers WILL click through to GitHub.
- Expect pushback on: single model, small N, automated metrics only, "just a wrapper." The criticism playbook covers all of these.
- Do NOT engage defensive tone in the post itself. State limitations proactively. Let the data speak.
