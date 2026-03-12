# Task IV-01: Research - Format Template Reuse from Bootcamp I/II/III

**Type:** Research (read-only)
**Parallelizable with:** Tasks IV-02, IV-03, IV-04, IV-05, IV-06
**Blocks:** Tasks IV-07 through IV-15 (all write tasks)
**Output:** `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md`

---

## Objective

Confirm the format template and conventions established by earlier bootcamps still apply
to Bootcamp IV, and identify any adaptations needed for evaluation/adversarial content.
Task 01 from the BC-II decomposition extracted the original template from Bootcamp I.
This task validates that template against BC-IV's specific needs.

## Input Files

Read in full:

- `docs/bootcamp/tasks/01-research-format/findings.md` - the format template extracted
  from Bootcamp I (if it exists; if not, read the source files below)
- `docs/bootcamp/01-process-model.md` (first 150 lines) - exemplar step structure
- `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` - the outline being implemented

Skim for structural comparison:

- One completed BC-II step (if any exist in `docs/bootcamp/`)
- One completed BC-III step (if any exist in `docs/bootcamp/`)

## What to Extract

1. **Reusable template elements** - heading hierarchy, section ordering, ToC, challenges
   format, "What to Read Next" sections, code block conventions

2. **BC-IV-specific adaptations needed:**
   - `> FIELD MATURITY:` blockquotes - BC-IV has a heavier FRONTIER proportion than
     BC-II/III. The blockquote convention needs to distinguish ESTABLISHED, EMERGING,
     and FRONTIER clearly
   - `> AGENTIC GROUNDING:` - BC-IV's agentic grounding connects to eval design and
     adversarial testing, not just "how agents use this"
   - Exercise/Challenge format - BC-IV exercises are eval design exercises (build an
     eval, design a rubric, run adversarial tests), not code implementation exercises.
     May need a different challenge structure
   - `> SLOPODAR:` blockquotes - used throughout BC-IV since the slopodar is a worked
     example of adversarial testing. Confirm the convention

3. **New conventions to propose (if any):**
   - `> NOVEL:` blockquote for content that is genuinely novel from this project vs
     established field content (the outline has explicit "Field vs Novel" sections)
   - Whether exercises should include "Safety Note:" warnings for Steps 6-7 (adversarial
     testing and red teaming content)

## Output Format

Write as a structured markdown document that write-task agents can load as prime context.
Include the confirmed template with any BC-IV adaptations clearly marked.
