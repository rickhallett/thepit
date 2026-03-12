# Task 01: Research - Format and Conventions for Bootcamp V

**Type:** Research (read-only)
**Parallelizable with:** Tasks 02, 03, 04, 05, 06
**Blocks:** Tasks 07-15 (all write tasks)
**Output:** `docs/bootcamp/tasks-v/01-research-format/findings.md`

---

## Objective

Confirm the format template and structural conventions that Bootcamp V steps must match.
Bootcamp I established the format. Bootcamps II-IV refined it. This task verifies the
template is stable and identifies any Bootcamp V-specific conventions needed (new
blockquote types, exercise format differences for infrastructure topics, etc.).

## Input Files

Read these files in full:

- `docs/bootcamp/tasks/01-research-format/findings.md` - existing format analysis from
  Bootcamp II task decomposition. This is the primary source. Verify it is still accurate.
- `docs/bootcamp/README.md` - curriculum overview, pedagogical approach, conventions
- `docs/bootcamp/01-process-model.md` - exemplar step (Bootcamp I, ~1440 lines)

Skim for structural comparison (first 150 lines each):

- `docs/bootcamp/03-filesystem-as-state.md` - relevant because Step 5 (state management)
  is the infrastructure counterpart to this Bootcamp I step
- `docs/bootcamp/08-process-observation.md` - relevant because Step 7 (observability)
  builds on this Bootcamp I step

## What to Extract

1. **Confirm the document structure template** - heading hierarchy, section ordering,
   mandatory sections (ToC, Why This is Step N, numbered content, Challenges, What to
   Read Next). Flag any drift from the Bootcamp II findings.

2. **Bootcamp V-specific conventions:**
   - Bootcamp V exercises are more implementation-heavy (build pipelines, deploy systems)
     than Bootcamp I-II (understand mechanisms). Does the challenge format need adjustment?
   - Bootcamp V topics have significant tooling dependencies (vector databases, tracing
     frameworks). How should tool installation and setup be handled in exercises?
   - Bootcamp V has "Field vs Novel" sections in the outline. Should these become a
     standard blockquote type (`> FIELD VS NOVEL:`) or remain as regular subsections?
   - The "Tool Stack" table in the outline - should each step include a "Tools Used"
     section at the top?

3. **Exercise format for infrastructure topics:**
   - Bootcamp I exercises are conceptual (explore, observe, understand)
   - Bootcamp V exercises require running services, installing packages, calling APIs
   - Propose a convention for: prerequisites per exercise, expected environment,
     fallback for when a tool/API is unavailable

4. **Cross-bootcamp reference convention:**
   - Bootcamp V heavily references I, II, III, and IV. What is the standard format
     for cross-bootcamp references? (e.g., "Bootcamp II Step 4" vs "BC-II.4" vs link)

## Output Format

Write findings as a structured markdown document. Include:
- Confirmed template (copy from BC-II findings if unchanged, note any updates)
- Bootcamp V-specific convention proposals (with rationale)
- Exercise format proposal for infrastructure topics
- Cross-reference format recommendation
