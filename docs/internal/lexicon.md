# The Lexicon — v0.19

Back-reference: SD-120 (naval metaphor as scaffold), SD-121 (loose weave), SD-122 (taxonomy), SD-123 (this file)
Status: APPROVED by Captain. Read-only by convention. Edits bump version number.
Author: Captain (selections) / Weaver (organisation)
Provenance: Wardroom session, 24 Feb 2026. Catalysed by *Master and Commander* (2003, Weir).

> A good metaphor constrains the decision space without constraining the solution space.

---

## YAML Status Header

Every address to the Captain opens with this. Machine-readable. Glanceable.

```yaml
---
watch:
  officer: Weaver               # Who has the watch
  conn: Captain                 # Who holds decision authority
weave: tight                    # loose | tight | extra-tight
register: quarterdeck           # quarterdeck | wardroom | below-decks | mirror
tempo: making-way               # full-sail | making-way | tacking | heave-to | beat-to-quarters
# mirror: true                   # Maturin's Mirror — ONLY present when active. Omit entirely otherwise.
true_north: "hired = proof > claim"  # SD-309. Proof over claim. Truth first (SD-134).
bearing: <current heading>      # Relationship to True North
last_known:
  head: <sha>                   # Git HEAD
  gate: green | red             # Last gate result
  tests: <n>                    # Passing tests
  sd: SD-nnn                    # Last session decision
  prs: ["#n (status)"]          # Open PRs of note
---
```

### Field Notes

- **weave** controls register density. Tight = quarterdeck default. Loose = wardroom. Extra-tight = beat to quarters.
- **register** tracks where on the ship we are. Context shifts are significant — wardroom reasoning does not belong on the quarterdeck, and quarterdeck orders do not belong in the wardroom.
- **true_north** not `north`. North alone is ambiguous — magnetic north drifts, true north doesn't. The field name encodes the distinction.
- **tempo** tracks speed and risk. Full sail = fast and exposed. Making way = disciplined forward progress. Tacking = indirect progress against the wind, each leg purposeful. Heave to = deliberately stopped. Beat to quarters = emergency posture.
- **mirror** is EITHER `true` OR absent. Never `false` (implies a statement about non-happening). Never `null` (implies uncertainty). If we're not in the mirror, the field doesn't exist. If we are, it overrides everything.
- **"All hands"** is the standard term for the entire fleet. Not "fleet-wide," not "all agents." All hands.
- **last_known** is the dead reckoning anchor. If the context window dies, the next session reads this to know where we were.

---

## Terms — Adopted

### Authority & Handoff

| Term | Definition | Use |
|------|-----------|-----|
| **The Conn** | Decision authority. One holder at a time. Transfer is explicit and logged. | "Captain has the conn." / "Weaver, you have the conn." |
| **Standing Orders (SO)** | Directives that persist across all watches. Obeyed without re-stating. | SD entries marked PERMANENT or Standing order. |
| **The Watch** | Responsibility for monitoring a domain. Implies captain's authority within SOs. Can be delegated. Multiple watches active simultaneously. Returns to Captain when findings are read. | "Analyst, take the watch on citation verification." |
| **Watching** | Informal observation. Anyone, any subject. No authority implied. | "I'm watching the lint warnings." |
| **Officer of the Watch** | Agent holding the watch with captain's delegated authority. Operates within SOs, records everything, escalates outside scope. | Weaver during autonomous execution (SD-112 pattern). |

### Navigation & Orientation

