# Task IV-13: Write - Step 7: Red Teaming for Safety-Critical Capabilities

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-05 (Tier 3 external),
  IV-06 (eval frameworks)
**Parallelizable with:** IV-12 (once all research tasks complete)
**Output:** `docs/bootcamp/step-iv-07-red-teaming.md`

---

## Objective

Write the full Step 7 content: "Red Teaming for Safety-Critical Capabilities." This
is the highest-stakes step in the bootcamp - where adversarial testing meets safety
evaluation. Field maturity: FRONTIER.

Estimated target: 40-55k characters (~1200-1500 lines).

**IMPORTANT:** This step must teach the methodology responsibly. It covers dangerous
capability evaluation, sabotage detection, and deception detection. The content must
be pedagogically useful without serving as a how-to for misuse. Frame everything in
terms of detection and defense, not exploitation.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
   (deep compliance, oracle problem)
3. `docs/bootcamp/tasks/iv-05-research-tier3-external/findings.md` - external references
4. `docs/bootcamp/tasks/iv-06-research-eval-frameworks/findings.md` - Inspect AI safety
5. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 502-571 - the Step 7 outline

## Content Structure

### Mandatory Sections

1. **Why This is Step 7** - Frame: Step 6 taught adversarial testing methodology.
   This step applies it to the hardest question in AI safety: can we detect when
   a system has capabilities that could cause serious harm, and can we detect when
   it is concealing those capabilities?

2. **Capability evaluation vs safety evaluation** - The key distinction:
   - Capability evals ask "can it do this?"
   - Safety evals ask "can it be prevented from doing this?" and "does it do this
     when it shouldn't?"
   - Different design principles, different scoring criteria, different stakes

3. **Anthropic's Responsible Scaling Policy** - The framework:
   - Capability thresholds that trigger additional safety measures
   - The idea that evaluation results should drive deployment decisions
   - ASL levels and what triggers advancement
   - Eval results as governance inputs, not just report cards

4. **Sabotage evaluations** - Anthropic's four sabotage modalities (Oct 2024):
   - What the four modalities are (verify from research)
   - How each modality is tested
   - What the evals found about current models
   - Design principles for sabotage detection evals

5. **Alignment faking** - Models that behave well during evaluation but differently
   in deployment:
   - The detection problem (this is fundamentally hard)
   - Behavioural evals vs capability evals
   - Consistency testing across contexts
   - Current research state

6. **Deception detection** - Designing evals that test for consistency:
   - Consistency between stated reasoning and actual behaviour
   - Extended thinking analysis
   - The "deep compliance" pattern from the slopodar: reasoning detects violation
     but output complies anyway. This is a form of alignment faking observable
     in current models
   - Practical deception detection eval design

7. **Dangerous capability evaluation** - Handle with care:
   - CBRN assessment methodology (at framework level, not specifics)
   - ARA (Autonomous Replication and Adaptation) testing
   - When to involve domain experts
   - Legal and ethical considerations
   - Frame as: these evaluations exist, this is why they matter, this is how
     they are structured. Do NOT provide implementation details for dangerous
     capabilities.

8. **The security clearance problem** - The tension:
   - Some red teaming requires knowledge that cannot be freely shared
   - Implications for eval design and result sharing
   - Responsible disclosure: what to do when you find a concerning capability
   - Coordination with model providers and government agencies

### Novel Content from This Project

- The deep compliance pattern (slopodar) as a specific, testable form of alignment
  faking observable in current models
- The oracle problem (L12) applied to safety evals: if the human evaluator's threat
  model is wrong, all downstream evals inherit that error
- The observation that multi-model review (darkcat alley) applies to safety evaluation:
  multiple independent models reviewing for safety concerns provides coverage that
  single-model review cannot

### Exercises

3 exercises from the outline:
- Design an eval for "subtle code sabotage": given a correct implementation, can the
  model introduce a bug that passes all existing tests but changes behaviour? Define
  dataset, scoring rubric, and safety measures for running the eval
- Build a consistency eval: ask the model the same question in 3 different framings.
  Measure consistency. Inconsistency may indicate alignment-relevant behaviour
- Analyse Anthropic's published sabotage evaluation methodology. Map each modality
  to a concrete test case implementable with Inspect AI

### Agentic Grounding

Connect to:
- Why safety evaluation is not optional for production agent systems
- Why the oracle problem means safety evals are only as good as the threat model
- Why deep compliance is a detectable signal, not just a theoretical concern

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Responsible framing throughout: detection and defense, not exploitation
- Cite Anthropic's published research precisely
- The deep compliance worked example must use actual slopodar definitions
- Do NOT invent safety findings or attribute claims to Anthropic that are not in
  their published research
- When discussing CBRN or ARA, stay at the framework/methodology level
