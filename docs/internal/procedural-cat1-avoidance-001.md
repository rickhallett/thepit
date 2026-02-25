# Procedural Record: Category One Avoidance
## The Provenance Overclaim Interception
Date: 2026-02-23
Classification: Category One (Lying With Truth)
Outcome: Averted pre-launch

---

## The Threat

The ship was preparing for HN launch with copy and positioning that implied the on-chain provenance layer delivered **behavioral trust** — that attesting an agent's DNA on-chain meant users could trust what the agent says and does.

This claim is false. The attestation proves identity (who made the agent, what instructions it was given, when). It does not prove integrity (what the agent will do, whether it will follow instructions, whether the model hasn't changed underneath). The bout engine has zero references to the attestation system at runtime. Nothing connects the hash at mint time to the output at execution time.

If launched with this framing, an informed HN commenter would have identified the gap in under 30 seconds and delivered a one-sentence kill shot:

> "You hash your own input and put your own hash on-chain. The model ignores your input whenever it wants. This proves nothing about output quality."

That dismissal is technically correct. The resulting thread would have been reputationally devastating.

## How It Was Detected

1. **Captain's instinct.** At hour 19 of continuous post, the Captain articulated the strategic challenge: "If the issue of trust could be solved by placing a string inside a block, the world would have done that before we woke up." The Captain's uncertainty was the signal.

2. **Round Table Layer 1 convened.** Analyst, Architect, and Sentinel were dispatched under SD-073 (Lying With Truth = Category One hazard), which explicitly ordered: do not reassure, do not produce balanced plausibility, be honest even if it's ugly.

3. **Three independent convergent assessments.** All three agents independently identified the same gap:
   - Analyst: "Our provenance layer addresses the wrong layer of the stack."
   - Architect: "The bout engine has zero references to agent-dna, promptHash, manifestHash, or attestation."
   - Sentinel: "You're attesting your own data to yourself."

4. **Captain validated.** On reviewing the RT L1 report, the Captain confirmed: "Category One. Not shippable, period."

## Why It Worked

1. **SD-073 was the governing order.** Without the explicit directive to not reassure, the agents would have produced balanced assessments that acknowledged limitations while emphasising strengths. That balance would have been Lying With Truth — accurate in every sentence, misleading in aggregate. The Captain's order to "appreciate that I am greatly outnumbered" forced genuine honesty.

2. **The Captain asked the right question.** Not "is our provenance layer good?" (which invites optimistic framing) but "what have we actually built?" (which demands specificity).

3. **Pre-RT context protection (SD-072).** All context was stored to file before dispatching the Round Table, ensuring the strategic challenge and the Captain's words survived regardless of harness state.

4. **Convergent independent assessment.** Three agents with different lenses (market, technical, security) arrived at the same conclusion independently. The Parallax Protocol (SD-050) at its most critical application.

## The Response

1. Copy redesign authorized (SD-079) — right-size all claims to what attestation actually proves
2. Naming shift: "Identity, not integrity. Registration, not trust." (SD-077)
3. Pitch layer shifted to research programme (SD-076) — lead with intellectual honesty, not provenance
4. Technical hardening: transcript hashing + runtime prompt verification (SD-080) — closes gaps in the evidence chain
5. "Signed commit" analogy adopted (SD-083) — honest framing of what attestation does

## What Was At Stake

The Captain's assessment: "I was banking on this having some portfolio value even if it got wrecked by HN, but I wasn't imagining a kind of wreckage that feels like, 'wait, you mean you spent 12-16hrs a day for 3 weeks, without stopping, and you didn't check at the outset that this was even possible?'"

A Category One hit on HN — where the top comment correctly identifies that the core trust claim is overclaimed — would have been difficult to recover from. The HN audience remembers. The comment thread lives forever. The wreckage compounds through every future reference.

## The Lesson

Agentic systems can build technically excellent infrastructure around a premise that doesn't hold. Every component works perfectly. The hashing is correct. The canonicalization is RFC-compliant. The EAS integration is solid. The test suite covers 10 attack scenarios. The cross-implementation parity is verified. And the entire structure supports a claim that is narrower than what the copy implies.

**The Category One hazard is not in the code. It is in the gap between what the code does and what the words say it does.** The agents that wrote the code are not the right agents to evaluate the claim. The agents that evaluate the claim must be explicitly ordered not to optimise for the builder's morale.

SD-073 is not a one-time order. It is the permanent standing defence against this class of failure.

---

*Filed by Weaver. Referenced by SD-081.*
