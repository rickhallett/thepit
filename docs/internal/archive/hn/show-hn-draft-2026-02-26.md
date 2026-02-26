# Show HN Draft — 2026-02-26

Back-reference: SD-190 (governance recursion), SD-194 (Captain's stream of consciousness), SD-191 (recursion broken by doing the work)
Status: DRAFT — Captain's voice required. This is scaffolding, not copy.
Supersedes: `docs/internal/show-hn-draft-2026-02-24.md` (pre-SD-190, different framing)

---

## What changed since the last draft

The old draft led with research findings (195 bouts, 6 hypotheses). That framing was correct for Feb 24. By Feb 26, the Captain's position shifted fundamentally. The research findings are still real, but the story the Captain wants to tell is now about the process: can one person govern 13 AI agents without the governance itself becoming the problem? The Captain's answer, as of SD-194: "I have so far been unable to prove that AI can be self organising." That honesty is the new lead.

The old draft hid the agentic engineering process. The new draft makes it the point.

---

## Checklist — dang's guidelines

- [x] Show HN in title
- [x] Product exists and can be tried (thepit.cloud, demo mode, no signup needed)
- [x] Text gives backstory
- [x] Clear statement of what it is/does
- [x] No marketing/sales language
- [x] Personal story + technical details
- [x] Username is personal (rickhallett), not brand
- [ ] Links to previous HN threads (none — first post)
- [x] No booster comments solicited
- [x] Easy to try without signup

---

## Title options (Captain picks)

```
Show HN: I tried to build self-organising AI agents. 194 decisions later, I'm asking for help

Show HN: One person, 13 AI agents, 194 session decisions, and I can't prove it works

Show HN: The Pit — an AI debate arena built by 13 agents that I can't prove are self-organising
```

---

## Post Body — scaffolding for Captain's voice

```
I spent 16 hours a day for the last [X] weeks building an AI debate arena with 13 specialised AI agents. Each agent has a defined role — architecture, QA, security, frontend, integration governance. Every decision is logged (194 session decisions as of today). The agent definitions, internal logs, and decision trail are public in the repo.

The product works. You can use it right now: pick a debate topic, watch Claude agents argue in real time, see the turn-by-turn reasoning. No signup required.

But this post isn't really about the product.

I have built a system to build a system, and that system may be building — or may only appear to be building — something real. I have so far been unable to prove that AI can be self-organising. The governance structure I created to manage the agents (a 13-layer model, a lexicon, standing orders, integration discipline) might be load-bearing engineering, or it might be well-intentioned process that only looks like engineering because it is coherent and plausible.

The specific problem I've hit: compounding errors that read like success. The AI agents produce output that is confident, well-structured, contextually appropriate, and sometimes completely wrong — not wrong in the way humans are wrong (through misunderstanding), but wrong in the way language models are wrong (through fluent, plausible hallucination that passes surface-level checks). I built verification layers to catch this. Then I needed verification layers for the verification layers. Then I noticed I was building governance recursion — the machine that builds the machine — and I couldn't tell if that was rigour or avoidance.

I have 1,054* tests. The core execution engine has zero. I have a cryptographic fingerprint system for agent identity. The reaction system had an FK violation in production. I have 194 session decisions documenting every choice. I took one day off.

I want to find something that works, not play a computer game. The symbols I use (naval metaphors, a crew, a "Captain") are deliberate storycrafting — pattern and process collected from myth and engineering culture to help me learn what governance might mean at every layer. They are not claims of authority.

I am increasingly of the opinion I have reached the limit of what I can do alone. I'm looking for people who have been building things longer than I have to tell me what they see. Not what's wrong with the code — what's wrong with the approach. Is the governance structure I built useful, or is it chaos that reads like order?

The code is open. The decision log is open. The internal documents are open. Tell me what you see.

Site: https://thepit.cloud
Source: https://github.com/rickhallett/thepit
Decision trail: https://github.com/rickhallett/thepit/blob/master/docs/internal/session-decisions.md
```

---

## First Comment — scaffolding

```
Builder here. Some context for this crowd.

Full disclosure: I'm between roles and this is partly a portfolio piece. The research question is genuine — I couldn't stop asking it. The code is open. Tell me what I got wrong.

Technical stack: Next.js App Router, Neon Postgres (Drizzle ORM), Anthropic Claude, Clerk auth, Stripe micro-credits. 8 Go CLI tools for agent management, identity verification, and research analysis. ~85,000 lines TypeScript + Go.

The 13 agents are all Claude instances with different system prompts and defined roles. They're orchestrated through a governance layer I call "the weave" — an integration discipline that requires every change to pass through verification gates before merging. Each agent's prompt is SHA-256 fingerprinted. The full agent definitions are excluded from git (IP), but the governance process and every decision are public.

The research: I ran 195 adversarial debate bouts and pre-registered 6 hypotheses. Two results went opposite to predictions. The methodology is on the /research page. Effect sizes, permutation tests, honest caveats about threshold and sample size — all there.

The thing I actually want help with: I've documented ~190 session decisions, and somewhere around SD-073 I identified what I call "Category One" — when the system lies with truth. Output that is factually assembled from real components but semantically wrong. I built detection mechanisms. Then I needed detection mechanisms for the detection mechanisms. I named this "governance recursion" and I genuinely cannot tell if the naming is itself an instance of the pattern.

If you've managed engineering teams, built complex systems, or worked in fields where cascading errors compound (aviation, medicine, nuclear), I would value your perspective on where the recursive loop breaks. What does "good enough" governance look like when your agents are probabilistic and your own inputs are non-deterministic?

Happy to answer anything about the architecture, the process, or the mistakes.
```

---

## Operational checklist before posting

- [ ] Repo set to public (`gh repo edit --visibility public`)
- [ ] Verify thepit.cloud is live and demo mode works without signup
- [ ] Verify /research page loads and links work
- [ ] Agent definitions confirmed excluded from git tracking (.gitignore + .git/info/exclude)
- [ ] Captain reads draft, rewrites in own voice, removes anything that smells of agent polish
- [ ] No uncommitted changes on master (clean working tree)
- [ ] SD-194 is on file (Captain's verbatim — done)
- [ ] Phasmid analysis on file (done)
- [ ] PR #371 either merged or noted as in-progress (currently: open, fix pushed, ready to merge)

---

## Prepared responses — Captain's discretion

**"This is just a ChatGPT wrapper":**
> It's an arena where agents argue under pressure. The product is the interaction, not the API call. But honestly, the product is less interesting than the process. The 194-decision governance trail is the real thing I'm showing.

**"The naval metaphor is cringe / LARPing":**
> It is, a bit. I chose it because the problem of governing semi-autonomous agents under uncertainty has been solved before — at sea, in aviation, in medicine. I needed a framework and I picked one with centuries of operational practice behind it. The metaphor is scaffolding. The question underneath is real.

**"How do you know the agents aren't just telling you what you want to hear?":**
> I don't. That's literally what I'm asking for help with. I named this problem at SD-073 and I've been trying to build detection for it ever since. The best I can say is: I've caught it several times, which means my detection works sometimes, which means I've probably missed it other times.

**"194 session decisions for a side project is insane":**
> Yes. I know. I took one day off. The question is whether the documentation discipline produced something useful or whether it's elaborate procrastination. I genuinely don't know. That's why I'm posting.

**"Why should I trust your test count?":**
> You shouldn't, necessarily. The footer on the site says: "this number is continually changing, has rarely been accurate, and may mean almost nothing in terms of system validity." The core execution engine has zero direct tests. The 1,054 number is real but it measures coverage of everything except the thing that matters most. I'm working on fixing that this week.

---

## Notes for the Captain

This draft is scaffolding. The voice is mine (Weaver's), not yours. It needs your hand on every paragraph before posting. The structure follows dang's guidelines. The content follows SD-194.

The key shift from the old draft: the old one hid the process and led with the product. This one makes the process the point and uses the product as evidence. The old one said "look what I built." This one says "I built something and I can't tell if it works. Help."

That's the honest position. It's also, per dang's guidelines, the position that seeds discussion in a good direction.

One operational note: the repo must go public before posting. SD-149 set it to private ("being chill, not going dark"). Going public is a one-way door in terms of git history visibility. Agent definitions are excluded. Internal docs (session decisions, round tables, this file) will be visible. That is the point.
