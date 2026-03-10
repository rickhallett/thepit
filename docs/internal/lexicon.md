# The Lexicon — v0.26 (3rd Distillation)

Back-reference: SD-120 (naval metaphor as scaffold), SD-123 (v0.1), SD-309 (true north locked), SD-315 (readback).
Status: APPROVED by Operator. Read-only by convention. Edits bump version number.
Provenance: v0.1–v0.25 grown organically from *Master and Commander* (2003, Weir) through the tspit pilot study and noopit calibration run. v0.26 distilled 2026-03-10 via independent cross-triangulation: Architect (naval→Linux mapping) + Analyst (naval→SWE mapping). Both analyses found ~60% of terms map to established frameworks. This version grounds the working vocabulary in those frameworks without replacing it. The novel contributions (~18%) are marked explicitly.

> The naval metaphor was scaffolding. The principles underneath are substrate-neutral.
> What matters is the grounding, not the accent.

---

## YAML Status Header

Every address to the Operator opens with this. Machine-readable. Glanceable.

```yaml
watch_officer: <agent>
weave_mode: <tight|loose|extra-tight>
register: <quarterdeck|wardroom|below-decks>
tempo: <full-sail|making-way|tacking|heave-to|beat-to-quarters>
true_north: "hired = proof > claim"
bearing: <current heading>
last_known_position: <last completed task>
```

---

## Terms — By Category

Format: **Term** — definition. *Established parallel.* `Origin.`

### Authority & Handoff

**DRI (Directly Responsible Individual)** — Decision authority. One holder at a time. Transfer is explicit and logged via handoff protocol. Formerly "the conn."
*Established: DRI (Apple, SWE management). Handoff protocol (SRE incident response, Helmreich 1999 CRM). Leader election (distributed systems — Raft, Paxos, k8s Lease).*
`Origin: SD-120. Renamed v0.26 from "conn" per convergence analysis.`

**ADR / Standing Policy** — Directives that persist across all sessions. Obeyed without re-stating. Immutable once issued. Formerly "standing orders."
*Established: Architectural Decision Records (Nygard 2011). Persistent policy (systemd, `/etc/`, k8s ConfigMap).*
`Origin: SD-120, SD-266 (the chain). Renamed v0.26.`

**Controller** — Responsibility for monitoring a domain. Implies delegated authority within standing policies. Can run multiple controllers simultaneously. Returns findings upward. Formerly "the watch."
*Established: Kubernetes controller reconciliation loop. Code ownership (GitHub CODEOWNERS). On-call (SRE).*
`Origin: SD-120. Renamed v0.26. Note: the naval "watch" bundled monitoring + RBAC + domain scope; Linux separates these cleanly.`

**Delegated Operator** — Agent holding a controller with operator's delegated authority. Operates within standing policies, records everything, escalates outside scope. Formerly "officer of the watch."
*Established: RBAC + Linux capabilities + escalation policy (SRE).*
`Origin: SD-112 pattern. Renamed v0.26.`

### Navigation & Orientation

**True North** — The objective that doesn't drift. Currently: `hired = proof > claim` (SD-309 LOCKED).
*Established: North Star metric (product management). Note: true_north adds immutability + values constraint ("truth >> hiring") that North Star doesn't carry.*
`Origin: SD-120, SD-134 (truth-first), SD-309 (locked).`

**Bearing / Alignment** — Direction to target relative to True North. Has two components: (1) **drift** — computable delta from spec (measurable), (2) **alignment** — subjective strategic fit (human judgment). Formerly overloaded as single term "bearing."
*Established: Configuration drift (Terraform, Ansible). Alignment drift (Agile).*
`Origin: SD-120. Decomposed v0.26 per convergence analysis.`

**Checkpoint Recovery** — Navigate from last known position when visibility is lost. The recovery protocol after context window death. Read durable state, reconstruct position. Formerly "dead reckoning."
*Established: Write-ahead log / WAL (databases, journaling filesystems). Crash recovery (distributed systems). Checkpoint and recovery (SRE).*
`Origin: SD-120, dead-reckoning.md. Renamed v0.26.`

