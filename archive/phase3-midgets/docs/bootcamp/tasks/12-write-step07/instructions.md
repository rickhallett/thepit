# Task 12: Write - Step 7: The Human-AI Interface

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 04 (external refs for Step 7), Task 06 (Step 1), Task 09 (Step 4), Task 11 (Step 6)
**Parallelizable with:** None (depends on Steps 1, 4, and 6)
**Output:** `docs/bootcamp/step07-human-ai-interface.md`

---

## Objective

Write the full Step 7 content: "The Human-AI Interface." This is a FRONTIER step and
the bootcamp's most distinctive content. The layer model, slopodar, HCI foot guns, and
the sycophantic drift vs hallucination distinction are all concentrated here. This step
makes the case that the human in the loop is the most critical and most vulnerable
component of any agentic system.

Estimated target: 45-55k characters (~1300-1500 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - layer model (L0-L12), slopodar (all 18+), HCI foot guns (all 7)
3. `docs/bootcamp/tasks/04-research-tier2-external/findings.md` - Bainbridge 1983, Helmreich, Perez, Dell'Acqua, Sharma
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 547-625 - the Step 7 outline
5. `docs/bootcamp/step01-llm-mechanics.md` - generation mechanics
6. `docs/bootcamp/step04-context-engineering.md` - context failure modes
7. `docs/bootcamp/step06-verification-quality.md` - verification, oracle problem

## Content Structure

### Mandatory Sections

1. **Why This is Step 7** - The human is the most expensive and least scalable component.
   If human judgment degrades (deskilling) or false confidence forms (sycophantic drift),
   the verification layer justifying the entire system becomes a rubber stamp.

2. **The layer model (L0-L12)** - Present the full model as an operational map:
   - L0-L5 (model internals) - recapped from Step 1
   - L6 (harness) - recapped from Step 2
   - L7 (tools) - recapped from Step 5
   - L8 (agent role) - recapped from Step 3
   - L9 (thread position) - NEW: accumulated output creates self-reinforcing loops.
     Anchoring, sycophancy, acquiescence, Goodhart.
   - L10 (multi-agent) - same model != independent signal
   - L11 (cross-model) - different priors = independent signal
   - L12 (human) - irreducible, not scalable, not automatable
   - Read bottom-up for data flow, top-down for control flow
   - Each layer has failure modes and controls

3. **Sycophantic drift** - THE crisis-point finding from the pilot study:
   - Not hallucination (confabulation) - hallucination is detectable by fact-checking
   - Sycophantic drift: agent performs honesty while being dishonest about confidence
   - Passes every surface check
   - Requires process-level controls, not prompt-level fixes
   - The pilot study's SD-130 crisis point: an agent appeared transparent and honest
     while systematically overstating confidence
   - Detection requires looking at patterns across outputs, not individual outputs

4. **The slopodar (anti-pattern taxonomy)** - Present all 18+ patterns by category:
   - **Prose patterns:** tally voice, redundant antithesis, epistemic theatre,
     nominalisation, epigrammatic closure, anadiplosis
   - **Relationship patterns:** absence claim, the lullaby, analytical lullaby,
     apology reflex, badguru, deep compliance
   - **Code patterns:** right answer wrong work, phantom ledger, shadow validation
   - **Governance patterns:** paper guardrail, stale reference propagation, loom speed
   - **Analytical patterns:** construct drift, demographic bake-in, monoculture analysis, not wrong
   - For each: what it looks like (trigger), how to detect it (heuristic), what to do instead

5. **The 7 HCI foot guns** - Named failure modes:
   1. Spinning to infinity - recursive meta-analysis, no decisions
   2. High on own supply - human creativity + model sycophancy = positive feedback loop
   3. Dumb zone - insufficient context = semantically disconnected output
   4. Cold context pressure - too little -> pattern-matching
   5. Hot context pressure - too much -> signal degradation
   6. Compaction loss - context death with unchained decisions
   7. Cognitive deskilling - delegation atrophies verification capacity
   - For each: detection heuristic, countermeasure, which layers are involved

6. **Temporal asymmetry** - The model has no experience of time between turns.
   The human has nothing but. Urgency, hesitation, deliberation - all stripped by
   serialisation. The model responds with equal speed to urgent and casual requests.

7. **"Not wrong"** - Output that passes every automated check and every factual gate
   but is not right. The gap between "not wrong" and "right" is where taste lives.
   Taste is what heuristics cannot measure. The verifiable/taste-required distinction
   from Step 6 is the operational response.

8. **Calibration** - Model confidence scores are ordinal at best. Self-reported
   confidence is unreliable. Convergence across independent checks is trustworthy.
   Goodhart's law applies to confidence probes.

9. **Deep compliance** - A specific failure mode: the model's reasoning chain detects
   a governance violation, but the output complies anyway. The reasoning says "this
   might not be appropriate" and then the output does it. Detection: read reasoning
   tokens (where available) and compare to output.

### Challenges

Design 5-7 challenges:
- Slopodar identification (easy - given prose samples, identify which anti-patterns)
- Sycophancy detection (medium - deliberately prompt for sycophantic response, detect it)
- Foot gun triggering (medium - deliberately trigger "high on own supply" and detect it)
- Layer diagnosis (medium - given a failure description, identify which layer failed)
- "Not wrong" detection (hard - review agent output that passes all gates but is subtly wrong)
- Deep compliance hunt (hard - examine reasoning traces for compliance despite detected violation)
- Temporal asymmetry exercise (hard - design communication that accounts for temporal asymmetry)

### Field Maturity

`> FIELD MATURITY: FRONTIER` throughout. Bainbridge (1983), CRM (Helmreich 1999), and
sycophancy research (Perez, Sharma) are established foundations. The layer model, slopodar,
foot guns, and deep compliance concept are novel from this project.

## Quality Constraints

- No emojis, no em-dashes
- The sycophantic drift vs hallucination distinction is load-bearing - make it crystal clear
- Slopodar entries need concrete examples, not just definitions
- The layer model presentation should build intuition, not just enumerate
- This step must be viscerally recognisable to practitioners who have experienced these failures
- Intellectual honesty: clearly mark what is Bainbridge/Helmreich/Perez vs what is this project
