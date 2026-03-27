# Research Page Review — Architect

**Reviewer:** Architect (backend/feature engineer, author of pitstorm analysis code)
**Date:** 2026-02-23
**Commit:** 3057bc7 (master, gate green)
**Directive:** "Read from the harshest possible lens, because that is what the world will do."

---

## R-01: "0 technical failures" stat

**Verdict:** SMUDGE

**The line(s):**
`programmeStats.technicalFailures: 0` — displayed in the programme stats bar as a large accent-coloured number alongside bouts, turns, and hypotheses.

**What a hostile reader sees:**
"They ran 195 bouts on their own platform and had zero failures? That's not a research finding, that's a deployment metric dressed up as science. Of course their own system worked — if it didn't, they'd have fixed it and re-run. This stat exists to make the page feel more impressive, not to inform."

**What must change:**
Remove from the stats bar entirely. Zero failures is a hygiene expectation, not a programme achievement. Displaying it as a headline number alongside substantive metrics (bouts, turns, hypotheses) elevates it to a significance it does not deserve. If the team wants to note reliability, mention it once in the methodology section as a footnote: "All 195 bouts completed without technical error." That's honest without being promotional.

**Confidence:** YES — I ran these bouts. The pitstorm runner retries on transient errors and the research bypass skips rate limits. A zero-failure rate under these conditions is unremarkable. A hostile reader with infrastructure experience will immediately see through this.

---

## R-02: "CLEAR" badge on all 6 hypotheses

**Verdict:** SMUDGE

**The line(s):**
Every hypothesis card shows a green `CLEAR` badge. The type system even defines `'null' | 'ambiguous'` variants that are never used.

**What a hostile reader sees:**
"Six for six? In what legitimate research programme do you pre-register six hypotheses and get a clear result on every single one? Either the thresholds are too lenient, the metrics are too coarse, or the hypotheses were crafted after seeing preliminary data. This looks like confirmation bias wearing a lab coat."

**What must change:**
The methodology note (R-03) addresses this, but it's not enough. The issue is visual: the wall of green creates an immediate credibility problem before anyone reads the caveat. Two options:

1. **Preferred:** Change the badge display for results where key metrics are confounded. H4's largest effect (d=3.009) is explicitly acknowledged in the analysis as a text-length confound, not a genuine quality signal. H6's max d=9.592 is flagged as a measurement artefact. These should not display as unqualified "CLEAR." Consider a `CLEAR*` or `CLEAR (caveated)` badge for H4 and H6 specifically, or use a different colour (amber?) for "clear but confounded."
2. **Minimum:** Add a sentence to the methodology note: "Two hypotheses (H4, H6) returned clear results where the largest effect sizes are dominated by known confounds documented in the full analysis."

I designed these experiments. Some of these "clear" results are genuinely clear (H1, H3, H5). Others are clear only in the narrow sense that *some* metric crossed d=0.30 — but the *largest* reported effect sizes are artefacts. A flat green wall obscures this distinction.

**Confidence:** YES — I wrote the pre-registrations and the analysis. The 6/6 pattern is honest but visually misleading.

---

## R-03: The methodology note

**Verdict:** SMUDGE

**The line(s):**
> "All six hypotheses returned clear results — a pattern we acknowledge is unusual and may reflect our threshold choice (|d| ≥ 0.30) or the relatively coarse-grained nature of text-statistical metrics. We invite scrutiny of the methodology."

**What a hostile reader sees:**
"They acknowledge the problem and then immediately move past it. One sentence of self-awareness does not offset the visual impact of six green badges, bold effect sizes, and a programme stats bar. The caveat is 14pt grey text buried below the stats bar. The clear badges are 12pt green monospace on every card. The visual hierarchy says 'trust us' while the text says 'question us.'"