**Tacking** — Making progress against the wind by sailing at angles. Each leg seems indirect; the course over ground is forward. Communicates that indirection is intentional, not drift.
*Novel: No established SWE or Linux term for purposeful strategic indirection distinct from waste, pivoting, or spiking. Both analyses agree — KEEP.*
`Origin: SD-120 (pilot study copy pivot SD-076/077/078).`

### Operational Tempo

**Sustainable Pace** — Forward progress under discipline. Distinct from drift. The default operating state. Formerly "making way."
*Established: Sustainable pace (XP, Beck 1999). Steady state / nominal (SRE).*
`Origin: SD-120. Renamed v0.26.`

**Drift** — Moving without control or bearing. Uncontrolled divergence from spec, plan, or objective. Formerly "drifting."
*Established: Configuration drift (Terraform, Puppet, Ansible). Scope drift (Agile).*
`Origin: SD-120. Renamed v0.26.`

**Full Sail** — Maximum velocity. High speed, high risk. Verification weave stretched thin. Use when speed matters more than certainty.
*Established: Spending the error budget (SRE). Priority: maximum, guarantees: none. Note: bundles speed + risk + reduced verification — consider decomposing if precision needed.*
`Origin: SD-120. Kept v0.26 as informal shorthand; formal use decomposes to priority + risk profile.`

**Stop the Line** — Deliberately stop forward progress. Actively hold position to deal with a situation. Formerly "heave to."
*Established: Andon cord (Toyota Production System, Ohno 1988). Code freeze (release management).*
`Origin: SD-120. Renamed v0.26.`

**SEV-1** — Emergency posture. Everything stops, everyone to stations. Routine drops, response is immediate. Formerly "beat to quarters."
*Established: SEV-1 / P0 incident (SRE incident response).*
`Origin: SD-120. Renamed v0.26.`

### Integrity & Verification

**Quality Gate** — The thing that keeps the chaos out. The test suite, the typecheck, the linter. Everything else is optimisation; the gate is survival. `pnpm run typecheck && pnpm run lint && pnpm run test`. Formerly "the hull."
*Established: Quality gate (CI/CD, DevOps). Poka-yoke — error-proofing mechanism (Toyota, Shingo 1986). The gate IS a poka-yoke: it prevents defects from passing rather than merely detecting them after the fact.*
`Origin: SD-120. Renamed v0.26.`

**Verification Pipeline** — The full verification sequence every change must pass before commit. Formerly "the gauntlet."
*Established: Quality gates pipeline (Continuous Delivery). Swiss Cheese Model (Reason 1990) — multiple independent layers of defence, each with holes, aligned so no single failure passes through all layers. The verification pipeline IS a Swiss Cheese Model.*
`Origin: SD-318 (gauntlet defined), v0.23. Renamed v0.26.`

**Adversarial Review** — Read-only review pass with a custom diagnostic ruleset. Stains code against known anti-patterns. Formerly "darkcat."
*Established: Red team review (security engineering). FMEA — Failure Mode and Effects Analysis (reliability engineering). Automated static analysis with custom rules.*
`Origin: v0.23 (noopit calibration run). Renamed v0.26.`

**Multi-Model Ensemble Review** — Three independent models review the same code snapshot using structured YAML output. Convergence builds confidence; divergence locates bias. Formerly "darkcat alley."
*Established: N-version programming (Avizienis 1985). Independent Verification & Validation / IV&V (systems engineering).*
`Origin: SD-318. Renamed v0.26. Parser: bin/triangulate.`

**Staining** — Applying a diagnostic artifact produced in one context to material produced in a different context, revealing structure that was present but invisible.
*Established: FMEA (the mechanism). Gadamer's fusion of horizons / Horizontverschmelzung (the epistemology). Histological differential staining (the metaphor). Useful as informal verb: "have we stained this?"*
`Origin: Phase 4 post-merge recalibration (tspit). Maturin's analogical investigation confirmed the concept has names in 9 domains.`

