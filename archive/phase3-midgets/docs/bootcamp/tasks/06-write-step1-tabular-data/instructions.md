# Task 06: Write - Step 1: Tabular Data with pandas and DuckDB

**Type:** Write
**Parallelizable with:** Tasks 07, 08 (Tier 1 steps share no content dependencies)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 03 (pandas/DuckDB APIs)
**Output:** `docs/bootcamp/bootcamp3-01-tabular-data.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 1: Tabular Data with pandas
and DuckDB. This is a Tier 1 foundation step - everything else in Bootcamp III depends
on it.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template and conventions
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/03-research-python-analytics/findings.md` - API reference
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 113-178 - the outline for this step

## Content Specification

From the outline, this step covers 8 topics:

1. DataFrames from scratch
2. Column operations
3. Filtering and boolean indexing
4. Groupby and aggregation
5. Joins and merges
6. Reshaping
7. DuckDB basics
8. Data cleaning patterns

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template from Task 01 findings:

- Title: `# Step 1: Tabular Data with pandas and DuckDB`
- Subtitle with step number and estimated time
- `## Why This is Step 1` section (motivational, dependency-aware)
- `## Table of Contents` with estimated times per section
- Numbered sections `## 1. DataFrames from Scratch` through `## 8. Data Cleaning Patterns`
- `## 9. Challenges` section with the 4 exercises
- `## Key Takeaways` - 8-10 questions the reader should be able to answer
- `## Recommended Reading` - pandas docs, DuckDB docs, relevant books
- `## What to Read Next` - pointer to Step 2

### Depth

Each topic section should include:

- **Concept** - what this operation does and why it matters for agent data
- **Mechanism** - the pandas/DuckDB API with correct signatures
- **Example** - working code using the project's actual data files (backlog.yaml,
  catch-log.tsv, events.yaml). Use the schemas from Task 02 findings.
- **Agentic grounding** - blockquote connecting the operation to a real agentic
  engineering task (e.g., "when you load a triangulate export, this is the operation
  that turns nested YAML into a flat table")

### Code Examples

- All Python code uses 2-space indentation (project convention)
- All code must be runnable (correct imports, correct API calls)
- Use `uv` for any package installation references
- Show both pandas and DuckDB approaches where the outline says to compare them
- Use the project's real file paths (`docs/internal/backlog.yaml`, etc.)

### Voice

- Direct, technical, no filler
- No emojis, no em-dashes
- Explain the "why" before the "how"
- Go deep on the mechanics (like Bootcamp I goes deep on syscalls)
- Historical context only where genuinely illuminating (pandas history is less
  interesting than Unix history - be selective)

### Target Length

800-1200 lines. This is a 4-5 hour step covering 8 topics - each topic needs
enough depth for ~30 minutes of learning.

## Quality Gate

Before considering the step done:

- Every code example must have correct imports
- Every file path must be a real project path (verify against Task 02 findings)
- Every pandas/DuckDB API call must match the signatures in Task 03 findings
- The challenge exercises must be solvable with the content taught in the step
- No emojis, no em-dashes