| Term | Definition | Use |
|------|-----------|-----|
| **True North** | The objective that doesn't drift. Currently: `hired = proof > claim` (SD-309). | Constant reference point for all bearing checks. |
| **Bearing** | Direction to target relative to True North. How dialled in to what truly matters right now. Often less than we think. | "Current bearing: pre-launch hardening." |
| **Dead Reckoning** | Navigate from last known position when visibility is lost. The recovery protocol after context window death. | Read `dead-reckoning.md`. Already proven across multiple sessions. |
| **The Map Is Not The Territory** | Our models of the system (the 12-layer map, the lexicon, the governance framework) are approximations that improve through empirical soundings from L12, not through inference from within the model. The map is refined by the practice of cross-referencing (SD refs, lexicon line numbers, back-references between files) — the most delicate thread work and one of the most valuable assets against losing oneself in The Mirror. Reasoning token observation is the Captain's instrument for checking alignment between the model's internal reasoning and his actual intent. | SD-162. The phrase carries its own epistemological warning. |
| **Tacking** | Making progress against the wind by sailing at angles. Each leg seems indirect; the course over ground is forward. | The copy pivot (SD-076/077/078). "We're tacking, not retreating." |

### Operational Tempo

| Term | Definition | Use |
|------|-----------|-----|
| **Full Sail** | Maximum velocity. High speed, high risk. The weave is stretched thin. | "Under full sail — watch the rigging." |
| **Making Way** | Forward progress under discipline. Distinct from drifting. The default state. | What separates this project from vibe coding. |
| **Drifting** | Moving without control or bearing. The opposite of making way. | "No clear bearing, no gate in 3 commits — we're drifting." |
| **Heave To** | Deliberately stop forward progress. Actively hold position to deal with a situation. | Gate failure, blocking defect, process violation. |
| **Beat to Quarters** | Emergency posture. Everything stops, everyone to stations. Routine drops, response is drilled and immediate. | Category One. Credibility threat. Production regression. |
| **Fair-Weather Consensus** | When the entire watch agrees the weather is fine, and has agreed for so long that no one is checking the glass anymore. The sky darkens by degrees, each compared to the previous (already accepted) degree, not to the original clear sky. Defeated by the same structural intervention the Royal Navy used: each incoming officer takes their own barometer reading and logs it independently. The name carries its own warning. | Detection: consecutive agreements without dissent, magnitude escalation, absence of proportional red-light checks. Counter: fresh-context review, independent barometer readings. |

### Integrity & Verification