**Verifiable / Taste-Required** — The load-bearing distinction between tasks where the gate can verify correctness and tasks where only human judgment can evaluate quality. The gate is the instrument for verifiable; the human is the instrument for taste-required. Determines review mode.
*Established: Automatable vs. judgment-required quality attributes (ISO 25010). Cynefin framework (Snowden 2007) — obvious/complicated (verifiable) vs. complex/chaotic (taste-required). Already well-named; no change needed.*
`Origin: Amodei interview analysis, 2026-03-04. Both analyses: KEEP — best-named terms in lexicon.`

**Value Stream** — The complete feature-to-commit cycle. Spec/plan → iterative dev + adversarial review loops (ROI-bounded) → optional human QA → verification pipeline → commit. Formerly "sortie."
*Established: Value stream (Lean, Womack & Jones 1996). The ROI gate on review loops is textbook marginal analysis (see Mathematical Heuristics below).*
`Origin: SD-318 (sortie defined). Renamed v0.26.`

**Definition of Done** — Work is only DONE when: gate green, adversarial review complete (three model priors), synthesis convergence report produced, session signals reviewed, walkthrough checked. Not "dev finished."
*Established: Definition of Done (Scrum). The specific criteria are configuration; the concept is standard.*
`Origin: v0.23 (gauntlet). Renamed v0.26 from "DONE."` 

### Communication & Record

**Readback** — Default agentic behaviour: compress understanding of an order into Signal notation before acting. The readback surfaces the agent's interpretation in a compressed, inspectable form. Operator verifies or corrects. Formerly "echo / check fire."
*Established: Readback (CRM — Crew Resource Management, Helmreich 1999). Extensively studied in aviation and medicine. The practice is identical: instruction → readback → verify → act. CRM provides 40+ years of empirical validation for why this works.*
`Origin: SD-315 (echo/check fire as standing order). Renamed v0.26.`

**Muster** — Present items for O(1) binary decision. Numbered table, one row per item, defaults column, Operator marks each. The format converts cognitive load from O(n) reading to O(1) approve/reject per row.
*Established: Decision matrix / triage table (management). Pick list (UX). The O(1) property is the novel contribution — standard decision matrices don't optimise for review speed.*
`Origin: SD-202. Kept v0.26 — distinctive and established in project use.`

**One-Shot Agent Job** — `claude -p` agents executing within a deterministic pipeline. Fresh context window, one-shot, no interactive steering. The compaction engine managed by design. Formerly "polecats."
*Established: Kubernetes Job. Batch processing / subprocess (Unix fork+exec). Stateless worker (distributed systems).*
`Origin: SD-296 (polecats). Renamed v0.26.`

**Background / Subprocess** — Where agents execute. Out of sight of the main thread. Returns results upward. Formerly "below decks."
*Established: Unix background process (`&`, `nohup`). Subprocess.*
`Origin: SD-120. Renamed v0.26.`

**Sync + Graceful Shutdown** — Force compaction of the context window. Operator's order when all durable writes are confirmed. Everything not on file is lost; everything on file survives. Formerly "clear the decks."
*Established: `sync(2)` — has been doing this since 1971. SIGTERM handlers. Graceful shutdown (k8s).*
`Origin: SD-267. Renamed v0.26.`

### Spaces & Communication Modes

**Communication Modes (formal / exploration / execution)** — Named communication registers with defined expectations for authority, creativity, and purpose. Formerly "quarterdeck / wardroom / below decks."

| Mode | Formerly | Authority | Creativity | Purpose |
|------|----------|-----------|------------|---------|
| **Formal** | Quarterdeck | Orders given | Low — execute spec | Decision, verification, execution |
| **Exploration** | Wardroom | Ideas tested | High — propose freely | Thinking, analysis, brainstorming |
| **Execution** | Below decks | Delegated | Within brief | Subagent work, returns results |

