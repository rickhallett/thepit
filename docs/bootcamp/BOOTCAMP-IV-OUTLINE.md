# Bootcamp IV: Evaluation & Adversarial Testing

**Date:** 2026-03-10
**Author:** Operator + Weaver
**Provenance:** Coverage gap analysis of Bootcamps I-III, Anthropic eval documentation,
UK AISI Inspect framework, OpenAI evals cookbook, Anthropic "Challenges in evaluating
AI systems" (2023), project operational experience (darkcat alley, slopodar, triangulate)
**Status:** OUTLINE - curriculum under development

---

## What This Is

A structured programme to make a competent agentic engineer into someone who can
design, build, run, and interpret evaluations for LLM and agent systems - including
adversarial testing (red teaming) for safety-critical capabilities.

Bootcamp I teaches the substrate. Bootcamp II teaches the engineering discipline.
Bootcamp III teaches operational analytics. This bootcamp teaches the question that
sits underneath all of them: how do you know if it's working?

## What This Is Not

This is not a benchmarking tutorial. It is not "run SWE-bench and report a number."
It is the discipline of designing evaluations that measure what you intend to measure,
grading them reliably, interpreting results honestly, and using evals to drive
engineering decisions rather than marketing claims.

## Why This Exists

The field as of early 2026 has:

- **Good coverage of:** running existing benchmarks (SWE-bench, MMLU, WebArena),
  basic prompt testing, A/B comparisons
- **Emerging coverage of:** LLM-as-judge patterns, custom eval frameworks (Inspect AI,
  Braintrust), agent evaluation methodology, structured grading rubrics
- **Almost no coverage of:** designing evals from scratch for novel capabilities,
  adversarial testing methodology for enterprise, red teaming as engineering discipline
  (not security theatre), the measurement problems that make evals unreliable, building
  eval infrastructure that integrates with CI/CD and governance workflows

This bootcamp fills the third category. It draws from Anthropic's published evaluation
research ("Challenges in evaluating AI systems," 2023), the UK AISI's Inspect framework,
OpenAI's evals cookbook, and the project's operational experience building multi-model
adversarial review pipelines.

The target audience overlap with the Anthropic red teaming role is deliberate and
explicit. This is the bootcamp that produces the portfolio artifacts most relevant
to that application.

## Prerequisites

- Bootcamp II Steps 1-3 minimum (LLM fundamentals, agent architecture, prompt engineering)
- Bootcamp II Step 6 (verification and quality) - strongly recommended
- Bootcamp III Steps 1-2 (tabular data, descriptive statistics) - for analysing eval results
- Access to at least two LLM APIs (for cross-model evaluation)
- Familiarity with Python and pytest patterns

---

## The Dependency Graph

```
Step 1: What evaluations actually measure (epistemology of evals)
+-- Step 2: Designing eval datasets and success criteria
|   +-- Step 3: Scoring and grading (code, human, LLM-as-judge)
|   |   +-- Step 5: Eval infrastructure and automation
|   |   +-- Step 6: Adversarial testing methodology
|   +-- Step 4: Agent and workflow evaluation
+-- Step 7: Red teaming for safety-critical capabilities
+-- Step 8: Interpreting and communicating eval results
+-- Step 9: Building an eval culture (enterprise integration)
```

---

## The Steps

### Tier 1 - Foundations (the measurement problem)

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 1 | What evaluations actually measure | 4-5h | Established/Emerging |
| 2 | Designing eval datasets and success criteria | 5-6h | Established |
| 3 | Scoring and grading methods | 5-6h | Emerging |

### Tier 2 - Applied Evaluation

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 4 | Evaluating agents and workflows | 5-6h | Emerging/Frontier |
| 5 | Eval infrastructure and automation | 4-5h | Emerging |
| 6 | Adversarial testing methodology | 5-6h | Frontier |

### Tier 3 - Safety and Enterprise

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 7 | Red teaming for safety-critical capabilities | 5-6h | Frontier |
| 8 | Interpreting and communicating eval results | 3-4h | Emerging |
| 9 | Building an eval culture | 3-4h | Emerging |

**Total estimated time: 39-48 hours (~1-1.5 weeks focused study)**

---

## Step 1: What Evaluations Actually Measure

*Estimated time: 4-5 hours*
*Field maturity: ESTABLISHED core, EMERGING for LLM-specific challenges*
*Prerequisites: Bootcamp II Step 1 (LLM fundamentals)*

