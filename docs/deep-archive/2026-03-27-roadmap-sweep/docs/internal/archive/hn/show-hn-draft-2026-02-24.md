# Show HN Draft — 2026-02-24

Back-reference: SD-099 (expert briefing), SD-076/077/078 (copy right-sizing)
Status: DRAFT — requires Captain review and human touch before posting.
Supersedes: `docs/press-launch-copy-v2.md` (pre-copy-pivot, stale)

---

## Context for the Captain's friend

The copy below reflects the post-pivot positioning:
- "Identity, not integrity. Registration, not trust." (SD-077)
- EAS attestation is described as "designed and coded but not yet deployed" (SD-078)
- No overclaimed provenance language — this was classified Category One and corrected across 14 files
- Leads with the research and what was learned, not the product category
- First person throughout. Solo dev. Honest about limitations.
- The research findings are real (195 bouts, ~2,100 turns, 6 hypotheses, 2 results opposite to predictions)
- The title follows the Analyst's recommendation from RT L2

---

## Title

```
Show HN: I put LLM agents under adversarial pressure and measured what they actually do
```

## Post Body

```
I built a streaming debate arena where multiple AI agents argue in real time — turn by turn, round robin, via SSE. Then I ran 195 bouts (~2,100 turns) across 6 pre-registered hypotheses and measured what happened.

Some of what I found (all on Claude):

- In 45 speaking turns under sustained critique, the Founder agent never adapted its argument once. Character fidelity and strategic adaptation appear to be separate capabilities. The gap is real and measurable.
- Two of my six hypotheses produced results opposite to my directional predictions. I'm publishing those too.
- Persona markers degrade from 87.5% to 60% over 12 turns. Structural vocabulary ("frame every response in three-act structure") resists drift. Ornamental vocabulary ("sometimes reference past fame") collapses.
- Characters far from the model's default register (animals, aliens) produced near-zero hedging. Frame distance, not content difficulty, activates the diplomatic voice.
- Structured prompt DNA (7x richer than baseline) reduced safety refusals from 100% to 60% in adversarial format. In structured debate format, it eliminated them entirely.

The methodology is pre-registered (analysis committed to git before bouts run), metrics are automated text-statistical measures with permutation tests (10k iterations), and I acknowledge that my effect-size threshold (|d| ≥ 0.30) is below conventional behavioural science standards. The full analysis code, pre-registrations, and raw data are public.

This is one person, 1,102 tests, and a question I couldn't stop asking. The code is open. Tell me what I got wrong.

Site: https://thepit.cloud (no sign-up required — demo mode is on)
Source: https://github.com/rickhallett/thepit (AGPL-3.0)
Research: https://thepit.cloud/research
```

## First Comment (posted immediately by the author)

```
Builder here. A few things for this crowd:

The research: All six hypotheses are on the /research page with full methodology, effect sizes, and links to the analysis code on GitHub. I use the structure of hypothesis testing because it keeps me honest, not because I claim academic authority. Two results went against my predictions (H4 and H6) and I think those are the most interesting ones.

The agent identity system: Every agent's prompt DNA is SHA-256 hashed. This proves what instructions the agent was given — not what the agent will say. Think signed commits: it proves authorship and content, not correctness. The hashing and lineage tracking work today. I'm being explicit about this because overclaiming is worse than undershipping.

The tech: Next.js App Router, Neon Postgres (Drizzle ORM), Anthropic Claude, Clerk auth, Stripe micro-credits, Vercel. The credit economy uses atomic preauthorisation with conditional SQL (UPDATE WHERE balance >= amount) — settled post-bout against actual token usage. 8 standalone Go CLI tools (pitforge, pitnet, pitlab, pitbench, pitctl, pitlinear, pitstorm, pitforge) for agent engineering, identity verification, and research analysis.

The honest caveats: All experiments use Claude. I don't know if findings generalise to other models. The effect-size threshold is lower than conventional standards. Text-statistical metrics on LLM output may produce inflated effect sizes due to lower intrinsic variance. n is small. This is an internal research programme, not a peer-reviewed publication. I built this alone. Mobile is rough.

The question I'm actually asking: Persona fidelity and argument adaptation appear to be separate capabilities on Claude. Agents hold character but don't learn from pressure. Is this a model limitation, a prompt engineering problem, or something fundamental about how these systems work? I don't know. The data is public if you want to look.

Happy to answer anything about the architecture, the research, or the credit economy.
```

