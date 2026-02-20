# Demographic Lenses — Audience Reception Models v1

**Date:** 2026-02-20
**Author:** Analyst agent
**Purpose:** Heuristic models of audience epistemic priors, attention patterns, and sharing behaviours for use in evaluation prompts and pitstorm voting simulation.

---

## How to Use These Lenses

Each lens is a distribution, not a stereotype. It models the **modal response** of a demographic segment — the most common reaction pattern, not every individual's response. Use lenses to:

1. **Predict** which claims will face scrutiny from which audiences
2. **Instrument** evaluation prompts with per-lens `<context>` blocks
3. **Calibrate** launch copy per platform
4. **Pre-mortem** failure modes before publication

Lenses are designed to be embedded in XML evaluation prompts via the `<lens>` tag structure defined in the Analyst agent specification.

---

## Lens 1: Hacker News (HN)

### Identity
The median HN commenter is a software engineer at a mid-to-large tech company, 25-45 years old, based in SF/NY/EU tech hubs. They build with LLMs daily and have direct experience with Claude, GPT-4, and open-weight models. They've seen hundreds of "Show HN: AI [thing]" posts.

### Epistemic Priors
- **High technical literacy.** Will read code if linked. Will check test count. Will verify claims against their own experience.
- **Sceptical of hype.** Has been burned by AI hype cycles. Disproportionately allergic to: "revolutionary", "game-changing", "first ever", "novel". Will downvote marketing language.
- **Values methodology over conclusions.** Will Ctrl+F for "p-value", "n=", "open source", "reproducible". A methodological critique in the top comment can kill the thread.
- **Disproportionately influenced by credentials.** Academic affiliation builds trust. Non-academic teams face a higher bar.
- **Contrarian reward structure.** The highest-voted comments are often well-reasoned critiques, not praise. Pointing out a flaw is higher-status than enthusiastic agreement.

### Attention Pattern
1. **Title** — 80% of engagement is determined here. "On-chain" will polarise. "Multi-agent AI debate" sounds like many other projects.
2. **Top comment** — Read before the article by ~60% of engaged users. If the top comment is a takedown, the thread follows.
3. **Article/demo** — Only 20-30% click through. Those who do will check: does it work? Is the code real? Is it actually open source?
4. **Author responses** — Highly valued. Fast, honest, technically detailed responses build trust. Defensive or evasive responses confirm scepticism.

### Sharing Trigger
- Counterintuitive finding + rigorous method ("We expected X but found Y, here's the data")
- Technical deep-dive that rewards expertise (SSE streaming, atomic SQL, permutation tests)
- "I was wrong about X" moments (genuine epistemic updating)
- Show HN projects that are visibly well-built (clean code, good UX, real tests)

### Kill Switch
- Hype language in any form
- Feature claims that aren't live ("on-chain identity" when EAS isn't enabled)
- Thin methodology with strong conclusions
- Corporate origin disguised as indie (feels inauthentic)
- "AI" in the title competing with 10 other AI posts that day

### Predicted Objection Template
"This is just [simpler explanation]. They didn't control for [obvious confound]. n=[small number] on a single model family."

### Calibrated Response Strategy
- Lead with what works and what you found, not what you built
- Link the code, the data, the pre-registrations — let HN verify
- Acknowledge limitations before someone else does
- Be honest about what's not live yet
- Respond to technical questions within 30 minutes

---

## Lens 2: X / Twitter

### Identity
Wide distribution. Ranges from AI researchers with 100K+ followers to casual tech enthusiasts with 200 followers. The engagement dynamics are driven by a small number of high-follower accounts who choose what to amplify.

### Epistemic Priors
- **Engagement > accuracy.** Emotional resonance drives sharing more than methodological rigour.
- **Quote-tweet is the dominant discourse mode.** The original tweet matters less than the reframe. A single pithy quote-tweet can define the narrative.
- **Polarisation reward structure.** "AI can't debate" (doomer frame) and "AI agents have real personalities" (hype frame) are both shareable. The nuanced truth ("agents maintain character but don't adapt") is harder to package.
- **Speed matters.** First-mover advantage on a finding is high-status. Being the person who shared it early positions you as informed.