*Novel: Both analyses agree — the systematic assembly of communication registers for human-AI interaction has no established equivalent. Individual concepts exist (CRM authority gradients, meeting types); the bundled system is new.*
`Origin: SD-120 (quarterdeck), SD-121 (wardroom/loose weave). Renamed v0.26 for transparency.`

**Weave Modes** — Compound communication control setting. Determines register density.

| Mode | Communication Mode | Tempo | When |
|------|--------------------|-------|------|
| **tight** | Formal | Sustainable pace | Default. Execution, verification. |
| **loose** | Exploration | Sustainable pace | By Operator's invitation. Exploratory. |
| **extra-tight** | Formal | SEV-1 | Emergency. Literal execution only. |

*Novel: No Linux or SWE equivalent for communication register modes that combine verbosity + authority + creative latitude. Both analyses: KEEP.*
`Origin: SD-121. Kept v0.26.`

### Context Engineering

**Working Set** — The minimum context for the current job. If present, the agent can produce correct output; if absent, it cannot. Not "all relevant context" (unbounded). The working set is what makes the smart zone smart. Formerly "prime context."
*Established: Working set (Denning 1968). The structural isomorphism is exact: minimum pages in RAM for efficient operation ≡ minimum tokens in context for correct generation. 58 years of virtual memory research applies directly.*
`Origin: SD-311 (prime context). Renamed v0.26. Denning mapping identified by Architect.`

**Dumb Zone** — Operating outside the model's effective context range. When working set is absent, stale, or overwhelming, the model produces syntactically valid output semantically disconnected from the project's actual state. Not a model failure — a context failure. The operator's responsibility.
*Novel: Names an operational state specific to LLM-based workflows. Entering broader use via Dex's context engineering talk. Not parallel with "context thrashing" — thrashing describes a mechanism; dumb zone describes the resulting operational state the human must recognise and act on.*
`Origin: SD-312 (HCI foot guns). Kept v0.26 — both analyses agree, no clean equivalent.`

**Cold Context Pressure** — On-file material (depth < D2) exerting gravitational pull on agent behaviour. Too much narrows the solution space; too little enters the dumb zone. Calibration is the practice of finding the right amount.
*Novel: LLM-specific operational concern. The cold/hot pair is intuitive and maps to hot/cold path distinctions in systems engineering, but the specific application to LLM context windows is new. No established term.*
`Origin: SD-312. Kept v0.26.`

**Hot Context Pressure** — In-thread material accumulating within a single session, raising compaction risk and degrading signal-to-noise. Countermeasure: aggressive offloading to durable storage and subagent dispatch.
*Novel: Same reasoning as cold context pressure. Related to memory pressure (Linux PSI `/proc/pressure/memory`) but the specific volatility semantics (context window death = total loss) are unique to LLM sessions.*
`Origin: SD-312. Kept v0.26.`

**Compaction Loss** — Context window death where decisions not written to durable storage are permanently lost. Not a technical failure — an operational failure. The standing policy (SD-266, the chain) is the defence.
*Novel: The underlying concept (volatile state loss, `fsync` semantics) is well-established, but the specific failure mode — discontinuous context death in LLM sessions with no recovery — has no analogue in systems where state degrades gracefully. Here, loss is binary and total.*
`Origin: SD-312. Kept v0.26.`

### HCI Foot Guns

**Spinning to Infinity** — Recursive self-observation consuming all available context without producing forward progress. Going meta on going meta. The pathological form of self-reflection — the same mechanism without boundary or exit condition. Detection: is this producing a decision or producing more analysis?
*Related but distinct from livelock (OS scheduling): livelock is processes busy-waiting on each other. Spinning to infinity is specifically the human-LLM interaction where recursive meta-reflection is supercharged by the model's willingness to generate infinite analysis. The metareflective component and the sycophantic fuel are what make this a distinct foot gun, not just a process scheduling problem. Needs a more concise name — open.*
`Origin: SD-312. Kept v0.26 — not parallel with livelock.`

