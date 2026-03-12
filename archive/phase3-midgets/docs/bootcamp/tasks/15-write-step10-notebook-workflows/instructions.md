# Task 15: Write - Step 10: Notebook-Based Analysis Workflows

**Type:** Write
**Parallelizable with:** Tasks 09, 10, 11, 12, 13, 14 (Tier 2/3 steps)
**Depends on:** Task 01 (format), Task 02 (data sources)
**Output:** `docs/bootcamp/bootcamp3-10-notebook-workflows.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 10: Notebook-Based Analysis
Workflows. This is a Tier 3 applied step. It teaches the reader to use Jupyter notebooks
effectively for analytical work, not just as a code scratchpad.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 763-828 - the outline for this step

## Content Specification

From the outline, this step covers 6 topics:

1. Notebook organization (naming, standard sections)
2. Reproducibility (dependencies, paths, autoreload)
3. The exploration-to-script pipeline
4. Magic commands for analytics
5. nbstripout and version control
6. Analysis templates

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template. Title: `# Step 10: Notebook-Based Analysis
Workflows`

### Prerequisites

This step assumes Bootcamp I Step 5.10 (Jupyter introduction) and Step 1 (tabular data).
The reader knows how to start Jupyter, create cells, and run code. This step covers
the workflow and discipline layer, not the mechanics.

### The Lab vs Factory Metaphor

The outline uses: "The notebook is the lab; the script is the factory." This metaphor
should be central. Exploration happens in notebooks. Once the analysis is proven, the
reusable parts get extracted to Python scripts (like triangulate started as exploration
and became `bin/triangulate`).

### PEP 723 Integration

Topic 2 (reproducibility) should reference PEP 723 inline metadata for script
dependencies, as covered in Bootcamp I Step 5.4. Show how to declare dependencies in
the first cell of a notebook using a helper that reads PEP 723 metadata.

### nbstripout Is Non-Negotiable

Topic 5 must make clear that committing notebook output to version control is a known
anti-pattern: large diffs, binary output, secrets in output cells. nbstripout is the
standard solution. Show the exact setup commands.

### Analysis Template

Topic 6 should produce a concrete template with these sections:
- Context (what question, what data, when)
- Data Loading (with validation)
- Analysis (the actual work)
- Findings (bullet points, supported by the analysis above)
- Next Steps (what to do with the findings)

### Code Examples

- Notebook naming: `2026-03-10-convergence-trend-analysis.ipynb`
- `%load_ext autoreload` and `%autoreload 2`
- `%%time` for cell timing
- `%%bash` for shell commands
- nbstripout setup: `uv pip install nbstripout && nbstripout --install`
- Module extraction pattern: notebook cell -> function in .py file -> import

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 500-800 lines. This is a 2-3 hour step with 6 topics. It is the shortest step
  because the mechanics are straightforward - the value is in the workflow discipline.

## Quality Gate

- nbstripout setup commands must be correct
- The analysis template must include all 5 sections listed above
- The exploration-to-script pipeline must show concrete before/after (notebook cell
  vs extracted function)
- Magic commands must be correct Jupyter/IPython syntax
- No emojis, no em-dashes
