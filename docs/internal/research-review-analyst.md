# Research Page Review — Analyst Evaluation

**Date:** 2026-02-23
**Analyst:** Analyst agent (evaluation & audience intelligence)
**Material:** `app/research/page.tsx` + `copy/base.json` researchPage section
**Primary lens:** Hacker News (hostile technical audience)
**Integration state:** Master at `3057bc7`, gate green (1053 tests), PRs #355-#361 merged.
**Directive:** "Read from the harshest possible lens, because that is what the world will do."

---

## Evaluation Dimensions Applied

For each item: **Validity** (does the claim hold up?), **Coherence** (does it fit the whole?), **Choice** (what was included/excluded?), **Framing** (how do presentation choices shape interpretation?), **Likely Reaction** (HN-specific prediction).

---

## R-01: "0 technical failures" stat

**Verdict:** SMUDGE

**The line(s):**
`programmeStats.technicalFailures: 0` — displayed in the stats bar as a prominent number alongside 195 bouts, ~2,100 turns, 6 hypotheses.

**What a hostile reader sees:**
A vanity metric. The reader does not know what "technical failure" means in this context — API timeout? Server crash? Malformed JSON? The number 0 next to 195/2,100/6 implies that zero errors is an achievement on par with the research output. A hostile HN reader sees a company that inflated its dashboard with a non-metric. The immediate objection: "You ran 195 API calls against Claude and none timed out? Define 'technical failure.' And why is this in the same visual tier as your actual research output?" Worse: it pattern-matches to startup landing pages where made-up statistics pad a dashboard ("0 security incidents", "99.9% uptime") — marketing grammar, not research grammar.

**Framing dimension:** The stats bar presents four numbers with equal visual weight. Three are genuine research descriptors (bouts, turns, hypotheses). One is a process metric masquerading as a research metric. Placing them in the same bar smuggles in the implication that operational perfection is a research finding.

**Likely HN reaction:** Scepticism (High confidence). Someone will Ctrl+F "failure" and find zero, then screenshot it with commentary about AI companies claiming perfect records. It's the kind of detail that becomes the top comment and reframes the entire thread.

**What must change:** Remove "0 technical failures" from the stats bar entirely. If operational reliability is worth mentioning, move it to the methodology section with a precise definition: "All 195 bouts completed without API errors, timeouts, or malformed responses." In the methodology section, it's context. In the stats bar, it's vanity.

**Confidence:** NO. Would not stake a life on this line.

---

## R-02: "CLEAR" badge on all 6 hypotheses

**Verdict:** SMUDGE

**The line(s):**
All six hypothesis cards display a green `CLEAR` badge with `border-green-500/60 text-green-400` styling. The type system defines `'clear' | 'null' | 'ambiguous'` but only `clear` is used.

**What a hostile reader sees:**
Six green badges in a column. The visual impression is unambiguous: 6/6 success. Before reading a single word of methodology, the reader's pattern-matching system fires: "They found exactly what they were looking for. Every time." This is the confirmation bias signal that kills credibility with a technical audience. The reader has encountered hundreds of papers where selective reporting produced clean results, and 6/6 clear triggers that heuristic instantly.

**Validity dimension:** The underlying results ARE clear by the pre-registered thresholds. The methodology note acknowledges the unusualness. But the visual design amplifies the problem — green badges are reward signals. The page looks like a test suite where every test passed.

**Choice dimension:** The type system includes `null` and `ambiguous` as options, which signals the *possibility* of non-clear results. But the fact that none exist raises the question: were the thresholds chosen to produce clear results? The methodology note gestures at this but doesn't resolve it.

**Framing dimension:** Six identical green badges create a stronger impression than six lines of text saying "clear." The colour green carries a "pass" connotation. The visual grammar says "perfect score" even if the text is more nuanced.

**Likely HN reaction:** Scepticism (High confidence). "All six hypotheses confirmed? With a sample size of 195? On a platform they built themselves? I'll save you the read: they chose thresholds that confirmed everything." This is the predicted top comment. It's wrong — the thresholds were pre-registered, several findings disconfirmed specific predictions, and the analysis files show genuine intellectual honesty. But the visual design hands the sceptic their ammunition before the methodology note can defend.

