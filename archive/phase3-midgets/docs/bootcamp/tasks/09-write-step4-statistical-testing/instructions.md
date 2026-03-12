# Task 09: Write - Step 4: Statistical Testing for Practitioners

**Type:** Write
**Parallelizable with:** Tasks 10, 11, 12, 13, 14, 15 (Tier 2/3 steps)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 04 (statistics APIs)
**Output:** `docs/bootcamp/bootcamp3-04-statistical-testing.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 4: Statistical Testing for
Practitioners. This is a Tier 2 core analysis step. It teaches the reader to determine
whether a measured difference is real or noise.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/04-research-statistics-apis/findings.md` - scipy.stats API reference
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 312-392 - the outline for this step

## Content Specification

From the outline, this step covers 8 topics:

1. The logic of hypothesis testing
2. t-tests (independent and paired)
3. Mann-Whitney U test
4. Chi-squared test
5. Effect size (Cohen's d, Cramer's V)
6. Multiple comparisons (Bonferroni)
7. Practical significance vs statistical significance
8. Bootstrap confidence intervals

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template. Title: `# Step 4: Statistical Testing for
Practitioners`

### The Critical Tone

This step must be explicitly anti-academic while being technically correct. The reader
is not studying statistics. The reader needs to answer: "We changed the darkcat review
instructions. Are the models finding more real issues now?"

Frame every concept as a decision tool, not a mathematical object:
- "p-value" = "how surprised should I be if nothing actually changed?"
- "effect size" = "is this difference big enough to matter?"
- "multiple comparisons" = "if I test 20 things, one will look significant by accident"

### No Mathematical Notation

The outline explicitly says "explained without mathematical notation." Use words and
code, not formulas. The reader learns `scipy.stats.ttest_ind(a, b)` and interprets
the output. They do not need to know the formula for the t-statistic.

### Decision Tree

Include a clear decision tree early in the step:

```
Is your data continuous or categorical?
  Continuous:
    Comparing two groups?
      Normally distributed? -> t-test
      Not normal / small sample? -> Mann-Whitney U
    Measuring correlation? -> Pearson or Spearman
  Categorical:
    Comparing distributions? -> Chi-squared
```

### Effect Size Is the Punchline

Sections 5 and 7 together form the punchline of this step: statistical significance
is not the same as practical significance. With enough data, everything is significant.
Effect size is the filter. Make this point repeatedly and concretely.

### Code Examples

- Use `scipy.stats` functions with correct signatures from Task 04 findings
- Every test should show: set up data, run test, interpret result, compute effect size
- Use project-realistic data (triangulate convergence rates, finding counts, severity
  distributions)
- Bootstrap section should show the complete pattern in 5-10 lines of Python

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 700-1000 lines. This is a 3-4 hour step with 8 topics.
- Practitioner voice throughout: "here is the test, here is the result, here is what
  you tell the Operator"

## Quality Gate

- Every scipy.stats function call must have correct signature and return value handling
- The decision tree must be present and correct
- Effect size interpretation thresholds must be included (small/medium/large)
- Bootstrap CI example must be complete and runnable
- No mathematical formulas - words and code only
- No emojis, no em-dashes
