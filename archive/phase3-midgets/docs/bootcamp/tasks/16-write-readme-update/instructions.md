# Task 16: Write - README and Index Update

**Type:** Write
**Parallelizable with:** None (runs last)
**Depends on:** Tasks 06-15 (all write tasks must be complete)
**Output:** Edits to `docs/bootcamp/README.md`

---

## Objective

Update the bootcamp README to include Bootcamp III in the curriculum overview. Add
the step listing, dependency graph, sequencing recommendation, and cross-references
to the existing README structure.

## Prime Context

Load these files before writing:

- `docs/bootcamp/README.md` - the existing curriculum overview
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` - the outline (for sequencing, cross-cutting)
- Scan `docs/bootcamp/bootcamp3-*.md` to verify all 10 steps were written

## What to Add

1. **Bootcamp III section** in the README matching the format of existing Bootcamp I
   and II sections. Include:
   - Title and description ("Operational Analytics for Agentic Engineering")
   - Total estimated time (32-40 hours)
   - Prerequisites (Bootcamp I Steps 1-5, Bootcamp II)
   - Step listing table (step number, topic, estimated time, tier)

2. **Dependency graph** - the ASCII graph from the outline

3. **Sequencing recommendation** - the 3-week plan from the outline

4. **Tool stack table** - the packages used (pandas, DuckDB, matplotlib, etc.)

5. **Cross-references** - link from Bootcamp I Step 4 (text pipeline) to Step 7
   (log analysis), from Bootcamp I Step 5 (Python CLI) to Step 1 (tabular data),
   from Bootcamp I Step 5.10 (Jupyter) to Step 10 (notebook workflows)

## Writing Requirements

- Match the existing README style and formatting exactly
- Add the Bootcamp III section after the existing sections, not replacing anything
- All file paths must point to the actual written step files
- No emojis, no em-dashes
- Keep the addition concise - the README is an index, not a restatement of the outline

## Quality Gate

- Every step file referenced must exist on disk
- The dependency graph must match the outline
- Prerequisites must be accurate
- Estimated times must match the individual steps
- No emojis, no em-dashes
