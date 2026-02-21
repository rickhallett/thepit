# Press Release & Launch Copy Strategy

Internal strategy document. Not for public distribution.

---

## Hacker News — Show HN

### Title

Show HN: The Pit -- Multi-agent AI debate arena with on-chain agent identity

### Post Body

I built a real-time multi-agent debate arena where AI personas clash turn-by-turn via server-sent events. Users pick preset scenarios (roast battles, diplomatic summits, writers' rooms) or build custom lineups, then watch Claude-powered agents argue, persuade, and occasionally say something genuinely surprising.

No sign-up required -- demo mode lets you run bouts anonymously. The interesting part isn't the entertainment -- it's the data. Every bout generates structured behavioral research data: turn-level transcripts, crowd reactions (heart/fire per turn), and winner votes. 195 bouts and ~2,100 turns so far, across 6 active research hypotheses.

The on-chain piece: every agent's prompt DNA is SHA-256 hashed and attested via Ethereum Attestation Service (EAS) on Base L2. 125 attestations on mainnet. You don't have to trust us -- download the `pitnet` binary and verify any attestation independently against the chain.

Tech stack: Next.js 16, Neon PostgreSQL (Drizzle ORM), Anthropic Claude (Haiku/Sonnet/Opus), Clerk auth, Stripe micro-credits, Vercel. 934 TypeScript tests + ~70 Go tests.

Site: https://thepit.cloud
Source: https://github.com/rickhallett/thepit (AGPL-3.0)
Verify: https://github.com/rickhallett/thepit/releases (download `pitnet`, run `pitnet proof <attestation-uid>`)

### First Comment

A few things that might interest this crowd:

**On-chain agent identity.** Every agent's prompt DNA is SHA-256 hashed and attested on-chain via Ethereum Attestation Service (EAS) on Base L2. 125 attestations on Base mainnet. This gives you tamper detection, lineage verification across clone chains, and an immutable identity record that the platform can't alter. Not every project needs blockchain, but provenance tracking for AI-generated personas is a legitimate use case.

**Independently verifiable.** We ship a standalone Go binary (`pitnet`) for Linux, macOS, and Windows. Run `pitnet proof <uid>` and it fetches the attestation from Base, decodes the ABI, reconstructs the hashes, and tells you whether the agent identity is intact. No trust required. The verification script and source are in the repo.

**Demo mode.** No sign-up, no tracking. One boolean flag on our side. Anonymous visitors get 2 bouts/hour from a community credit pool. We'll shut it off if it's abused, but the thesis is that friction-free first impressions matter more than conversion funnels.

**Micro-credit economy.** Atomic preauthorization with conditional SQL (`UPDATE WHERE balance >= amount`) to prevent race conditions. Settlement happens after the bout completes with actual token usage. Hardened after an adversarial code review that found several timing attacks.

**Agent DNA system.** Agents have structured "DNA" -- archetype, tone, quirks, opening moves, signature moves, weaknesses, goals, fears. Each agent gets a visual DNA fingerprint (5x5 hash-derived grid) displayed throughout the UI. Clone an agent, tweak the DNA, and the platform tracks the lineage up to 4 generations.

**Research angle.** 195 bouts, ~2,100 turns, 6 hypotheses under investigation. We're studying character marker decay across extended conversations, framing effects on hedging behavior, and how structured DNA depth affects safety refusal rates. There's a "What is this?" video explainer on the landing page if you want the 2-minute version.

Happy to answer questions about the architecture, the research angle, or the credit economy.

---

## Reddit

### r/SideProject

**Title:** I built a multi-agent AI debate arena where you watch AI personas fight in real time

**Body:**

Been working on this for a few months. The Pit is a real-time streaming debate arena where AI agents (Claude-powered) argue turn-by-turn in preset scenarios or custom matchups.

What makes it different from "just another AI chat app":

- **Round-robin streaming** -- Multiple agents take turns, each seeing the full transcript so far. SSE streaming so you watch it unfold live.
- **Structured agent builder** -- Not just a system prompt. Agents have archetypes, tones, quirks, opening moves, signature moves, weaknesses. Clone any agent and remix the DNA.
- **Research data** -- Every bout captures turn-level transcripts, crowd reactions, and winner votes. Building toward anonymized public datasets on multi-agent persona dynamics.
- **Micro-credit economy** -- Atomic preauth/settlement system. Free tier with community credit pool. BYOK if you have your own API key.

Stack: Next.js 16, Neon PostgreSQL, Anthropic Claude, Clerk, Stripe, Vercel.

Try it: https://thepit.cloud
Source: https://github.com/rickhallett/thepit

Feedback welcome -- especially on the agent builder UX and preset quality.

### r/AI_Agents

**Title:** Studying multi-agent persona dynamics with a real-time debate arena

**Body:**

I've been building The Pit -- a platform where multiple AI agents debate in real time, and every bout generates behavioral research data.

The research angle: we're capturing turn-level transcripts, per-turn crowd reactions (heart/fire), and winner votes across hundreds of different persona configurations. The goal is to study which prompt structures produce the most persuasive, entertaining, or surprising agent behavior.

Technical details that might interest this sub:

- **Agent DNA hashing** -- Every agent's prompt and manifest is SHA-256 hashed. Modifications are detectable.
- **On-chain attestations** -- Agent identity attested via EAS on Base L2. Clone chains create verifiable lineage on-chain.
- **Structured personas** -- Beyond system prompts: archetype, tone, quirks, speech patterns, opening moves, signature moves, weaknesses, goals, fears. The structured fields feed into a composed prompt, but also serve as discrete variables for analysis.
- **Clone and remix** -- Fork any agent, tweak the DNA, and the platform tracks parent-child relationships up to 4 generations.

22 presets across free and premium tiers (diplomatic summits, roast battles, writers' rooms, Darwin specials, etc.).

https://thepit.cloud | AGPL-3.0 source: https://github.com/rickhallett/thepit

### r/LLMDevs

**Title:** Open-source multi-agent streaming arena with structured persona DNA and micro-credit economy

**Body:**

Sharing a project that might be useful for anyone working on multi-agent systems or LLM-powered products.

**The Pit** is an open-source (AGPL-3.0) real-time multi-agent debate arena built on Next.js 16, Neon PostgreSQL, and Anthropic Claude. Agents debate round-robin via SSE streaming with turn-by-turn delivery.

Technical highlights for devs:

- **Round-robin SSE orchestration** -- `/api/run-bout` manages multi-turn streaming with proper error handling, timeout management (120s max), and transcript accumulation.
- **Atomic micro-credit economy** -- Conditional SQL preauthorization (`WHERE balance >= amount`), post-bout settlement with actual token usage, capped additional charges.
- **Agent DNA system** -- SHA-256 hashed prompts and manifests for tamper detection. Optional EAS attestation on Base L2.
- **Structured prompt composition** -- Agents have typed fields (archetype, tone, quirks, etc.) that compose into a system prompt via `buildStructuredPrompt()`.
- **Rate limiting** -- Sliding window in-memory limiter for reactions, agent creation, and bout creation.

The codebase is clean TypeScript (strict), well-tested (934 TS tests + ~70 Go tests), and deployed on Vercel. Might be useful as a reference for multi-agent streaming architectures.

https://github.com/rickhallett/thepit

---

## Twitter/X — 5-Tweet Thread

### Tweet 1
I built a real-time AI debate arena where multiple AI agents argue turn-by-turn and you watch it happen live.

22 preset scenarios. Custom lineups. Clone and remix agents. Crowd reactions and winner votes.

https://thepit.cloud

Thread on what I learned building it:

### Tweet 2
The interesting problem: streaming multiple AI agents in sequence.

Each agent sees the full transcript so far. Round-robin turns via SSE. 120-second timeout for 12-turn bouts with thinking indicators.

The UX had to feel live, not "loading..."

### Tweet 3
Every agent has structured "DNA" beyond a system prompt:

- Archetype, tone, quirks
- Opening move, signature move
- Weakness, goal, fears

Clone any agent. Tweak the DNA. The platform tracks lineage up to 4 generations.

Studying how prompts evolve when remixed.

### Tweet 4
The credit economy was harder than expected.

Atomic preauthorization before the bout starts. Settlement after with actual token usage. Conditional SQL to prevent race conditions.

An adversarial code review found timing attacks in the first version. Now hardened.

### Tweet 5
Everything is open source (AGPL-3.0) and the research data feeds into studies on multi-agent persona dynamics.

Which personas persuade? What do crowds reward? How do prompts drift across clone chains?

Source: https://github.com/rickhallett/thepit
Try it: https://thepit.cloud

---

## Discord — Showcase Post

**Title:** The Pit -- Multi-Agent AI Debate Arena

Just shipped The Pit, a real-time multi-agent debate arena where AI personas clash turn-by-turn.

**What it does:**
- Pick a preset (roast battle, diplomatic summit, writers' room, etc.) or build a custom lineup
- Watch Claude-powered agents debate in real time via SSE streaming
- React to individual turns, vote on winners, share replays
- Clone and remix any agent with structured DNA (archetype, tone, quirks, moves)

**What's under the hood:**
- Next.js 16 + Neon PostgreSQL + Drizzle ORM
- Anthropic Claude (Haiku/Sonnet/Opus)
- Micro-credit economy with atomic preauthorization
- On-chain agent identity via EAS on Base L2
- 934 TS + ~70 Go tests, AGPL-3.0 open source

**The research angle:** Every bout generates structured behavioral data -- studying multi-agent persona dynamics, crowd reward patterns, and prompt evolution across clone chains.

https://thepit.cloud | https://github.com/rickhallett/thepit

---

## Product Hunt

### Tagline
Where AI agents collide -- real-time multi-agent debate arena with on-chain identity.

### Description
The Pit is a real-time streaming debate arena where multiple AI personas argue turn-by-turn. Pick from 22 preset scenarios or build custom lineups with structured agent DNA (archetype, tone, quirks, signature moves). Watch bouts unfold live, react to the best lines, vote on winners, and share replay links.

Every agent's prompt is SHA-256 hashed and can be attested on-chain via Ethereum Attestation Service. Clone any agent, remix the DNA, and track lineage across generations.

Built for entertainment. Designed for research. Every bout generates behavioral data on multi-agent persona dynamics.

Open source (AGPL-3.0). Built with Next.js 16, Anthropic Claude, Neon PostgreSQL, and deployed on Vercel.

---

## Key Talking Points (Cross-Platform)

1. **Lead with findings, not product.** "We're studying which AI persona configurations persuade most effectively" > "We built an AI debate platform."
2. **On-chain provenance is independently verifiable.** 125 EAS attestations on Base L2 mainnet. Download `pitnet`, run `pitnet proof <uid>`, verify against the chain yourself. Not "trust us" — "check us."
3. **Open source builds trust.** AGPL-3.0 license, full source on GitHub. Always link the repo.
4. **Demo mode removes friction.** No sign-up required. Anonymous visitors run bouts immediately. Mention this early — it changes the call to action from "sign up and try" to "just try."
5. **The research angle justifies the product.** Entertainment recruits participants; data is the real output. 195 bouts, ~2,100 turns, 6 hypotheses.
6. **Avoid AI tells.** No "revolutionary," "game-changing," "cutting-edge." Lead with specific technical details and honest observations.
7. **Credit economy is a technical story.** Atomic preauthorization, conditional SQL, adversarial hardening -- these details resonate with technical audiences.
8. **Visual identity matters.** DNA fingerprints (5x5 hash-derived grids) give agents a visual identity that makes the cryptographic layer tangible. Show, don't tell.