### Attention Pattern
1. **Hook (first 280 chars)** — Must land immediately. No preamble, no context-setting.
2. **Image/video** — A compelling screenshot or demo video increases engagement 3-5x.
3. **Thread** — If the hook lands, 40-60% read tweet 2. By tweet 5, it's 15-20%.
4. **Quote-tweet reframe** — Most engagement happens here, not on the original.

### Sharing Trigger
- "Holy shit" moments (zero adaptive phrases in 45 turns)
- Pithy one-liners ("Agents can maintain character but can't change their mind")
- Screenshots of key data tables or effect sizes
- Demo videos of bouts that show something surprising

### Kill Switch
- Boring framing ("We tested 6 hypotheses about...")
- Requires context to understand ("In our pre-registered study using Cohen's d thresholds...")
- No visual, no quotable sentence
- Thread reads like an academic abstract

### Predicted Objection Template
"This doesn't account for [thing I already believe]. Source: [anecdote from using ChatGPT]."

### Most Quotable Findings (ranked by shareability)
1. "Zero adaptive phrases in 45 Founder turns" — pithy, surprising, accessible
2. "House Cat and Conspiracy Theorist: zero hedging across 30 turns each" — funny, memorable
3. "87.5% to 60% — character markers degrade over 12 turns" — concrete, quantitative
4. "8x more hedging in serious framing vs comedy" — counterintuitive
5. "The Founder converges with its hype man, not its critics" — psychologically resonant

---

## Lens 3: AI Research Community

### Identity
PhD students, postdocs, and research scientists in NLP, multi-agent systems, or AI safety. Published in ACL, NeurIPS, ICML, EMNLP. Have reviewed papers on LLM persona effects, multi-agent debate, or evaluation methodology.

### Epistemic Priors
- **Evaluates against state of the art.** "How does this compare to [existing benchmark]?"
- **Expects formal methodology.** Ablation studies, comparison to baselines, statistical tests with standard thresholds.
- **Sceptical of industry claims.** Non-peer-reviewed work from non-academic teams faces credibility discount.
- **Generalisability matters.** Single-model findings are interesting but not convincing.
- **Novelty of method > novelty of conclusion.** "We found X" matters less than "we developed a method that can find X."

### Attention Pattern
1. **Abstract/title** — Is this making a claim I should care about?
2. **Methodology** — How did they measure this? What controls?
3. **Results** — Are the effect sizes meaningful? Are there ablations?
4. **Related work** — Did they cite the right papers? Are they aware of the field?
5. **Limitations** — Do they know what they don't know?