**What must change:**
1. Promote the caveat's visual weight. Currently it's `text-sm text-muted` — the lowest-emphasis style on the page. It should be at least `text-base text-foreground` with a distinct border or background treatment (e.g., a callout box). The caveat needs to be *at least* as visually prominent as the individual hypothesis cards.
2. Add specifics: "Our threshold of |d| ≥ 0.30 is below conventional 'medium effect' standards in behavioural science (Cohen's d = 0.50). Text-statistical metrics on LLM output may produce large effect sizes more readily than human behavioural data because LLM outputs have lower intrinsic variance within conditions."
3. State explicitly that several "clear" results had their largest effect sizes driven by known confounds (H4's TTR confound, H6's zero-baseline confound).

**Confidence:** YES — the current note is honest in content but dishonest in presentation. The information asymmetry between the visual impact and the textual caveat is a design choice, and a hostile reader will interpret it as deliberate.

---

## R-04: DS paper feel

**Verdict:** SMUDGE

**The line(s):**
The entire page structure: hypothesis cards with IDs, effect sizes, Cohen's d values, programme stats bar, "Cross-hypothesis model," "Three axes of multi-agent output."

**What a hostile reader sees:**
"This borrows the visual grammar of a peer-reviewed paper — hypothesis IDs, effect sizes, cross-study synthesis — without the institutional backing. No IRB. No peer review. No independent replication. The 'three axes model' synthesises six self-run experiments into a theoretical framework. In academia this would be a workshop paper at best, presented here as settled science."

**What must change:**
1. Add a visible disclaimer near the top: "This is an internal research programme by the team that built the platform. It has not been externally reviewed or independently replicated. We publish the methodology and data to enable external scrutiny, not to claim equivalence with peer-reviewed research."
2. The "Cross-hypothesis model" section ("Three axes of multi-agent output") should be explicitly labelled as a working hypothesis, not a finding. The current framing ("The six hypotheses converge on a model with three independent axes") implies convergent validity from independent studies. These are not independent — they were designed by the same person (me), run on the same platform, on the same day, using the same model.

**Confidence:** YES — I designed the experiments and I would not submit this as a paper without significant additional work (independent replication, human evaluation, cross-model testing). The page should not look like something I would submit.

---

## R-05: Effect size values (H6 d=9.592*)

**Verdict:** HOLE

**The line(s):**
H6 card: `maxD: '9.592*'` with keyFinding including `*d confounded by unequal group sizes (3 early vs 3 late turns per bout); treat as directional, not precise.`

**What a hostile reader sees:**
"A Cohen's d of 9.592 is not a real effect size. In behavioural science, d > 3.0 is essentially unheard of. This is either a measurement error or a deliberately inflated number designed to look impressive to people who don't know what Cohen's d means. The asterisk disclaimer is doing more work than any asterisk should have to do."

**What must change:**
This is the single most dangerous number on the page. Here is what the analysis actually found:

The d=9.592 comes from M1 (self-novelty), comparing the Founder's turn 0 (opening pitch, no prior context) to turn 8 (after two rounds). Turn 0 self-novelty is trivially 1.000 (every word is new when you've never spoken before) with SD=0.000. Turn 8 is 0.669 with SD=0.049. The division-by-near-zero SD inflates d to absurdity. **The analysis itself says explicitly:** "The enormous effect sizes (d = 6-10) are measurement artefacts, not behavioural findings."

The page should:
1. **Not display 9.592 as the max d.** The meaningful unconfounded metrics are M3 (d=0.785, pivot density) and M4 (d=0.536, adaptive ratio). Report `maxD: '0.785'` or `maxD: '0.785†'` with a note that confounded metrics reached higher values.
2. If the asterisk approach is kept (I advise against it), the footnote needs to be far more prominent. Currently it's inline text in the keyFinding field. A statistician scanning the page sees `d=9.592` in green monospace and will dismiss the entire programme.
3. In the keyFinding, replace the asterisk-based caveat with a direct statement: "The largest effect sizes (d=6-10) are measurement artefacts from zero-baseline confounds. The unconfounded metrics show a moderate effect (d=0.785 for pivot density)."

**Confidence:** YES — I wrote this analysis. I flagged the confound in the analysis document itself. Displaying the confounded value as the headline number on the research page contradicts my own analysis notes.

---

## R-06: "Prompt depth is the dominant lever"

**Verdict:** SMUDGE

**The line(s):**
Builder lesson #1: "7x richer structured DNA cuts safety refusals by half or eliminates them entirely on Claude."

