# Task 11: Write - Step 6: Visualization for Decision-Making

**Type:** Write
**Parallelizable with:** Tasks 09, 10, 12, 13, 14, 15 (Tier 2/3 steps)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 05 (visualization APIs)
**Output:** `docs/bootcamp/bootcamp3-06-visualization.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 6: Visualization for
Decision-Making. This is a Tier 2 core analysis step. It teaches the reader to make
functional plots that answer operational questions.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/05-research-visualization/findings.md` - matplotlib/seaborn APIs
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 464-538 - the outline for this step

## Content Specification

From the outline, this step covers 8 topics:

1. matplotlib fundamentals (OOP API)
2. The right chart for the question
3. Multi-panel figures
4. Heatmaps
5. Annotations and reference lines
6. Saving and exporting
7. Common mistakes
8. Seaborn for statistical plots

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template. Title: `# Step 6: Visualization for
Decision-Making`

### OOP API Only

Teach the object-oriented matplotlib API (`fig, ax = plt.subplots()`) exclusively.
Do not teach the pyplot state machine (`plt.plot()`, `plt.xlabel()`). The OOP API is
composable, explicit, and does not have hidden global state. Mention the state machine
exists and explain why it is avoided.

### The Decision Table

Section 2 ("the right chart for the question") should include a clear reference table:

```
Question type                    Chart type
Is this trending?                Line chart
How do groups compare?           Bar chart
What does the distribution       Histogram / box plot / violin
  look like?
Are these related?               Scatter plot
How does this matrix look?       Heatmap
```

Make this concrete with project examples: convergence rate over runs (line), finding
count per model (bar), match confidence distribution (histogram), convergence matrix
(heatmap).

### Common Mistakes Section Is Required

Section 7 must explicitly cover the anti-patterns from the outline:
- Truncated y-axis exaggerating differences
- Pie charts for more than 3 categories
- 3D charts that obscure
- Missing axis labels
- Rainbow colormaps on sequential data

Show a bad example and the fixed version for at least 2 of these.

### Code Examples

- Every plot type needs a complete, runnable code example
- Use the OOP API: `fig, ax = plt.subplots()`
- Include `fig.savefig()` in at least one example
- Use project data for realistic examples
- Multi-panel examples should use `fig, axes = plt.subplots(2, 2)`

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 800-1100 lines. This is a 4-5 hour step with 8 topics.
- "The goal is not beautiful charts. The goal is functional plots that answer questions."

## Quality Gate

- Every matplotlib call must use the OOP API (ax.method, not plt.method)
- The chart type decision table must be present
- Common mistakes section must show at least 2 bad/good comparisons
- Seaborn examples must use the `ax=` parameter for matplotlib integration
- Every code block must include `import matplotlib.pyplot as plt` where needed
- No emojis, no em-dashes