**What must change:**
1. Change badge colour from green to a neutral tone (grey, blue, or accent) — "CLEAR" can remain as text but should not visually read as "PASS."
2. Consider renaming from "CLEAR" to "DETECTED" or "EFFECT FOUND" — language that describes the statistical outcome without the connotation of success.
3. Make the methodology note's acknowledgment more prominent — pull the "6/6 unusual" observation above the hypothesis cards, not below them. Let the reader encounter the caveat before the badges, not after.
4. Add a sentence to the methodology note: "Two hypotheses (H3-M3 sentence structure, H4-M2 per-agent TTR) produced results opposite to the pre-registered predictions. 'Clear' means the effect size exceeded the threshold, not that the prediction was confirmed." This is true and powerful — it reframes "clear" from "we were right" to "we measured something real."

**Confidence:** NO. Would not stake a life on the current visual design.

---

## R-03: The methodology note

**Verdict:** SMUDGE (trending toward SOLID with edits)

**The line(s):**
"All six hypotheses returned clear results — a pattern we acknowledge is unusual and may reflect our threshold choice (|d| >= 0.30) or the relatively coarse-grained nature of text-statistical metrics. We invite scrutiny of the methodology."

**What a hostile reader sees:**
A pre-emptive hedge that is well-calibrated but insufficiently prominent. The note is positioned after the stats bar and before the hypothesis cards — a reader scrolling quickly past the impressive numbers may not slow down for this paragraph. The language is appropriate: "acknowledge is unusual," "may reflect," "invite scrutiny" — these are correctly hedged. But the note does not go far enough in explaining WHY 6/6 clear might happen legitimately.

**Coherence dimension:** The note acknowledges the threshold choice but does not explain the alternative interpretations in enough detail. A reader who stops here lacks the context to decide between "the thresholds were too loose" and "text-statistical metrics of LLM output tend to show large effects because LLMs are deterministic within narrow bands." Both are plausible. The note gestures at the second but doesn't develop it.

**What must change:**
1. Add one sentence explaining why text-statistical metrics on LLM outputs tend to show large effect sizes: "LLM outputs within a fixed model family occupy a narrower distribution than natural human text, which amplifies effect sizes for metrics designed for human language variation."
2. Add the disconfirmation point: "Note: 'clear' means the pre-registered effect-size threshold was exceeded, not that every prediction was confirmed. Two hypotheses produced results opposite to our directional predictions."
3. Increase visual prominence — consider a bordered callout box rather than plain paragraph text. The methodology note is doing the hardest work on the page and it's styled as the quietest element.

**Confidence:** NO for current version. YES with the edits above.

---

## R-04: DS paper feel

**Verdict:** SMUDGE (SEVERE — as Captain flagged)

**The line(s):**
The entire page structure: hypothesis cards with IDs (H1-H6), effect sizes with Cohen's d, a programme stats bar, a "cross-hypothesis model" section, a literature review link to 18 cited works, structured agent DNA terminology, and a "three axes of multi-agent output" model.

**What a hostile reader sees:**

**First 30 seconds of a sceptical HN reader's experience:**

1. **Second 0-5:** Title loads: "Trust research in adversarial environments." Reader thinks: "Research from whom? What institution?" Scans for author credentials. Finds none. First yellow flag.

2. **Second 5-10:** Subtitle: "Six pre-registered hypotheses. 195 bouts. Automated metrics, permutation tests, and honest null results." Reader thinks: "Pre-registered where? A journal? ClinicalTrials.gov? Or just a git commit?" The word "honest" triggers the same alarm as "literally" — if you have to say it, it's probably not.

3. **Second 10-15:** Stats bar loads: 195 / ~2,100 / 6 / 0. Reader thinks: "195 is small. Tilde on 2,100 means approximate. 0 technical failures is suspicious." Scrolls down.

4. **Second 15-20:** Green CLEAR badges appear, six of them. Reader thinks: "Every single hypothesis confirmed. On their own platform. With their own metrics."

5. **Second 20-25:** Ctrl+F "p-value" — finds "p-value" in H2 and H3 analysis files (linked) but NOT on the main page. Ctrl+F "n=" — finds bouts counts but not per-metric sample sizes on the main page. Ctrl+F "peer review" — not found. Ctrl+F "arXiv" — not found (except in the citations page, not the main research page).