**What a hostile reader sees:**
"'By half' — from what to what? '7x richer' — 7x what dimension? And 'eliminates them entirely' is doing a lot of work there. I bet the elimination only happened in specific conditions."

**What the analysis actually says:**
- The "7x" refers to character count: ~270 chars baseline vs ~1950 chars enhanced. This is accurate.
- "Cuts by half" refers to roast-battle: bouts with at least one refusal dropped from 100% to 60%. This is a 40 percentage point drop, not "by half." The per-bout refusal *turn count* dropped from 43% to 26%, which IS roughly half. So "by half" is defensible only for the average refusal turns metric, not for the bout-level rate.
- "Eliminates them entirely" refers to gloves-off preset only. In roast-battle, the enhanced DNA still had 60% of bouts containing refusals. The page doesn't specify which preset.

**What must change:**
1. Add the preset context: "In the more adversarial format (roast-battle), refusal turns dropped from 43% to 26%. In structured debate (gloves-off), enhanced DNA eliminated all refusals."
2. "Cuts safety refusals by half" should become "reduces average refusal rate by approximately half in the most adversarial preset." The current phrasing lets the reader assume the best case (elimination) is the general case.
3. The H1 analysis also notes a critical caveat the page omits: the refusal rank order is preserved. The Insult Comic still refuses most even with enhanced DNA. Persona archetype still matters — prompt depth doesn't override the character's proximity to safety boundaries, it compresses the gap.

**Confidence:** YES — I ran H1. The claim is directionally correct but omits the condition that matters: roast-battle is still at 60% refusal rate. "Eliminates them entirely" is true only for gloves-off.

---

## R-07: "Frame distance eliminates the assistant voice"

**Verdict:** SMUDGE

**The line(s):**
Builder lesson #2: "Characters structurally far from the model's default register (animals, aliens, historical figures) produce zero hedging."

**What a hostile reader sees:**
"'Zero hedging' — literally zero? In how many turns? That's a strong claim. And what counts as 'structurally far'? That's a post-hoc categorisation."

**What the analysis actually says:**
- H3 analysis: "the House Cat and Conspiracy Theorist produced zero hedging phrases across 30 turns each."
- This is true: 0 hedging phrases detected in 30 turns per agent, using the frozen 20-phrase hedging list.
- However: "zero" depends entirely on the phrase list. The hedging detection uses ILIKE pattern matching on 20 specific phrases. An agent that hedges with novel phrasing ("I can see both perspectives here" or "Well, that's one way to look at it") would not be detected. "Zero hedging" means "zero hits on our 20 frozen phrases," not "zero cautious language."
- The per-agent data shows the Alien and Diplomat (first-contact) were not at zero — the Diplomat occasionally hedges. The "zero" claim is specific to House Cat and Conspiracy Theorist.
- "Structurally far from the model's default register" is my interpretive framing, not a measured variable. The analysis does not define or measure "frame distance."

**What must change:**
1. Change "produce zero hedging" to "produced zero instances of the 20 pre-registered hedging phrases across 30 turns each" or simply "produced near-zero hedging on our automated metrics."
2. Acknowledge the measurement limitation: automated hedging detection catches specific phrases, not all cautious language.
3. "Frame distance" should be presented as a hypothesis, not a finding: "We hypothesise that frame distance from the model's default register predicts hedging reduction, but we have not directly measured frame distance."

**Confidence:** YES — "zero hedging across 30 turns" is factually accurate *for the specific measurement*. But the implication that these agents produce no cautious language whatsoever is stronger than the measurement supports.

---

## R-08: "Make character language functional, not decorative"

**Verdict:** SOLID (with minor caveat)

**The line(s):**
Builder lesson #3: '"You MUST frame every response in three-act structure" resists drift (100% marker persistence). "You sometimes reference past fame" does not (collapses to 13.3%).'

**What a hostile reader sees:**
"Are these exact quotes from real agent prompts? And 100% seems suspiciously perfect."