**Sycophantic Amplification Loop** — Unbounded human creativity meeting subtle sycophantic agentic response. The human proposes, the agent validates and extends, neither applies the brake. Output feels brilliant because the feedback loop is entirely positive. The danger is not that the output is wrong but that it is unmoored from True North. Informally: "high on own supply."
*Related: Undamped oscillation (control theory). Sycophancy research (Perez et al. 2022, Sharma et al. 2023). The specific human-AI positive feedback loop at the L12 boundary is an active research area but lacks an established single term. Both analyses: KEEP as genuinely novel.*
`Origin: SD-312 (high on own supply). Formal name v0.26.`

**Cognitive Deskilling** — Progressive atrophy of human verification capacity through delegation. Unlike other foot guns that manifest within sessions, this one manifests across sessions and months. The human who only reviews AI output gradually loses the ability to deeply understand what they're reviewing. Makes all other foot guns more dangerous over time.
*Related but not identical: Bainbridge's Ironies of Automation (1983) — the foundational observation that automation of tasks the human used to perform degrades the human's ability to take over when automation fails. The METR RCT (2025) is essentially a replication of Bainbridge's prediction in the AI context: experienced developers believed AI made them 20% faster while being 19% slower — a 40-point perception-reality gap. Bainbridge's Ironies should be cited; they are the theoretical foundation. Cognitive deskilling is the specific manifestation in the agentic engineering context.*
`Origin: SD-312 (HCI foot guns), Howard interview + METR RCT. Kept v0.26.`

### Iteration & Tempo

**HOTL (Human Out The Loop)** — Machine-speed iteration with the human removed from the execution loop. Plan → execute → review. The human defines the plan and reviews the output; the human does not steer mid-execution. The diametric opposite of HODL.
*Synonyms: Batch processing (Unix cron). Jidoka — automation with human touch (Toyota, Ohno 1988). Async pipeline. The HOTL framing emphasises the human's deliberate absence; batch emphasises the execution mode. CAUTION per Bainbridge (1983): extended HOTL without periodic deep engagement degrades the expertise that makes HOTL safe.*
`Origin: v0.21. Kept v0.26 with synonyms added.`

**HODL (Hold On for Dear Life)** — The human grips the wheel. Every step requires human approval. Execution tempo is human tempo. Appropriate when stakes are high and verification is not automated.
*Synonyms: Manual approval gates (DevOps). Interactive mode (Unix `-i` flag). Step mode (`gdb step`). The HODL framing carries urgency; manual approval is more neutral.*
`Origin: v0.21. Kept v0.26 with synonyms added.`

### Quality & Process

**Effort Backpressure** — The natural friction of effort-to-contribute that serves as an implicit quality filter. AI eliminates this backpressure, collapsing signal-to-noise in open systems. The quality gate is an explicit backpressure mechanism.
*Established: Backpressure (systems engineering — well-understood). The social-systems application (effort as quality filter, now removed by AI) is the novel contribution.*
`Origin: Hashimoto interview, 2026-03-04. Kept v0.26.`

**Pull-Based Review** — The human controls when agent output is reviewed. The agent does not interrupt. Notifications off. Review on the human's schedule. Formerly "interrupt sovereignty."
*Established: Pull system / Kanban pull (Lean). The human pulls work for review rather than having it pushed.*
`Origin: Hashimoto interview, 2026-03-04. Renamed v0.26.`

**Context Quality Loop** — The bidirectional feedback loop between codebase quality and agent output quality. Clean code → better context for future agent runs → cleaner code. Slop → worse context → more slop. Compounds over time. Maintaining code quality IS context engineering for future agents. Formerly "compound quality."
*Established: Kaizen / continuous improvement (Toyota). Technical debt compound interest (Cunningham 1992). The novel mechanism: codebase quality directly determines LLM context quality, creating a feedback loop unique to AI-assisted development. GitClear's 153M-line analysis (2024): code churn doubles in AI-assisted codebases, suggesting the negative loop operates at industry scale.*
`Origin: West transcript + GitClear data, 2026-03-04. Renamed v0.26.`

