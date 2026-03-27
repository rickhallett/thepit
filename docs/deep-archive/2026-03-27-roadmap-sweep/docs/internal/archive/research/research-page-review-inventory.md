# Research Page Review Inventory

**Date:** 2026-02-23
**Ordered by:** Captain, via Weaver
**Reviewers:** Analyst, Scribe, Architect (same inventory, independent reviews)
**Source file:** `app/research/page.tsx` + `copy/base.json` (researchPage section)
**QA refs:** 2.8.1 (SEVERE), 2.8.2 (SEVERE), 2.8.4 (SEVERE), 2.8.6

---

## Captain's Directive

Read the research page in its current state as if your own student — your own child — had written it. You would know that giving them anything less than the full truth risks something you cannot bear to let happen. Read from the harshest possible lens, because that is what the world will do. Only by doing so can you maximise their chances of survival.

Where what they are doing is rock-solid, say so. Where it is shot through with holes — even holes you yourself had something to do with — say so. If you would not stake the life of someone you love on this line, then it is not a line. It is a smudge.

Put your ego aside. How they react to the truth cannot be weighed against something threatening their survival.

---

## Review Protocol

For each item below, provide:

1. **Verdict:** SOLID / SMUDGE / HOLE
2. **The line(s):** Exact text being evaluated
3. **What a hostile reader sees:** The worst reasonable interpretation
4. **What must change:** Specific, actionable edit (or "nothing" if SOLID)
5. **Confidence:** Would you stake a life on this line? YES / NO

---

## Inventory

### R-01: "0 technical failures" stat (QA ref 2.8.1 — SEVERE)

```
programmeStats.technicalFailures: 0
```

Displayed in the programme stats bar as a prominent headline number alongside 195 bouts, ~2,100 turns, 6 hypotheses.

**Context:** Captain flagged as SEVERE — "AI slop optics, association with made-up figures." A hostile HN reader sees a vanity metric that implies methodological perfection. "0 technical failures" is not a research finding. It is a boast. It invites the question: "What counts as a technical failure? Who defined it? Who audited it?"

---

### R-02: "CLEAR" badge on all 6 hypotheses (QA ref 2.8.2 — SEVERE)

```
result: 'clear' (all 6 hypotheses)
```

Every hypothesis badge is green "CLEAR". No nulls, no ambiguous results.

**Context:** Captain flagged as SEVERE — same optics as 2.8.1. Six out of six clear results is unusual. The methodology note acknowledges this: "a pattern we acknowledge is unusual and may reflect our threshold choice." But the visual impression is 6/6 green badges. A hostile reader sees confirmation bias before they read the caveat.

---

### R-03: The methodology note (lines 213-235)

```
All hypotheses are pre-registered... All six hypotheses returned clear results — a pattern
we acknowledge is unusual and may reflect our threshold choice (|d| >= 0.30) or the
relatively coarse-grained nature of text-statistical metrics. We invite scrutiny of the methodology.
```

**Context:** This is the self-aware caveat. Does it go far enough? Is it prominent enough? Does it pre-empt or merely acknowledge? A hostile reader who scrolls past the green badges may never reach this paragraph. Even if they do: does "we acknowledge is unusual" match the severity of 6/6 clear?

---

### R-04: DS paper feel (QA ref 2.8.4 — SEVERE)

The overall page aesthetic: hypothesis cards, effect sizes, Cohen's d values, programme stats bar, literature review section.

**Context:** Captain flagged as SEVERE — "HN could hang us for this and this alone." The concern is not that the research is bad, but that the presentation borrows the visual grammar of a published data science paper (hypothesis IDs, effect size badges, formal methodology section) without the institutional backing, peer review, or sample sizes that justify that register. A solo project presenting itself in the visual language of a lab is an optics risk.

---

### R-05: Effect size values (per hypothesis)

| H | maxD | n (bouts) |
|---|------|-----------|
| H1 | — | 50 |
| H2 | 3.584 | 25 |
| H3 | 1.300 | 30 |
| H4 | 3.009 | 50 |
| H5 | 1.212 | 30 |
| H6 | 9.592* | 15 |

**Context:** H6 reports d=9.592 with an asterisk. The footnote explains the confound (unequal group sizes). But d=9.592 is a number that would make any statistician raise an eyebrow. Is the asterisk sufficient? Does the presence of such an extreme value undermine the credibility of the more reasonable values?

---

### R-06: "Prompt depth is the dominant lever" (builder takeaway #1)

```
7x richer structured DNA cuts safety refusals by half or eliminates them entirely on Claude.
The safety layer responds to persona framing quality.
```

**Context:** Is this claim supported by the H1 data? "7x richer" (270 vs 1950 chars). "Cuts by half" (100% to 60% for roast-battle). "Eliminates entirely" (for gloves-off). Are these numbers from the analysis, and are they reported accurately here?

---

### R-07: "Frame distance eliminates the assistant voice" (builder takeaway #2)

```
Characters structurally far from the model's default register (animals, aliens, historical
figures) produce zero hedging. Frame proximity, not content difficulty, activates the
diplomatic register.
```

