# Task IV-09: Write - Step 3: Scoring and Grading Methods

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-03 (Tier 1 external),
  IV-06 (eval frameworks)
**Parallelizable with:** IV-08 (once IV-07 establishes the voice)
**Output:** `docs/bootcamp/step-iv-03-scoring-grading.md`

---

## Objective

Write the full Step 3 content: "Scoring and Grading Methods." This covers the full
grading hierarchy: code-based, LLM-as-judge, and human evaluation. Field maturity:
EMERGING - the patterns exist but conventions are still forming.

Estimated target: 40-55k characters (~1200-1500 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks/iv-03-research-tier1-external/findings.md` - external references
4. `docs/bootcamp/tasks/iv-06-research-eval-frameworks/findings.md` - Inspect AI and
   OpenAI evals framework details
5. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 237-301 - the Step 3 outline

## Content Structure

### Mandatory Sections

1. **Why This is Step 3** - Frame: you have a dataset (Step 2) and understand what
   measurement means (Step 1). Now: how do you grade the output? The grading method
   determines the reliability of the entire evaluation. A good eval with a bad grader
   is a bad eval.

2. **The grading hierarchy** - Anthropic's recommendation: fastest and most reliable
   first. (1) Code-based grading. (2) LLM-based grading. (3) Human grading. Always
   start with code-based if possible. Connect to the verifiable/taste-required
   distinction from the project lexicon.

3. **Code-based grading** - The gold standard when applicable. Methods:
   - Exact match (`output == golden_answer`)
   - String containment (`key_phrase in output`)
   - Regex patterns
   - JSON schema validation
   - SQL execution and result comparison
   - Code compilation checks
   - When to use each. Worked examples in Python.

4. **LLM-as-judge** - The two-stage process: model generates, then a different model
   evaluates against a rubric. Cover:
   - Rubric design (the difference between "rate 1-5" useless and a rubric with
     specific criteria per level)
   - Empirical scales (1-5, correct/incorrect, multi-category)
   - Chain-of-thought grading (encourage reasoning before judgment)
   - Using a different model family for grading than generation
   - Worked example of a good rubric vs a bad rubric

5. **LLM-as-judge failure modes** - Critical section:
   - Position bias (first option preferred)
   - Verbosity bias (longer answers rated higher)
   - Self-preference (Claude rates Claude higher)
   - Format sensitivity
   - Mitigation strategies for each

6. **Human evaluation** - When unavoidable:
   - Inter-rater reliability and Cohen's kappa
   - Training protocols for human evaluators
   - A/B test design for preference evaluation
   - Crowdworker vs expert evaluators
   - Connect to the taste-required concept: some outputs can only be evaluated
     by humans (HODL territory)

7. **Scoring metrics** - Quick reference for metric selection:
   - Accuracy, precision, recall, F1
   - BLEU, ROUGE-L (and their limitations for LLM output)
   - Cosine similarity (embedding-based)
   - Custom metrics
   - When each is appropriate for which output type

8. **The Inspect AI scoring model** - Practical implementation:
   - Scorers as composable components
   - Built-in scorers (exact, includes, model_graded_fact, model_graded_qa)
   - Custom scorer implementation
   - Code examples using the Inspect API

9. **Calibrating graders** - Before using a grader at scale:
   - Run it against known-good and known-bad samples
   - Measure grader accuracy (precision, recall, F1 of the grader itself)
   - Iterate on the rubric until grader accuracy > 90%
   - This is meta-evaluation: evaluating the evaluator

### Novel Content from This Project

- The analyst agent (`.claude/agents/analyst.md`) as a worked example of an
  LLM-as-judge framework with structured XML evaluation prompts across 5 dimensions
- The darkcat review instructions as a specialised rubric for code review evaluation
- The triangulate matching algorithm as a custom scorer for cross-model finding
  comparison

### Exercises

3 exercises from the outline:
- Implement 3 graders for SQL generation: code-based (execute and compare),
  LLM-as-judge with rubric, string similarity. Compare agreement rates
- Build an LLM-as-judge rubric for code review quality. Test against 20 known
  good and 20 known bad. Measure precision and recall
- Calibrate an LLM grader on 50 samples with known grades. Report accuracy,
  false positive rate, false negative rate. Iterate if accuracy < 90%

### Agentic Grounding

Connect to:
- Why the grading hierarchy matters for eval infrastructure cost (code-based is
  free, LLM-based costs tokens, human costs time)
- Why using different model families for grading matters (L10/L11 - same model
  correlation vs cross-model independence)
- Why calibration prevents the "right answer wrong work" pattern (slopodar)

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Code examples must include both Python (raw) and Inspect AI patterns
- Rubric examples must be specific enough to be directly usable, not generic
- The grading hierarchy must be presented as engineering guidance, not dogma