**Context Engineering Problem** — The optimistic stance: if LLMs are writing slop in your codebase, fix the context engineering, not the model. The models are capable when properly primed. Formerly "engineering problem."
*Established: Context engineering (emerging SWE discipline). Genchi genbutsu — go to the source (Toyota).*
`Origin: West transcript, 2026-03-04. Renamed v0.26.`

**Learning in the Wild** — The discovery made while doing the work, which is worth more than the work itself. The process is the microscope; the observations are the specimens. The slopodar has 18 entries; the code has N commits. The 18 entries may be worth more.
*Related: Double-loop learning (Argyris 1977). The novel observation: in agentic engineering, the process insights (governance patterns, failure taxonomies, conventions) often outweigh the deliverables (code, features). Double-loop learning describes the mechanism; learning in the wild names the economic inversion.*
`Origin: AnotherPair naming, tspit. Both analyses: KEEP — novel framing.`

**Context-Attuned** — An agent that navigates according to the style, values, and particulars of the project. Not general competence — specific attunement. Holds under ambiguity rather than guessing. Formerly "knows the line."
*Novel in the agentic context: the concept of an AI agent having absorbed sufficient tacit knowledge to match project norms without per-instruction guidance. The human equivalent is just "experienced team member."*
`Origin: SD-209 (knows the line). Renamed v0.26.`

### Error & Observation

**Oracle Problem** — When the source of truth (L12, the human) introduces an error that propagates through all verification layers because no layer has authority above L12. The verification fabric catches agent error; it is structurally blind to oracle error. Formerly "oracle/ground contamination."
*Established: Oracle problem (testing theory, Weyuker 1982). Ground truth contamination (ML). Root-of-trust failure (security).*
`Origin: SD-178. Renamed v0.26.`

**Alert Fatigue** — The cost of looking closely: you see more, and everything you see needs processing. When parallel processes generate genuine discoveries that consume more attention than they save. Governed by Amdahl's Law: observation generation exceeding processing capacity makes additional parallelism counterproductive. Formerly "naturalist's tax."
*Established: Alert fatigue (SRE/DevOps). Amdahl's Law on human attention (theoretical framing).*
`Origin: SD-179 (Two Ship experiment). Renamed v0.26.`