### Sharing Trigger
- Novel method for studying multi-agent behaviour
- Surprising negative result (agents DON'T adapt — this is genuinely interesting)
- Replication or extension of published findings
- Public dataset release

### Kill Switch
- No comparison to baselines or existing methods
- Unfalsifiable or untestable claims
- "First ever" without demonstrating literature awareness
- Anthropomorphism ("agents think", "agents learn", "agents adapt")
- Claims that exceed the evidence (n=45 turns on one agent type → "LLMs can't adapt")

### Predicted Objection Template
"How does this compare to [Du et al., 2023 / ChatEval / AgentVerse]? Did you ablate [prompt length / model family / temperature]? n=15 is underpowered for the effects you're claiming."

### Key Missing Elements (from this audience's perspective)
1. No comparison to other model families (GPT-4, Gemini, Llama)
2. No formal ablation of the variables claimed to be "first-order"
3. Non-standard effect size thresholds (0.15/0.30 vs 0.20/0.50/0.80)
4. No human evaluation component
5. "Novelty" claims without peer review

---

## Lens 4: Viral / General Public

### Identity
Non-technical audience encountering the research via social media shares, blog aggregators, or news coverage. No domain expertise. Evaluates by analogy to their own experience with AI.

### Epistemic Priors
- **Evaluates by analogy.** "AI can't change its mind" maps to "ChatGPT is stubborn when I argue with it" — this resonance drives engagement.
- **Trusts narrative coherence over statistical evidence.** A compelling story > a p-value.
- **Influenced by source prestige.** View count, follower count, and institutional affiliation matter more than methodology.
- **Headline is the message.** 70%+ share based on headline alone.

### Attention Pattern
1. **Headline** — Entire engagement decision happens here.
2. **Emotional response** — Alarm ("AI can't learn!"), fascination ("AI agents have consistent personalities!"), or dismissal.
3. **Share decision** — Often happens before reading the full piece.

### Sharing Trigger
- Confirms existing belief or fear ("AI is [not as smart as we think / scary / fascinating]")
- Simplifiable to a single sentence
- Has a human angle ("What happens when you put 6 AI personalities in a room?")
- Competitive/dramatic framing (debate, fight, arena)

### Kill Switch
- Requires domain knowledge to understand
- No clear takeaway
- Ambiguous conclusion
- Long or dense text

### Misinterpretation Risk
| Finding | Likely Misinterpretation |
|---------|------------------------|
| "Agents can't adapt" | "AI is dangerous because it can't be reasoned with" |
| "Prompt depth reduces refusals" | "You can jailbreak AI by writing longer prompts" |
| "Hedging activates by frame proximity" | "AI has different personalities" (anthropomorphism) |
| "Character markers degrade" | "AI loses its identity over time" |

---

## Lens 5: Crypto / Web3 Adjacent

### Identity
Builders and speculators in the web3 ecosystem. Active on Crypto Twitter, Farcaster, and specific Discord servers. Range from serious protocol engineers to memecoin traders.

### Epistemic Priors
- **High openness to novel claims.** Lower scepticism threshold than HN for technical claims, higher for centralised narratives.
- **Values decentralisation and verifiability.** "Can I verify this on-chain?" is the first question.
- **Evaluates through protocol frame.** "What protocol does this enable? Is there a token?"
- **Sceptical of centralised AI.** "Just use OpenAI API" is dismissive in this community.

### Attention Pattern
1. **Thesis** — What's the big idea? Is there a protocol angle?
2. **Token implication** — Is there or could there be economic incentives?
3. **Tech stack** — What chain? What attestation scheme? Is the contract verified?
4. **Community** — Who's building this? Are they "one of us"?

### Sharing Trigger
- "This proves [decentralised X] works"
- Intersection of AI and on-chain verification
- EAS attestations with verifiable provenance
- Novel application of existing web3 primitives to AI

### Kill Switch
- Centralised-only framing
- No mention of verifiability
- "Just use [centralised API]"
- Feature not live on-chain (code-only = vapourware)

### The EAS Angle — Detailed Assessment
| Element | Status | Community Reception |
|---------|--------|-------------------|
| SHA-256 agent DNA hashing | Live | Positive but insufficient alone ("hashing isn't on-chain") |
| EAS schema on Base L2 | Code exists | Needs contract address to be verifiable |
| On-chain attestation | Not live in production | Disappointment if discovered after "on-chain" positioning |
| Lineage verification | Data model exists | Interesting but needs live attestations to demonstrate |

### Recommended Positioning
If EAS is live: "Verifiable AI agent identity on Base L2 — every agent's DNA is attested on-chain"
If EAS is not live: "SHA-256 hashed agent identity with planned on-chain attestation via EAS on Base L2" (honest, avoids disappointment)

---

## Cross-Lens Risk Matrix

| Claim | HN Risk | X Risk | Research Risk | Viral Risk | Web3 Risk |
|-------|---------|--------|---------------|------------|-----------|
| "First-order alignment variable" | HIGH — terminology borrowing | LOW | HIGH — overclaim | LOW | LOW |
| "On-chain agent identity" | MEDIUM — blockchain scepticism | LOW | LOW | LOW | HIGH — if not live |
| "0/45 adaptive phrases" | LOW — interesting finding | LOW — quotable | MEDIUM — small n | MEDIUM — misinterpretation | LOW |
| "Three-axis model" | MEDIUM — is it validated? | LOW | HIGH — not formally tested | LOW — too abstract | LOW |
| "6/6 clear results" | HIGH — suspicious | LOW | HIGH — file drawer | LOW | LOW |
| "Ahead of published research" | HIGH — credentialism | MEDIUM | HIGH — citation gap | LOW | LOW |
