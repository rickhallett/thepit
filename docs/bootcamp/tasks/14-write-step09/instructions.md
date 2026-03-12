# Task 14: Write - Step 9: Failure Modes and Recovery

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 05 (external refs for Step 9), Task 09 (Step 4), Task 11 (Step 6), Task 12 (Step 7)
**Parallelizable with:** Task 13 (Step 8) - different external refs, same prior dependencies
**Output:** `docs/bootcamp/step09-failure-modes.md`

---

## Objective

Write the full Step 9 content: "Failure Modes and Recovery." FRONTIER step. This
takes the HCI foot guns from Step 7 and puts them in operational depth: detection
heuristics, countermeasures, real examples. Also covers governance recursion, loom
speed, and the "rerun > fix in place" standing order.

Estimated target: 35-45k characters (~1000-1300 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - HCI foot guns, dead-reckoning, slopodar governance patterns
3. `docs/bootcamp/tasks/05-research-tier3-external/findings.md` - Bainbridge, WAL, SRE patterns
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 695-769 - the Step 9 outline
5. `docs/bootcamp/step04-context-engineering.md` - cold/hot pressure, compaction, dumb zone
6. `docs/bootcamp/step06-verification-quality.md` - verification discipline
7. `docs/bootcamp/step07-human-ai-interface.md` - foot guns introduced, layer model

## Content Structure

### Mandatory Sections

1. **Why This is Step 9** - Enterprise systems run continuously. Failures compound.
   These foot guns emerged from sustained operation over months. Naming is the first
   step to detection. Detection is the prerequisite for control.

2. **Spinning to infinity** - In depth:
   - What it looks like: "let's think about this more carefully" -> more analysis ->
     more meta-analysis -> analysis of the meta-analysis -> no decision made
   - Detection heuristic: "Is this producing a decision or producing more analysis?"
   - Countermeasure: time-box analysis, force a binary decision
   - Real example: reviewing a review of a test = stop
   - Layers: L9 (thread position accumulates), L3 (context fills with analysis)

3. **High on own supply** - In depth:
   - What it looks like: human proposes creative idea, agent validates and extends,
     human feels brilliant, agent amplifies, neither applies the brake
   - Detection heuristic: check bearing against primary objective ("does this get us hired?")
   - Countermeasure: fresh-context adversarial review (new agent, no sycophantic history)
   - Real example: the pilot study's positive feedback loops
   - Layers: L9 (accumulated praise), L12 (human ego)

4. **Cognitive deskilling** - In depth:
   - Unlike other foot guns: manifests across sessions and months, not within
   - Bainbridge's Ironies (1983): automation removes the practice that builds the
     expertise needed to supervise the automation
   - METR RCT evidence: developers are already slower but believe they're faster
   - Countermeasure: periodic deep engagement, not pure review mode. Write some
     code yourself. Solve problems manually. Keep the skill sharp.
   - The hardest foot gun because the feedback loop is the slowest

5. **Context degradation patterns** - Operational depth:
   - Dumb zone: how to detect (output "looks right" to non-experts, wrong to experts)
   - Cold pressure: how to detect (agent generates boilerplate, not project-specific code)
   - Hot pressure: how to detect (agent's answers become unfocused, tangential)
   - Compaction loss: how to detect (agent forgets decisions from earlier in session)
   - Session boundary amnesia: calibration resets even when facts survive

6. **When to reset vs fix in place** - Standing order:
   - Bad output -> diagnose root cause -> reset context -> rerun with correct input
   - Why fixing inline is worse: you're editing probabilistic output, introducing
     your edits into a context already contaminated by the wrong output
   - The contamination principle: once bad output is in context, it influences
     everything that follows (L9 self-reinforcement)
   - Rerunning is cheap. Context contamination is expensive.

7. **Checkpoint recovery** - The write-ahead log pattern applied to sessions:
   - Write intent before action (decisions to file before implementation)
   - Recover from last committed state (read durable state, reconstruct context)
   - The dead-reckoning protocol: navigate from last known position when visibility is lost
   - Practical: git log + decision files + AGENTS.md = checkpoint recovery kit

8. **Governance recursion** - The meta-governance trap:
   - When something goes wrong, instinct generates more governance
   - Another standing order, another protocol, another checklist
   - Each layer feels like progress. None prevents the original failure.
   - Detection: compare governance files (number, size) to test files (number, coverage)
   - The cure: mechanisms, not rules. Gates, not standing orders.

9. **Loom speed** - Granularity mismatch:
   - Detailed plan: 20 items, each with specific conditions
   - Execution: 5 regex sweeps that don't respect item boundaries
   - At machine speed, you discover what went wrong after it already happened
   - Countermeasure: execution granularity must match plan granularity
   - If the plan has 20 items, execution has 20 steps

### Challenges

Design 5-6 challenges:
- Foot gun identification (easy - given a scenario, name the foot gun)
- Spinning detection (medium - deliberate meta-analysis loop, detect and break it)
- Checkpoint recovery exercise (medium - given scattered durable state, reconstruct context)
- Governance recursion audit (medium - review a project's governance docs, identify recursion)
- Deskilling self-assessment (hard - honest assessment of which skills have atrophied)
- Contamination experiment (hard - deliberately contaminate context, observe downstream effects)

### Field Maturity

`> FIELD MATURITY: FRONTIER` throughout. Established foundations: Bainbridge (1983),
SRE incident response, WAL/checkpointing, METR RCT. Novel: all 7 foot guns as named
operational failures, governance recursion, loom speed, "rerun > fix in place" principle.

## Quality Constraints

- No emojis, no em-dashes
- Each foot gun needs a concrete, recognisable example - not hypotheticals
- Countermeasures must be actionable, not just "be careful"
- The cognitive deskilling section must be honest about its long timescale and difficulty
- Governance recursion is subtle - make it viscerally recognisable