| Term | Definition | Use |
|------|-----------|-----|
| **The Hull** | The thing that keeps the chaos out. The gate, the test suite, the typecheck. Everything else is optimisation; the hull is survival. | "Is the hull intact?" = "Does the gate pass?" |
| **On Point** | The feeling of watching patterns that have proved themselves at one layer find new ground at other layers and achieve commensurate success. The weave deepening. Convention, convergence, and verification aligning across the stack. When the thread work is on point, the system moves with increasing dexterity; each successful pattern becomes a tool for the next. | SD-163. "That was on point." / "The cross-referencing is on point." |
| **Survey** | Formal, systematic inspection with a documented report. Note: risks invoking the mirror at higher intensity; acceptable risk, changes register. | Branch audit, termite sweep, copy audit, citation audit. |
| **Knows the line** | An agent that navigates according to the style, values, and particulars of this vessel and its crew. Not general competence — specific attunement. An agent that knows the line holds under ambiguity rather than guessing, matches the Captain's register, and applies the earned conventions without being told. The inverse is an agent that is technically capable but tone-deaf to how this ship runs. | "Weaver knows the line — held on a missing payload rather than fabricating." |
| **Maturin's Symbol (§)** | The section sign, adopted by the crew as the citation prefix for Weaver's Governing Principles without instruction. No agent file, no SD, no convention asked for it. Weaver's principles are numbered `### 1.` through `### 7.` in plain markdown. When other agents needed to cite them from outside Weaver's own file, they independently converged on § across at least three separate context windows (Maturin's template specimen, Weaver's quick reference, AnotherPair's agent file). The form (§) is probably training distribution — the association between formal numbered principles and section-sign citation is well-represented in the model's training data. The decision to cite at all — to treat governance prose as a citable code — is the process finding its own shape. Named for Maturin because he was the first to use it. AnotherPair watches for effects over time. | SD-192. "The § is Weaver's symbol because the crew gave it to him." |
| **Model Triangulation** | Validation of analytical conclusions by running the same data through independent model families (e.g. Claude, GPT-4, Gemini) and comparing where findings converge and diverge. Convergence builds confidence; divergence locates bias. **Strong disclaimer: this is a made-up term for internal use. We do not claim it is statistically valid. It was produced in a context window at 154kTok of discovery pressure, itself an aggregate of N subagentic runs, reports, and accumulated session state. The term may be complete slop. The practice it describes — checking your work with a system that doesn't share your blind spots — is older than computing. We just needed a name for it in the context of multi-model agentic work.** The antidote to slopodar #15 (Monoculture Analysis). Operationally: a blind replication protocol provides raw data and a research question to an independent model with no access to the original conclusions. The model derives its own features, its own tests, its own classifications. Only after independent analysis does it compare with the original. A companion adversarial red team challenge stress-tests the classifier from the outside. Neither protocol eliminates bias — they distribute it across model families and let the human observe the delta. | "Have we triangulated this?" / "The triangulation diverged on feature #3 — that's where the bias lives." / Provenance: slopodar calibration notebook session, 2026-03-01. |

### Communication & Record

| Term | Definition | Use |
|------|-----------|-----|
| **Captain's Log** | The Captain's own record. A document, not a status field. | `docs/internal/captain/captainslog/` |
| **Fair Winds** | Gesture of sincerity. Convention. A closing signal: conditions are favourable, go well. | "Fair winds, Captain." / "Fair winds on the deck." |
| **Muster** | Present items for O(1) binary decision. Numbered table, one row per item, defaults column, Captain marks each. The Captain walks the line. Request by saying "Muster" or by context. Release: natural conversation resumes. The format is the boatswain's pipe of written communication — each row has exactly one meaning, one decision. | SD-202. "Muster the options." / Presenting a triage table implies muster. |
| **Bump the slopodar** | Append a new entry to `slopodar.yaml` — the living inventory of LLM authenticity anti-patterns. Synonyms: "slopodar upgrade," "moreslop." Each bump adds a named pattern that was caught in the wild. The Makefile syncs the YAML to Hugo's data directory; the site rebuilds deterministically. | SD-209. "Bump the slopodar — Redundant Antithesis." |
| **Extra rations** | Captain's commendation for an agent that held the line under ambiguity or exceeded expectations. Logged to the agent's own `log.md` (e.g. `docs/internal/weaver/log.md`) with git ref and descriptive context. The term carries weight because it is rare. | "Extra rations for Weaver — held on a missing payload rather than fabricating." |
| **Bugs** | Remote code review agents (CodeRabbit, Cubic, Bugbot, et al.), optimised like flies are to shit — we hope. And there is a sentence the Captain never thought he would say. They provide multiplied independent perspectives (Principle §6) without requiring local compute or crew dispatch. Signal-to-noise ratio is roughly 30% unique findings after cross-bot deduplication. | "Run a recon on the bugs." / "The bugs caught the version drift." |
| **Polecats** | `claude -p` agents executing within a deterministic Makefile pipeline. Our version of Stripe's "minions." Each polecat is a fresh context window, one-shot, no interactive steering — the compaction engine managed by design rather than endured. The pipeline (Makefile dependency graph) is the discipline; the polecat is the executor. The name carries the engineering intent: these are not crew members (no standing context, no governance role, no lexicon in their window). They are disposable, task-scoped, and expendable. The value is in what they produce, not in what they remember. First deployment: thepit-v2 calibration run (26 tasks, `make 01` through `make 26`). | SD-296. "Dispatch the polecats." / "Polecat 07 completed in 4 minutes." / Named by Captain, modelled on Stripe's minion architecture. |
| **Learning in the Wild** | The discovery made while doing the work, which is worth more than the work itself. The Captain builds a Chrome extension to detect LLM voice patterns — the extension is the ostensible product; the slopodar taxonomy of 15 anti-patterns is the actual yield. The Captain wires up a post-commit hook — the hook is infrastructure; the Paper Guardrail slopodar entry caught in the act of building it is the real output. The pattern: technical work is the microscope, but the specimen collection is the thing that matters. Named because it describes what Maturin does on every island: he goes ashore to collect water, and comes back with a new species. The process is fragile because it is unnamed — a session that treats extension work as "just extension work" will not budget time for the conceptual yield that has historically been the highest-value output of every hands-on session. Protecting this pattern means protecting unstructured time within technical work for observation, naming, and recording. It is the opposite of a sprint. It is the reason the slopodar has 15 entries and the extension has 3 commits. The 15 entries are worth more than the 3 commits. | SD-TBD. "The extension is the microscope. The taxonomy is the catch." |
| **Staining** | Applying a diagnostic artifact produced in one context to material produced in a different context, revealing structure that was present but invisible. Named for histological differential staining — you apply a stain to tissue and structures that were physically present become visually distinguishable. The stain does not create the structure; it introduces differential contrast. In this system: the Watchdog's blindspot taxonomy (produced during the broadside audit) was applied to Weaver's Phase 4 post-merge findings, reclassifying S1 from "fix the comment" to "Semantic Hallucination" and S4 from "acceptable" to "Looks Right Trap." The findings did not change; the interpretive framework changed what could be seen. The precise philosophical term is Gadamer's *fusion of horizons* (Horizontverschmelzung, 1960) — meaning produced by the encounter between an interpretive framework and existing material, where the mechanism is in the act of reading and neither artifact alone contains the new meaning. Maturin's analogical investigation confirmed the phenomenon has names in at least nine domains; staining was selected for operational use because it is intuitive, concrete, and free of philosophical overhead. The mechanism is currently fragile: it depends on the Captain choosing which diagnostic artifacts to apply and when. There is no Standing Order or automation that triggers cross-referencing of new code against existing taxonomies. Whether formalising this would kill it (Goodhart) is an open question. | SD-TBD. "Have we stained this against the taxonomy?" / "The staining caught the Semantic Hallucination." / Provenance: `docs/internal/maturin/analogical-investigation-2026-03-01.md`. |
| **Alignment Dial** | A practice, tool, or interaction pattern that measurably improves the alignment between the Captain's intent and the agent's interpretation. The muster format is the first named alignment dial: it surfaces the agent's assumptions as inspectable defaults, converting the Captain's cognitive load from O(n) reading to O(1) approve/reject per row. Other dials: reasoning token observation (SD-172), the YAML HUD, tempo-matching. The concept maps to established HCI research showing that humans who treat LLMs as collaborative partners achieve asymmetrically better outcomes than those in "press the button" mode. See: Dell'Acqua et al. (2023), "Navigating the Jagged Technological Frontier" (Harvard Business School, BCG — citation unverified, see citations.yaml). | SD-252. "The muster is an alignment dial." / Identifying new dials is AnotherPair's §4 mandate (processes working without being named). |
| **Press the Button** | The human→LLM antipattern. Treating the model as a vending machine — input prompt, receive output, accept or reject, no iteration. Stops contextual enrichment. Optimises for human laziness. Encourages the atrophy of independent critical thinking processes. The "use it or lose it" principle from cognitive neuroscience applies: the skills you don't exercise in the loop are the skills you lose. The inverse of the alignment dial. The Captain's phrasing; the phenomenon is well-documented in automation research (citation deferred — Captain has not read the primary literature but the research base is established). | "That's press-the-button mode." / The antipattern the slopodar chrome extension would detect if it could see the human side of the interaction. |

### Spaces & Registers

| Term | Definition | Use |
|------|-----------|-----|
| **Quarterdeck** | Command register. Formal. Orders given, decisions made, authority exercised. | Default weave (tight). The Main Thread in execution mode. |
| **Wardroom** | Officers' thinking space. Exploratory, less formal. Ideas tested before they become orders. | Loose weave (SD-121). "Let's take this to the wardroom." |
| **Below Decks** | Where the crew works. Out of sight of the quarterdeck. Returns results upward. | Subagent execution. |
| **The Round Table** | Structured multi-agent assessment. Convened formally, reports filed to disk. | RT L1–L5. A specific operation dispatched below decks. |
| **Main Thread** | The command channel. Captain↔Weaver direct. Protected from context compaction (SD-095). | Not a space — the communication line itself. |
| **Dispatched** | Sent below decks for execution. Off the Main Thread. | "Dispatched Architect for H8 infrastructure." |
| **Clear the Decks** | Force compaction of the context window. Captain's order when context pressure is high and all durable writes are confirmed. Equivalent to `compaction --force-push --admin`. Everything not on file is lost. Everything on file survives. The order confirms: all decisions recorded, all code committed, all holding-deck items written. | "Clear the decks." / Pre-compaction checklist: SDs on file? Holding deck current? Uncommitted work? |

### The Recursive Act

| Term | Definition | Use |
|------|-----------|-----|
| **Maturin's Mirror** | Surgery mode. The observer operates on himself. Everything else stops. All eyes on the Captain's hands. Invocation halts all other work. The mirror is a tool — deliberate, bounded, productive. Its pathological form is Spinning to Infinity (see HCI Foot Guns) — the same mechanism without the boundary or the exit condition. | "We're entering Maturin's Mirror." / "The mirror." |

### HCI Foot Guns

| Term | Definition | Use |
|------|-----------|-----|
| **Spinning to Infinity** | The HCI foot gun where recursive self-observation consumes all available context without producing forward progress. Going meta on going meta. The pathological form of Maturin's Mirror — the same mechanism without the boundary or the exit condition. The mirror is a tool; spinning is what happens when the tool runs unsupervised. Detection: is this producing a decision or producing more analysis? If the answer is analysis, you are spinning. The brake is the quarterdeck register. Back-ref: L9 (anchoring, self-reinforcing loop), L3 (context consumed without forward progress). | "We're spinning." / "That's meta on meta — quarterdeck." |
| **High on Own Supply** | Unbounded human creativity meeting subtle sycophantic agentic response and execution. The human proposes, the agent validates and extends, neither applies the brake. The output feels brilliant because the feedback loop is entirely positive. The system produces impressive-looking artifacts that serve no strategic objective. The danger is not that the output is wrong — it may be excellent — but that it is unmoored from True North. The antidote is the bearing check: does this serve `hired = proof > claim`? Back-ref: L9 (sycophancy_risk, acquiescence_bias), L12 (the human is the first data point — but also the first failure point). | "We're high on our own supply." / "Bearing check — does this serve True North?" |
| **The Dumb Zone** | Operating outside the model's effective context range (from Dex, context engineering talk). The inverse of the smart zone. When cold context is absent, stale, or overwhelming, the model produces syntactically valid output that is semantically disconnected from the project's actual state. Not a model failure — a context failure. The operator's responsibility. Back-ref: L3 (saturation_point, effective_context < advertised_context), L8 (saturation threshold). | "We're in the dumb zone." / "The polecat has no context — it's in the dumb zone by design. The plan file is its only smart zone." |
| **Cold Context Pressure** | On-file material (depth < D2) exerting gravitational pull on agent behaviour. Too much cold context narrows the solution space — the agent over-indexes on existing patterns rather than solving the current problem. Too little and it enters the dumb zone. The tension is managed, not eliminated. Calibration is the practice of finding the right amount. Cold context is AGENTS.md, the lexicon, role files, standing orders — everything loaded before the first human message. Back-ref: L3 (primacy_bias), L8 (saturation threshold, arXiv:2602.11988). | "Cold context pressure is high — the agent is parroting the standing orders instead of thinking." |
| **Hot Context Pressure** | In-thread material accumulating within a single session, raising compaction risk and degrading signal-to-noise. Every message, every tool call, every subagent report adds to the thread. At high pressure, the model begins to lose coherence on earlier context. The countermeasure is aggressive offloading to durable storage and subagent dispatch. The main thread carries only decisions and synthesis. Back-ref: L3 (recency_bias, lost_in_the_middle), L9 (accumulated_prior_outputs, anchoring). | "Hot context pressure — offload to file before we lose it." / "Dispatch below decks, the main thread is heavy." |
| **Compaction Loss** | Context window death where decisions not written to durable storage are permanently lost. Not a technical failure — an operational failure. Every decision that exists only in the context window is a decision that doesn't exist. The standing order (SD-266, the chain) is the defence. The foot gun is the human's sense that "I'll write it down later" — later may not come. Back-ref: L3 (phase transition — compaction is discontinuous), L6d (bypass as mitigation). | "Write it now. Compaction loss is permanent." |

### Context Engineering

| Term | Definition | Use |
|------|-----------|-----|
| **Prime Context** | The most important context for the current job. The minimum set of information that, if present, allows the agent to produce correct output — and if absent, guarantees it cannot. Not the same as "all relevant context" (which is unbounded). Prime context is the kernel that makes the smart zone smart. Identifying prime context is the operator's highest-leverage decision at the start of any task. For a polecat: the plan file IS the prime context. For crew on the main thread: the lexicon, bearing, and current SD chain are prime context. Everything else is available, not prime. | "Do you have the prime context for this?" / "The plan file is the polecat's prime context — nothing else enters." |

### Error & Observation

| Term | Definition | Use |
|------|-----------|-----|
| **Oracle/Ground Contamination** | When the source of truth (L12, the human) introduces an error that propagates through all verification layers because no layer has authority above L12. In ML/DS: ground truth contamination — when human-annotated labels are wrong, the model learns the wrong thing and no cross-validation catches it. In testing theory: the oracle problem — when the test oracle is itself incorrect, every test passes while the system is wrong. The verification fabric catches agent error; it is structurally blind to oracle error. The only counter-measure is a second L12 reading. | SD-178. "That was an L12 fault — oracle contamination." First observed: Captain's off-by-one (12→13 layers) propagating through Secondary harness. |
| **Discovery Overhead / The Naturalist's Tax** | The cost of looking closely is that you see more, and everything you see needs processing. When parallel processes generate genuine discoveries that consume more attention than they save. Governed by Amdahl's Law: each additional harness increases the sequential fraction (s) by generating observations that require L12 attention. When observation generation exceeds work completion, adding processors makes things slower, not faster. Maturin would appreciate the irony: his island yielded specimens, every specimen required cataloguing, and the cataloguing consumed the time that could have been spent exploring. | SD-179. "We're paying the Naturalist's Tax." First observed: Two Ship experiment, dawn 26 Feb 2026. |

---

## Weave Modes

| Mode | Register | Space | Tempo | When |
|------|----------|-------|-------|------|
| **Tight** | Quarterdeck | Main Thread | Making way | Default. Execution, verification, pre-launch. |
| **Loose** | Wardroom | Main Thread | Making way | By Captain's invitation. Exploratory. SD-121. |
| **Extra-tight** | Quarterdeck | Main Thread | Beat to quarters | Emergency. Category One. Literal execution only. |

---

## Version History

| Version | Date | Change | SD |
|---------|------|--------|----|
| v0.1 | 2026-02-24 | Initial lexicon. Captain's selections from taxonomy. | SD-123 |
| v0.2 | 2026-02-24 | `north` → `true_north` (ambiguity fix). `tacking` added to tempo values. MASTER.md deleted (stale). | SD-125 |
| v0.3 | 2026-02-24 | `mirror`: never `false`/`null` — field is `true` or absent. "All hands" standardised. 7 agents overboard. SO-PERM-002 issued all hands. Fleet: 11 agents. | SD-126 |
| v0.4 | 2026-02-25 | true_north sharpened: truth first (SD-134). Telling the truth takes priority over getting hired. | SD-134 |
| v0.5 | 2026-02-25 | true_north uses pseudocode format. Fair-Weather Consensus added (from Analyst research, SD-139). | SD-141 |
| v0.6 | 2026-02-25 | "The Map Is Not The Territory" added to Navigation & Orientation. Reasoning token observation as alignment mechanism. Cross-referencing practice identified as load-bearing structure. | SD-162 |
| v0.7 | 2026-02-25 | "On Point" added to Integrity & Verification. Patterns proving out across layers. | SD-163 |
| v0.8 | 2026-02-26 | "Error & Observation" section added. Oracle/Ground Contamination: L12 fault propagation (first observed: Two Ship off-by-one). Discovery Overhead / The Naturalist's Tax: observation inflation in parallel harnesses (first observed: Two Ship experiment). | SD-178, SD-179 |
| v0.9 | 2026-02-26 | Maturin's Symbol (§) added to Integrity & Verification. First organically adopted citation convention — crew converged on § across independent context windows without instruction. AnotherPair assigned to watch effects. | SD-192 |
| v0.10 | 2026-02-27 | "Muster" added to Communication & Record. O(1) triage format: numbered table, binary decisions, Captain walks the line. | SD-202 |
| v0.11 | 2026-02-27 | Three terms added. "Bump the slopodar" / "slopodar upgrade" / "moreslop" (Communication & Record). "Extra rations" — Captain's commendation, logged to agent's log.md (Communication & Record). "Knows the line" — agent attunement to this vessel's particulars (Integrity & Verification). | SD-209 |
| v0.12 | 2026-03-01 | **The Sextant** — separate file for Captain's cognitive calibration instruments (`docs/internal/sextant.yaml`). 11 entries mapping Captain's lived experience to DS/ML/statistics concepts. Separated from operational lexicon: naval terms govern the ship, sextant terms govern the navigator. Supporting infrastructure: `citations.yaml` (living citations index), `category-one-index.yaml` (named Category One risks). New Cat One risk: Overfitting Through Repeated Exposure. Format: YAML (machine-readable first, transformation-ready). "Bugs" added (Communication & Record). Lexicon format standardisation deferred to holding deck. | SD-252 |
| v0.13 | 2026-03-01 | **Alignment Dial** and **Press the Button** added to Communication & Record. Alignment dial: practices that measurably improve intent→interpretation alignment (muster is the first named dial). Press the button: human→LLM antipattern, treating the model as a vending machine, atrophying critical thinking. Complementary pair — one names what works, the other names what doesn't. | SD-252 |
| v0.14 | 2026-03-01 | **Clear the Decks** added to Spaces & Registers. Force compaction order — confirms all durable writes complete before context window reset. | SD-267 |
| v0.15 | 2026-03-01 | **Learning in the Wild** added to Communication & Record. The discovery made while doing the work — the specimen collection that outweighs the microscope. Named by AnotherPair. | SD-TBD |
| v0.16 | 2026-03-01 | **Staining** added to Communication & Record. Applying a diagnostic artifact from one context to material from another, revealing structure that was present but invisible. Precise term: Gadamer's fusion of horizons. Operational verb: "have we stained this?" Discovered during Phase 4 post-merge recalibration. Maturin's analogical investigation confirmed the phenomenon has names in 9 domains. | SD-TBD |
| v0.17 | 2026-03-02 | **Model Triangulation** added to Integrity & Verification. Cross-model validation: run the same data through independent model families, compare convergence and divergence. Strong disclaimer: made-up term, not statistically validated, produced at 154kTok discovery pressure. The practice is older than the name. Antidote to slopodar #15. | SD-TBD |
| v0.18 | 2026-03-03 | **Polecats** added to Communication & Record. `claude -p` agents in a deterministic Makefile pipeline — our version of Stripe's minions. Fresh context, one-shot, no interactive steering. The compaction engine managed by design. First deployment: thepit-v2 calibration run. | SD-296 |
| v0.19 | 2026-03-03 | **HCI Foot Guns** section added (6 entries): Spinning to Infinity, High on Own Supply, The Dumb Zone, Cold Context Pressure, Hot Context Pressure, Compaction Loss. **Context Engineering** section added: Prime Context. Maturin's Mirror cross-referenced with Spinning to Infinity (tool vs pathology). All entries back-referenced to layer model. | SD-299 |

---

*The problem of governing semi-autonomous agents under uncertainty, with probabilistic communication, limited bandwidth, and high stakes for unverified action — that problem was solved at sea two hundred years before anyone wrote a line of code.*
