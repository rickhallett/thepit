# Task IV-14: Write - Step 8: Interpreting and Communicating Eval Results

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-05 (Tier 3 external)
**Parallelizable with:** IV-15
**Output:** `docs/bootcamp/step-iv-08-interpreting-results.md`

---

## Objective

Write the full Step 8 content: "Interpreting and Communicating Eval Results." This
bridges evaluation science and decision-making. Field maturity: EMERGING.

Estimated target: 30-40k characters (~900-1200 lines). Shorter than the technical
steps - this is about interpretation, communication, and honesty.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
   (paper guardrail, analytical lullaby from slopodar)
3. `docs/bootcamp/tasks/iv-05-research-tier3-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 574-613 - the Step 8 outline

## Content Structure

### Mandatory Sections

1. **Why This is Step 8** - Frame: you can now design, build, and run evaluations.
   But eval results are not conclusions - they are data that must be interpreted.
   The gap between an eval score and a deployment decision is where most eval
   misuse lives. This step teaches honest interpretation.

2. **The gap between scores and decisions** - A score of 85% means different things:
   - 85% accuracy on medical diagnosis = potentially dangerous
   - 85% accuracy on content classification = probably acceptable
   - 85% accuracy on code generation = depends on the failure mode
   - Context determines whether a score is good enough

3. **Confidence intervals for eval results** - Small eval datasets produce noisy scores:
   - Bootstrap confidence intervals (connect to Bootcamp III Step 4)
   - "Our model scores 85% +/- 3% (95% CI)" is more honest than "scores 85%"
   - How to compute and report confidence intervals
   - What sample size gives useful precision?

4. **Comparing models honestly** - When is a 2% accuracy difference meaningful?
   - Statistical testing for eval comparisons (Bootcamp III Step 4)
   - The multiple comparisons problem (testing across many benchmarks)
   - Bonferroni correction
   - Practical guidance: when to trust a comparison, when to be skeptical

5. **Communicating eval limitations** - What the eval does NOT test:
   - Known blind spots
   - Population the eval samples from vs population the model will serve
   - The Anthropic observation about HELM scores and prompt format sensitivity
   - How to write an honest limitations section

6. **Eval reports as decision documents** - Structure for non-ML stakeholders:
   - Summary (one paragraph, no jargon)
   - Methodology (what was tested, how, with what data)
   - Results (with confidence intervals)
   - Limitations (what was NOT tested)
   - Recommendations (conditional: "if your use case requires X, then...")
   - Template suitable for enterprise procurement decisions

7. **Avoiding eval theatre** - The slopodar patterns applied to evaluation:
   - Paper guardrails: running evals for compliance optics, not genuine insight
   - An eval that always passes is not an eval - it is a rubber stamp
   - Analytical lullaby: warm numbers with no caveats. "95% accuracy across
     10,000 samples" sounds impressive until you learn the hard cases were excluded
   - How to detect and resist eval theatre in your own work

### Novel Content from This Project

- The paper guardrail pattern (slopodar) applied to evaluation
- The analytical lullaby pattern (slopodar) applied to eval reporting
- The connection to the oracle problem: if the eval designer's understanding
  of the task is wrong, even honest reporting propagates the error

### Exercises

No explicit exercises in the outline for this step. Design 2-3:
- Take an eval result (provided or from a previous exercise). Write two reports:
  one that commits the analytical lullaby, and one that communicates honestly.
  Compare them
- Given eval scores from 3 models on 5 benchmarks, determine which comparisons
  are statistically meaningful using confidence intervals and multiple comparison
  correction
- Write an eval report for a fictional enterprise stakeholder deciding whether
  to deploy an AI code review system. Include all sections from the template

### Agentic Grounding

Connect to:
- Why honest eval reporting matters for deployment decisions
- Why confidence intervals prevent overconfident claims
- Why eval theatre undermines trust in AI safety

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Statistics examples should use real numbers (not "X" and "Y")
- The eval report template should be directly usable
- Slopodar references must use actual pattern definitions
- Bootstrap CI code should be runnable Python