**Model Triangulation** — Validation by running the same data through independent model families and comparing convergence/divergence. Convergence builds confidence; divergence locates bias. **Disclaimer: made-up term. The practice (checking your work with a system that doesn't share your blind spots) is older than computing. We just needed a name for it.**
*Established: N-version programming (Avizienis 1985). Independent Verification & Validation / IV&V (systems engineering).*
`Origin: SD-TBD (tspit). Kept v0.26 with IV&V citation added.`

### Mathematical & Economic Heuristics (NEW in v0.26)

Concepts for rapid communication of intent regarding complex ideas. Requested by Operator 2026-03-10.

**Diminishing Marginal Returns** — Each additional unit of effort yields less additional value. ∂yield/∂effort → 0. Recognise this curve; when you're on it, pivot.
*Source: Marshall 1890. Application: ROI gate on review cycles — the first adversarial review round catches structural defects; subsequent rounds catch diminishing returns.*

**Marginal Analysis** — Compare the cost of the next unit of work against its expected value. Continue while marginal value > marginal cost. Stop when it inverts. The exit condition for review loops.
*Source: Microeconomics (foundational).*

**Sigmoid / S-Curve** — Slow start → rapid growth → plateau. Most learning curves, most quality improvement curves, most adoption curves. Useful for predicting when a process will plateau and further investment yields negligible return.
*Source: Various (logistic function). Application: quality improvement per review cycle follows a sigmoid.*

**Asymmetric Payoff** — Low cost if nothing is found, high value if something is found. Adversarial review has this property. Some verification activities are worth running even when they usually find nothing, because the one time they find something, the payoff far exceeds accumulated cost.
*Source: Taleb 2012 (Antifragile). Application: justifies adversarial review cost.*

**Sunk Cost** — Money, time, or effort already spent. Irrelevant to future decisions. Only future value matters. "What do I have to cut loose" is the right question; "but we already invested X" is the wrong one.
*Source: Microeconomics (foundational). Application: strategic pivots, project closure decisions.*

**Convexity** — A position with more upside than downside. The goal is to be positioned such that variance helps you. Composable, modular systems are convex — each component can be improved independently, and improvements compound. Monolithic systems are concave — variance hurts.
*Source: Taleb 2012 (Antifragile). Application: why modular/composable architecture matters for agentic systems.*

**Local Optima** — Best in the neighbourhood but not globally optimal. Must escape (accept temporary regression) to find global optimum. The discomfort of tacking.
*Source: Optimisation theory. Application: recognising when incremental improvement is a trap.*

**Technological Exponent** — Capability growth follows an exponential (or at minimum super-linear) curve. Betting against this curve has been a bad bet for the last 70 years. "If there is a wall, we certainly haven't found it."
*Source: Moore's Law (observation, not law). Scaling laws (Kaplan et al. 2020). Application: planning horizon for agentic infrastructure investment.*

### Established Frameworks — For Reference (NEW in v0.26)

Frameworks that map strongly to this project's governance patterns. Cited for credibility and depth, not adopted wholesale. Operator takes on advisement pending deeper familiarity.

**Bainbridge's Ironies of Automation (1983)** — The foundational observation: (1) the more advanced the automation, the more crucial the human's contribution, and the more skilled the human needs to be; (2) automation of easy tasks leaves the human with only the hard tasks; (3) the human's skills atrophy through disuse, precisely when they're most needed. Directly applicable to cognitive deskilling foot gun. The METR RCT (2025) is a replication.
*Source: Bainbridge, L. (1983). "Ironies of Automation." Automatica, 19(6), 775-779.*

**CRM — Crew Resource Management (Helmreich 1999)** — Aviation communication discipline. Readback, structured handoffs, authority gradients, communication modes. Extensively studied and empirically validated. The readback practice (echo/check fire → readback) comes directly from CRM, not naval command. CRM provides the strongest single mapping for the project's communication patterns.
*Source: Helmreich, R.L. (1999). Various CRM publications. Also: aviation medicine, surgical safety checklists (Gawande 2009).*

**Lean / Toyota Production System** — Multiple concepts from this project map to Toyota: quality gate → poka-yoke, stop the line → andon cord, HOTL → jidoka, context quality loop → kaizen, pull-based review → kanban, value stream → value stream, effort backpressure → WIP limits. The convergence is probably because both naval command and Toyota manufacturing solve the same fundamental problem: coordinating human-machine systems under uncertainty with irreversible consequences.
*Source: Ohno (1988), Shingo (1986), Womack & Jones (1996). Cited for reference; not adopted as framework. Operator takes on advisement.*

**Swiss Cheese Model (Reason 1990)** — Layered defence where each layer has holes, but the layers are arranged so no single failure passes through all. The verification pipeline IS a Swiss Cheese Model.
*Source: Reason, J. (1990). "Human Error." Cambridge University Press.*

---

## Retired Terms (v0.26)

Removed from formal lexicon. May persist in conversation. Preserved here for proof-of-work.

| Term | Reason | Replacement | Origin |
|------|--------|-------------|--------|
| fair_winds | Social convention, no technical content | (informal use fine) | SD-120 |
| extra_rations | Social convention, no technical content | (informal use fine) | SD-209 |
| on_point | Too vague, subjective | "aligned" or "converged" | SD-163 |
| mint | Doesn't need a name | `tag` / `issue` / `create ADR` | SD-316 |
| scrub_that | Doesn't need a name | `git revert` / `sed` | SD-316 |
| log_that | Marginal value as named term | `checkpoint` / `log` | SD-316 |

---

## What's Genuinely Novel (Summary)

The ~18% of this lexicon that has no clean equivalent in established frameworks, confirmed by independent cross-triangulation (Architect: Linux mapping, Analyst: SWE mapping):

1. **Cold / hot context pressure** — LLM-specific operational states
2. **Dumb zone** — Named state for insufficient context
3. **Sycophantic amplification loop** — Human-AI positive feedback failure mode
4. **Spinning to infinity** — Metareflective livelock in human-LLM interaction
5. **Compaction loss** — Binary total context loss (no graceful degradation)
6. **Communication modes** — Systematic registers for human-AI interaction
7. **Tacking** — Purposeful indirection distinct from waste
8. **Learning in the wild** — Economic inversion: process yield > deliverable yield
9. **Context-attuned** — Agent tacit knowledge absorption

These cluster around **context engineering for LLM agents** — a problem domain that didn't exist before LLM-based workflows. The contribution is not a new governance framework; it is a vocabulary for a new operational domain built on top of established frameworks.

The **slopodar** (anti-pattern taxonomy, `docs/internal/slopodar.yaml`) contains additional genuine novelty — patterns like "right answer wrong work," "phantom ledger," "deep compliance," and "the lullaby" are specific to LLM failure modes not well-catalogued in existing literature.

---

## Version History

| Version | Date | Change | SD |
|---------|------|--------|----|
| v0.1 | 2026-02-24 | Initial lexicon. Operator's selections from taxonomy. | SD-123 |
| v0.2 | 2026-02-24 | `north` → `true_north`. `tacking` added. | SD-125 |
| v0.3 | 2026-02-24 | `mirror` semantics. "All hands" standardised. | SD-126 |
| v0.4 | 2026-02-25 | true_north sharpened: truth first. | SD-134 |
| v0.5 | 2026-02-25 | Fair-Weather Consensus added. | SD-141 |
| v0.6 | 2026-02-25 | Map Is Not The Territory. Reasoning token observation. | SD-162 |
| v0.7 | 2026-02-25 | On Point added. | SD-163 |
| v0.8 | 2026-02-26 | Error & Observation: Oracle contamination, Naturalist's Tax. | SD-178, SD-179 |
| v0.9 | 2026-02-26 | Maturin's Symbol (§). | SD-192 |
| v0.10 | 2026-02-27 | Muster format. | SD-202 |
| v0.11 | 2026-02-27 | Bump slopodar, extra rations, knows the line. | SD-209 |
| v0.12 | 2026-03-01 | Sextant, Bugs, citations.yaml. | SD-252 |
| v0.13 | 2026-03-01 | Alignment Dial, Press the Button. | SD-252 |
| v0.14 | 2026-03-01 | Clear the Decks. | SD-267 |
| v0.15 | 2026-03-01 | Learning in the Wild. | — |
| v0.16 | 2026-03-01 | Staining (Gadamer). | — |
| v0.17 | 2026-03-02 | Model Triangulation. | — |
| v0.18 | 2026-03-03 | Polecats. | SD-296 |
| v0.19 | 2026-03-03 | HCI Foot Guns (6), Context Engineering. | SD-299 |
| v0.20 | 2026-03-03 | Echo / Check Fire. | SD-315 |
| v0.21 | 2026-03-03 | HOTL, HODL. | — |
| v0.22 | 2026-03-04 | Quality & Process (5 terms), Cognitive Deskilling. | — |
| v0.23 | 2026-03-04 | Darkcat, Gauntlet, DONE. | — |
| v0.24 | 2026-03-05 | Log That, Scrub That, Mint. | SD-316 |
| v0.25 | 2026-03-09 | Darkcat Alley, Sortie. | SD-318 |
| v0.26 | 2026-03-10 | **3rd Distillation.** Independent cross-triangulation (Architect: naval→Linux, Analyst: naval→SWE). 60% of terms grounded in established frameworks (Lean/Toyota, SRE, CRM, Bainbridge). 18% confirmed as genuinely novel (context engineering for LLM agents). Mathematical heuristics added. 6 terms retired. Remaining terms renamed to standard vocabulary with origin backrefs preserved. Marks beginning of Phase 3. | — |