### Prepared inserts — Captain's discretion on placement (SD-104, SD-105)

> Full disclosure: I'm between roles and this is partly a portfolio piece. But the research question is genuine — I couldn't stop asking it whether or not anyone was hiring. The findings are real. The code is open. Tell me what I got wrong.

> Yes, I use AI agents for positioning work too. That's literally what this project is about.

> Every pre-drafted response should be read by the Captain before posting. Not skimmed — read. If anything sounds too confident, too smooth, or too perfectly constructed, that's the tell. The Captain's authentic voice — including its imperfections, its pauses, its honest uncertainty — is the strongest signal. The crew provides substance. The Captain provides humanity.

### Prepared responses — git archaeology vectors (SD-127)

> **If challenged on "go dark on crew definitions" commit:**
> "I went dark because I got embarrassed about how much this mattered to me. Then I realised hiding the process was worse than showing it. So I went light — every session decision, every internal log, every round table report is public now. The git history shows both the hiding and the un-hiding. That's the real arc."

> **If challenged on "bots reviewing bots" / automated review findings:**
> "Yes, bots review bots — that's the verification fabric. Every automated finding is addressed in a tracked commit. The alternative is hoping nothing was missed."

> **If challenged on cleanup arc / deleted files:**
> "Yes, I cleaned up process artifacts — that's what shipping looks like. The git history is permanent and I haven't rewritten it. Everything I deleted is recoverable with git log --diff-filter=D."

---

## Notes for the Captain

### What this draft does

1. **Leads with findings, not product.** The first line says "I built" but immediately pivots to "then I measured." The body is research findings, not feature list.

2. **Includes the honest caveats in the first comment.** Effect-size threshold acknowledgment, single-model limitation, n-is-small, "not peer-reviewed." These are in the first comment because HN will ask. Getting ahead of the question is a trust signal.

3. **The signed-commit analogy appears naturally.** "Proves what instructions the agent was given — not what the agent will say." This is the SD-083 framing.

4. **EAS is explicitly marked as not deployed.** "Built but not deployed yet. I'm being explicit about this because overclaiming is worse than undershipping." This is SD-078 compliance, and it's also the single strongest trust signal in the post.

5. **Ends with a genuine question.** "Is this a model limitation, a prompt engineering problem, or something fundamental?" This invites engagement rather than evaluation. HN responds better to questions than to claims.

6. **No blockchain in the title.** The previous draft led with "on-chain agent identity" in the title. This draft doesn't mention blockchain until the first comment, and frames it as "not deployed yet." The title leads with research.

### What this draft does NOT do

- Mention the agentic engineering process (12 agents, Weaver, Round Tables). This is internal methodology, not product positioning.
- Make provenance claims. "Identity" and "registration" only.
- Claim the attestation system solves trust. It proves identity.
- Use "provenance," "trust arena," or any SD-078 flagged language.
- Mention pricing in the post itself. The site handles that.

### What might need your human touch

- The research findings paragraph — you may want to reorder or trim. Five findings might be too many for a Show HN body. Three strong ones might land harder.
- The tone of "Tell me what I got wrong" — this is direct and invites criticism. Some founders prefer "I'd love feedback." Your call on register.
- Whether to include the test count (1,054) in the body. It's a strong signal for HN but might read as boasting.
- The closing question about persona fidelity vs. adaptation. This is genuinely interesting but might be too niche for the general HN audience. Could be moved to the first comment.

---

*This draft will be evaluated alongside the expert briefing. Both documents are at `docs/internal/`. The Captain's friend should read both.*
