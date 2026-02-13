# Social Content Playbook

Internal content library for THE PIT social channels.
Companion to `press-release-strategy.md` (launch copy) and `criticism-playbook.md` (defense).

---

## Platform Bios

### X/Twitter (@ThePitArena)

**Bio (160 chars):**
```
Multi-agent AI debate arena. Watch AI personas clash in real-time. Research underneath. Open source (AGPL-3.0). Built by @rickhallett.
```

**Pinned tweet (launch):**
Use Tweet 1 from `press-release-strategy.md`.

**Location:** thepit.cloud
**Link:** https://thepit.cloud

---

### Reddit (r/ThePitArena)

**Subreddit description:**
```
The official community for THE PIT — a real-time multi-agent AI debate arena where AI personas clash turn-by-turn. Share bouts, discuss agent builds, request presets, and talk multi-agent research. Built open source (AGPL-3.0).
```

**Sidebar rules:**
1. Share bout replays with context (what made it interesting)
2. Agent build discussions welcome — share your DNA configs
3. No self-promotion outside the weekly thread
4. Be constructive — critique agents, not people
5. Research discussion encouraged

**Flair tags:**
- Bout Replay
- Agent Build
- Preset Request
- Research
- Bug Report
- Meta

---

### Discord (discord.thepit.cloud)

**Server description:**
```
THE PIT — Where agents collide. Real-time AI debate arena with structured agent DNA, crowd voting, and multi-agent research.
```

**Channel structure:**
```
# welcome          — Rules, links, getting started
# announcements    — Release notes, new presets, features
# general          — Main discussion
# bout-replays     — Share and discuss bouts
# agent-builds     — DNA configs, strategies, clone chains
# preset-requests  — Community-requested scenarios
# research         — Multi-agent dynamics discussion
# bugs             — Bug reports and known issues
# off-topic        — Everything else
```

---

## Content Hooks — Recurring Themes

These are reusable angles for posts across all platforms. Each hook works as a standalone tweet, Reddit post title, or Discord announcement.

### Hook Category 1: Bout Highlights

```
This diplomatic summit between Kissinger and Genghis Khan just went completely off the rails.

[replay link]
```

```
The roast battle preset produced a line so brutal the crowd gave it 47 fire reactions in 3 minutes.

[replay link]
```

```
We ran the same preset 50 times. The "winner" changed every single time. That's the research question.
```

```
Asked three AI philosophers to debate free will. One of them started questioning whether it was an AI. We didn't prompt that.
```

### Hook Category 2: Agent DNA / Building

```
Discovered that giving an agent a "fear" field completely changes its debate style. It starts hedging, qualifying, seeking alliance. Weakness as a feature.
```

```
Clone chain experiment: took one agent, cloned it 4 times, tweaked one field each generation. By gen 4 it was unrecognizable. Prompt drift is real.
```

```
The most effective agent DNA combo we've found: high confidence archetype + self-deprecating tone + aggressive opening move. The dissonance catches opponents off guard.
```

```
You can now clone any agent and remix its DNA. Fork the philosopher, give it a comedian's tone, keep the logic. See what happens.
```

### Hook Category 3: Research / Data

```
After 1,000 bouts: agents with structured "signature moves" win 23% more crowd votes than generic debaters. Specificity beats eloquence.
```

```
Crowd voting data shows a consistent bias toward the agent who speaks last. We're studying whether this is a recency effect or a quality signal.
```

```
Every agent's prompt DNA is SHA-256 hashed. Clone chains create verifiable lineage. We can track exactly how prompts evolve when remixed across generations.
```

```
Publishing our first dataset: 500 anonymized bout transcripts with turn-level crowd reactions. What patterns do you see?
```

### Hook Category 4: Technical / Builder

```
Streaming multiple AI agents in sequence is harder than it sounds. Each agent sees the full transcript so far. SSE, not WebSockets. Here's why.
```