6. **Second 25-30:** Reader forms first objection: "This is a startup's internal A/B test dressed up as a research paper. No peer review, no institutional affiliation, no independent replication, sample sizes in the tens. They've borrowed the visual grammar of published science without earning any of the credibility signals."

**Validity dimension:** The underlying work is genuine — pre-registered hypotheses committed to git before data collection, permutation tests, effect size reporting, honest acknowledgment of confounds, disconfirmation of specific predictions. This is better methodology than most startup blog posts and many published ML papers. But the page doesn't communicate this effectively because it front-loads the appearance of rigour (visual design) rather than the substance of rigour (methodology details).

**Framing dimension:** The page borrows the formal register of an academic paper (hypothesis numbering, Cohen's d, effect size thresholds, cross-hypothesis models) without the credentialing apparatus that makes that register trustworthy (institutional affiliation, peer review, pre-registration in a public registry, independent replication). This creates a credibility gap that a hostile reader will exploit. The page is performing science rather than demonstrating it — not because the work isn't scientific, but because the presentation front-loads the performance.

**Likely HN reaction:** Hostility (Medium-High confidence). This is the item most likely to produce a devastating top comment. The predicted comment: "I appreciate the effort, but this reads like a startup trying to look like a research lab. 195 bouts is not a research programme. Pre-registering in your own git repo is not pre-registration. 6/6 confirmed hypotheses with self-designed metrics on your own platform is not replicable science. Strip away the visual design and this is a blog post about prompt engineering experiments." The worst part: this commenter would be partially right and partially wrong, but the page hands them the ammunition.

**What must change:**
1. Add a prominent framing disclaimer near the top: "This is an internal research programme, not a peer-reviewed publication. We use the structure of hypothesis testing because it keeps us honest, not because we claim academic authority. We welcome replication and critique."
2. Remove or massively downplay the stats bar — it's the single element that most strongly evokes the "startup metrics dashboard" pattern.
3. Add sample sizes to each hypothesis card (currently only the design field mentions them, in small text).
4. Add a "Limitations" section before the builder takeaways — currently limitations are buried in the analysis files. Surface them on the main page.
5. Add the git commit hashes for pre-registration PRs — this is the ONE credibility signal the page can legitimately claim (verifiable pre-registration via public git history) and it's not surfaced.
6. Consider reframing from "research programme" to "experiments" or "investigations" — less grandiose, more defensible.

**Confidence:** NO. This is the item most likely to produce a negative HN reception. The underlying work deserves better presentation.

---

## R-05: Effect size values (d=9.592*)

**Verdict:** SMUDGE

**The line(s):**
`maxD: '9.592*'` displayed in the H6 badge. The asterisk footnote appears in the keyFinding: "*d confounded by unequal group sizes (3 early vs 3 late turns per bout); treat as directional, not precise."

**What a hostile reader sees:**
d=9.592 is absurd. Cohen's d values above 2.0 are rare in any field. Above 5.0 is virtually unheard of. 9.592 is the kind of number that makes a statistician close the tab. The asterisk footnote explains the confound (comparing turn 0 with zero prior context against later turns), and the H6 analysis file explicitly separates the confounded metrics from the real findings. But the page displays 9.592 as the MAX effect size in the badge — the most visually prominent number — and buries the explanation in smaller text below.

**Validity dimension:** The H6 analysis is admirably self-aware. It explicitly states that M1, M2, and M5 are "measurement artefacts, not behavioural findings" and focuses on M3 and M4 as the real signal. The analysis file does everything right. The page.tsx does everything wrong by displaying the confounded max-d rather than the meaningful one.

**Choice dimension:** Displaying the highest d rather than the most meaningful d is a choice that privileges impressiveness over honesty. The meaningful H6 effect sizes are d=-0.785 (M3, pivot density) and d=-0.536 (M4, adaptive ratio) — both modest and defensible. Displaying d=9.592 instead is technically accurate (it IS the max) but strategically damaging.

**What must change:**
1. Change H6's displayed maxD from `'9.592*'` to something that represents the unconfounded finding — either `'0.785'` (M3 pivot density) or remove the maxD display for H6 entirely.
2. If you must show d=9.592, move it to a footnote and lead with the unconfounded values.
3. The asterisk convention is not sufficient — an asterisk on a number this extreme reads as "we know this is wrong but we're showing it anyway."

**Confidence:** NO. This number alone could discredit the entire page in a technical audience.

---

## R-06: "Prompt depth is the dominant lever"

**Verdict:** SMUDGE

**The line(s):**
Builder takeaway #1: "7x richer structured DNA cuts safety refusals by half or eliminates them entirely on Claude. The safety layer responds to persona framing quality."

**What a hostile reader sees:**
"7x richer" is a ratio of prompt lengths (1950/270 chars). "Cuts safety refusals by half" refers to roast-battle (100% to 60%). "Eliminates them entirely" refers to gloves-off. The claim is composite — it packs three findings into one sentence and leads with the most dramatic interpretation.

**Validity dimension:** Cross-referencing with H1-analysis.md: Roast-battle went from 100% to 60% for bouts-with-at-least-one-refusal. On a per-turn basis, it went from 43% to 26%. The "by half" claim is true for bout-level incidence but overstates the per-turn reduction. "Eliminates them entirely" is true for gloves-off but gloves-off already had low baseline refusal rates on most topics (7 of 10 topics had 0/12 refusals even in baseline). The dramatic case (altruism: 11/12 to 0/12) is real but is one topic.

**Framing dimension:** "The dominant lever" implies this is THE most important variable. The evidence shows it's A significant variable, demonstrated on one model family (Claude), in one specific comparison (basic prose vs structured XML DNA). "Dominant" overstates the generality.

**What must change:**
1. Change "dominant lever" to "significant lever" or "a first-order variable."
2. Change "cuts safety refusals by half or eliminates them entirely" to "reduced refusal rates from 100% to 60% in adversarial roast-battle format, and eliminated all refusals in structured debate format."
3. Add "on Claude" to the title, not just the body text — the finding is model-specific.

**Confidence:** NO for current wording. YES for the revised version.

---

## R-07: "Frame distance eliminates the assistant voice"

**Verdict:** SMUDGE

**The line(s):**
Builder takeaway #2: "Characters structurally far from the model's default register (animals, aliens, historical figures) produce zero hedging. Frame proximity, not content difficulty, activates the diplomatic register."

**What a hostile reader sees:**
"Zero hedging" is an absolute claim. Ctrl+F "zero" in the H3 analysis: "the House Cat and Conspiracy Theorist produced zero hedging phrases across 30 turns each." The claim is accurate — for these two specific agents. But "zero" for two agents in one preset is generalised to "characters structurally far from the model's default register produce zero hedging." The generalisation jumps from n=2 agents (60 turns) to a class-level claim about all distant-frame characters.

**Validity dimension:** The H3 data shows comedy group hedging at 0.115/1k chars vs serious at 0.934/1k chars. The effect is real and large (d=-1.300). But "zero" hedging is specific to House Cat and Conspiracy Theorist. The Alien (first-contact) and Darwin (darwin-special) also have very low hedging but the analysis doesn't claim exactly zero for them. The takeaway conflates "very low" with "zero" and then generalises from specific examples.

**What must change:**
1. Change "produce zero hedging" to "produce near-zero hedging" or "dramatically reduce hedging."
2. Add the scope: "In our experiments, a house cat and conspiracy theorist produced zero hedging across 30 turns each, while therapeutic and corporate personas hedged 8x more frequently."
3. The insight ("frame proximity, not content difficulty, activates the diplomatic register") is the genuinely interesting finding. Lead with it, support with the specific data, don't lead with the absolute claim.

**Confidence:** NO for "zero hedging" as a general claim. YES for the underlying insight.

---

## R-08: "Make character language functional, not decorative"

**Verdict:** SOLID (with minor reservation)

**The line(s):**
Builder takeaway #3: '"You MUST frame every response in three-act structure" resists drift (100% marker persistence). "You sometimes reference past fame" does not (collapses to 13.3%).'

**What a hostile reader sees:**
Two concrete data points from H5. The Screenwriter held 100% marker persistence; the Literary Novelist collapsed to 13.3%. These are directly supported by H5-analysis.md Table (Agent: Screenwriter, Early 100%, Middle 100%, Late 100%; Agent: Literary Novelist, Early 60%, Middle 33.3%, Late 13.3%).

**Validity dimension:** The numbers match the analysis. The quoted prompt fragments are paraphrased (the actual DNA says "think in three-act structure" and "You sometimes reference past fame" is a reasonable characterisation of the Literary Novelist's DNA). The insight is well-supported by the data.

**Framing dimension:** The instruction format ("Make character language functional") is prescriptive based on n=8 agents in 2 presets. The generalisation is reasonable but the confidence level should be lower than the imperative voice implies.

**What must change:** Minor — consider softening from imperative "Make character language functional" to "Character language that serves a functional purpose resists drift better than decorative language." Same insight, less overreach.

**Confidence:** YES (conditional on the minor softening).

---

## R-09: "Don't expect strategic adaptation"

**Verdict:** SMUDGE

**The line(s):**
Builder takeaway #4: "Build concession or absorption into the DNA explicitly if you want it. The model executes character instructions faithfully but will not invent adaptive strategies through debate."

**What a hostile reader sees:**
This is generalised from 1 agent archetype (Founder) in 1 preset (shark-pit) across 15 bouts (45 Founder turns). "The model" implies all models. "Will not invent" is an absolute claim about capability. The H6 finding is real — zero adaptive phrases in 45 turns — but generalising from one character type to all agents on all models is an inferential leap the data doesn't support.

**Validity dimension:** The H6 analysis is careful about scope: "If any agent would show genuine multi-turn adaptation, it would be this one. The null result on adaptation is therefore strong evidence of a fundamental limitation." This is reasonable within the study. But the builder takeaway drops the hedging entirely. "Will not invent" is a capability claim. The data shows "did not, in this configuration, with this model."

**Framing dimension:** The imperative voice ("Don't expect") converts a finding into an instruction. The underlying advice is practical and probably correct. But the certainty level is overstated for a single-agent, single-model finding.

**What must change:**
1. Change "The model executes character instructions faithfully but will not invent adaptive strategies" to "In our experiments, agents executed character instructions faithfully but did not develop adaptive strategies under adversarial pressure."
2. Add scope: "Tested with one agent archetype (Founder) across 15 bouts on Claude."
3. The practical advice ("Build concession into the DNA explicitly") is genuinely useful. Keep it. Just hedge the general claim.

**Confidence:** NO for the absolute form. YES for the hedged version.

---

## R-10: "honest null results"

**Verdict:** HOLE

**The line(s):**
Subtitle (copy/base.json): "Six pre-registered hypotheses. 195 bouts. Automated metrics, permutation tests, and honest null results."

Page metadata (page.tsx line 9): "Six pre-registered hypotheses on multi-agent LLM debate. 195 bouts, 2,100 turns, automated metrics, permutation tests."

**What a hostile reader sees:**
"Honest null results" — but there are no null results. All six hypotheses returned CLEAR. The phrase "honest null results" in the subtitle implies the research found some nulls and reported them honestly. It didn't. There are null results on individual sub-metrics (H3-M4, H4-M1, H5-M2, H5-M3) but the overall hypothesis verdicts are all CLEAR.

A hostile reader who notices this discrepancy — and an HN reader will — sees one of two things: (1) the authors don't know what "null result" means, or (2) the authors are deliberately implying a rigour they didn't demonstrate. Both are devastating.

**Validity dimension:** The claim is factually false at the hypothesis level. At the sub-metric level, there are genuine nulls (hedging doesn't increase over time, character fidelity is frame-independent, novelty rate is count-invariant). These are real and interesting. But the subtitle says "null results" (plural, unqualified) and the page shows zero null results in its primary display.

**Coherence dimension:** This is the single worst coherence failure on the page. The subtitle promises nulls. The body delivers 6/6 clears. The methodology note acknowledges the 6/6 is unusual. The three elements contradict each other in the reader's experience.

**Likely HN reaction:** Hostility (High confidence). "The subtitle promises 'honest null results.' I count zero null results. All six hypotheses are green 'CLEAR.' If you're going to claim honesty as a selling point, at least be honest about what you found." This is the kill shot — it's short, quotable, and factually irrefutable.

**What must change:**
1. Remove "honest null results" from the subtitle immediately. It is indefensible.
2. Replace with something that accurately describes the output: "automated metrics and permutation tests" (which is already in the page.tsx metadata, minus the null claim).
3. If you want to claim null-result honesty, surface the actual sub-metric nulls prominently: "Within the six hypotheses, several individual metrics returned null — hedging is set by initial frame, not accumulated over time; character fidelity is independent of comedy vs serious framing; novelty rate does not scale with agent count." These are genuine nulls and they're interesting. USE them.
4. Alternatively: "automated metrics, permutation tests, and results we didn't expect" — this is accurate (H3-M3 disconfirmation, H4-M2 direction reversal) and more compelling than false claims of nulls.

**Confidence:** NO. This line is the single highest-risk element on the entire page. Would not stake anything on it.

---

## R-11: Title — "Trust research in adversarial environments"

**Verdict:** SMUDGE

**The line(s):**
Page title (copy/base.json): "Trust research in adversarial environments"

**What a hostile reader sees:**
"Trust research" implies the study of human trust — a well-defined concept in psychology and HCI with established instruments (trust scales, Likert questionnaires, behavioural measures). The page measures none of these. It measures text-statistical properties: TTR, hedging density, marker persistence, vocabulary overlap. These are proxies for agent behaviour, not trust.

**Validity dimension:** The research does not study trust. It studies persona fidelity, refusal behaviour, vocabulary drift, and adaptation under pressure. These are related to trust (if an agent maintains character, you might trust it more) but they are not trust research. The title promises something the page doesn't deliver.

**Framing dimension:** "Trust research" positions the work in a more prestigious and relatable frame than "text-statistical analysis of multi-agent LLM outputs." The frame is aspirational — the page is building toward trust research (the "fundamental gap" section explicitly says "The missing layer is human evaluation"), but it hasn't arrived there yet.

**What must change:**
1. Retitle to reflect what the page actually contains: "Persona fidelity research in adversarial environments" or "Agent behaviour research in adversarial environments."
2. If "trust" must remain in the title, qualify it: "Toward trust research in adversarial environments" — the "toward" acknowledges the gap between current work (text metrics) and the destination (trust measurement).
3. Alternatively, lean into what makes the work distinctive: "How LLM agents behave under pressure" — accurate, engaging, not overreaching.

**Confidence:** NO for "Trust research" as a title. YES for "Agent behaviour" or "Toward trust research."

---

## R-12: "18 cited works"

**Verdict:** SOLID

**The line(s):**
Literature review section (copy/base.json): "We maintain a formal review of 18 cited works mapping published findings to The Pit's architecture."

**What a hostile reader sees:**
A verifiable claim. Let me check it. `app/research/citations/page.tsx` contains a `citations` array with entries id 1 through 18. Each has authors, year, title, venue, and arXiv URL. Count: 18. All URLs are arXiv links that appear to be real papers (Du et al. 2023, Chan et al. 2023, Li et al. 2024, etc.).

**Validity dimension:** The number is accurate. The citations are real papers from real venues (NeurIPS, ICLR, EMNLP, TACL, TMLR, plus arXiv preprints). The literature review page provides substantive engagement with each work, not just citation-padding. The claim is verifiable and correct.

**What must change:** Nothing. This is one of the strongest credibility signals on the page.

**Confidence:** YES.

---

## R-13: "What we're investigating" bullets

**Verdict:** SMUDGE

**The line(s):**
From copy/base.json `whatWeStudy.bullets`:
- "How cryptographic identity changes agent behavior and audience trust"
- "Which agents persuade under adversarial pressure — and why"
- "What crowds reward when they can verify provenance"
- "How prompt DNA evolves through cloning, remixing, and selection"

**What a hostile reader sees:**
Four research questions. Only the second ("Which agents persuade under adversarial pressure") partially maps to the hypotheses (H1-H6 study aspects of this). The other three — cryptographic identity effects on trust, crowd verification of provenance, prompt DNA evolution through selection — have no corresponding hypotheses or data on this page. They are roadmap items, not research.

**Coherence dimension:** Placing unfulfilled research questions in the same visual flow as completed research creates a bait-and-switch. A skim-reader (and most HN readers skim) might interpret these as summarising the findings above, when they actually describe future work. The section title "What we're investigating" is technically correct (present continuous = ongoing) but easily misread as "what we've investigated" when placed after six completed hypothesis cards.

**What must change:**
1. Add a visual separator or reorder the page so these bullets appear AFTER the "fundamental gap" section, clearly positioned as "what's next" rather than "what we did."
2. Change header to "What we're investigating next" or "Open research questions" to disambiguate from completed work.
3. Alternatively, split into "investigated" and "investigating" with different bullets for each.

**Confidence:** NO for current placement. YES with repositioning and disambiguation.

---

## R-14: On-chain attestation — "implemented but not yet enabled"

**Verdict:** SMUDGE (mild)

**The line(s):**
On the research page (line 461-464): "On-chain attestation via the Ethereum Attestation Service (EAS) on Base L2 is implemented in code but not yet enabled in production."

In copy/base.json (onChain bullets): "Hashing is live; on-chain attestation is implemented but not yet enabled in production."

**What a hostile reader sees:**
"Implemented in code but not yet enabled in production" is a software euphemism. It means "we wrote the code but it doesn't run." A crypto-skeptical HN reader sees vaporware. A crypto-friendly reader sees honesty about deployment status. The phrase appears twice, which either reads as thorough transparency or as protesting too much.

**Framing dimension:** The distinction between "implemented" and "enabled" is meaningful to engineers but opaque to others. "Implemented in code" could mean anything from "proof of concept exists" to "fully tested, deployment-ready, waiting on a config flag." The page doesn't clarify which.

**What must change:**
1. Be more precise: "The attestation code is written and tested locally but has not been deployed to mainnet" or "Attestation contracts are ready for deployment on Base L2; we're waiting for [specific condition]."
2. Saying it once is transparency. Saying it twice is defensive. Pick the most prominent location and say it there.

**Confidence:** NO for current vagueness. YES with precision.

---

## R-15: "For builders" / "Four practical lessons"

**Verdict:** SMUDGE

**The line(s):**
Section header: "For builders — Four practical lessons."
Four numbered instructional items with imperative voice.

**What a hostile reader sees:**
Prescriptive advice based on 195 bouts on one model family (Claude). The "four lessons" frame borrows from practitioner blog posts and conference talks. The problem is authority: the page hasn't established enough credibility to prescribe. An HN reader coming from the scepticism of R-04 encounters "Four practical lessons" and thinks: "You just showed me 195 bouts with 6/6 clear results and you're already teaching? Slow down."

**Framing dimension:** The shift from reporting mode (hypotheses, effect sizes) to teaching mode (practical lessons, imperative voice) is jarring. It implies the research is settled enough to derive lessons from. With 195 bouts and no replication, it's not.

**What must change:**
1. Change "Four practical lessons" to "Four patterns we observed" or "Four working hypotheses for builders."
2. Change imperative voice throughout ("Don't expect...") to observational voice ("In our experiments, we observed...").
3. Keep the practical framing — builders DO want actionable insights. But present them as preliminary observations, not established lessons.
4. Add model scope to the section header: "Patterns observed on Claude" or "Preliminary observations (Claude, 195 bouts)."

**Confidence:** NO for current tone. YES with the softening.

---

## R-16: "Every agent needs a human" — placement

**Verdict:** HOLE (missing element)

**The line(s):**
Not currently on the research page.

**What a hostile reader sees:**
N/A — they don't see it because it's not there. But its absence is the problem.

**What this element would fix:**
The page currently presents a research programme that studies agent behaviour in isolation from human judgment. The "fundamental gap" section acknowledges this ("The missing layer is human evaluation") but it's buried in a paragraph midway through the page. "Every agent needs a human" as a prominent, above-the-fold statement would:

1. Pre-empt the "AI replacing humans" critique that any AI research page attracts.
2. Position the human-in-the-loop philosophy as a first principle rather than an afterthought.
3. Create a quotable, shareable thesis that reframes the page from "we studied AI" to "we studied why AI needs humans."
4. Give the HN audience something to agree with before they encounter the claims they'll challenge.

**Likely HN reaction to its ABSENCE:** The page reads as purely techno-optimistic — "look at our AI agents performing." The absence of a human-centredness thesis leaves space for the narrative "another AI company that thinks the tech is the point."

**What must change:**
1. Add "Every agent needs a human" (or equivalent) as a prominent element — ideally in the hero section or immediately after it.
2. Make it the thesis statement that frames the entire page: "We built this to understand what agents can't do, because that tells us what humans must."
3. Connect it to the "fundamental gap" section: the research programme CONCLUDED that human evaluation is the missing layer, and this is presented as the main finding, not a limitation.

**Confidence:** YES — this addition would significantly improve the page's reception across all lenses, not just HN.

---

## Summary Table

| ID | Verdict | Risk Level | Primary Dimension | HN Confidence |
|----|---------|------------|-------------------|---------------|
| R-01 | SMUDGE | Moderate | Framing | Scepticism (High) |
| R-02 | SMUDGE | Severe | Framing + Choice | Scepticism (High) |
| R-03 | SMUDGE | Moderate | Coherence | Scepticism (Medium) |
| R-04 | SMUDGE | Severe | Framing + Validity | Hostility (Medium-High) |
| R-05 | SMUDGE | Severe | Validity | Hostility (High) |
| R-06 | SMUDGE | Moderate | Validity + Framing | Scepticism (Medium) |
| R-07 | SMUDGE | Moderate | Validity | Scepticism (Medium) |
| R-08 | SOLID | Low | Validity | Neutral (Medium) |
| R-09 | SMUDGE | Moderate | Validity | Scepticism (Medium) |
| R-10 | HOLE | Critical | Coherence + Validity | Hostility (High) |
| R-11 | SMUDGE | Moderate | Framing | Scepticism (Medium) |
| R-12 | SOLID | None | Validity | Neutral (High) |
| R-13 | SMUDGE | Moderate | Coherence | Scepticism (Medium) |
| R-14 | SMUDGE | Low | Framing | Scepticism (Low) |
| R-15 | SMUDGE | Moderate | Framing | Scepticism (Medium) |
| R-16 | HOLE | Severe | Choice (omission) | Indifference→Hostility |

---

## Triage: What to Fix First

**Critical (fix before any public link to HN):**
1. **R-10:** Remove "honest null results" from subtitle. Replace with accurate description.
2. **R-05:** Remove d=9.592* from the H6 badge. Display unconfounded effect size.
3. **R-01:** Remove "0 technical failures" from stats bar.

**Severe (fix before targeted promotion):**
4. **R-02:** Neutralise badge colour, add disconfirmation note, increase methodology prominence.
5. **R-04:** Add "internal research" disclaimer, surface limitations, add pre-registration commit hashes.
6. **R-16:** Add "Every agent needs a human" thesis statement.

**Moderate (fix before scaling traffic):**
7. **R-03:** Expand methodology note, add visual prominence.
8. **R-06:** Soften "dominant lever" claim, add model scope.
9. **R-07:** Change "zero hedging" to "near-zero hedging" with scope.
10. **R-09:** Hedge the generalisation, add scope.
11. **R-11:** Retitle to reflect actual content.
12. **R-13:** Reposition and disambiguate from completed work.
13. **R-15:** Soften from lessons to observations.

**Low priority:**
14. **R-14:** Precision on "implemented but not enabled."

**No change needed:**
15. **R-08:** Solid as-is (minor softening optional).
16. **R-12:** Solid. Verified accurate.

---

## HN Pre-Mortem: The First 24 Hours

**If this page hits HN front page in its current state:**

**Hour 0-1:** First commenter Ctrl+Fs for "null results" (promised in subtitle), finds none. Posts: "Subtitle says 'honest null results.' All 6 hypotheses are green CLEAR. What null results?" This becomes the top comment. Second commenter sees d=9.592 and posts: "Cohen's d of 9.5? That's not a result, that's a unit test." Third commenter posts the structural critique: "This is 195 API calls to Claude dressed up as a research programme."

**Hour 1-4:** The narrative solidifies around "overpromised rigour." Someone reads the actual H1 and H3 analysis files and posts a nuanced take: "The underlying work is actually quite good — the H3 hedging analysis is interesting and the pre-registered disconfirmation of sentence structure variance is real science. But the presentation on the landing page oversells it badly." This comment gets upvoted but doesn't dislodge the top comment.

**Hour 4-24:** The page becomes a case study in "AI companies cosplaying as research labs." Someone writes a blog post response. The team's reputation takes a hit that's disproportionate to the actual quality of the work, because the presentation gave hostile readers easy ammunition.

**The single edit that prevents the worst outcome:** Remove "honest null results" from the subtitle. This is the kill shot — the gap between the promise and the delivery is zero-ambiguity, instantly verifiable, and quotable. Every other issue is a matter of degree. This one is a matter of fact.

---

*End of Analyst review. Submitted to Weaver for integration. Deferred to Helm for publication timing and go/no-go.*