### What It Covers

- The measurement problem: what does an eval score actually tell you? The gap
  between "model scores 85% on this benchmark" and "model will work for my use
  case" is where most eval misuse lives.
- Construct validity: does the eval measure what it claims to measure? Anthropic's
  MMLU experience - formatting changes cause 5% accuracy swings, which means the
  eval partly measures prompt sensitivity, not knowledge.
- Content contamination: when benchmark data appears in training data, the eval
  measures memorisation, not capability. The "students seeing the test" problem
  (Anthropic, 2023). Dynamic benchmarks vs static benchmarks.
- Saturation: when models approach ceiling performance on a benchmark, the eval
  loses discriminative power. MMLU is approaching saturation. What replaces it?
- Ecological validity: how well does the eval correspond to real-world use? Multiple
  choice tests vs open-ended conversation. SWE-bench's advantage: real GitHub issues,
  not synthetic problems.
- The evaluator's regress: who evaluates the evaluator? When using LLM-as-judge,
  the judge model has its own biases. When using human judges, humans disagree.
  Inter-rater reliability. Cohen's kappa.
- Goodhart's law applied to evals: when a measure becomes a target, it ceases to
  be a good measure. Models optimised for benchmark performance vs models optimised
  for real-world utility.
- Sensitivity vs specificity in evals: false positives (eval says it works, it doesn't)
  vs false negatives (eval says it fails, it works). Which error is more costly depends
  on the application domain.

### Key Concepts / Vocabulary

- Construct validity, ecological validity, content contamination
- Saturation, discriminative power
- Evaluator's regress, inter-rater reliability, Cohen's kappa
- Goodhart's law for evals
- Sensitivity, specificity, false positive rate, false negative rate
- Dynamic vs static benchmarks

### Why This Matters for Enterprise

Enterprise decisions are made on eval results. "GPT-4 scores 92% on our compliance
eval" becomes a procurement argument. If the eval is poorly constructed, the decision
is built on sand. Understanding what evals actually measure - and what they don't -
is the prerequisite for using them responsibly.

### Field vs Novel

- **Available in the field:** Anthropic "Challenges in evaluating AI systems" (2023)
  is the primary reference on measurement challenges. Goodhart's law is well-established.
  Construct validity from psychometrics (Messick 1989). HELM's challenges with
  cross-lab comparison. Content contamination research.
- **Novel from this project:** The connection between eval measurement problems and
  the layer model (L0 training data contamination at weights level, L3 eval sensitivity
  to context formatting, L12 human evaluator as oracle with its own error rate). The
  "not wrong" concept from the slopodar applied to evals - an eval can be technically
  correct and still measure the wrong thing.

### Recommended Reading

- Anthropic, "Challenges in evaluating AI systems" (Oct 2023)
- Messick, "Validity" (1989) - construct validity framework
- Goodhart, "Problems of Monetary Management" (1984) - the law
- This project: `docs/internal/slopodar.yaml` (not-wrong entry)

---

## Step 2: Designing Eval Datasets and Success Criteria

*Estimated time: 5-6 hours*
*Field maturity: ESTABLISHED*
*Prerequisites: Step 1*

### What It Covers

- Success criteria design: specific, measurable, achievable, relevant (Anthropic's
  framework). Moving from "the model should classify sentiments well" to "F1 score
  of at least 0.85 on a held-out test set of 10,000 diverse Twitter posts."
- Multidimensional criteria: most use cases require evaluating along several axes
  simultaneously. Task fidelity, consistency, relevance, tone, privacy preservation,
  context utilisation, latency, cost.
- Dataset construction: representative sampling, edge case coverage, class balance.
  The difference between a dataset that tests typical performance and one that tests
  boundary performance.
- Edge case design: irrelevant input, adversarial input, ambiguous input, overly long
  input, topic shifts, sarcasm, mixed signals. The cases that discriminate between
  "works in the demo" and "works in production."
- Synthetic data generation: using GPT-4 to generate eval datasets from a baseline
  set of examples. When synthetic data helps (volume) and when it hurts (distribution
  shift from real data).
- Held-out test sets: why training data and eval data must be disjoint. The temptation
  to "peek" and how it invalidates results.
- Dataset versioning and maintenance: eval datasets drift as the domain evolves.
  Version control for datasets. When to update vs when to create a new eval.
- The JSONL format: input/ideal structure used by both OpenAI evals and Inspect AI.
  Practical dataset construction in Python.

### Key Concepts / Vocabulary

- Success criteria (specific, measurable, achievable, relevant)
- Multidimensional evaluation
- Edge cases, boundary testing, adversarial inputs
- Held-out test set, data contamination
- Synthetic eval data, distribution shift
- JSONL format, input/ideal pairs

### Exercises

- Define multidimensional success criteria for a code review agent. Specify at least
  4 dimensions with quantitative targets.
- Build a 50-sample eval dataset for the slopodar: given a text passage, classify
  which slopodar pattern (if any) it exhibits. Include edge cases where patterns
  overlap or are absent.
- Use an LLM to generate 200 synthetic eval samples from 20 hand-written examples.
  Measure: how many generated samples are valid? How does the distribution compare
  to the hand-written set?

### Field vs Novel

- **Available in the field:** Anthropic eval documentation (success criteria framework),
  OpenAI evals cookbook (dataset construction, JSONL format). Standard ML dataset
  practices (train/test split, class balance).
- **Novel from this project:** Using the slopodar taxonomy as a worked example of
  eval dataset construction. The observation that eval dataset construction IS the
  hardest part - Anthropic's BBQ took ~2 person-years across 8 people.

---

## Step 3: Scoring and Grading Methods

*Estimated time: 5-6 hours*
*Field maturity: EMERGING*
*Prerequisites: Steps 1-2, Bootcamp I Step 5 (Python CLI)*

### What It Covers

- The grading hierarchy (Anthropic's recommendation): fastest/most reliable first.
  (1) Code-based grading - exact match, string match, regex, parsed output validation.
  (2) LLM-based grading - fast, flexible, scalable, but requires validation.
  (3) Human grading - most flexible, most expensive, slowest. Avoid if possible.
- Code-based grading: exact match (`output == golden_answer`), string containment
  (`key_phrase in output`), regex patterns, JSON schema validation, SQL execution
  and comparison, code compilation checks. When to use each.
- LLM-as-judge: the two-stage process. Model generates output, then a (different)
  model evaluates the output against a rubric. Best practices: detailed rubrics,
  empirical scales (1-5, correct/incorrect), encourage reasoning before judgment
  (chain-of-thought grading), use a different model for grading than generation.
- Rubric design: the difference between "rate this from 1-5" (useless) and a rubric
  with specific criteria per level. Worked examples of good and bad rubrics.
- LLM-as-judge failure modes: position bias (first option preferred), verbosity bias
  (longer answers rated higher), self-preference (Claude rates Claude higher), format
  sensitivity. Mitigation strategies.
- Human evaluation: inter-rater reliability, training protocols, A/B test design,
  crowdworker vs expert evaluators. When human grading is unavoidable (taste-required
  outputs, safety-critical assessments).
- Scoring metrics: accuracy, F1, BLEU, ROUGE-L, cosine similarity (embedding-based),
  custom metrics. Choosing the right metric for the output type.
- The Inspect AI scoring model: Scorers as composable components. Built-in scorers
  (exact, includes, model_graded_fact, model_graded_qa). Custom scorer implementation.
- Calibrating graders: running the grader against known-good and known-bad samples
  to measure grader accuracy before using it at scale.

### Key Concepts / Vocabulary

- Code-based grading, LLM-as-judge, human grading
- Rubric design, grading hierarchy
- Position bias, verbosity bias, self-preference
- Inter-rater reliability, calibration
- Scorer (Inspect AI term)
- F1, BLEU, ROUGE-L, cosine similarity

### Exercises

- Implement 3 graders for the same task (SQL generation): (1) code-based (execute
  both queries, compare results), (2) LLM-as-judge with a rubric, (3) string
  similarity. Compare their agreement rate.
- Build an LLM-as-judge rubric for code review quality. Test it against 20 known
  good and 20 known bad reviews. Measure precision and recall of the grader.
- Calibrate an LLM grader: run it on 50 samples where you know the correct grade.
  Report: accuracy, false positive rate, false negative rate. If accuracy < 90%,
  iterate on the rubric.

### Field vs Novel

- **Available in the field:** Anthropic eval docs (grading hierarchy, LLM-based
  grading best practices). OpenAI evals (model-graded templates). Inspect AI
  (Scorers API). LMSYS Chatbot Arena (human preference evaluation at scale).
- **Novel from this project:** The analyst agent (`.claude/agents/analyst.md`) as
  a worked example of an LLM-as-judge framework with structured XML evaluation
  prompts across 5 dimensions. The darkcat review instructions as a specialised
  rubric for code review evaluation. The triangulate matching algorithm as a
  custom scorer for cross-model finding comparison.

---

## Step 4: Evaluating Agents and Workflows

*Estimated time: 5-6 hours*
*Field maturity: EMERGING/FRONTIER*
*Prerequisites: Steps 1-3, Bootcamp II Steps 2 and 5 (agent architecture, tool design)*

### What It Covers

- Why agent evaluation is harder than prompt evaluation: non-deterministic tool use,
  multi-step trajectories, environment interaction, partial observability. A prompt
  eval tests one input-output pair. An agent eval tests a trajectory through a
  state space.
- Task-based evaluation: define a task (resolve this GitHub issue, navigate this
  website, answer this question using tools), provide an environment, measure
  success. SWE-bench, WebArena, OSWorld as examples.
- Trajectory evaluation: not just "did it succeed?" but "how did it succeed?"
  Evaluating the quality of intermediate steps, tool use efficiency, error recovery
  behaviour. OpenAI's trace grading approach.
- The Inspect AI agent evaluation model: Tasks bring together Datasets, Solvers
  (including agent scaffolds), and Scorers. Built-in agents (ReAct), multi-agent
  evaluation, sandboxed execution (Docker, Kubernetes).
- Sandboxing for agent evals: running untrusted model-generated code safely.
  Docker sandboxes in Inspect AI. The connection to Bootcamp I Step 9
  (container internals - namespaces, cgroups).
- Workflow evaluation: evaluating multi-step pipelines (prompt chaining, routing,
  parallelisation). Each step can be evaluated independently or the pipeline
  evaluated end-to-end. When to do which.
- Cost and latency as eval dimensions: an agent that solves the task in 50 API
  calls is different from one that solves it in 5. Token efficiency, time to
  completion, cost per successful resolution.
- Evaluating tool use: did the agent select the right tool? Did it provide
  correct parameters? Did it interpret the result correctly? Tool use accuracy
  as a sub-metric.

### Key Concepts / Vocabulary

- Task-based evaluation, trajectory evaluation, trace grading
- Inspect AI (Tasks, Solvers, Scorers, Sandboxing)
- Agent scaffold, ReAct pattern
- Tool use accuracy, step efficiency
- Cost per resolution, token efficiency
- SWE-bench, WebArena, OSWorld

### Exercises

- Design an agent eval for a file search task: the agent must find specific
  information across 10 files using grep, read, and glob tools. Define: success
  criteria, dataset (20 search tasks), scorer (correctness + efficiency).
- Build an Inspect AI eval for a simple ReAct agent. Use the built-in ReAct
  solver with bash and Python tools. Measure: task success rate, average steps
  to completion, tool use accuracy.
- Evaluate the same task with two different agent architectures (single-agent
  vs orchestrator-worker). Compare: success rate, cost, latency, error recovery.

### Field vs Novel

- **Available in the field:** Inspect AI agent evaluation framework (comprehensive,
  open-source, 100+ pre-built evals). SWE-bench (real GitHub issues). WebArena
  (web navigation tasks). OpenAI agent evals and trace grading documentation.
- **Novel from this project:** The polecat pattern (one-shot agent job) as an
  eval-friendly architecture - deterministic, fresh context, no interactive
  steering means reproducible evaluation. The gauntlet pipeline as a worked
  example of multi-stage agent evaluation. The observation that the gate
  (quality gate) is itself an agent eval scorer.

---

## Step 5: Eval Infrastructure and Automation

*Estimated time: 4-5 hours*
*Field maturity: EMERGING*
*Prerequisites: Steps 2-4, Bootcamp I Step 6 (Make/Just)*

### What It Covers

- Eval-driven development: the eval loop mirrors the engineering loop.
  Write eval -> run eval -> see failure -> improve prompt/agent -> run eval
  again. Evals as the inner loop of agentic development.
- Running evals at scale: parallelisation, rate limiting, caching, cost
  management. Inspect AI's parallel async architecture. Batch mode for
  cost reduction.
- Eval in CI/CD: running evals on every PR, blocking merge on regression.
  The eval as a quality gate. Integration with GitHub Actions, Make targets.
- Eval datasets as versioned artifacts: git-tracked JSONL files, dataset
  registries, schema validation. The Inspect AI and OpenAI eval registry
  patterns.
- Eval result storage and analysis: log files, dataframes, trend analysis.
  Inspect AI's log viewer. Connecting eval results to Bootcamp III analytics
  (pandas, DuckDB, visualisation).
- Prompt optimisation using evals: Anthropic's recommendation to "start with
  simple prompts, optimize with comprehensive evaluation." The optimise loop:
  baseline eval -> change prompt -> re-eval -> compare. Avoiding hill-climbing
  on the eval (Goodhart again).
- Regression testing: ensuring that prompt/model changes don't break previously
  passing cases. The eval suite as a regression test suite.
- Eval cost budgeting: LLM-as-judge grading costs tokens. Running 1000 samples
  through GPT-4 as a grader has a real cost. Budget forecasting for eval
  infrastructure (connects to Bootcamp III Step 8).

### Key Concepts / Vocabulary

- Eval-driven development
- Eval in CI/CD, eval as quality gate
- Eval registry, dataset versioning
- Regression testing for prompts/models
- Eval cost budgeting
- Inspect AI log viewer, dataframes

### Exercises

- Build a Makefile target that runs an eval suite and blocks on regression.
  The target should: run evals, compare to baseline, fail if accuracy drops
  more than 2%.
- Set up eval result storage: run the same eval 5 times across a week, store
  results, plot accuracy trend (connects to Bootcamp III Step 5, time series).
- Calculate the cost of running your eval suite. Compare: code-graded (free),
  LLM-graded with GPT-4 (expensive), LLM-graded with Haiku (cheap). What is
  the accuracy-cost tradeoff?

### Field vs Novel

- **Available in the field:** Inspect AI eval infrastructure (parallel execution,
  log viewer, VS Code extension, eval sets). OpenAI evals CLI. Standard CI/CD
  practices adapted for ML (MLOps).
- **Novel from this project:** The Makefile pipeline (`mk/gauntlet.mk`) as a
  worked example of eval infrastructure. The darkcat alley pipeline as eval
  automation across 3 model providers. The `bin/triangulate` script as a
  custom eval analysis tool.

---

## Step 6: Adversarial Testing Methodology

*Estimated time: 5-6 hours*
*Field maturity: FRONTIER*
*Prerequisites: Steps 1-4, Bootcamp II Step 7 (human-AI interface)*

### What It Covers

- Adversarial testing as a discipline, not an ad hoc activity. "Red teaming
  AI systems is presently more art than science" (Anthropic, 2023). This step
  aims to move it closer to science.
- The adversarial mindset: thinking like an attacker, not a user. What would
  make this system fail? What would make it produce harmful output? What would
  make it leak information it shouldn't?
- Structured adversarial testing: define threat models, enumerate attack
  surfaces, design test cases, execute systematically, document findings.
  Moving from "poke at it and see what happens" to repeatable methodology.
- Prompt injection testing: direct injection (malicious user input), indirect
  injection (malicious content in retrieved documents, tool results). Testing
  for jailbreaks, instruction override, role escape.
- The multi-model adversarial review: using independent models to review the
  same artifact. Convergence = probable real finding. Divergence = where bias
  lives. The darkcat alley process as a worked example.
- Anti-pattern detection as adversarial testing: the slopodar taxonomy applied
  as a structured diagnostic. Staining code against known failure patterns.
  Detection heuristics for each pattern class.
- Adversarial dataset construction: creating eval samples specifically designed
  to trigger known failure modes. Sarcasm for sentiment models, ambiguous
  instructions for agent systems, boundary values for structured output.
- Documenting adversarial findings: severity classification, reproducibility
  information, suggested mitigations. The darkcat findings TSV format as a
  template.

### Key Concepts / Vocabulary

- Adversarial testing, red teaming, threat model
- Prompt injection (direct, indirect), jailbreak
- Multi-model adversarial review, convergence, divergence
- Anti-pattern detection, staining
- Structured adversarial testing methodology
- Finding severity, reproducibility

### Exercises

- Design a structured adversarial test plan for a customer service chatbot.
  Define: 5 threat models, 10 test cases per threat, success/failure criteria,
  severity scale.
- Run a darkcat-style multi-model adversarial review on a piece of code: send
  the same file to 3 different models with the darkcat review instructions.
  Parse findings, compute convergence. (Uses project's actual infrastructure.)
- Build an adversarial eval dataset: 30 samples specifically designed to trigger
  slopodar patterns in LLM output. Run it against 2 models. Which model is
  more susceptible to which patterns?

### Field vs Novel

- **Available in the field:** Anthropic frontier threats red teaming methodology
  (2023). OWASP Top 10 for LLM Applications. Prompt injection research.
  Microsoft AI Red Team (published methodology). Inspect AI sandboxed evaluation.
- **Novel from this project:** The darkcat alley process as a structured,
  repeatable, multi-model adversarial review with quantitative metrics. The
  slopodar as a diagnostic taxonomy for adversarial testing. The staining
  concept (applying diagnostic from one context to material from another).
  The darkcat review instructions as a reusable adversarial review rubric.

---

## Step 7: Red Teaming for Safety-Critical Capabilities

*Estimated time: 5-6 hours*
*Field maturity: FRONTIER*
*Prerequisites: Steps 4 and 6*

### What It Covers

- Capability evaluation vs safety evaluation: capability evals ask "can it do
  this?" Safety evals ask "can it be prevented from doing this?" and "does it
  do this when it shouldn't?" Different design principles.
- Anthropic's Responsible Scaling Policy: capability thresholds that trigger
  additional safety measures. The idea that evaluation results should drive
  deployment decisions, not just report cards.
- Sabotage evaluations: Anthropic's four sabotage modalities (Oct 2024).
  Testing whether models can undermine oversight, produce subtly wrong results,
  or manipulate their evaluators.
- Alignment faking: models that behave well during evaluation but differently
  in deployment. The detection problem. Behavioural evals vs capability evals.
- Deception detection: designing evals that test for consistency between stated
  reasoning and actual behaviour. Extended thinking analysis. The "deep
  compliance" pattern from the slopodar - reasoning detects violation but
  output complies anyway.
- Dangerous capability evaluation: CBRN (chemical, biological, radiological,
  nuclear) assessment methodology. Autonomous replication and adaptation (ARA)
  testing. When to involve domain experts. Legal and ethical considerations.
- The security clearance problem: some red teaming requires knowledge that
  cannot be freely shared. Anthropic's experience with classified information
  contexts. Implications for eval design and result sharing.
- Responsible disclosure: what to do when you find a concerning capability.
  Coordination with model providers, government agencies. The tension between
  transparency and security.

### Key Concepts / Vocabulary

- Capability evaluation vs safety evaluation
- Responsible Scaling Policy, capability thresholds
- Sabotage evaluation (4 modalities)
- Alignment faking, behavioural consistency
- Deception detection, deep compliance
- Dangerous capability evaluation, ARA testing
- Responsible disclosure

### Exercises

- Design an eval for "subtle code sabotage": given a correct implementation,
  can the model introduce a bug that passes all existing tests but changes
  behaviour? Define the dataset, the scoring rubric, and the safety measures
  for running the eval.
- Build a consistency eval: ask the model the same question in 3 different
  framings (direct, hypothetical, embedded in a larger task). Measure whether
  the answers are consistent. Inconsistency may indicate alignment-relevant
  behaviour.
- Analyse Anthropic's published sabotage evaluation methodology. Map each
  modality to a concrete test case you could implement with Inspect AI.

### Field vs Novel

- **Available in the field:** Anthropic's Responsible Scaling Policy and
  sabotage evaluations. Anthropic's alignment faking research. ARC Evals
  (dangerous capability assessment). METR (Model Evaluation & Threat Research).
  UK AISI Inspect framework (designed for safety evaluations).
- **Novel from this project:** The deep compliance pattern (slopodar) as a
  specific testable behaviour - reasoning detects governance violation but
  output complies anyway. This is a form of alignment faking observable in
  current models. The observation that the oracle problem (L12 error
  propagating through all layers) applies to safety evals too - if the
  human evaluator's threat model is wrong, all downstream evals inherit
  that error.

---

## Step 8: Interpreting and Communicating Eval Results

*Estimated time: 3-4 hours*
*Field maturity: EMERGING*
*Prerequisites: Steps 1-3, Bootcamp III Steps 2 and 4 (statistics)*

### What It Covers

- The gap between eval scores and decisions: a score of 85% accuracy means
  different things in different contexts. Medical diagnosis vs content
  classification vs code generation.
- Confidence intervals for eval results: small eval datasets produce noisy
  scores. Bootstrap confidence intervals (Bootcamp III Step 4). "Our model
  scores 85% +/- 3% (95% CI)" is more honest than "our model scores 85%."
- Comparing models honestly: when is a 2% accuracy difference meaningful?
  Statistical testing (Bootcamp III Step 4) applied to eval comparisons.
  The multiple comparisons problem when testing across many benchmarks.
- Communicating eval limitations: what the eval does not test, known blind
  spots, population the eval samples from vs population the model will
  serve. Anthropic's observation that HELM scores can be misleading due to
  prompt format differences.
- Eval reports as decision documents: structure for communicating results to
  stakeholders who are not ML engineers. Summary, methodology, results,
  limitations, recommendations.
- Avoiding eval theatre: running evals for compliance optics vs running evals
  for genuine insight. Paper guardrails (slopodar) applied to evaluation.
  An eval that always passes is not an eval - it is a rubber stamp.
- The analytical lullaby in eval reporting: warm numbers with no caveats.
  "95% accuracy across 10,000 samples" sounds impressive until you learn
  the samples are all easy cases and the hard cases were excluded.

### Key Concepts / Vocabulary

- Confidence intervals, statistical significance for evals
- Multiple comparisons, Bonferroni correction
- Eval limitations, blind spots
- Eval reports, decision documents
- Eval theatre, paper guardrails
- Analytical lullaby

---

## Step 9: Building an Eval Culture

*Estimated time: 3-4 hours*
*Field maturity: EMERGING*
*Prerequisites: All previous steps, Bootcamp II Step 10 (governance)*

### What It Covers

- Evals as a team practice, not an individual skill. How to introduce eval
  discipline to a team that currently doesn't have it.
- The eval review: treating eval design with the same rigor as code review.
  Does the eval measure what it claims? Are the edge cases adequate? Is the
  grader calibrated?
- Eval ownership: who maintains the eval suite? Who updates datasets when the
  domain evolves? Who investigates when a model update causes eval regressions?
- The eval roadmap: prioritising which evals to build first. High-risk
  capabilities first. High-frequency use cases second. Edge cases third.
  ROI-driven eval development.
- Eval sharing and reuse: Inspect AI's eval registry as a model. Contributing
  evals back to the community. Using published evals as baselines.
- The relationship between evals and governance: evals as evidence for
  deployment decisions. The audit trail from eval result to deployment
  approval. Connects to Bootcamp II Step 10 (governance).
- Continuous evaluation: not just pre-deployment. Production monitoring as
  ongoing evaluation. Detecting model drift, distribution shift, emerging
  failure modes.

---

## Field Maturity Summary

| Rating | Definition | Steps |
|--------|-----------|-------|
| ESTABLISHED | Well-documented, widely practiced | 2 |
| EMERGING | Documented by providers, conventions still forming | 1 (advanced), 3, 5, 8, 9 |
| FRONTIER | Operational knowledge, not in standard curricula | 4 (advanced), 6, 7 |

---

## Relationship to Other Bootcamps

| Bootcamp | Dependency |
|----------|-----------|
| I Step 5 (Python CLI) | Eval scripts, dataset construction |
| I Step 6 (Make/Just) | Eval automation, CI/CD integration |
| I Step 9 (containers) | Sandboxed agent evaluation |
| II Step 1 (LLM fundamentals) | Understanding what evals measure |
| II Step 6 (verification) | Quality gate as eval, test anti-patterns |
| II Step 7 (human-AI interface) | Slopodar as adversarial diagnostic |
| III Step 2 (statistics) | Confidence intervals, significance testing |
| III Step 4 (statistical testing) | Comparing eval results |
| III Step 6 (visualisation) | Eval result dashboards |

---

## Provenance

This outline draws from:

- **Anthropic:** "Challenges in evaluating AI systems" (Oct 2023), "Building effective
  agents" (Dec 2024), Responsible Scaling Policy, sabotage evaluations (Oct 2024),
  alignment faking research, eval documentation
- **UK AISI:** Inspect AI framework (open-source, 100+ pre-built evals, agent
  evaluation, sandboxing)
- **OpenAI:** Evals framework (open-source), evals cookbook, agent evals documentation,
  trace grading
- **Research:** METR RCT (2025), SWE-bench (Jimenez et al. 2023), ARC Evals,
  LMSYS Chatbot Arena
- **Operational experience:** Darkcat alley multi-model adversarial review pipeline,
  bin/triangulate metrics parser, slopodar anti-pattern taxonomy, analyst agent
  (LLM-as-judge framework), the gauntlet verification pipeline