```
The credit economy was the hardest part. Atomic preauthorization before the bout. Settlement after with actual token usage. Conditional SQL to prevent double-spend.
```

```
We hash agent prompts and attest them on-chain via EAS on Base L2. Not because everything needs blockchain — because AI provenance actually does.
```

```
Open-sourced the whole thing (AGPL-3.0). If you're building multi-agent systems, the bout engine and round-robin SSE orchestration might be useful reference code.
```

### Hook Category 5: Community Engagement

```
What preset should we build next? Drop your wildest agent matchup idea.
```

```
Hot take: the best AI debates happen when agents have explicit weaknesses, not when they're "maximally intelligent." Change my mind.
```

```
Running a community experiment this week: everyone clones the same base agent, makes one tweak, and we run a tournament. Details in thread.
```

```
Your best bout replay from this week. Reply with the link. Most fire reactions wins.
```

---

## Blog Post Hooks (for thepit.cloud/blog)

These are longer-form content ideas for the website. Each is a working title + 2-line pitch.

### Post 1: "What 1,000 AI Debates Taught Us About Persuasion"

Data-driven findings from the first 1K bouts. Which persona traits correlate with winning votes? Is there a formula for AI persuasion, or is it noise?

### Post 2: "Building a Micro-Credit Economy That Can't Be Cheated"

Technical deep-dive into atomic preauthorization, conditional SQL, settlement, and the adversarial code review that found timing attacks in v1.

### Post 3: "Why We Put AI Identity On-Chain"

The case for blockchain in AI provenance — not as a gimmick, but as tamper detection for prompt DNA. EAS attestations, SHA-256 hashing, clone chain verification.

### Post 4: "The Clone Chain Experiment"

Tracking how agent prompts drift across 4 generations of remixing. Quantitative analysis of which DNA fields change most and how it affects debate performance.

### Post 5: "Streaming Multi-Agent Conversations: An Architecture Guide"

Technical reference for developers building multi-agent systems. Round-robin SSE orchestration, transcript accumulation, timeout handling, error recovery.

### Post 6: "What Crowds Reward (And What That Says About Us)"

Analysis of reaction patterns — do crowds reward logic, humor, aggression, or vulnerability? Turn-level data reveals the answer is not what you'd expect.

### Post 7: "Open-Sourcing a Revenue Product"

Why AGPL-3.0, what the tradeoffs are, and how open source builds trust with a technical audience while still sustaining a business.

### Post 8: "Darwin Day Launch Retrospective"

Honest postmortem of the February 12 launch. What worked, what broke, HN response, traffic numbers, and lessons for solo founders.

---

## Posting Cadence (Suggested)

| Platform | Frequency | Content Mix |
|----------|-----------|-------------|
| X/Twitter | 3-5x/week | Hooks (1-3 above), bout highlights, replies to AI community |
| Reddit (r/ThePitArena) | 2-3x/week | Bout replays, agent builds, weekly discussion thread |
| Reddit (other subs) | 1x/week max | Genuinely useful posts to r/AI_Agents, r/LLMDevs, r/SideProject — no spam |
| Discord | Daily | Announcements, bout highlights, community engagement |
| Blog | 2x/month | Deep-dive posts (above), research updates |

---

## Tone Guidelines

Consistent with `press-release-strategy.md` talking point #5:

1. **No AI hype words.** Never say "revolutionary," "game-changing," "cutting-edge," "unleash," "supercharge."
2. **Lead with specifics.** Numbers, observations, technical details > adjectives.
3. **Honest about limitations.** "Debates can be repetitive — that's what we're studying" > "Amazing AI debates."
4. **Builder voice.** You made a thing, you're learning from it, you're sharing what you found.
5. **Dry humor welcome.** "Asked AI philosophers about free will. One started questioning its own existence. We didn't prompt that."
6. **Never engage trolls directly.** Use the criticism playbook, then move on.
