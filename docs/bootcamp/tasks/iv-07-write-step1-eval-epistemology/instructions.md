# Task IV-07: Write - Step 1: What Evaluations Actually Measure

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-03 (external refs Tier 1)
**Parallelizable with:** None initially (first write task), but IV-08 and IV-09 can
follow once this establishes the voice
**Output:** `docs/bootcamp/step-iv-01-eval-epistemology.md`

---

## Objective

Write the full Step 1 content: "What Evaluations Actually Measure." This is the
epistemological foundation - the measurement problem that underlies all evaluation.
Field maturity: ESTABLISHED core (construct validity, Goodhart's law) with EMERGING
LLM-specific challenges (content contamination detection, dynamic benchmarks).

Estimated target: 40-55k characters (~1200-1500 lines), matching Bootcamp I step lengths.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks/iv-03-research-tier1-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 107-173 - the Step 1 outline

## Content Structure

Follow the format template from Task IV-01 findings. The outline specifies these topics:

### Mandatory Sections

1. **Why This is Step 1** - Frame: before you can evaluate anything, you must understand
   what evaluation actually tells you. The gap between "model scores 85% on this
   benchmark" and "model will work for my use case" is where most eval misuse lives.
   This step is the calibration of the instrument before you use it.

2. **The measurement problem** - What does an eval score actually tell you? Introduce
   the concept that evaluation is measurement, and all measurement has error,
   limitations, and assumptions. Frame for engineers, not philosophers.

3. **Construct validity** - Does the eval measure what it claims to measure? Use the
   Anthropic MMLU finding (formatting changes cause 5% accuracy swings) as the
   anchor example. The eval partly measures prompt sensitivity, not knowledge.
   Draw from Messick (1989) for the psychometric framework.

4. **Content contamination** - When benchmark data appears in training data, the eval
   measures memorisation, not capability. The "students seeing the test" analogy.
   Dynamic benchmarks vs static benchmarks. Connect to L0 in the layer model
   (training data is frozen at weights level).

5. **Saturation** - When models approach ceiling on a benchmark, the eval loses
   discriminative power. MMLU approaching saturation. What replaces saturated
   benchmarks? Connect to the lifecycle of an eval.

6. **Ecological validity** - How well does the eval correspond to real-world use?
   Multiple choice tests vs open-ended conversation. SWE-bench's advantage:
   real GitHub issues, not synthetic problems.

7. **The evaluator's regress** - Who evaluates the evaluator? When using LLM-as-judge,
   the judge has its own biases. When using human judges, humans disagree. Introduce
   inter-rater reliability and Cohen's kappa. Connect to L12 in the layer model
   (the oracle problem - human evaluator error propagates through all layers).

8. **Goodhart's law applied to evals** - When a measure becomes a target, it ceases to
   be a good measure. Models optimised for benchmark performance vs real-world utility.
   The leaderboard incentive structure.

9. **Sensitivity vs specificity** - False positives (eval says it works, it doesn't)
   vs false negatives (eval says it fails, it works). Which error is more costly
   depends on domain. Medical diagnosis analogy. Connect to safety evaluation
   (Step 7 preview: for safety, false negatives are catastrophic).

### Layer Model Integration

Explicitly map content to the layer model:
- L0 WEIGHTS: content contamination lives here (training data is frozen)
- L3 CONTEXT: eval sensitivity to prompt formatting lives here
- L12 HUMAN: the oracle problem - evaluator error propagates through all layers

### Novel Content from This Project

Use `> NOVEL:` or equivalent blockquote convention for:
- The "not wrong" concept from the slopodar applied to evals - an eval can be
  technically correct (all assertions pass) and still measure the wrong thing
- The connection between eval measurement problems and the layer model
- The oracle problem (L12) applied to evaluation design

### Challenges

Design 4-6 challenges of increasing difficulty:
- Construct validity analysis (easy - given a benchmark description, identify what it
  actually measures vs what it claims to measure)
- Contamination detection (medium - design a test to check whether a model has memorised
  a specific benchmark's answers)
- Eval sensitivity test (medium - take an existing eval, change the prompt format,
  measure the score difference)
- Goodhart's law in action (hard - design an eval for a real task, then show how a model
  could game it without improving at the actual task)
- Design a dynamic benchmark (hard - design an eval that resists contamination through
  periodic regeneration)

### Agentic Grounding

Use `> AGENTIC GROUNDING:` blockquotes connecting to:
- Why understanding construct validity matters when designing evals for agent systems
- Why contamination awareness matters when selecting benchmarks for model comparison
- Why the oracle problem matters for human-in-the-loop verification

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Prose style matches Bootcamp I: direct, technical, no filler
- Every section answers "why does this matter for evaluation practice?"
- Cite sources precisely (Anthropic 2023, Messick 1989, Goodhart 1984)
- Mark the field/novel boundary honestly in every section
