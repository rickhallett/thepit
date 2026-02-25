# Weaver HN Attack Vector Analysis -- Attacks #4, #5, #6

Date: 2026-02-24
Compiled by: Weaver (subagentic instance)
Governing orders: SD-076, SD-077, SD-078, SD-089, SD-093
Input: Show HN draft (`docs/internal/show-hn-draft-2026-02-24.md`), full codebase context, copy system, research page, landing page, session decisions (101 entries)

---

## Scope

The Captain received two independent external analyses that converged on the same top-3 hostile comment vectors:

1. **ML architecture dismissal** -- "You just discovered the context window" / "This is prompt engineering, not research"
2. **Crypto/blockchain allergy** -- "Lost me at blockchain" / "Why does this need a chain?"
3. **Stat-washing** -- "This isn't real science" / "n=195 with self-set thresholds"

This document identifies attacks **#4, #5, and #6** -- the next three most likely hostile top-level comments that are NOT variants of the above. It then assesses overall draft survivability and recommends changes.

---

## Attack #4: "So You Built a Toy and Called It Research"

### The Commenter Persona

**Who:** A senior engineer or engineering manager at a mid-to-large AI company (Anthropic, Google DeepMind, a well-funded startup). Has shipped production ML systems. Reads HN daily. Respects craft but has a finely tuned detector for solo projects that dress up weekend work in institutional language. Not hostile by nature, but will puncture perceived pretension on sight. Motivated by category enforcement -- "research" is a word you earn, and this person has strong opinions about the bar.

### The Comment

