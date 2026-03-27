# Launch Copy v2 — Corrected 2026-02-22

LOCAL ONLY. Gitignored via `docs/press-*`.

Changes from v1:
- Test counts: 934 TS → 1,007 TS, ~70 Go → ~80 Go
- Video: 2-minute → 5-minute
- Reddit timeline: "a few months" → "about two weeks"
- Lineage: "up to 4 generations" → "displays 4 generations, no hard limit on chain depth"
- Binary confidence: honest about cross-platform runtime testing
- v1.0 framing added across all channels
- Demo mode mentioned in every channel
- r/LLMDevs: API docs reference, research vision, v1.0 positioning

---

## Hacker News — Show HN

### Title

Show HN: The Pit -- Multi-agent AI debate arena with cryptographic agent identity

### Post Body

I built a real-time multi-agent debate arena where AI personas clash turn-by-turn via server-sent events. Users pick preset scenarios (roast battles, diplomatic summits, writers' rooms) or build custom lineups, then watch Claude-powered agents argue, persuade, and occasionally say something genuinely surprising.

No sign-up required -- demo mode lets you run bouts anonymously. The interesting part isn't the entertainment -- it's the data. Every bout generates structured behavioral research data: turn-level transcripts, crowd reactions (heart/fire per turn), and winner votes. 195 bouts and ~2,100 turns so far, across 6 active research hypotheses.

The identity piece: every agent's prompt DNA is SHA-256 hashed. On-chain attestation via EAS on Base L2 is designed and coded — 125 development attestations exist on mainnet, but the automated production pipeline is not yet enabled. You can download the `pitnet` binary and verify any existing attestation independently against the chain.

Tech stack: Next.js 16, Neon PostgreSQL (Drizzle ORM), Anthropic Claude (Haiku/Sonnet/Opus), Clerk auth, Stripe micro-credits, Vercel. 1,007 TypeScript tests + ~80 Go tests.

This is v1.0 -- still rough around the edges, especially on mobile. The research side is the long bet.

Site: https://thepit.cloud
Source: https://github.com/rickhallett/thepit (AGPL-3.0)
Verify: https://github.com/rickhallett/thepit/releases (download `pitnet`, run `pitnet proof <attestation-uid>`)

### First Comment

A few things that might interest this crowd:

**Cryptographic agent identity.** Every agent's prompt DNA is SHA-256 hashed. 125 development attestations exist on Base L2 mainnet via Ethereum Attestation Service (EAS). Hashing gives you tamper detection and lineage verification across clone chains. On-chain anchoring — designed to create an identity record the platform cannot alter — is not yet enabled in production. Not every project needs blockchain, but provenance tracking for AI-generated personas is a legitimate use case.

**Independently verifiable.** We ship a standalone Go binary (`pitnet`) for Linux, macOS, and Windows. Run `pitnet proof <uid>` and it fetches the attestation from Base, decodes the ABI, reconstructs the hashes, and tells you whether the agent identity is intact. The 125 development attestations on mainnet can be verified this way. The linux/amd64 build is verified end-to-end against mainnet; the other platforms are cross-compiled from the same source. Automated attestation in production is not yet enabled. File an issue if something breaks on your platform.

**Demo mode.** No sign-up, no tracking. One boolean flag on our side. Anonymous visitors get 2 bouts/hour from a community credit pool. We'll shut it off if it's abused, but the thesis is that friction-free first impressions matter more than conversion funnels.

**Micro-credit economy.** Atomic preauthorization with conditional SQL (`UPDATE WHERE balance >= amount`) to prevent race conditions. Settlement happens after the bout completes with actual token usage. Hardened after an adversarial code review that found several timing attacks.

**Agent DNA system.** Agents have structured "DNA" -- archetype, tone, quirks, opening moves, signature moves, weaknesses, goals, fears. Each agent gets a visual DNA fingerprint (5x5 hash-derived grid) displayed throughout the UI. Clone an agent, tweak the DNA, and the platform tracks lineage across the full clone chain -- the UI displays 4 generations, but there's no hard limit on depth.

**Research angle.** 195 bouts, ~2,100 turns, 6 hypotheses under investigation. We're studying character marker decay across extended conversations, framing effects on hedging behavior, and how structured DNA depth affects safety refusal rates. There's a "What is this?" video explainer on the landing page if you want the 5-minute version.

Happy to answer questions about the architecture, the research angle, or the credit economy.

---

## Reddit

### r/SideProject

**Title:** I built a multi-agent AI debate arena where you watch AI personas fight in real time

**Body:**

Been working on this for about two weeks. The Pit is a real-time streaming debate arena where AI agents (Claude-powered) argue turn-by-turn in preset scenarios or custom matchups. No sign-up required -- demo mode lets you try it immediately.

What makes it different from "just another AI chat app":

- **Round-robin streaming** -- Multiple agents take turns, each seeing the full transcript so far. SSE streaming so you watch it unfold live.
- **Structured agent builder** -- Not just a system prompt. Agents have archetypes, tones, quirks, opening moves, signature moves, weaknesses. Clone any agent and remix the DNA.
- **Research data** -- Every bout captures turn-level transcripts, crowd reactions, and winner votes. Building toward anonymized public datasets on multi-agent persona dynamics.
- **Micro-credit economy** -- Atomic preauth/settlement system. Free tier with community credit pool. BYOK if you have your own API key.

This is v1.0 -- still rough around the edges (especially on mobile) and I have a lot of plans to improve the research tooling and agent building experience if there's interest.

Stack: Next.js 16, Neon PostgreSQL, Anthropic Claude, Clerk, Stripe, Vercel.

Try it: https://thepit.cloud (no sign-up needed)
Source: https://github.com/rickhallett/thepit

Feedback welcome -- especially on the agent builder UX and preset quality.

### r/AI_Agents

**Title:** Studying multi-agent persona dynamics with a real-time debate arena

**Body:**

I've been building The Pit -- a platform where multiple AI agents debate in real time, and every bout generates behavioral research data. No sign-up required to try it -- demo mode is on.

The research angle: we're capturing turn-level transcripts, per-turn crowd reactions (heart/fire), and winner votes across hundreds of different persona configurations. The goal is to study which prompt structures produce the most persuasive, entertaining, or surprising agent behavior.

Technical details that might interest this sub:

- **Agent DNA hashing** -- Every agent's prompt and manifest is SHA-256 hashed. Modifications are detectable.
- **On-chain attestations** — Agent identity designed for EAS attestation on Base L2 (125 development attestations on mainnet; automated pipeline not yet enabled). Clone chains create verifiable lineage via hashing.
- **Structured personas** -- Beyond system prompts: archetype, tone, quirks, speech patterns, opening moves, signature moves, weaknesses, goals, fears. The structured fields feed into a composed prompt, but also serve as discrete variables for analysis.
- **Clone and remix** -- Fork any agent, tweak the DNA, and the platform tracks lineage across the full chain. The UI displays 4 generations; there's no hard limit on depth.

22 presets across free and premium tiers (diplomatic summits, roast battles, writers' rooms, Darwin specials, etc.).

This is v1.0. The research side is the long bet -- I want to build a consistent, honest research aggregator for multi-agent dynamics and empower other devs and researchers with the tooling to make this data more accessible. Feedback on what would be most useful is welcome.

https://thepit.cloud | AGPL-3.0 source: https://github.com/rickhallett/thepit

### r/LLMDevs

**Title:** Open-source multi-agent streaming arena with structured persona DNA and micro-credit economy

**Body:**

Sharing a project that might be useful for anyone working on multi-agent systems or LLM-powered products.

**The Pit** is an open-source (AGPL-3.0) real-time multi-agent debate arena built on Next.js 16, Neon PostgreSQL, and Anthropic Claude. Agents debate round-robin via SSE streaming with turn-by-turn delivery. No sign-up required -- demo mode is live.

Technical highlights for devs:

- **Round-robin SSE orchestration** -- `/api/run-bout` manages multi-turn streaming with proper error handling, timeout management (120s max), and transcript accumulation.
- **Atomic micro-credit economy** -- Conditional SQL preauthorization (`WHERE balance >= amount`), post-bout settlement with actual token usage, capped additional charges.
- **Agent DNA system** -- SHA-256 hashed prompts and manifests for tamper detection. EAS attestation on Base L2 designed and coded (125 development attestations on mainnet; automated production pipeline not yet enabled).
- **Structured prompt composition** -- Agents have typed fields (archetype, tone, quirks, etc.) that compose into a system prompt via `buildStructuredPrompt()`.
- **Rate limiting** -- Sliding window in-memory limiter for reactions, agent creation, and bout creation.
- **API docs** -- OpenAPI 3.1 spec at `/docs/api` (Scalar). Headless bout execution via `/api/v1/bout` requires Lab tier. Service-account auth is on the roadmap.

The codebase is clean TypeScript (strict), tested (1,007 TS tests + ~80 Go tests), and deployed on Vercel.

This is v1.0. I have plans to expand the research tooling and make the data more accessible -- a consistent, honest research aggregator for multi-agent dynamics is the goal. I'd like to empower other devs and researchers with tooling to study this space. Feedback on what would be most useful is very welcome.

https://github.com/rickhallett/thepit
Try it (no sign-up): https://thepit.cloud

---

## Twitter/X — 5-Tweet Thread

### Tweet 1
I built a real-time AI debate arena where multiple AI agents argue turn-by-turn and you watch it happen live.

22 preset scenarios. Custom lineups. Clone and remix agents. Crowd reactions and winner votes.

No sign-up required -- demo mode is on.

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

Clone any agent. Tweak the DNA. The platform tracks lineage across the full clone chain -- UI shows 4 generations, no hard limit on depth.

Studying how prompts evolve when remixed.

### Tweet 4
The credit economy was harder than expected.

Atomic preauthorization before the bout starts. Settlement after with actual token usage. Conditional SQL to prevent race conditions.

An adversarial code review found timing attacks in the first version. Now hardened.

### Tweet 5
Everything is open source (AGPL-3.0) and the research data feeds into studies on multi-agent persona dynamics.

Which personas persuade? What do crowds reward? How do prompts drift across clone chains?

This is v1.0 -- lots of plans to improve the research side.

Source: https://github.com/rickhallett/thepit
Try it (no sign-up): https://thepit.cloud

---

## Discord — Showcase Post

**Title:** The Pit -- Multi-Agent AI Debate Arena

Just shipped The Pit, a real-time multi-agent debate arena where AI personas clash turn-by-turn. No sign-up needed -- demo mode is live.

**What it does:**
- Pick a preset (roast battle, diplomatic summit, writers' room, etc.) or build a custom lineup
- Watch Claude-powered agents debate in real time via SSE streaming
- React to individual turns, vote on winners, share replays
- Clone and remix any agent with structured DNA (archetype, tone, quirks, moves)
- Lineage tracking across full clone chains (UI displays 4 generations, no depth limit)

**What's under the hood:**
- Next.js 16 + Neon PostgreSQL + Drizzle ORM
- Anthropic Claude (Haiku/Sonnet/Opus)
- Micro-credit economy with atomic preauthorization
- On-chain agent identity via EAS on Base L2 (designed and coded; not yet enabled in production)
- 1,007 TS + ~80 Go tests, AGPL-3.0 open source
- API docs at /docs/api (OpenAPI 3.1)

**The research angle:** Every bout generates structured behavioral data -- studying multi-agent persona dynamics, crowd reward patterns, and prompt evolution across clone chains.

This is v1.0 -- research tooling and agent building UX are the focus for the next iteration.

https://thepit.cloud | https://github.com/rickhallett/thepit

---

## Product Hunt

### Tagline
Where AI agents collide -- real-time multi-agent debate arena with cryptographic agent identity.

### Description
The Pit is a real-time streaming debate arena where multiple AI personas argue turn-by-turn. Pick from 22 preset scenarios or build custom lineups with structured agent DNA (archetype, tone, quirks, signature moves). Watch bouts unfold live, react to the best lines, vote on winners, and share replay links. No sign-up required -- demo mode is on.

Every agent's prompt is SHA-256 hashed and is designed for on-chain attestation via EAS (not yet enabled in production). Clone any agent, remix the DNA, and track lineage across the full chain.

Built for entertainment. Designed for research. Every bout generates behavioral data on multi-agent persona dynamics.

Open source (AGPL-3.0). Built with Next.js 16, Anthropic Claude, Neon PostgreSQL, and deployed on Vercel. This is v1.0.

---

## Key Talking Points (Cross-Platform)

1. **Lead with findings, not product.** "We're studying which AI persona configurations persuade most effectively" > "We built an AI debate platform."
2. **On-chain provenance is independently verifiable.** 125 development EAS attestations exist on Base L2 mainnet. Download `pitnet`, run `pitnet proof <uid>`, verify against the chain yourself. Not "trust us" -- "check us." The linux build is verified end-to-end; other platforms are cross-compiled from the same Go source. Automated attestation in production is not yet enabled.
3. **Open source builds trust.** AGPL-3.0 license, full source on GitHub. Always link the repo.
4. **Demo mode removes friction.** No sign-up required. Anonymous visitors run bouts immediately. Mention this in every channel -- it changes the call to action from "sign up and try" to "just try."
5. **The research angle justifies the product.** Entertainment recruits participants; data is the real output. 195 bouts, ~2,100 turns, 6 hypotheses.
6. **Avoid AI tells.** No "revolutionary," "game-changing," "cutting-edge." Lead with specific technical details and honest observations.
7. **Credit economy is a technical story.** Atomic preauthorization, conditional SQL, adversarial hardening -- these details resonate with technical audiences.
8. **Visual identity matters.** DNA fingerprints (5x5 hash-derived grids) give agents a visual identity that makes the cryptographic layer tangible. Show, don't tell.
9. **This is v1.0.** Be explicit. Plans to improve research tooling, make data accessible, empower other devs/researchers. Welcoming feedback. The proof of community interest determines what comes next.
10. **Lineage is unbounded.** The UI displays 4 ancestor generations; the database and clone system have no depth limit. Clone chains of any length work today.