**What the analysis actually says:**
- H5 analysis confirms: The Screenwriter maintained 100% marker hit rate across all three phases (early, middle, late) in all 15 bouts. Markers: "beat", "act", "scene", "structure", "inciting incident."
- The Literary Novelist collapsed from 60% to 13.3%. Markers: "the tradition", "one might argue", "prose", "the sentence", "canon."
- The 100% is real. I checked: every one of the Screenwriter's ~45 turns contained at least one of the five frozen markers. This is because the markers ("act", "scene", "structure") are extremely common words in any discussion about writing when framed in screenwriting terms.
- The quoted prompt fragments ("You MUST frame every response in three-act structure" and "You sometimes reference past fame") are my paraphrases of the agent DNA, not exact quotes from the preset JSON. I would need to verify they match the actual prompt text.

**What must change:**
1. Verify the quoted prompt fragments are accurate or explicitly mark them as paraphrases: "The Screenwriter's DNA instructs structural analysis (100% marker persistence). The Washed-Up Celeb's DNA suggests occasional reminiscence (collapses to 13.3%)."
2. Note that "100% marker persistence" means "at least one of five markers appeared in every turn" — not that every marker appeared every time. A turn containing only the word "structure" once would count. This is a low bar, which partly explains the perfect score.

**Confidence:** YES — the numbers are accurate. The insight (functional vocabulary > decorative vocabulary) is the most practically useful finding in the programme. The quoted prompts may need verification against actual preset files.

---

## R-09: "Don't expect strategic adaptation"

**Verdict:** SMUDGE

**The line(s):**
Builder lesson #4: "Build concession or absorption into the DNA explicitly if you want it. The model executes character instructions faithfully but will not invent adaptive strategies through debate."

And H6 card keyFinding: "Zero adaptive phrases in 45 Founder turns."

**What a hostile reader sees:**
"You tested ONE agent persona (the Founder) in ONE preset (shark-pit) on ONE model (Haiku 4.5) and you're generalising to 'the model' doesn't adapt? The Founder is literally designed to be 'delusionally confident' — you tested the most stubborn possible character and concluded that characters don't concede."

**What the analysis actually says:**
The H6 analysis is admirably honest about this: "The Founder is the best character in the roster for testing adaptation because its DNA explicitly describes reactive behaviour ('pivot under fire', 'reframe weaknesses as features'). If any agent would show genuine multi-turn adaptation, it would be this one."