**Context:** "Zero hedging" is a strong claim. Is this exactly what H3 found? "Zero hedging across 30 turns each" for House Cat and Conspiracy Theorist. Is "zero" literally zero, or "below threshold"? Is "30 turns" across how many bouts?

---

### R-08: "Make character language functional, not decorative" (builder takeaway #3)

```
"You MUST frame every response in three-act structure" resists drift (100% marker persistence).
"You sometimes reference past fame" does not (collapses to 13.3%).
```

**Context:** The claim is about structural vs ornamental vocabulary from H5. Are the 100% and 13.3% figures direct from the analysis? Are the quoted prompt fragments real (from actual agent DNA)?

---

### R-09: "Don't expect strategic adaptation" (builder takeaway #4)

```
Build concession or absorption into the DNA explicitly if you want it. The model executes
character instructions faithfully but will not invent adaptive strategies through debate.
```

**Context:** "Zero adaptive phrases in 45 Founder turns" is the H6 finding. The takeaway makes a general claim from a specific test on one agent archetype. Is the generalisation justified?

---

### R-10: "honest null results" (subtitle)

```
subtitle: "Six pre-registered hypotheses. 195 bouts. Automated metrics, permutation tests,
and honest null results."
```

**Context:** The word "honest" is doing heavy lifting. There are no null results — all six are clear. "Honest null results" implies some results were null, which would be a mark of credibility. But there are none. Is this copy misleading?

---

### R-11: The title — "Trust research in adversarial environments"

```
title: "Trust research in adversarial environments"
```

**Context:** "Trust research" is a strong compound. Does this page constitute "trust research"? Or is it closer to "behavioural observation of LLM agents under constrained conditions"? The word "trust" implies human trust judgments were measured. Were they?

---

### R-12: Literature review claim — "18 cited works"

```
description: "...We maintain a formal review of 18 cited works mapping published findings
to The Pit's architecture."
```

**Context:** Is this number accurate? Does the citations page actually contain 18 works? Has it been verified recently?

---

### R-13: "What we're investigating" bullets

```
- How cryptographic identity changes agent behavior and audience trust
- Which agents persuade under adversarial pressure — and why
- What crowds reward when they can verify provenance
- How prompt DNA evolves through cloning, remixing, and selection
```

**Context:** These are aspirational research questions. Some map to existing hypotheses; some do not. "What crowds reward when they can verify provenance" — has this been studied yet? "How prompt DNA evolves through cloning" — is there data? Are these presented as active investigations or completed findings? The page context may make the distinction, but a skim-reader may not.

---

### R-14: On-chain attestation — "implemented but not yet enabled"

```
On-chain attestation via the Ethereum Attestation Service (EAS) on Base L2 is implemented
in code but not yet enabled in production.
```

**Context:** This is stated twice (once in the JSX body, once in the copy bullet). The honesty is good. But does "implemented in code" overstate readiness? If the code exists but has never run against mainnet, is "implemented" the right word?

---

### R-15: "For builders" section heading and framing

The entire "Four practical lessons" section uses instructional language: "the dominant lever," "eliminates the assistant voice," "make character language functional," "don't expect."

**Context:** QA ref 2.8.6 — Captain said "keep but massively tone down." The current tone is prescriptive ("do this, don't do that") based on 195 bouts on a single model family (Claude). Is that evidence base sufficient for instructional framing? Would "what we observed" be safer than "four practical lessons"?

---

### R-16: "Every agent needs a human" — placement

Captain directive: this should be "at the very top of connected research papers."

**Context:** This phrase does not currently appear on the research page. Captain wants it prominent. Where should it go? Is it a subtitle? An epigraph? A section header? This is a placement decision, not a content review — but the inventory must note its absence.

---

## Review Assignments

All three reviewers receive this identical inventory. Each reviews independently, applying their own expertise:

**Analyst** — Apply the five evaluation dimensions (validity, coherence, choice, framing, likely reaction). For each item, assess how it performs through the HN lens specifically, since Captain has identified that as the primary risk audience. Build the evaluation apparatus; do not soften, do not amplify.

**Scribe** — Cross-reference every factual claim against its source material. Is the number from the analysis file? Is the copy-system text consistent with the hardcoded page data? Are there stale references? Is the documentation trail intact? If a number cannot be verified from a file on disk, flag it.

**Architect** — You wrote the pitstorm analysis code and the research findings. For each claim (R-05 through R-09 especially), answer: does the research page accurately represent what the code measured? Are there caveats from the analysis that the page omits? Are there limitations you know about that a reader would need to evaluate the claim fairly? Where the page simplifies your findings, does it simplify honestly or does it distort?

---

## Deliverable

Each reviewer writes their verdict into a single file:

- `docs/internal/research-review-analyst.md`
- `docs/internal/research-review-scribe.md`
- `docs/internal/research-review-architect.md`

Format: one section per R-## item, using the verdict/line/hostile-reader/must-change/confidence structure above. Omit items where you have nothing to add beyond another reviewer's expected expertise (e.g., Analyst need not verify line numbers; Scribe need not model HN reception).

Captain will read all three, triangulate, and make final editorial decisions.
