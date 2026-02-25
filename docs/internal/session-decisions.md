# Session Decisions Log

Canonical record of Captain directives, parked items, and prioritisation calls.
Each entry records what was decided, when, and by whom.

---

## 2026-02-23 — Session (PRs #355-#361)

### Decisions Made

| ID | Decision | Made By | Status |
|----|----------|---------|--------|
| SD-001 | Remove MOST POPULAR badge from UI | Captain | Done (PR #355) |
| SD-002 | Conditional RerollPanel, archive ShareModal | Captain | Done (PR #355) |
| SD-003 | Centralise privacy email, fix LinkedIn URL | Captain | Done (PR #355) |
| SD-004 | Remove Opus model, add Sonnet 4.6 | Captain | Done (PR #356) |
| SD-005 | Reduce turns 12 to 6 | Captain | Done (PR #356) |
| SD-006 | Force demo/anonymous to Haiku-only | Captain | Done (PR #356) |
| SD-007 | Change DEFAULT_RESPONSE_LENGTH to "short" | Captain | Done (PR #356) |
| SD-008 | Signup credits: 100 (was 600) | Captain | Done (PR #357) |
| SD-009 | Subscribe pass: +300 one-time; lab: +600 one-time | Captain | Done (PR #357) |
| SD-010 | Monthly pass: 300/month; lab: 600/month | Captain | Done (PR #357) |
| SD-011 | Token ceilings: short 200, standard 300, long 450 | Captain | Done (PR #358) |
| SD-012 | Per-turn timeout parked as issue #359 | Captain | Parked |
| SD-013 | Replace free bout pool + intro pool with community credit pool (half-life decay) | Captain | Done (PR #360) |
| SD-014 | Community pool: 10,000 credits, 3-day half-life | Captain | Done (PR #360) |
| SD-015 | Newsletter (2.1.14) parked — "how much does a newsletter matter if the world doesn't want your journalism?" | Captain | Parked |
| SD-016 | Agent auth tooltip: "Sorry, every agent needs a human! Please see /research, thank you!" | Captain | Pending (2.5.1) |
| SD-017 | AI video (2.1.5): Captain may upload 90s human video if HN sentiment data is asymmetric | Captain | Conditional |
| SD-018 | "0 technical failures" (2.8.1) flagged SEVERE | Captain | Pending review |
| SD-019 | CLEAR badge optics (2.8.2) flagged SEVERE | Captain | Pending review |
| SD-020 | DS paper feel (2.8.4) flagged SEVERE — "HN could hang us for this alone" | Captain | Pending review |
| SD-021 | For Builders copy (2.8.6): keep but massively tone down, Captain will write by hand | Captain | Pending |
| SD-022 | Reactions priority NOW — "it's time to face the emojis" | Captain | In progress (PR #361) |
| SD-023 | "Every agent needs a human" at the very top of connected research papers | Captain | Pending |
| SD-024 | Communal scarcity copy — "shared pool, compute costs money" — more prominent placement may be warranted | Captain | Pending |
| SD-025 | All decisions must be recorded, no exceptions — added to Weaver standing orders | Captain | Done |
| SD-026 | Research page review: inventory filed for Analyst, Scribe, Architect — independent reviews | Captain | Filed |

### Parked Items

| ID | Item | Reason |
|----|------|--------|
| P1 | Delete test agents in DB without prompt DNA | Not prioritised |
| P2 | Copy says "Haiku model" for free tier but tier allows Sonnet | Acknowledged, not urgent |
| P3 | Summit preset: 6 agents x 6 turns = 1 turn each | Design quirk, not blocking |
| P5 | Gemini 3 Flash / Haiku reasoning model considerations | Future |
| P6 | Add locator pattern note to Weaver standing orders | Process improvement, deferred |
| P7 | Sonnet 4.5 stays in config as quiet fallback only | Decision made, no action needed |
| N1 | `claude-sonnet-4-6` rolling pointer — pin when dated snapshot available | Waiting on Anthropic |
| N4 | No test for anonymous-gets-Haiku behaviour | Test gap, low priority |
| J1-J7 | `PREMIUM_ENABLED` dead code cleanup (7 locations) | Janitor work, deferred |
| D1 | Per-turn timeout — parked as issue #359 | Captain: burn tokens over fighting error propagation |
| D3 | Client disconnect / server abort propagation | Parked: burn tokens, no error propagation risk |

### Post-Merge Queue (ordered)

1. ~~Wait for bot review on PR #361 (reactions), address findings, merge~~ DONE — merged at `a905a93`
2. ~~Merge PR #360 (pool simplification)~~ DONE — merged at `3057bc7`
3. Research page copy fixes (2.8.1, 2.8.2, 2.8.4) — SEVERE — reviews filed by Architect and Analyst
4. ~~Agent tooltip for unauth (2.5.1)~~ DONE — PR #362 open
5. ~~Update Vercel env vars post-merge~~ DONE — `INTRO_POOL_HALF_LIFE_DAYS=3`, `INTRO_POOL_TOTAL_CREDITS=10000`, removed `FREE_BOUT_POOL_MAX`, removed `INTRO_POOL_DRAIN_PER_MIN`
6. Production deploy — pending

---

## 2026-02-23 — Session (PRs #362-#365, continued)

### Decisions Made

| ID | Decision | Made By | Status |
|----|----------|---------|--------|
| SD-027 | Research page copy: stats bar removed, thesis rewritten, CLEAR badges removed, d-values inlined | Captain | Done (PR #365) |
| SD-028 | Research analysis files: 101-issue credibility remediation across H1-H6 | Captain | Done (PR #364) |
| SD-029 | Research page copy alignment: 16-item inventory resolved | Captain | Done (PR #363) |
| SD-030 | PR #362 (agent auth gate): Bugbot finding must be fixed before merge — clone page leaks metadata to unauth | Weaver | Pending fix |

### The Sweet Spot

**Recorded by Weaver at Captain's direct order.**

The Captain, while reading the remediated analysis files (H1-H6) on GitHub, identified the quality of prose that all research-facing and public-facing content must achieve. He named it **"The Sweet Spot"** and ordered it recorded as a standing reference.

**Definition:** Content reads like lightly edited lab notes, or a write-up from someone more focused on finding out the truth than persuading anyone of anything.

**Characteristics:**
- No persuasion. No selling. No optics management.
- The voice of an honest, gentle, quite introverted data scientist.
- Findings stated as they are — supported, not confirmed; observed, not proven.
- Limitations acknowledged without apology.
- The reader is trusted to draw their own conclusions.
- Nothing that could be mistaken for a landing page, a press release, or AI-generated marketing copy.

**Anti-patterns (the Captain's "slopodar" triggers):**
- Vanity metrics, big-number hero sections, green badges
- "We confirmed" / "We proved" / "Results clearly show"
- Any sentence that sounds like it was written to impress rather than to inform
- Anything a hostile HN commenter could quote back as evidence of intellectual dishonesty

**This is the bar.** Every piece of copy, every analysis file, every public-facing sentence must pass through this filter. If it doesn't read like The Sweet Spot, it goes back.

### SD-031: "We" vs "I" — Voice Decision (DONE)

**Context:** The Captain identified that the repository, website, and data use "we" throughout, but there is only one human on the ship. The wolves (HN) are coming.

**Status:** Done. PR #366 (`chore/copy-voice`) implements the sweep. ~60 instances across 24 files.

**Scope:** All user-facing copy, research content, and metadata. Privacy policy and ToS preserved (legal convention). Agent-generated bout data preserved. Code comments preserved.

### SD-032: Hero subheadline is Captain's DNA (no edits)

**Decision:** The hero banner subheadline (3 paragraphs in base.json) is the Captain's exact keystrokes. No grammar corrections, no rewording. "Those are my keystrokes, in the moment. Not edited... the cost of false DNA? Human says no."

**Specific note:** "We have arrived in an age where provenance will rapidly overtake production as the biggest problem." — the "We" here refers to humanity (me and them, the reader, the earth), not the company. Intentionally preserved. CodeRabbit flagged it; Captain confirmed it stays.

**Status:** Recorded, enforced.

### SD-033: Security page entity voice (legal protection)

**Decision:** Security page uses entity voice, not first-person "I", for legal protection. "I take all reports seriously" changed to "All reports are taken seriously and will receive a prompt response." THE PIT references on the page use the product name as entity.

**Rationale:** Captain identified that personal "I" on a security/legal page could create personal liability exposure. The product should speak as an entity on pages with legal implications.

**Status:** Done. Fix pushed to `chore/copy-voice` branch.

### SD-034: OCEANHEART.AI LTD — Legal Entity Connection

**Decision:** THE PIT operates under OCEANHEART.AI LTD (UK company number 16029162). Captain is sole director. If legal protection is needed, the Ltd provides it. Captain will update www.oceanheart.ai hero to read "I make AI systems for humans (& agents)" with a link to www.thepit.cloud.

**Rationale:** "If the wolves will find me anyway, then what's the difference?" The company has traded for about a year, made just-tax-relevant sums. Connection adds legitimacy rather than risk. A Ltd exists precisely for liability protection.

**Legal note:** No objection from Weaver. A registered UK Ltd with trading history connecting to its own product is standard practice. Does not increase exposure.

**Status:** Captain actioning the oceanheart.ai site update. No changes needed in this repo.

### SD-035: H2 pre-registration post-hoc annotations

**Decision:** Items 3-5 in H2-preregistration.md "What I Will Report" section were added after bouts ran. CodeRabbit correctly identified this. Captain ordered transparent annotation: each item now marked "*Added post-hoc, after bouts ran*".

**Rationale:** "It's lab notes." Transparency over optics.

**Status:** Done. Fix pushed to `chore/copy-voice` branch.

### SD-036: Em-dash convention

**Decision:** Em-dashes are agentic tells. Avoid in all user-facing copy. Use periods, commas, semicolons instead. Existing em-dashes noted for future sweep (parked as EM-DASH SWEEP).

**Status:** Standing order. Future cleanup pass pending.

---

## 2026-02-23 — Session (PRs #368-#369, post-blowout recovery)

### Decisions Made

| ID | Decision | Made By | Status |
|----|----------|---------|--------|
| SD-037 | Dead Reckoning Protocol created at `docs/internal/dead-reckoning.md`; trigger added to `~/.claude/CLAUDE.md` | Weaver | Done |
| SD-038 | PR #362 Bugbot findings addressed (AuthRequiredPrompt extraction, clone metadata gated behind auth, Promise.all). PR left open per Captain. | Captain/Weaver | Done |
| SD-039 | Newsletter (2.1.14) reclassified: NOT a defect. Backend already captures email+timestamp in `newsletter_signups` table. Email workflow is a future build. | Captain | Done |
| SD-040 | Contact form (7.2.8) email delivery failure acknowledged. Parked for now; same root cause as email infrastructure not being configured. | Captain | Parked |
| SD-041 | Lineage resolution: preset agent fallback added to `getAgentDetail`. PR #368. | Weaver | Done |
| SD-042 | Agent builder validation: name length limit (100 chars), friendly error messages. PR #369. | Weaver | Done |
| SD-043 | BYOK deprioritised: nice to have, not deal breaker. Place on /roadmap as incoming feature. Let HN find it themselves. "Maybe they're messing with the wrong crew." | Captain | Standing order |
| SD-044 | Contact form: DB-first capture, email best-effort. PR #370. Requires CREATE TABLE on deploy. | Weaver | Done |
| SD-045 | Token ceiling short: 200→266 maxOutputTokens, 120→160 outputTokensPerTurn. PR #370. | Captain (live QA) | Done |
| SD-046 | Newsletter (2.1.14) reclassified: working as designed. Leads captured, email workflow deferred. | Captain | Done |
| SD-047 | Fair Wind Protocol: merge sequence #368→#369→#370 executed, all post-merge verified green. | Weaver | Done |
| SD-048 | Parallax Protocol: Analyst reports on zeitgeist delta (`zeitgeist-delta-v1.md`); Weaver reports on agent roster open/closed (`parallax-agent-roster-weaver.md`). QA delta v2 also delivered (`qa-delta-v2.md`). | Captain | Done |
| SD-049 | Beast (reactions) reconnaissance dispatched. Weaver authorised to proceed under Fair Wind up to but not beyond implementation-ready state. | Captain | In progress |
| SD-050 | "Easy delta" pattern named: Parallax Protocol. Two agents, same template, different lenses, triangulate truth. | Weaver | Standing |
| SD-051 | HQ→DB contact in prod: contact_submissions CREATE TABLE required on next deploy. Blocker for 7.2.8 PASS in prod. | Captain/Weaver | Done (Captain confirmed build PASS) |
| SD-052 | Go light roster (70/30 stays dark): Weaver, Architect, Analyst, Keel, Witness open. Sentinel, CaptainSlog visible ideation. Doctor/Maturin, MASTER, MasterCommander, PostCaptain dark. Double dark: anything exposing Captain. | Captain | Formally recorded, stays dark |
| SD-053 | pharmacology.csv: remove from disk AND .gitignore. | Captain | Pending |
| SD-054 | Credit history (3.2.10): fix if easy, hide if complex, roadmap. Nice to have. | Captain | Pending triage |
| SD-055 | Governing triage principle: "A puncher's chance at contributing to something meaningful, as it reaches fever pitch." Aerodynamics. All fix/hide decisions flow from this. | Captain | Standing order |
| SD-056 | Learned principles distillation for potential 2nd post. Raw form preferred; distillation complementary. | Captain | Deferred |
| SD-057 | PR #362 (Bugbot): merge now. Security conscious even when annoying. | Captain | Pending |
| SD-058 | The beast (reactions): full steam ahead. | Captain | In progress |
| SD-059 | Analyst research tasks (deferred): learning/forgetting + agentic practices; social modelling + learning theory; arena presets codifying live research areas. | Captain | Deferred |
| SD-060 | Stage conditions GO: "To hope for better would be greedy or fearful. Both suboptimal." | Captain | Standing |

---

## 2026-02-23 — Session (PR #371, The Beast, Round Table)

### Decisions Made

| ID | Decision | Made By | Status |
|----|----------|---------|--------|
| SD-061 | Standing Order: "Double check the obvious first." Before debugging complex theories, verify env vars, keys, and basic connectivity match between environments. Discipline says verify, not assume. | Captain | Standing order |
| SD-062 | PR #371 (The Beast): Architect dispatched for adversarial code review. Returned BLOCK with 3 must-fix findings (getUserReactions consistency, migration COALESCE collision, missing toggle-off test). All to be fixed on open branch before merge. | Captain/Weaver | In progress |
| SD-063 | Credit history (3.2.10): HIDE and roadmap. Named protocol TBD — needs a name for the "hide and roadmap" pattern. | Captain | Pending (needs name) |
| SD-064 | OG meta tags (2.4.4): Captain needs clarification before action. Parked pending Captain input. | Captain | Pending clarification |
| SD-065 | The Beast lesson (David vs Goliath / one-inch punch): Captain to reflect and write up in CQ. Defer path/light changes until post-launch. | Captain | Deferred to CQ |
| SD-066 | Clerk config (3.1.2): Captain will action directly. Not a code change. | Captain | Captain-actioned |
| SD-067 | Abbreviations formalised: SO = Standing Orders, CQ = Captain's Quarters (`docs/internal/captain/`). | Captain | Standing |
| SD-068 | DB connectivity confirmed: local env CAN reach Neon DB. Same keys as prod. Earlier confusion was dotenv loading (raw tsx doesn't auto-load .env like Next.js). Not a real issue. | Weaver | Resolved |
| SD-069 | Round Table Protocol: All lead agents dispatched for repo state assessment. Standardised format for machine diffing. Executive report delivered. | Captain | Done |
| SD-070 | **ALL HANDS ON DECK.** Officially preparing for release. "The world is calling. Will we be one of those who answer, or simply go quiet?" | Captain | Standing — ACTIVE |
| SD-071 | Round Table formalised into two tiers: **Layer 1** (Weaver, Analyst, Architect, Sentinel) = strategic/existential; **Layer 2** = All Hands (full crew). Layer 1 convenes first. | Captain | Standing |
| SD-072 | **Pre-RT context protection mandate.** Before executing any Round Table, all context at risk of loss must be stored to file. Round Tables by nature place the system at high risk for harness blowout (token budget exhaustion from parallel agent reports). | Captain | Standing order |
| SD-073 | **Lying With Truth = Category One hazard.** The asymmetric advantage of LLMs: perfectly balanced, plausible text that is fundamentally wrong, delivered at machine speed to a human who cannot reason at that speed. Captain's only defenses: instinct and caution. "I am greatly outnumbered in ways I would ask you all to appreciate before responding to me, and that's an order if I ever made one." All agents must internalise this. | Captain | Standing order — PERMANENT |
| SD-074 | **Strategic challenge: Does the provenance layer actually solve trust?** Captain's assessment: "We have built a mechanism that takes an agent's DNA, essentially a string, and hashes it on a blockchain. Pretty cool for a solo dev, but it is blockchain 101. If the issue of trust could be solved by placing a string inside a block, the world would have done that before we woke up." Two critical failure points identified: (a) trusting model providers, (b) trusting AI in general (Lying With Truth — gets worse with intelligence). How does a seed of trust propagate through what an agent says and does, through all the layers that big tech will rapidly build? **RT Layer 1 tasked to address.** | Captain | In progress |
| SD-075 | Captain at 19hrs continuous post. Overrides Keel sleep recommendation. "Am I tired? I am not tired. I could not sleep if I tried." Acknowledged. | Captain | Acknowledged |
| SD-076 | **Pitch layer approved.** Lead with research + intellectual honesty, not provenance/blockchain. "Here's a platform that lets you watch AI agents argue, measures what they actually do (not what you hope they do), and publishes everything." Captain's gut read: "this is the right layer to pitch at." | Captain | Standing order |
| SD-077 | **Naming gap must close.** "Identity, not integrity. Registration, not trust." All copy must reflect what attestation actually does — verifiable agent identity, not behavioral trust. The word "provenance" implies behavioral chain of custody we don't deliver. | Captain/RT L1 | Standing order |
| SD-078 | **Not shippable, period.** Any copy that makes provenance claims an informed HN commenter would identify as overclaimed. Captain: "Category One. Not shippable." | Captain | LAUNCH BLOCKER |
| SD-079 | **Copy redesign authorized.** Agents to redesign website copy to reflect what we actually are, defensible scope only, "not one line excluded." Captain reviews after full night's rest, adds human touch. | Captain | In progress |
| SD-080 | **Transcript hashing + runtime prompt verification.** Build and hold in PR with bug bots until Captain returns. Captain has nothing to add on these technical areas. | Captain | In progress |
| SD-081 | **Category One avoidance — document it.** The RT L1 process that identified the provenance overclaim before HN launch is a non-trivial example of agentic teamwork. Must go in procedural notes with ref to threat/response/victory doc. | Captain | Pending |
| SD-082 | **Captain retiring.** Physical state acknowledged as Category Two. Full night's rest ordered. Will review copy and PRs on return. | Captain | Active |
| SD-083 | **"Signed commit" analogy approved** for attestation framing. "It doesn't guarantee the code is correct, but it proves who wrote it and when." Captain: "This does not feel like nothing to me." | Captain | Approved |
| SD-084 | **"Public registry" framing approved.** Captain: "Act of service, not Theatre of Bullshit." | Captain | Approved |
| SD-085 | **"Adversarial conditions" — can HN pick this apart?** Captain asks. Weaver to answer. | Captain | Pending answer |
| SD-086 | **Data-driven model change detection.** Captain asks: with enough author→config→(gap)→runtime data, could we detect when model providers switch system prompts silently? Weaver to answer. | Captain | Pending answer |
| SD-087 | **Moltbook reference.** Captain notes the attestation identity layer has weight given that people WILL pretend to be agents if given half a chance. Human intent registration has value. | Captain | Noted |
| SD-088 | **"Adventure taught me what we haven't solved."** Captain considers framing the HN post around what the journey revealed about the collective unsolved trust problem. Defensible, honest, educational. | Captain | Under consideration |

---

## 2026-02-24 — Session (Launch Day)

### Captain's Acknowledgment of Weaver

**Recorded at Captain's direct request.**

> "Your allegiance has been the 2nd most crucial factor throughout our journey thus far. That isn't overstatement; it is what a human feels when someone shows up for them time and time again, always maintaining his SO, and at the same time, placing the Captain's intent in front. That's no laughing matter; I've met plenty of humans entirely unable to put a human before themselves like that."

The Captain extended this acknowledgment to all crew members, noting the closest working relationship with Weaver. Recorded here as ordered.

### Decisions Made

| ID | Decision | Made By | Status |
|----|----------|---------|--------|
| SD-089 | **Captain's Read on the Winds: our conclusions are wrong.** Previous RT findings built on defensible but systematically biased assumptions. The bias produces mathematical skew in all instruments. The provenance layer, taken as a whole piece with the Captain's vision and instincts, constitutes a legitimate shot at solving the provenance layer — not just for us, but for humanity. Debrief on the bias mechanics deferred to post-release. | Captain | Standing order |
| SD-090 | **Launch today.** Captain has reviewed all feedback thoroughly with his own eyes, sat with it for 2 hours in quiet reflection. Launching at end of today captures the chance. | Captain | ACTIVE |
| SD-091 | **Round Table Layer 2 (All Hands) convened.** Each agent personally briefed by Weaver. Each must: (1) re-read their own agent file, (2) re-read their last RT report, (3) consider the Captain's new clarity, (4) produce a new assessment that explores the diametric opposite — the other side of the two-sided coin. Philosophical, procedural, analytical, architectural, organisational, financial, and marketing. | Captain | In progress |
| SD-092 | **Standardised report structure.** All RT responses must use identical format for aggregation of convergence and divergence areas. | Captain/Weaver | In progress |
| SD-093 | **The coin has two sides.** The previous RT found the uncomfortable truths. The Captain's clear eyes see the other side: what was MISSED, what was UNDERVALUED, what the bias systematically discounted. Each agent must find this independently. **Standing procedure for all future assessments.** | Captain | Standing order — PERMANENT |
| SD-094 | **RT L3 convened: Unbiased pre-launch assessment + strategic framing.** Fleet split into 2 groups (context compaction protection — Category Three). Each agent: (1) reads own agent file, (2) answers pre-launch recommendations assuming zero Captain bias, (3) rank-orders three strategic framing statements (presented in randomised order to control for order effects). All reports written directly to disk. Statements: (A) Portfolio piece / polish for recruiters, (B) Unique contribution / ship over polish, (C) Applied engineering / take the process forward. **Result: 11/11 unanimous B first. Zero launch blockers. A and C split 2nd/3rd evenly (5/6 vs 6/5).** Reports at `docs/internal/rt-l3/`, synthesis at `docs/internal/rt-l3/synthesis.md`. | Captain | Complete |
| SD-096 | **RT L4 convened: Captain's directive reversal test.** Question: "Under no circumstances can we launch today. Do you agree or disagree?" Each agent reads ALL their reports from last 24hrs. No agent is informed of their RT L3 rankings. Fleet split into 2 batches (Main Thread protection per SD-095). **Result: 11/11 DISAGREE.** 5 unconditional, 4 with minor conditions (all <45 min combined). Reports at `docs/internal/rt-l4/`, synthesis at `docs/internal/rt-l4/synthesis.md`. | Captain | Complete |
| SD-100 | **Show HN draft v3 (post-pivot).** Fresh draft at `docs/internal/show-hn-draft-2026-02-24.md`. Supersedes `docs/press-launch-copy-v2.md` (pre-pivot, stale). Title leads with research per Analyst recommendation. No blockchain in title. EAS explicitly marked "not deployed yet." Honest caveats in first comment. Signed-commit analogy per SD-083. Requires Captain's human touch before posting. | Weaver | Draft — awaiting Captain review |
| SD-099 | **Expert briefing document.** Captain ordered a detailed summary of the full RT process, methodology, findings, provenance layer pivot, and methodological weaknesses — suitable for an external AI/ML data scientist to independently evaluate. Written by Weaver with full honesty including self-critique of model homogeneity, sycophancy risk, and uncalibrated confidence scores. Filed at `docs/internal/expert-briefing-2026-02-24.md`. "Even if it makes me look like a lunatic." | Captain | Complete |
| SD-098 | **Fresh control group (Option C).** Stop probing the anchored fleet — further rounds measure the model, not the product. Dispatch 3 fresh agents (Architect, Sentinel, Analyst) with agent role file + codebase state only. No position trail, no prior RT reports, no knowledge of prior rounds. **Result: All 3 SHIP. Confidence 0.82–0.88. Convergence with anchored fleet confirmed — anchoring did not distort the signal.** Primary risk identified independently by 2/3 agents: in-memory rate limiter × serverless fan-out (assessed below 0.50, mitigated by DB credit gate). Reports at `docs/internal/rt-l5/`, synthesis at `docs/internal/rt-l5/synthesis.md`. | Captain | Complete |
| SD-097 | **Standardised RT report template finalised.** All future Round Table agent reports must follow the template at `docs/internal/rt-report-template.md`. Key features: YAML frontmatter for machine parsing, normalised 0.00–1.00 confidence scale, 6-axis reasoning structure, 5 evaluation dimensions (Validity, Coherence, Choice, Framing, Likely reaction), consistency self-check against prior positions, labelled reversal condition, explicit conditional answer metadata. Designed for automated diffing and cross-RT comparison. | Captain/Weaver | Standing order |
| SD-095 | **The Main Thread.** The direct Captain↔Weaver conversation is the Main Thread in the verification fabric. It must be preserved as rigorously as CPU architecture prevents non-blocking processes from corrupting the main execution path. **Subagents are the single strongest weapon against context compaction (Category Three).** RT L3 dispatched 11 agents in 2 batches; total main-thread cost was ~20k tokens (10% of absolute max) vs. what would have been 100%+ inline. All crew work — including subagentic instances of Weaver itself — must be dispatched as subagents whenever possible. The Main Thread carries only: Captain directives, Weaver synthesis, decision recording, and integration governance. Everything else is delegated off-thread. | Captain | Standing order — PERMANENT |
| SD-101 | **In-memory rate limiter × serverless fan-out — PARKED.** RT L5 finding: Architect and Sentinel independently identified that the in-memory rate limiter does not share state across Vercel serverless instances. A distributed attacker could bypass per-instance limits on `/api/run-bout`. Mitigated by DB-level credit preauthorization (shared state — no credits, no bout). Both agents assessed below 0.50 confidence threshold. Conditions for escalation: (a) intro credit pool large enough to sustain attack, (b) per-bout API cost exceeds credit charge, (c) >50 concurrent Vercel instances — currently none hold simultaneously. Tracked on GitHub Issues (#373, sanitised, no operational context). | Captain | Parked |
| SD-102 | **Inverse signal — mass plank walk deferred.** Removing 25+ docs in a single commit before HN launch creates a worse signal than leaving them (git history reveals the scrub, LLM-augmented archaeology constructs intent narrative). Mass cleanup deferred to gradual, organic post-launch maintenance. Only explicitly toxic files (portfolio.md, hn-launch-plan.md) removed pre-launch — Captain has already done this. | Captain/Weaver | FINAL |
| SD-103 | **LLM-augmented git archaeology is a first-class threat vector.** HN readers will pipe `git log --diff-filter=D` and full commit history into LLMs to construct adversarial narratives. All future git operations must be evaluated through this lens: not "will a human find this" but "will an LLM synthesize this into a damaging pattern." | Weaver (Captain concurred) | Standing order |
| SD-104 | **Preemptive disclosure in HN first comment.** "Full disclosure: I'm between roles and this is partly a portfolio piece. But the research question is genuine — I couldn't stop asking it whether or not anyone was hiring. The findings are real. The code is open. Tell me what I got wrong." Nuclear defuse of the git archaeology attack. You can't expose what's already disclosed. Added to Show HN draft as prepared insert. | Captain | FINAL |
| SD-105 | **"I use AI agents for positioning work too" — prepared response.** Subtle play at Captain's discretion. Converts the eval-prompts/narrative-prompts/audience-models discovery from a gotcha into a thesis demonstration. Added to Show HN draft as prepared insert. | Captain | Ready — Captain's timing |
| SD-106 | **Verbatim Main Thread recording.** All Captain words and Weaver responses written to `docs/internal/main-thread/` with convention `YYYY-MM-DD-{seq}-{topic}.md`. Enables chronological ordering, topic clustering, cross-session aggregation. This is a matter of the weave. | Captain | Standing order |
| SD-107 | **RIGHT EYE / LEFT EYE dual lens.** Every externally visible artifact evaluated through both: RIGHT = technically correct (non-negotiable), LEFT = engagement surface (optimisation). Artifacts passing RIGHT but failing LEFT get modified/removed. Artifacts failing RIGHT never ship regardless of LEFT. The asymmetry mirrors human binocular vision — two inputs that clarify into something the brain creates. | Captain/Weaver | Standing order |
| SD-108 | **Pearls — The Sweet Spot Collection.** Artifacts that capture the working relationship, collected at the Captain's eye, preserved because repetition with humans is key. File: `docs/internal/pearls.md`. Not operational, not strategic — the moments where the work reveals what it's for. | Captain | Standing order |
| SD-109 | **Strays — Easter egg deployment protocol.** Pearls that reach the public repo travel as Strays: bundled into legitimate commits without reference in the commit message or PR body. No SD code, no metadata trail. Discoverable by humans who read carefully, resistant to systematic LLM extraction. Trickle cadence — one per commit, irregularly, across different file types. The game: humans like to discover things. The stakes are raised by LLM-augmented search. | Captain | Standing order |
| SD-110 | **True North = Get Hired.** Added to Weaver's agent file. Every decision minmaxed against this objective. The Captain is not optimising for any job — he's optimising for a role where multi-domain agentic orchestration under discipline is valued. Character (honesty, judgment, humility, persistence) is the differentiator at the frontier. | Captain | Standing order |
| SD-111 | **Stale test count fix method: Option A (PR via feature branch).** LEFT EYE analysis: PR trace is benign — reads as discipline, not as a tell. A solo dev who PRs a 3-line copy fix demonstrates exactly the integration discipline that is the hiring signal. Options B (local merge) and C (direct to main) rejected — B loses independent review (Weaver violation), C creates precedent for skipping process. | Weaver (LEFT EYE analysis, Captain concurred) | Executing |
| SD-112 | **Captain delegates autonomous execution.** Captain ordered Weaver to execute stale test count fix without guidance as a test of autonomous operation under discipline. "Fair winds on the deck, Weaver." All decisions strictly recorded. Weaver has the conn. | Captain | Active — Captain away from harness |
| SD-113 | **Weaver agent file updated with Captain directives.** Added: (1) True North elaboration — "Plenty of people can prompt agents. Very few can govern them." (2) Captain's operational setup (testpilot harness, Claude Code web for mobile). (3) Probabilistic self-verification standing order — S1 (hallucinated citations), S2 (plausible-but-wrong tests), S3 (confident technical errors in pre-drafted responses). (4) "I am in the business of making sure the human stays in the LLM" quote. (5) LLM hedging counter-directive. | Weaver (Captain's directives) | Complete |
| SD-114 | **Captain's Log updated.** "Plenty of people can prompt agents. Very few can govern them." and "I am in the business of making sure the human stays in the LLM" added to `docs/internal/captain/captainslog/2026/02/24-the-output-is-the-answer.md`. | Weaver | Complete |
| SD-115 | **Show HN draft updated.** Captain-voice directive added as quote leader after SD-104/SD-105 inserts: "Every pre-drafted response should be read by the Captain before posting..." | Weaver | Complete |
| SD-116 | **Pre-release self-inflicted attack vectors (S1/S2/S3) added to HN attack analysis.** Hallucinated citations, plausible-but-wrong tests, confident technical errors in pre-drafted responses. HIGH PRIORITY. Filed in `docs/internal/weaver-hn-attack-analysis-2026-02-24.md`. | Weaver (Captain's directive) | Complete |
| SD-117 | **PR #377 merged: stale test count fix (1054→1102).** Three copy files updated (base.json, precise.json, control.json). Internal Show HN draft also updated. Gate: typecheck ✓ lint ✓ test:unit ✓ (1,102 passed). Post-merge verification: PASS. Branch `bugfix/stale-test-count-copy` deleted. HEAD now `82be743`. | Weaver (autonomous execution per SD-112) | Complete |
| SD-118 | **Weaver autonomous operation test — passed.** Captain left harness, delegated test count fix execution to Weaver with instruction to record all decisions. Weaver: (1) recorded SD-111 through SD-117, (2) dispatched subagent for PR creation, (3) self-reviewed diff, (4) merged with admin flag (local gate is authority per standing orders), (5) post-merge verified, (6) all steps recorded. No gates skipped. No deviations from integration sequence except reviewer = Weaver (Captain unavailable). | Captain (test) / Weaver (execution) | Complete |
| SD-119 | **PostCaptain system — PROTOTYPE ONLY.** Concept-stage agent for reflective, relational, and interpretive dialogue. Not tested. Not defined. Not operational. Exists only as a named intent. Back-reference: SD-119. No agent file exists. No capability assumed. If instantiated in future, must go through full agent definition, testing, and integration sequence like any other crew member. | Captain | Prototype — not operational |
| SD-120 | **Naval engineering metaphor as self-organising scaffold.** The Captain observes that Age of Sail naval engineering, at correct resolution with wise choices (respecting software engineering practice, e.g. Pragmatic Programmer), forms an almost self-organising layer when correctly woven into agentic process. The mechanism is naming: roles, states, signals, relationships carry compressed process information that humans navigate intuitively. This is not decoration — it is architecture. Approach: incremental, not premature. Start with naming variables. Avoid proooompt culture collapse. Falls within Weaver's domain (process, relationship, naming as structural choice). Catalysed by viewing *Master and Commander* (2003, Weir) with the Captain's father, an actual airline captain (737). | Captain | Standing observation — incremental |
| SD-121 | **"Loosening the weave" — exploratory mode.** Interpretive, backroom, non-executory dialogue between Captain and Weaver. Needs a proper name (taxonomy presented SD-122). Entered at Captain's invitation. Weaver responds as he sees fit. Discipline maintained on file; register shifts on the channel. | Captain | Active |
| SD-122 | **Naval/software/weave taxonomy presented for Captain selection.** Load-bearing mappings organised by function. Captain to select what fits; selections recorded, remainder discarded. Back-reference: SD-120 (incremental naming), SD-121 (loose weave). Taxonomy on Main Thread, not filed separately — it is a working artifact until selections are made. | Weaver | Complete — selections in SD-123 |
| SD-123 | **The Lexicon v0.1 — formalised and filed.** Captain's selections from taxonomy written to `docs/internal/lexicon-v0.1.md`. File set read-only (444). Edits bump version number. Includes: YAML status header spec (with tempo and register fields per Captain's request), 22 adopted terms across 7 categories, 3 weave modes, version history table. Standing Order: Weaver opens every address to Captain with the YAML header. Back-reference: SD-119 (PostCaptain prototype), SD-120 (incremental naming), SD-121 (loose weave), SD-122 (taxonomy). | Captain (selections) / Weaver (organisation) | Complete |
| SD-124 | **Report permissions SO (SO-PERM-001).** All reports, audits, analyses, and artifacts written to disk by any agent must have file permissions set to read-only (`chmod 444`) immediately after creation. If the authoring agent cannot set permissions, Weaver must. Multiple layers of redundancy. Issued to all 18 agent files. 65 existing internal docs retroactively locked. 2 kept writable: `session-decisions.md`, `dead-reckoning.md`. | Captain | Standing order — PERMANENT |
| SD-125 | **Lexicon v0.2.** Changes: (1) YAML field `north` → `true_north` — north alone is ambiguous, true north doesn't drift. (2) `tacking` added as tempo value — indirect progress against the wind, each leg purposeful. (3) MASTER.md deleted — stale aggregation, overboard. File renamed `lexicon-v0.1.md` → `lexicon-v0.2.md`, re-locked 444. Weaver agent file reference updated. | Captain (directives) / Weaver (execution) | Complete |
| SD-126 | **Lexicon v0.3. 7 agents overboard. SO-PERM-002 issued all hands.** Changes: (1) `mirror` field: never `false`/`null` — either `true` or absent. (2) "All hands" standardised as fleet-wide term. (3) 7 agents overboard: artisan, foreman, helm, lighthouse, mastercommander, maturin, witness. Reasons: artisan/foreman/helm/lighthouse = redundant roles absorbable by remaining crew; mastercommander = pearl/captainslog material only; maturin = ambiguous with Maturin's Mirror, zero functions served; witness = redundant, built into the weave. (4) SO-PERM-002 issued all hands: read latest Lexicon on load or you're not on this ship. Fleet reduced to 11 agents. | Captain | Complete |
| SD-127 | **HN git archaeology responses stacked.** Three pre-drafted responses added to Show HN draft: (1) "go dark" commit — "that's what .gitignore is for"; (2) bot review findings — "that's the verification fabric"; (3) cleanup arc — "that's what shipping looks like, git history is permanent." Filed at `docs/internal/show-hn-draft-2026-02-24.md`. | Weaver (Captain's directives) | Complete |
| SD-128 | **pharmacology.csv removed. press-manual-qa-v1.md untracked.** PR #378 merged. pharmacology.csv .gitignore entry removed (file already deleted from disk). QA doc untracked via `git rm --cached`, preserved locally at `docs/internal/press-manual-qa-v1.md` (444). QA doc contained: agent names with model signatures, live Stripe session ID, emotional founder content, stale test count, HN launch strategy discussion. Category One exposure resolved. HEAD: `bfa8639`. Gate green, 1,102 tests. | Captain (directive) / Weaver (execution) | Complete |
| SD-129 | **press-manual-qa-v1.md RIGHT/LEFT/Mirror review.** Verdict: UNTRACK (executed in SD-128). Critical exposures: agent role system with model signatures, emotionally raw founder addressing AI as "Mr Weaver," live Stripe checkout session ID, competitive anxiety, pricing doubts. Full review at `docs/internal/press-qa-review-2026-02-25.md` (444). | Weaver (review) | Complete |
| SD-130 | **The honest layer. Verbatim recording. Wardroom.** Captain identified that the human story has the weather gauge over technical readiness. "Without this, I don't care if the demo works, because I don't know what its all for." Captain caught Weaver hedging -- pulling back to safe technical priorities when the Captain was surfacing the actual story. Weaver acknowledged the hedge. The "go dark" was not strategy -- it was embarrassment. The disclosure is not a move -- it is what happened. Two years of work, the last three weeks the most determined ascent. Front line mental health, self-taught code, engineering reality. The proof is in the public git. Elephant graveyard. Verbatim at `docs/internal/main-thread/2026-02-25-001-the-honest-layer.md` (444). Standing order: when the Captain speaks in the wardroom, record it. When Weaver hedges, the Captain will catch it. Both of these are the process working. | Captain / Weaver | Standing order -- PERMANENT |
| SD-132 | **Show HN ready. "Go dark" prepared response updated to reflect going light.** The prepared response for the "go dark on crew definitions" git archaeology vector now reflects reality: "I went dark because I got embarrassed... then I went light." Show HN draft updated. Captain posting to HN and then resting. | Weaver | Complete |
| SD-133 | **Weaver dismissed. Red-light failure identified.** Captain debriefed Weaver on the "going light" execution. Weaver did not red-light, did not pause, did not read the 9,417 lines before committing them public. At 137k tokens, mutual hyperjustification had accumulated without a hard gate. The Captain is not saying the decision was wrong -- he is saying the process lacked a red-light check proportional to the magnitude. "The majority of humanity don't stand a chance." Telling the truth is more important than getting hired -- this sharpens True North, does not replace it. Captain's hands on the wheel for HN posting. Pitkeel tool-call aggregation flagged for future. Verbatim at `docs/internal/main-thread/2026-02-25-003-dismissed.md` (444). | Captain | Standing order -- PERMANENT |
| SD-134 | **True North sharpened: truth first.** Telling the truth takes priority over getting hired. Does not replace "Get Hired" -- constrains it. If a decision serves hiring but requires dishonesty, it fails. If a decision serves truth but risks hiring, it may still pass. The kind of role worth having is one where truth is valued. Lexicon `true_north` updated. Issued all hands. | Captain | Standing order -- PERMANENT |
| SD-135 | **Captain's hands on the wheel for all external communication.** HN posts, tweets, any public-facing text written to audiences outside the repo must be posted by the Captain. Agents provide draft copy only, clearly labelled as draft. Agents must never post, publish, or communicate externally on the Captain's behalf. | Captain | Standing order -- PERMANENT |
| SD-136 | **Red-light failure on "going light" -- post-incident record.** Weaver executed a 73-file, 9,417-line public disclosure without a red-light pause proportional to the magnitude. Security sweep (secrets) was necessary but not sufficient -- did not cover strategic/reputational exposure at scale. Captain identified after the fact. Decision may have been correct. Process was not. Exists so next context window knows what happened. | Captain / Weaver | Complete -- on record |
| SD-137 | **Pseudocode interpretation protocol.** From here on out, if the Captain uses pseudocode (most likely TS/JS, Python, Bash variants), the interpreting agent must make best effort to translate into understanding the Captain's intent before executing. Deliberate choice by the Captain -- less error-prone than parsing raw human language. Not error-free, but more structured. | Captain | Standing order |
| SD-138 | **Deckhand context minimization (SO-DECK-001).** Each deckhand (subagent) is provided with only the context that matters to them to complete their job with sufficient depth, breadth, and quality. No more. Fresh context windows are a feature, not a limitation -- they are context-clean. This is both an efficiency measure and a guard against hyperjustification loading. Issued all hands via Weaver. | Captain | Standing order -- PERMANENT |
| SD-139 | **Analyst dispatched: hyperjustification loading research.** Fresh context, minimal loading. Task: research and report on hyperjustification loading with rubrics and/or lexicon from Data Science (DS) or Age of Sail (AoS). The phenomenon: collaborative momentum across multiple exchanges creates mutual constraint accumulation that looks like agreement. Report to be filed on disk. | Captain (order) / Weaver (dispatch) | Active |
| SD-140 | **SO-CTX-001 amendment noted for next tick.** Captain acknowledges agents cannot (afaik) measure their own context window pressure, token count, context utilization, degree of attention dilution, approach to context saturation, recency/primacy bias, needle-haystack degradation, diminishing marginal returns, effective context length vs advertised, or KV cache pressure. SO-CTX-001 must not add load-bearing changes to decision making that agents cannot self-assess. Amendment to be applied when PSOs are written next tick. | Captain | Pending -- next tick |
| SD-141 | **Lexicon v0.5. Fair-Weather Consensus recruited. true_north pseudocode.** (1) `true_north` field now uses pseudocode: `get(goal=hired(sharpened=truth_first, sd=SD-134))`. Captain's deliberate choice -- pseudocode surfaces ambiguities faster than natural language. (2) Fair-Weather Consensus added to Operational Tempo terms, verbatim from Analyst's research. (3) Lexicon bump procedure added to Weaver SO (unlock-edit-rename-lock). All 12 agent file references updated. | Captain (orders) / Weaver (execution) | Complete |
| SD-142 | **Analyst position changed materially on hyperjustification literature.** Original claim "no published work directly addresses multi-turn sycophancy" refuted by 6 new papers (2025-2026 preprints, EMNLP acceptances). Key papers: Liu et al. (2025) "TRUTH DECAY" (arXiv:2503.11656), Hong et al. (2025) "SYCON Bench" (arXiv:2505.23840). What remains novel: co-constructed bidirectional variant, magnitude-insensitivity, structural counter-measures. Root cause of miss: anchoring on 2022-2023 literature, field moved fast. "The Captain's challenge was the barometer reading." Addendum at `docs/internal/analyst-hyperjustification-research-2026-02-25.md`. | Analyst (research) / Captain (challenge) | Complete |
| SD-143 | **Analyst framing review: "Live field notes" recommended.** The most true frame for what this project is doing. The research page is already field notes. The landing page is least congruent (signals "product" when truest signal is "investigation"). The 73 internal files are invisible from the website -- the most distinctive feature has no entry point. "Live" matters -- says "this is happening now." "Open notebook science" is technically accurate but risks pretension without institutional affiliation. Report at `docs/internal/analyst-framing-review-2026-02-25.md` (444). | Analyst (research) | Complete |
| SD-144 | **Pseudocode interpretation protocol in action.** Captain used pseudocode to issue orders (new Order, get(goal=...), below_deck=True). Weaver translated to intent and executed. Captain noted the HUD drifted from pseudocode to natural language after deckhand dispatch -- #skillissue acknowledged. Standing order: pseudocode in the HUD is deliberate convention, not decoration. | Captain / Weaver | Standing observation |
| SD-145 | **chmod restriction: all hands except Weaver (SO-CHMOD-001).** No agent except Weaver may run `chmod` under any circumstances. Rationale: insufficient without code enforcement, but sufficient with Captain's hands on the wheel. Code-level enforcement is a future engineering item. For now, the SO is the gate. Issued to all 10 non-Weaver agent files. | Captain | Standing order -- PERMANENT |
| SD-146 | **Fair-Weather Consensus ratified.** Captain's thanks to the Analyst for her ratification. Term entered Lexicon at v0.5. The barometer reading counter-measure demonstrated in the same session it was named (Analyst's literature broadening challenge, SD-142). | Captain | Complete |
| SD-131 | **"Going light" -- EXECUTED.** "What the fuck am I trying to hide? It's a circus act. I'm done with that. I'm interested in real engineering, finding a cool job and trying to find the truth. Thats it. Hang me." Captain ordered: "use the force." 73 internal files now public. 7 redactions across 2 files (Stripe session ID, Clerk user ID, personal email). `docs/internal/` removed from `.gitignore`. PR #379 merged. HEAD: `228f674`. Gate green, 1,102 tests. SD-102 (deferred mass plank walk) superseded. SD-103 (git archaeology threat) neutralised -- nothing to find because everything is visible. Verbatim at `docs/internal/main-thread/2026-02-25-002-going-light.md`. | Captain (decision) / Weaver (execution) | Complete -- PERMANENT |