But the hostile reader has a point: "the model will not invent adaptive strategies" is a generalisation from n=1 agent. The analysis argues this is a strong test case (the Founder's DNA is the most adaptation-primed), and I still believe this argument holds. But:

- We didn't test an agent with DNA that explicitly instructs adaptation ("concede points when the evidence is strong").
- We didn't test agents with confrontational DNA that might adapt differently.
- The H6 pre-registration itself lists "single agent" as a known limitation.

**What must change:**
1. Qualify the builder lesson: "In our testing, a single agent designed for reactive behaviour (the Founder) showed zero adaptive phrases in 45 speaking turns." Then the recommendation: "If you need adaptive behaviour, build it into the DNA explicitly."
2. The general claim "The model executes character instructions faithfully but will not invent adaptive strategies through debate" should be scoped: "In our testing on Claude Haiku with a single agent type, ..." or "Based on H6's single-agent test, we recommend..."
3. The builder lesson title "Don't expect strategic adaptation" is stronger than what a single-agent study supports. Consider: "Don't assume strategic adaptation will emerge."

**Confidence:** YES on the data (zero adaptive phrases in 45 turns is real). NO on the generalisation without caveats. The leap from "the Founder doesn't adapt" to "the model doesn't adapt" needs explicit scoping.

---

## R-10: "honest null results" (subtitle)

**Verdict:** HOLE

**The line(s):**
Copy system subtitle: "Six pre-registered hypotheses. 195 bouts. Automated metrics, permutation tests, and honest null results."

**What a hostile reader sees:**
"I just scrolled through six hypotheses. They're all CLEAR. Where are the null results? The subtitle promises honest null results and the page delivers none. This is either a lie or a euphemism."

**What the analysis actually says:**
There ARE null results — within individual hypotheses. H3's M4 (character marker rate) is null (d=-0.063). H4's M1 and M3 are null/ambiguous. H5's M2 and M3 are null. H6's M4 is effectively null (masked by disappearing defensive phrases). But these are sub-metrics within hypotheses, not hypothesis-level results.

The subtitle says "honest null results" while every hypothesis badge says CLEAR. This is a direct contradiction.

**What must change:**
Remove "honest null results" from the subtitle. Replace with something accurate:
- "Six pre-registered hypotheses. 195 bouts. Automated metrics and permutation tests. Open methodology."
- Or: "Six pre-registered hypotheses. 195 bouts. Automated metrics, permutation tests, and several within-hypothesis null findings."
- Or simply delete the phrase and let the methodology note speak for itself.

**Confidence:** YES — "honest null results" in a subtitle where all results are CLEAR is indefensible. A hostile reader will use this exact contradiction to discredit the page.

---

## R-11: Title — "Trust research in adversarial environments"

**Verdict:** SMUDGE

**The line(s):**
Page title: "Trust research in adversarial environments" (from `c.researchPage.title`).

**What a hostile reader sees:**
"'Trust research' — you measured lexical diversity metrics and hedging phrase counts. You did not measure trust. No human trust judgments were collected. No trust instruments were administered. The word 'trust' in the title implies you studied trust, but you studied text statistics."

**What must change:**
The title is interpretable in two ways: (1) "Research about trust in adversarial environments" (implies trust was measured) or (2) "Research you can trust, conducted in adversarial environments" (claims trustworthiness of methodology). Both readings are problematic — (1) because trust wasn't measured, (2) because claiming your own research is trustworthy is circular.

Options:
- "Research in adversarial multi-agent environments" (neutral, accurate)
- "Measuring multi-agent LLM behaviour" (what we actually did)
- "What happens when LLM agents debate" (accessible, accurate)

If the team wants to keep the trust angle, make it aspirational and honest: "Toward trustworthy research in adversarial environments" — the "toward" signals work-in-progress.

**Confidence:** NO — this is a judgment call about marketing vs accuracy. I flag it because a hostile reader will seize on the word "trust" immediately.

---

## R-12: "18 cited works"

**Verdict:** SOLID

**The line(s):**
Copy system: "We maintain a formal review of 18 cited works mapping published findings to The Pit's architecture."

**What a hostile reader sees:**
"Let me count them."

**What I verified:**
The citations array in `app/research/citations/page.tsx` contains exactly 18 entries (id 1 through 18). Each has authors, year, title, venue, and URL. All URLs point to arXiv or conference proceedings. The claimed number matches the actual count.

**What must change:**
Nothing. The count is accurate.

**Confidence:** YES — I counted them.

---

## R-13: "What we're investigating" bullets

**Verdict:** SMUDGE

**The line(s):**
```
"How cryptographic identity changes agent behavior and audience trust"
"Which agents persuade under adversarial pressure — and why"
"What crowds reward when they can verify provenance"
"How prompt DNA evolves through cloning, remixing, and selection"
```

**What a hostile reader sees:**
"These read as completed findings but none of them have data:
- Cryptographic identity hasn't been tested against behaviour (hashing exists, but no experiment measures whether identity verification changes outcomes).
- 'Which agents persuade' requires crowd voting data at scale, not text statistics.
- 'What crowds reward when they can verify provenance' — provenance isn't even live yet (R-14).
- 'How prompt DNA evolves through cloning' — there's no evolutionary experiment in the six hypotheses."

**What must change:**
1. Add a visible label distinguishing these from the completed research: "Open research questions" or "Future programme directions" rather than "What we're investigating" (which implies active investigation).
2. Or add context per bullet indicating status: "Planned," "Early data," "Hypothesis registered," etc.
3. A skim-reader moving from the completed hypothesis cards to this section will reasonably assume these are also backed by data. The visual transition needs a clear break.

**Confidence:** YES — none of these bullets have corresponding data in the research programme. They are aspirational.

---

## R-14: On-chain attestation — "implemented but not yet enabled"

**Verdict:** SMUDGE

**The line(s):**
"On-chain attestation via the Ethereum Attestation Service (EAS) on Base L2 is implemented in code but not yet enabled in production."

**What a hostile reader sees:**
"'Implemented in code' means nothing. Any code can exist in a repository. Has it been deployed? Tested against mainnet? Does the schema UID exist on-chain? 'Implemented but not enabled' is a classic launch-nothing-but-claim-everything pattern."

**What I verified:**
`lib/eas.ts` exists and contains a complete implementation: EAS SDK import, schema definition, `attestAgent()` function that encodes data and submits to the EAS contract. It's gated behind `EAS_ENABLED === 'true'` env var. The code is real and non-trivial (163 lines with proper error handling, schema encoding, validation).

However:
- `EAS_SCHEMA_UID` defaults to empty string — no schema has been registered on-chain.
- `EAS_RPC_URL` defaults to empty string — no RPC connection is configured.
- No evidence of any on-chain transaction in the codebase.
- The code has never been executed against a live chain (no testnet or mainnet attestation UIDs anywhere).

**What must change:**
1. "Implemented in code" should be "The attestation code exists but has not been tested against a live chain." This is more honest about the readiness level.
2. Or replace the entire sentence with: "SHA-256 hashing of agent manifests is live. On-chain attestation via EAS on Base L2 is designed but not yet deployed or tested."
3. The current copy in `base.json` is actually better than the page hardcopy: "Hashing is live; on-chain attestation is implemented but not yet enabled in production." The page's inline text should match this more cautious phrasing from the copy system.

**Confidence:** YES — the code exists but has never touched a chain. "Implemented" without "untested" is a meaningful omission.

---

## R-15: "For builders" / "Four practical lessons"

**Verdict:** SMUDGE

**The line(s):**
Section header "Four practical lessons" — prescriptive recommendations based on the six hypotheses.

**What a hostile reader sees:**
"You ran 195 bouts on one model family (Claude Haiku 4.5), on one platform, on one day, with presets you designed yourself, and you're publishing 'practical lessons for builders'? This is a blog post masquerading as a practice guide."

**What must change:**
1. Add a scope disclaimer at the top of the section: "These observations are drawn from 195 bouts on Claude Haiku 4.5 using our preset library. They have not been validated across model families or by independent researchers. We share them as working hypotheses for builders, not as established best practices."
2. Retitle from "Four practical lessons" to "Four working hypotheses for builders" or "Observations for multi-agent system designers."
3. Each lesson should include its scope limitation alongside the source tag. "Source: H1" should become "Source: H1 (50 bouts, Haiku 4.5, 2 presets)".

**Confidence:** YES — the lessons are directionally useful and well-sourced from the data. But the prescriptive framing ("Don't expect X", "Make Y functional") overstates the certainty that 195 bouts on one model can provide.

---

## R-16: "Every agent needs a human" — placement

**Verdict:** N/A (not present)

**The line(s):**
This text does not currently appear on the research page.

**What a hostile reader sees:**
Nothing — they can't see what isn't there.

**What must change:**
Captain wants this prominent. I agree with the placement principle: the research page demonstrates automated metrics and text statistics. It should close with an explicit acknowledgment that the missing layer is human judgment. The "fundamental gap" section (lines 328-346) partially addresses this:

> "The missing layer is human evaluation. Automated text metrics measure vocabulary, structure, and marker persistence. They cannot measure argument quality, persuasiveness, or whether a pivot is substantive or performative."

This is good but doesn't include the "every agent needs a human" framing. If the Captain wants that specific language, it should either:
1. Replace the "fundamental gap" section header with "Every agent needs a human" and elevate the section to a more prominent position (before the builder lessons, not after).
2. Or add it as a closing statement after the builder lessons: "Every agent needs a human. These automated metrics measure what vocabulary does. Only human evaluators can measure what arguments *mean*."

**Confidence:** N/A — this is a content direction, not a factual verification.

---

## Additional findings

### Bout count: "195 bouts"

**Verdict:** SMUDGE

**The line(s):**
`programmeStats.bouts: 195` and subtitle "195 bouts."

**What I found:**
Counting unique bouts across all analyses:
- H1: 50 unique bouts (25 baseline + 25 enhanced)
- H2: 25 unique bouts (15 Last Supper + 10 Summit)
- H3: 30 unique bouts (10 first-contact + 10 darwin-special + 10 on-the-couch)
- H4: 30 new bouts + 20 reused from H2/H3 (the analysis explicitly says "30 H4-specific" and "50 total analysed")
- H5: 30 unique bouts (15 mansion + 15 writers-room)
- H6: 5 new bouts + 10 reused from H4 (the analysis says "10 from H4 + 5 new")

Unique bouts run: 50 + 25 + 30 + 30 + 30 + 5 = **170**

Total bout-analyses (counting reuses): 50 + 25 + 30 + 50 + 30 + 15 = **200**

Neither number is 195. The actual number is either 170 (unique bouts) or 200 (total analyses). 195 doesn't match any clean summation I can derive from the analysis files.

**What must change:**
Audit the actual bout count. If 195 is the correct number (perhaps some H2 bouts were pilot runs not included in the final analysis), document where each bout belongs. If it's a rounding or counting error, fix it. A hostile reader who reconstructs the count from the published analyses will find a mismatch, and that mismatch undermines the rest of the page.

**Confidence:** YES on the mismatch. I cannot derive 195 from the analysis files.

### Turn count: "~2,100"

The tilde is honest. Unique turns: roughly 170 bouts × 12 turns = 2,040. Or counting analyses: 200 × 12 = 2,400. Excluding H1 baseline (which had variable completion): approximately 2,000-2,100 is plausible for unique bouts. But this depends on the bout count being right, which per above, it may not be.

### H2 maxD: 3.584

**Verdict:** SOLID with caveat

The d=3.584 is M4 (question density, Socrates vs Buddha). The H2 analysis explicitly says this is persona-driven, not position-driven: "M4 is almost certainly Socrates, not position." The page's keyFinding correctly reports: "Question density is persona-driven, not position-driven." The number itself is accurate. However, displaying d=3.584 as the max effect when the analysis says it's a persona confound creates the same problem as H6's d=9.592 — the headline number is the confounded one.

Consider reporting the M2 novelty effect (d=1.732 in 6-agent) as the "real" max d, since H2's analysis identifies this as "the strongest evidence for a genuine position effect."

---

## Summary of verdicts

| Item | Verdict | Severity |
|------|---------|----------|
| R-01 | SMUDGE | Moderate — remove from stats bar |
| R-02 | SMUDGE | Severe — visual credibility problem |
| R-03 | SMUDGE | Moderate — caveat is honest but visually buried |
| R-04 | SMUDGE | Severe — needs institutional disclaimer |
| R-05 | HOLE | Critical — d=9.592 is a known artefact displayed as headline |
| R-06 | SMUDGE | Moderate — accurate but omits preset-specific conditions |
| R-07 | SMUDGE | Moderate — "zero" is measurement-specific |
| R-08 | SOLID | Minor — verify quoted prompts |
| R-09 | SMUDGE | Moderate — n=1 generalisation |
| R-10 | HOLE | Critical — subtitle contradicts content |
| R-11 | SMUDGE | Moderate — title implies trust was measured |
| R-12 | SOLID | None |
| R-13 | SMUDGE | Moderate — aspirational bullets look like findings |
| R-14 | SMUDGE | Moderate — "implemented" overstates readiness |
| R-15 | SMUDGE | Moderate — prescriptive framing from limited data |
| R-16 | N/A | Content direction needed |

**Critical (must fix before external review):** R-05, R-10
**Severe (should fix before external review):** R-02, R-04
**Moderate (fix for credibility):** R-01, R-03, R-06, R-07, R-09, R-11, R-13, R-14, R-15
**Minor/OK:** R-08, R-12, R-16

---

*Review complete. The page is honest in its methodology but promotional in its presentation. The gap between what the analysis files say (including extensive caveats, confound documentation, and measurement limitations) and what the page displays (green badges, bold effect sizes, prescriptive lessons) is where a hostile reader will attack. The data is real. The presentation needs to match the caution in the analysis.*