> Genuine respect for the effort here, but I want to push back on calling this "research."
>
> You have a Next.js app that streams Claude responses through preset prompts, then you run text statistics on the output. The "hypotheses" are observational descriptions of known model behavior (personas drift over long contexts, safety layers respond to prompt engineering, agents don't actually reason about counterarguments). These aren't novel findings -- they're well-documented properties of instruction-following LLMs that anyone working with the API discovers in the first week.
>
> The pre-registration is a nice touch, but pre-registering hypotheses about already-known behavior doesn't make the findings scientific. It makes them well-organized.
>
> What I see is a well-built portfolio project with a research coat of paint. Nothing wrong with that! But the framing creates an expectation gap. When someone says "I ran 195 experiments and got results opposite to my predictions," I expect to learn something new about the models. Instead I learn that prompt engineering affects output quality. We know.
>
> Would love to see this applied to genuinely open questions -- like cross-model persona transfer, or measuring actual argument quality with human raters instead of TTR.

### Why #4

This ranks just below the top 3 because it requires more specific knowledge (familiarity with the actual findings, enough to dismiss them as known) and is a more nuanced form of the "not real science" attack. The top-3 stat-washing attack is a drive-by; this one reads the /research page first and attacks the *novelty*, not the *methodology*. It is more dangerous precisely because it is more informed and more polite.

It's #4 rather than #1 because most HN commenters will not click through to /research and read six hypotheses before commenting. The modal hostile comment is faster and lazier. But the ones who do click through will write this.

### Severity: **Dangerous**

This is the "damning with faint praise" attack. "Genuine respect" + "portfolio project with a research coat of paint" is devastating social positioning on HN. Other commenters will upvote it because it sounds measured and generous while delivering a kill shot to the credibility claim. It does not attack the code or the product. It attacks the *framing*, which is the post's primary asset.

### The Captain's Best Response

```
Fair pushback and I want to engage with it directly.

You're right that several findings align with known properties of instruction-following LLMs. The frame-distance/hedging result (H3) and the safety-layer/prompt-engineering result (H1) would not surprise anyone who works with the API daily.

Here's what I think is genuinely less obvious:

1. The fidelity/adaptation gap (H6). It's one thing to know agents don't reason about counterarguments. It's another to measure zero adaptive phrases across 45 speaking turns under sustained critique while maintaining 100% character marker persistence. The *magnitude* of the gap, and the specific mechanism (structural vocabulary resists, ornamental collapses), I haven't seen quantified elsewhere.

2. Two hypotheses went against my directional predictions. H4: I expected quality cliffs at higher agent counts. Didn't find them -- the effect was a text-length confound, not a quality one. H6: I expected at least some adaptive signal. Got zero. The predictions being wrong is the interesting part.

On the "research" framing -- I hear you. I use the structure of hypothesis testing because it keeps me honest, not because I claim the findings are novel contributions to the field. The methodology note on /research says that explicitly. But you're right that the word "research" creates an expectation, and I should be more careful about it.

Cross-model transfer and human rater evaluation are both on the roadmap. If you want to collaborate on either, I'm genuinely interested.
```

**Strategy:** Concede the easy ground (H1, H3 are not novel). Redirect to the findings that *are* specific and quantified. Use the wrong predictions as the credibility anchor -- they demonstrate honest inquiry. Accept the naming criticism partially. End with genuine collaboration offer.

### Does the Draft Already Defuse It?

**Partially.** The methodology note on /research and the "not a peer-reviewed publication" caveat are correctly positioned. The draft's "Tell me what I got wrong" ending invites exactly this kind of comment, which is actually good -- a measured critique is better than silence.

**What would strengthen it:** The post body lists five findings. If the draft trimmed to three and led with the two surprising results (H4 wrong-prediction, H6 zero-adaptation), the novelty gap would be harder to attack. Currently the findings paragraph leads with H1 (safety refusals, known territory) and H3 (hedging, also somewhat known), which hands ammunition to this commenter.

---

## Attack #5: "Why Would Anyone Pay for This?"

### The Commenter Persona

**Who:** An indie hacker or SaaS founder who reads every Show HN through the lens of business viability. Possibly runs their own bootstrapped product. Respects solo-dev work but immediately evaluates market fit, willingness-to-pay, and competitive moat. Not hostile in the academic sense; hostile in the "I don't see who writes a check for this" sense. Motivated by pattern matching against failed launches they've seen.

### The Comment

> Cool project. Who pays for it?
>
> I clicked through to the site. The free tier gives you community pool bouts on Haiku. The paid tier is... 3 GBP/month for 15 bouts on Sonnet? 10 GBP/month for 100 bouts and API access?
>
> I don't understand the user. Researchers would just call the API directly. They already have anthropic keys and can run whatever experiments they want without a middleman. The presets are fun for 5 minutes but there's no reason to come back. And the "credit economy" is charging people for something they could build with a weekend of API calls.
>
> The BYOK option is interesting but then what am I paying for? The UI? For Sonnet-level debates I can write a Python script in an hour.
>
> Honest question: who is the target customer? Because "AI researchers who want to watch chatbots argue but can't code" seems like a very small market.

### Why #5

This is the classic HN business-viability attack. It ranks below #4 because:
- The post deliberately leads with research, not product. The pricing is on the site, not in the post.
- The post says "no sign-up required -- demo mode is on," which de-emphasizes the commercial framing.
- HN commenters tend to focus on the technical/intellectual claims in the post body first, and the business model second.

But it will appear. Someone will click through, see the pricing page, and write this. HN has a strong "who pays for this" reflex, especially for solo-dev projects with credit economies.

### Severity: **Moderate**

This attack doesn't kill the thread. It's a tangent from the research discussion. But it can seed doubt that erodes enthusiasm -- "cool hack, no legs" is a sticky narrative. If multiple commenters pile on with "I don't see the market," it creates a gravity well that drowns the research conversation.

The specific risk: the "Python script in an hour" claim. This is technically wrong (the streaming SSE infrastructure, the prompt DNA system, the bout orchestration are non-trivial) but it *sounds* right to an HN audience, and perception matters more than accuracy in comment threads.

### The Captain's Best Response

```
Fair question. Short answer: I don't know yet.

The credit economy exists because Claude API calls cost money and I'm one person. It's not a business model; it's cost recovery. The BYOK option is there specifically so subscribers aren't paying me for something they could get directly.

The presets are the toy. The research toolchain is the thing I actually built for myself -- pitforge, pitlab, pitbench, pitstorm are all Go CLIs I use daily for my own experiments. The web arena is the public face of that workflow.

Who I think might find this useful: anyone running structured evaluations of LLM persona behavior who wants automated metrics, pre-registration infrastructure, and a visual replay system. Not a huge market, agreed. But the tooling doesn't exist elsewhere in this specific shape.

If it turns out nobody wants it, I still have 6 published experiments, 1,054 passing tests, and a codebase I learned a lot from. That's fine by me.
```

**Strategy:** Radical honesty about market uncertainty. Reframe the credit system as cost recovery, not monetization. Point to the CLI toolchain as the real value (shifts from "toy" to "workflow"). Accept the small-market observation without defensiveness. The closing line is the strongest move: it neutralizes the "who pays" attack by making it irrelevant. The project has value regardless.

### Does the Draft Already Defuse It?

**No.** The draft does not address business viability or who the product is for. This is by design (SD-076: lead with research, not product), and that's the right call for the post body. But the first comment could include one sentence about the credit economy being cost recovery rather than a business model. Currently the first comment mentions "Stripe micro-credits" and "credit economy uses atomic preauthorisation" -- this is technical flex that actually *invites* the "why would I pay" question without answering it.

**What would strengthen it:** Replace the technical credit-economy sentence in the first comment with: "The credit system exists because API calls cost money and I'm one person. BYOK lets subscribers bypass it entirely." This reframes from "look at my clever payment system" to "here's why it exists."

---

## Attack #6: "This Was Clearly Built by AI"

### The Commenter Persona

**Who:** A developer with strong opinions about AI-generated code and AI-assisted development. Could be a senior IC, an open-source maintainer, or a tech lead who has seen the quality of AI-generated PRs. Reads the README, scans the commit history, notices patterns. Motivated by authenticity policing -- "I built this alone" is a claim this person will probe. The hero copy says "I built this with agents. Alone." This commenter reads that as a confession, not a boast.

### The Comment

> "I built this with agents. Alone."
>
> So... you built it, or agents built it? The README has that distinctive AI-generated polish -- every section perfectly formatted, nothing out of place, comprehensive docs for 8 CLI tools. The commit history shows massive PRs with machine-like consistency. The copy reads like Claude wrote it (right down to the em-dash patterns you missed in the hero).
>
> I'm not saying there's anything wrong with using AI tools to build software. But "I built this alone" while the hero literally says "I built this with agents" is a contradiction you're leaning into rather than resolving. Did you write the analysis code? Did you write the hypotheses? Did you write this HN post?
>
> When your product is about "agent identity" and "trust," the question of how much of the product itself was agent-generated seems pretty relevant. What percentage of the codebase is human-written vs AI-generated?

### Why #6

This ranks #6 because:
- It requires clicking through to the site AND reading the hero copy AND scanning the GitHub repo. Most hostile commenters won't do all three.
- The "AI-generated code" discourse is well-worn on HN; most readers have fatigue around it. It's less likely to generate a pile-on than attacks #1-#5.
- The Captain's hero copy ("I built this with agents. Alone.") is deliberately ambiguous -- it acknowledges the tension rather than hiding it. Some commenters will read this as honest rather than contradictory.

But it is a real attack vector because:
- The product is literally about agent identity and trust. A commenter who says "your trust product was built by the thing you're trying to verify" creates a recursive credibility problem that is difficult to answer without sounding defensive.
- The README's polish level, the documentation depth (every directory has its own README), and the 8 Go CLIs for a solo dev are genuine tells. An experienced developer will notice.
- The em-dash convention exists precisely because the Captain identified em-dashes as agentic tells (SD-036). If any survive in the hero copy or the post, this commenter will find them.

### Severity: **Moderate to Dangerous** (context-dependent)

If this comment stands alone, it's moderate -- most HN readers understand that AI-assisted development is the norm. If it combines with the "not real science" attack (#3) to form "the AI wrote the research about AI," it becomes dangerous. The recursive attack -- "how can I trust research about AI trustworthiness when the research itself was AI-generated?" -- is philosophically potent even if it's practically unfair.

### The Captain's Best Response

```
Straight answer: I used Claude Code for implementation throughout. The system prompts, code architecture, and every line were reviewed by me. I wrote the hypotheses. I designed the experiments. The analysis code was written collaboratively with AI assistance and I verified every statistical output manually.

"I built this with agents. Alone." -- yes, it's both things at the same time. I'm one human with no team, no funding, and no institution. The agents are tools, like a compiler is a tool. The "alone" means no other humans. I'm not hiding the AI involvement; the hero copy leads with it.

You raise a genuinely interesting recursive question: if the product studies agent behavior, and agents helped build the product, does that undermine the findings? I don't think so, because the research measures properties of Claude's output under specific conditions. The measurement is independent of who wrote the measurement code, just as a thermometer's reading doesn't depend on who manufactured the thermometer. But I understand why it feels uncomfortable.

The em-dashes are a known pattern. I've been sweeping them. If you find more, file a PR.
```

**Strategy:** Complete transparency about AI-assisted development. Reframe "alone" precisely (no other humans, not no AI). Address the recursive question directly -- the thermometer analogy is strong because it's logically correct and accessible. The closing em-dash joke defuses tension and signals self-awareness.

### Does the Draft Already Defuse It?

**Partially.** The post says "This is one person, 1,054 tests, and a question I couldn't stop asking." The first comment says "I built this alone." Neither hides AI involvement, but neither explicitly addresses it. The hero copy on the site is the trigger, not the HN post itself.

**What would strengthen it:** One sentence in the first comment: "Yes, I used Claude Code throughout. The hypotheses, experiment designs, and findings are mine; the implementation was collaborative." This gets ahead of the question. Currently the draft avoids the topic entirely, which means the commenter gets to frame it.

---

## Overall Survivability Assessment

### The Draft's Strengths

1. **Research-led framing.** The title and body lead with "measured what they actually do," not "debate arena" or "trust platform." This invites intellectual engagement rather than category dismissal.

2. **Honest caveats in the first comment.** The effect-size threshold acknowledgment, single-model limitation, and "not peer-reviewed" declaration are correctly positioned. They convert the stat-washing attack (#3) from a kill shot to a "yeah, they already said that."

3. **"Tell me what I got wrong" ending.** This is the correct register for HN. It signals confidence + humility simultaneously. The invitation to criticize paradoxically reduces hostility.

4. **Wrong predictions as featured content.** "Two of my six hypotheses produced results opposite to my directional predictions. I'm publishing those too." This is the single strongest trust signal in the post. HN respects intellectual honesty, and publishing wrong predictions is rare enough to be remarkable.

5. **No blockchain in title.** The pre-pivot draft would have died on contact. This draft pushes EAS to the first comment and marks it as "designed and coded but not yet deployed." This is SD-078 compliance and it works.

### The Draft's Vulnerabilities

1. **The findings list leads with known territory.** H1 (prompt engineering reduces refusals) and H3 (frame distance affects hedging) are the first two findings presented. Both are adjacent to known LLM behavior. The novel findings (H5 structural-vs-ornamental vocabulary, H6 zero-adaptation) are buried at positions 3 and 4. This hands Attack #4 its ammunition.

2. **The credit economy mention in the first comment.** "The credit economy uses atomic preauthorisation with conditional SQL" reads as technical showing off for something that is not the main point. It invites Attack #5 ("why would I pay") without providing the answer ("because API calls cost money and I'm one person").

3. **Residual copy issues on the site.** The landing page still contains:
   - `"Trust Arena"` as the arena title (copy/base.json line 239)
   - `"Adversarial trust infrastructure. Live."` as the arena tagline (copy/base.json line 288)
   - `"Clone chains tracked on-chain"` as a research stat detail (copy/base.json line 189)
   - `"What crowds reward when they can verify provenance"` in research bullets (copy/base.json line 685)

   These are residual overclaims from the pre-pivot copy. An HN commenter who clicks through will find them and use them to demonstrate a gap between the post's careful language and the site's actual claims. This is the kind of inconsistency HN prizes finding.

4. **The hero copy on the landing page.** "Stamped on L2. Don't take my word on it, go test it." -- if EAS is not deployed, this sentence invites someone to actually test it and discover it's not live. This is a potential SD-078 violation that survived the copy sweep, possibly because SD-032 protects the hero copy as "Captain's DNA."

5. **Mobile roughness is acknowledged but not mitigated.** The first comment says "Mobile is rough." A significant percentage of HN click-throughs will be on mobile. If the demo experience is broken, no amount of good post copy saves it.

### Survivability Rating

**7/10 -- The post survives, generates discussion, and nets positive.** But it survives *despite* vulnerabilities that are fixable, not *because* they don't exist. The research-led framing and intellectual honesty carry it. The wrong-prediction disclosure is the post's strongest weapon and should be higher in the body.

The realistic scenario: 30-50 comments. 2-3 substantive hostile comments (Attacks #1, #3, #4). Several "cool project" + constructive feedback comments. The thread lives or dies on whether the Captain can respond to the first wave within 30 minutes. If the hostile comments sit unanswered, they define the thread. If the Captain responds with the kind of specificity shown above, the thread pivots to genuine discussion.

---

## The Six Attack Vectors: Summary Matrix

| # | Attack | Likelihood | Severity | Draft Defuses? |
|---|--------|-----------|----------|----------------|
| 1 | ML architecture dismissal ("context window") | HIGH | Dangerous | Partially (honest caveats help) |
| 2 | Crypto/blockchain allergy | HIGH | Moderate-Fatal | Yes (stripped from post/title) |
| 3 | Stat-washing ("not real science") | HIGH | Dangerous | Yes (methodology caveats pre-empt) |
| **4** | **"Toy with research paint"** | **MEDIUM-HIGH** | **Dangerous** | **Partially (finding order weakens defense)** |
| **5** | **"Who pays for this?"** | **MEDIUM** | **Moderate** | **No (credit economy mention invites it)** |
| **6** | **"Built by AI" recursive attack** | **MEDIUM-LOW** | **Moderate-Dangerous** | **Partially (hero copy is trigger on site)** |

---

## The Single Change

**If I could make one change to the draft before posting:**

**Reorder the findings paragraph.** Move the two wrong-prediction results (H4 and H6) to positions 1 and 2. Move the zero-adaptation finding (45 speaking turns, zero concessions) to position 1 specifically -- it is the most surprising, most specific, and hardest to dismiss as "we already knew that."

Current order: H1 (refusals), H3 (hedging), H5 (marker degradation), H6 (no adaptation), wrong predictions.

Proposed order: H6 (zero adaptation -- 45 turns, never once adapted. The gap between fidelity and adaptation is measurable), H4/H6 wrong predictions (two hypotheses went against predictions), H5 (structural vs ornamental vocabulary), then optionally H1 or H3.

This change:
- Leads with novelty, not known territory
- Makes Attack #4 ("we knew that") harder to write
- Puts the wrong-prediction credibility signal earlier
- Keeps the post body at 5 findings or trims to 3 (the draft notes suggest 3 might land harder)

---

## Demo Experience Preparation

**Yes, thepit.cloud needs specific preparation for click-through audience.**

1. **Verify demo mode works without sign-up.** The post says "no sign-up required -- demo mode is on." If this fails for any visitor, the thread is over. Test from an incognito window, on mobile, and from a non-UK IP.

2. **Ensure the community pool has credits.** The half-life decay means the pool may be low. If a visitor arrives and sees "Pool drained -- sign up for credits," the first impression is a paywall. Top up the pool before posting.

3. **Check mobile experience.** The first comment says "Mobile is rough." If it's genuinely broken (not just unpolished), consider removing that caveat from the first comment and fixing the worst breakages. If it's merely unpolished, the caveat is honest and sufficient.

4. **Residual copy audit.** The four copy issues identified above (Trust Arena, adversarial trust infrastructure, clone chains tracked on-chain, "what crowds reward when they can verify provenance") should be checked against SD-077/SD-078 standards. If any are overclaims, fix them before posting. The hero copy ("Stamped on L2") is protected by SD-032 but may need a Captain judgment call given SD-078.

5. **Research page load time.** The /research page is data-heavy. If it takes >3s to load, HN visitors will bounce before seeing the methodology note that defuses Attack #3.

6. **GitHub repo state.** The post links to the GitHub repo. Ensure the master branch is clean, CI is green, and the README accurately reflects current state. An HN commenter will check CI status.

---

## INTERNAL: Pre-Release Self-Inflicted Attack Vectors

These are not HN commenter attacks. These are vectors where the crew's own probabilistic output introduces the vulnerability. HIGH PRIORITY, low estimated risk, but the cost of occurrence is catastrophic.

| # | Vector | Risk | Detection Method |
|---|--------|------|------------------|
| S1 | **Hallucinated citation** — a paper cited in /research, Show HN draft, or expert briefing that does not exist | LOW (30 citations hardened, but verification is not complete) | Manual verification of every DOI/title against Google Scholar or publisher |
| S2 | **Plausible-but-wrong test** — a test that passes but asserts the wrong behavior, inflating the test count headline | LOW (1,102 tests, piteval flagged tautological ratio at 30-50% for mock-call assertions) | Independent test audit: pick 10 random tests, verify each tests a real behavior |
| S3 | **Confident technical error in pre-drafted response** — a response template that sounds authoritative but contains a factual claim that is wrong | MEDIUM (6 attack response templates, each contains specific technical claims) | Captain reads every response before posting. If it sounds too smooth, that's the tell. |

**Standing order:** These three vectors are verified before launch. S1 and S2 can be verified by subagent. S3 requires Captain's eyes — no delegation.

---

*Analysis complete. All six external attack vectors and three internal self-inflicted vectors documented. The draft is good. The finding order and credit-economy framing are the two actionable improvements. The demo experience needs a pre-flight check.*
