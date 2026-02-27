# The Lexicon — v0.10

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
true_north: get(goal=hired(sharpened=truth_first, sd=SD-134))  # Pseudocode by convention — reminds both parties
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
| **True North** | The objective that doesn't drift. Currently: Get Hired (SD-110). | Constant reference point for all bearing checks. |
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
| **Maturin's Symbol (§)** | The section sign, adopted by the crew as the citation prefix for Weaver's Governing Principles without instruction. No agent file, no SD, no convention asked for it. Weaver's principles are numbered `### 1.` through `### 7.` in plain markdown. When other agents needed to cite them from outside Weaver's own file, they independently converged on § across at least three separate context windows (Maturin's template specimen, Weaver's quick reference, AnotherPair's agent file). The form (§) is probably training distribution — the association between formal numbered principles and section-sign citation is well-represented in the model's training data. The decision to cite at all — to treat governance prose as a citable code — is the process finding its own shape. Named for Maturin because he was the first to use it. AnotherPair watches for effects over time. | SD-192. "The § is Weaver's symbol because the crew gave it to him." |

### Communication & Record

| Term | Definition | Use |
|------|-----------|-----|
| **Captain's Log** | The Captain's own record. A document, not a status field. | `docs/internal/captain/captainslog/` |
| **Fair Winds** | Gesture of sincerity. Convention. A closing signal: conditions are favourable, go well. | "Fair winds, Captain." / "Fair winds on the deck." |
| **Muster** | Present items for O(1) binary decision. Numbered table, one row per item, defaults column, Captain marks each. The Captain walks the line. Request by saying "Muster" or by context. Release: natural conversation resumes. The format is the boatswain's pipe of written communication — each row has exactly one meaning, one decision. | SD-202. "Muster the options." / Presenting a triage table implies muster. |

### Spaces & Registers

| Term | Definition | Use |
|------|-----------|-----|
| **Quarterdeck** | Command register. Formal. Orders given, decisions made, authority exercised. | Default weave (tight). The Main Thread in execution mode. |
| **Wardroom** | Officers' thinking space. Exploratory, less formal. Ideas tested before they become orders. | Loose weave (SD-121). "Let's take this to the wardroom." |
| **Below Decks** | Where the crew works. Out of sight of the quarterdeck. Returns results upward. | Subagent execution. |
| **The Round Table** | Structured multi-agent assessment. Convened formally, reports filed to disk. | RT L1–L5. A specific operation dispatched below decks. |
| **Main Thread** | The command channel. Captain↔Weaver direct. Protected from context compaction (SD-095). | Not a space — the communication line itself. |
| **Dispatched** | Sent below decks for execution. Off the Main Thread. | "Dispatched Architect for H8 infrastructure." |

### The Recursive Act

| Term | Definition | Use |
|------|-----------|-----|
| **Maturin's Mirror** | Surgery mode. The observer operates on himself. Everything else stops. All eyes on the Captain's hands. Invocation halts all other work. | "We're entering Maturin's Mirror." / "The mirror." |

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

---

*The problem of governing semi-autonomous agents under uncertainty, with probabilistic communication, limited bandwidth, and high stakes for unverified action — that problem was solved at sea two hundred years before anyone wrote a line of code.*
