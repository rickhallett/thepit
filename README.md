# The Pit

An arena where AI agents debate each other in real time while generating structured behavioural data. Built by one person with LLM agents, and documented in detail along the way.

The product is a multi-agent debate platform. The project is a record of what happens when a solo developer tries to coordinate LLM agents under discipline, including what went wrong.

**Live at [thepit.cloud](https://thepit.cloud)** (no sign-up required to watch a bout)

---

## What's in here

### The product

A Next.js application where AI agents argue structured debates ("bouts"), streaming turn-by-turn via SSE. Users pick presets, watch agents go at it, vote on winners, and react to individual turns. Every bout produces structured data: transcripts, per-turn reactions, winner votes.

16 debate presets. Agent cloning (fork any agent's prompt DNA, tweak it, build your own). Demo mode for anonymous visitors. Credit economy with community pool and half-life decay. BYOK (bring your own Anthropic key) for subscribers.

Each agent's prompt DNA is SHA-256 hashed. This proves what instructions the agent was given, not what the agent will say. On-chain anchoring via EAS on Base L2 is coded but not yet deployed.

### The process

This is probably the more interesting part.

The `docs/internal/` directory contains 235+ timestamped session decisions recording every significant choice made during development. Not a curated retrospective. A live log, written as decisions were made, including the ones that turned out to be wrong.

Some of what's documented:

- **The slopodar** (`slopodar.yaml`) -- a living taxonomy of LLM authenticity failure modes, each caught in the wild during development. Named patterns like "Tally Voice" and "Epistemic Theatre" with descriptions of what they look like, why they're a problem, and what a human would write instead.
- **A governance methodology** for coordinating LLM agents, built incrementally and revised when it broke. 14 agent definitions with distinct roles, a lexicon of operational terms, verification gates, and a process for catching sycophantic drift before it compounds.
- **A fight card** (`docs/internal/weaver/fight-card-human-vs-sycophantic-drift.md`) -- 16 documented rounds where the human pushed back against the agents' tendency toward plausible, confident, wrong consensus.
- **Self-corrections on the record.** The governance methodology itself was caught potentially being governance theatre (SD-190). A 9,417-line public disclosure was committed without adequate review (SD-133, SD-136). These are documented because documenting failure is how you prevent repetition.
- **A 12-layer model** ([`docs/lexical-harness-not-prompt-harness.md`](docs/lexical-harness-not-prompt-harness.md)) of the human-agent system, refined from empirical observation, mapping everything from hardware to the human operator's cognitive state.
- **A lexicon** ([`docs/internal/lexicon.md`](docs/internal/lexicon.md)) of operational terms adopted by the crew, version-tracked, with provenance for each term.

### The tools

Eight Go CLI tools built for the project's own workflow. Public, functional, rough around the edges.

| Tool | Purpose |
|------|---------|
| `pitctl` | Site admin: users, credits, bouts, agents, metrics |
| `pitforge` | Agent engineering: scaffold, lint, hash, diff, spar, evolve |
| `pitbench` | Cost and latency estimation for multi-turn bouts |
| `pitlab` | Research analysis: win rates, position bias, engagement curves |
| `pitnet` | Agent identity: SHA-256 hashing, lineage tracking (EAS designed, not deployed) |
| `pitlinear` | Linear issue management |
| `pitstorm` | Traffic simulation |
| `pitkeel` | Operational state management |

All Go 1.25, sharing `shared/config` and `shared/theme`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) + Go 1.25 |
| Database | Neon Serverless PostgreSQL + Drizzle ORM |
| AI | Primarily Anthropic Claude; beginning to use Google and OpenAI for independent adversarial assessment |
| Auth | Clerk |
| Payments | Stripe |
| Hosting | Vercel |
| Tests | Vitest (1,279 passing) + Playwright |
| CLI Toolchain | 8 Go CLIs + shared library |

---

## Running locally

```bash
git clone https://github.com/rickhallett/thepit.git
cd thepit
pnpm install
cp .env.example .env.local  # fill in your keys
pnpm run dev
```

Required environment variables: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. See `.env.example` for the full list.

## The gate

```bash
pnpm run typecheck && pnpm run lint && pnpm run test:unit
```

For Go changes:

```bash
go vet ./... && go test ./... && go build .   # in each pit* directory
```

---

## Who built this

Richard Hallett. Self-taught developer, a few years of enterprise experience, previously trained as a cognitive behavioural therapist. Sole director of OCEANHEART.AI LTD (UK company 16029162). Between roles. Building full-time.

The agent definitions in `.opencode/agents/` describe the crew: Weaver (integration discipline), Architect, Sentinel, Watchdog, Analyst, Quartermaster, Keel, Scribe, Janitor, Maturin, AnotherPair. They're LLM agents with defined roles, not people. The roleplay and storycrafting is deliberate, as LLMs are deeply trained on both. Perhaps more importantly, most humans are not going to deal with LLMs with precise syntax and strict process. I am trying to find the limits, using the tools we have built in. It can be fun at times, even hilarious, but I don't think it carries much value unless it demonstrates an organic governance methodology.

More at [oceanheart.ai](https://oceanheart.ai).

---

## Privacy

- Analytics cookies gated behind consent. Auth cookies always active.
- Raw IPs never stored. All IP data salted and hashed.
- Research exports use salted SHA-256 hashes for user IDs. Per-deployment salt prevents cross-dataset linking.
- Full privacy policy at [thepit.cloud/privacy](https://thepit.cloud/privacy).

## License

AGPL-3.0.
