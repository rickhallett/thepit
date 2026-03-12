# Task 01: Research - Bootcamp I Format and Conventions

**Type:** Research (read-only)
**Parallelizable with:** Tasks 02, 03, 04, 05
**Blocks:** Tasks 06-16 (all write tasks)
**Output:** `docs/bootcamp/tasks/01-research-format/findings.md`

---

## Objective

Analyse Bootcamp I steps to extract the format template, structural conventions, and
quality bar that Bootcamp II steps must match. The write tasks depend on this analysis
to produce consistent output.

## Input Files

Read these files in full:

- `docs/bootcamp/README.md` - curriculum overview, pedagogical approach, conventions
- `docs/bootcamp/01-process-model.md` - exemplar step (50k, ~1440 lines)
- `docs/bootcamp/07-git-internals.md` - exemplar step (45k, ~1379 lines)
- `docs/bootcamp/scriptease-config.md` - quiz integration pattern

Skim these for structural comparison (first 100 lines each):

- `docs/bootcamp/03-filesystem-as-state.md`
- `docs/bootcamp/09-container-internals.md`

## What to Extract

1. **Document structure template** - exact heading hierarchy, section ordering, what
   sections appear in every step (ToC, Why This is Step N, numbered content sections,
   Challenges, What to Read Next, etc.)

2. **Section conventions:**
   - How "Why This is Step N" is written (motivational, dependency-aware, agentic grounding)
   - How content sections are structured (concept -> mechanism -> example -> agentic grounding)
   - How challenges are formatted (header style, difficulty progression, what constitutes
     a good challenge vs a toy exercise)
   - How agentic grounding blockquotes work (when they appear, how long, what they connect)

3. **Voice and quality bar:**
   - Prose style (direct, technical, no filler, no sycophancy, no em-dashes, no emojis)
   - How deep the explanations go (kernel data structures, syscalls, not just CLI usage)
   - How historical context is woven in (short, relevant, not decorative)
   - Typical section length and depth

4. **Conventions list:**
   - 2 spaces indentation in code blocks
   - `## Challenge:` headers
   - `> AGENTIC GROUNDING:` blockquotes
   - `> HISTORY:` blockquotes (Bootcamp I specific)
   - `> FIELD MATURITY:` blockquotes (Bootcamp II new convention)
   - `> SLOPODAR:` blockquotes (Bootcamp II new convention)
   - No emojis, no em-dashes

5. **Approximate target metrics:**
   - Lines per step (range across the 12 steps)
   - Sections per step
   - Challenges per step
   - Code examples per section

## Output Format

Write findings as a structured markdown document that a write-task agent can load as
prime context. Use headings for each extraction category above. Include concrete examples
(copy relevant snippets) rather than abstract descriptions.
