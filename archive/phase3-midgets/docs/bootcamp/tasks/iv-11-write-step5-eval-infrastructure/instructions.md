# Task IV-11: Write - Step 5: Eval Infrastructure and Automation

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-04 (Tier 2 external),
  IV-06 (eval frameworks)
**Parallelizable with:** IV-10 (once Tier 2 research is available)
**Output:** `docs/bootcamp/step-iv-05-eval-infrastructure.md`

---

## Objective

Write the full Step 5 content: "Eval Infrastructure and Automation." This is the
engineering systems step - how to build, run, and maintain eval infrastructure.
Field maturity: EMERGING.

Estimated target: 35-45k characters (~1000-1300 lines). Slightly shorter than
Steps 1-4 since this is more procedural and less conceptual.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks/iv-04-research-tier2-external/findings.md` - external references
4. `docs/bootcamp/tasks/iv-06-research-eval-frameworks/findings.md` - infrastructure details
5. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 371-432 - the Step 5 outline

## Content Structure

### Mandatory Sections

1. **Why This is Step 5** - Frame: you can now design evals (Steps 1-2), score them
   (Step 3), and handle agents (Step 4). But running evals manually does not scale.
   This step is about making evaluation a first-class part of your engineering
   workflow - eval-driven development.

2. **Eval-driven development** - The eval loop mirrors the engineering loop:
   write eval -> run eval -> see failure -> improve prompt/agent -> run eval again.
   Evals as the inner loop of agentic development. This is TDD for LLM systems.

3. **Running evals at scale** - Practical concerns:
   - Parallelisation (Inspect AI's async architecture)
   - Rate limiting (API provider limits)
   - Caching (avoid re-running expensive LLM calls for unchanged inputs)
   - Cost management (budgets, alerts)
   - Batch mode for cost reduction

4. **Eval in CI/CD** - Running evals on every PR, blocking merge on regression:
   - The eval as a quality gate (connect to the project's gate concept)
   - Integration with GitHub Actions
   - Make targets for eval execution
   - When to run full vs subset evals (PR = fast subset, merge = full suite)

5. **Eval datasets as versioned artifacts** - Git-tracked JSONL files:
   - Dataset registries (Inspect AI pattern, OpenAI pattern)
   - Schema validation for datasets
   - Version control strategies for eval data
   - When to use git vs DVC vs other tools

6. **Eval result storage and analysis** - Where results go:
   - Log files (Inspect AI log format)
   - Dataframes for analysis (connect to Bootcamp III - pandas, DuckDB)
   - Trend analysis across runs
   - Inspect AI's log viewer

7. **Prompt optimisation using evals** - Anthropic's recommendation:
   - Start with simple prompts, optimise with comprehensive evaluation
   - The optimise loop: baseline eval -> change prompt -> re-eval -> compare
   - Avoiding hill-climbing on the eval (Goodhart again from Step 1)

8. **Regression testing** - Ensuring changes do not break previously passing cases:
   - The eval suite as a regression test suite
   - Baseline management (what is "passing"?)
   - Regression detection thresholds

9. **Eval cost budgeting** - LLM-as-judge costs tokens:
   - Cost estimation formulas (samples x tokens per sample x price per token)
   - Budget forecasting for eval infrastructure
   - The accuracy-cost tradeoff: code-graded (free) vs LLM-graded with GPT-4
     (expensive) vs LLM-graded with Haiku (cheap)
   - Connect to Bootcamp III Step 8 (cost modelling)

### Novel Content from This Project

- The Makefile pipeline as a worked example of eval infrastructure
- The darkcat alley pipeline as eval automation across 3 model providers
- The `bin/triangulate` script as a custom eval analysis tool
- The catch-log as an eval result storage pattern (append-only, timestamped)

### Exercises

3 exercises from the outline:
- Build a Makefile target that runs an eval suite and blocks on regression. The
  target should: run evals, compare to baseline, fail if accuracy drops > 2%
- Set up eval result storage: run the same eval 5 times, store results, plot
  accuracy trend (connect to Bootcamp III Step 5 time series)
- Calculate the cost of running your eval suite. Compare: code-graded, LLM-graded
  with expensive model, LLM-graded with cheap model. Report the accuracy-cost tradeoff

### Agentic Grounding

Connect to:
- Why eval-driven development is the responsible way to iterate on agent systems
- Why eval cost budgeting is a real engineering constraint
- Why the gate concept (quality gate) is itself eval infrastructure

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Makefile examples must follow the project's conventions (see Bootcamp I Step 6)
- Cost calculations should use realistic 2026 token prices
- CI/CD examples should be GitHub Actions (the project's platform)
