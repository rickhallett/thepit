# Task 07: Write - Step 2: Descriptive Statistics

**Type:** Write
**Parallelizable with:** Tasks 06, 08 (Tier 1 steps share no content dependencies)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 03 (pandas APIs)
**Output:** `docs/bootcamp/bootcamp3-02-descriptive-stats.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 2: Descriptive Statistics.
This is a Tier 1 foundation step. It teaches the reader to describe distributions before
attempting inference or visualization.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/03-research-python-analytics/findings.md` - pandas API patterns
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 180-239 - the outline for this step

## Content Specification

From the outline, this step covers 6 topics:

1. Central tendency (mean, median, mode)
2. Spread (std, variance, IQR, range)
3. Percentiles and quantiles (p50, p90, p95, p99)
4. Distribution shape (skewness, kurtosis, histograms)
5. Correlation (Pearson, Spearman)
6. Crosstabs and contingency tables

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template from Task 01 findings:

- Title: `# Step 2: Descriptive Statistics`
- Subtitle with step number and estimated time
- `## Why This is Step 2` - this is the cheapest, fastest analysis. Before hypothesis
  testing, before time series, before visualization.
- `## Table of Contents` with estimated times
- Numbered content sections
- `## 7. Challenges`
- `## Key Takeaways`
- `## Recommended Reading`
- `## What to Read Next`

### Depth

Each topic section should include:

- **When to use this measure** - operational framing, not textbook framing. "Median
  for token counts because they are right-skewed. Mean for match confidence scores
  because they are roughly symmetric."
- **pandas API** - `df.describe()`, `.mean()`, `.median()`, `.std()`, `.quantile()`,
  `.corr()`, `.value_counts()`, `pd.crosstab()`
- **Working example** - using project data (triangulate match confidence scores,
  catch-log control frequencies, backlog item ages)
- **Interpretation guide** - what the number means in operational context. "A standard
  deviation of 0.15 on match confidence means most scores are within 0.15 of the mean."

### The Key Distinction

This step must clearly establish the difference between describing data (this step) and
testing claims about data (Step 4). Descriptive statistics answer "what does this look
like?" Statistical testing answers "is this difference real?" Keep the reader firmly in
description territory.

### Code Examples

- All Python, 2-space indentation
- Use project data files for examples (match confidence scores, catch frequencies)
- Show `df.describe()` output and walk through each row
- Include at least one histogram in the distribution shape section (using matplotlib
  briefly - full treatment is in Step 6)

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 600-900 lines. This is a 3-4 hour step covering 6 topics.
- Operational framing throughout: "you need this to answer the Operator's question"

## Quality Gate

- Every statistical concept must connect to an agentic engineering use case
- Every code example must use correct pandas API
- Challenge exercises must be solvable with content from this step only (no Step 3/4)
- No emojis, no em-dashes
