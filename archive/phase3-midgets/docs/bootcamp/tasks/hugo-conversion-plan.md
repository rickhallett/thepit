# Bootcamp III Hugo Conversion Plan

**Date:** 2026-03-10
**Status:** PLAN
**Scope:** Convert 10 Bootcamp III step files from docs/bootcamp/ to Hugo content

---

## Current State

**Source material:** `docs/bootcamp/bootcamp3-{01..10}-*.md` (10 files, 10,967 lines total)

**Hugo stubs already exist:** `sites/oceanheart/content/bootcamp/iii-{01..10}-*.md`
(10 files, 20 lines each, correct TOML front matter, placeholder body)

**Hugo config:** `sites/oceanheart/hugo.toml` - bootcamp section is live, `unsafe = true`
in goldmark renderer (allows raw HTML in markdown)

**_index.md already updated:** References Bootcamp III with correct description and step count.

## Conversion Pattern (extracted from Bootcamp I)

The Bootcamp I conversion from `docs/bootcamp/01-process-model.md` to
`sites/oceanheart/content/bootcamp/01-process-model.md` applied these transformations:

### 1. Front matter preserved, body replaced

The TOML `+++` front matter block in the Hugo stub is kept verbatim. The body
(everything after the closing `+++`) is replaced with content from the docs source.

### 2. H1 title stripped

The `# Step N: Title` line is removed. Hugo generates the page title from the
`title` field in front matter.

### 3. Header metadata block stripped

The lines between the H1 and the first `---` are removed:
```
**Estimated time:** ...
**Prerequisites:** ...
**Leads to:** ...
**You will need:** ...
```
These are redundant with front matter fields (`estimate`, `step`, `tier`).

### 4. Subtitle line added

A single line after `+++` and before the first `---`:
```
Step N of 10 in Bootcamp III: Operational Analytics.
```
This matches the pattern in all existing Hugo bootcamp content.

### 5. Pipe escaping in markdown tables

Bare `|` characters inside table cells (not column separators) must be escaped
as `\|` for Hugo's goldmark parser. This affects:
- Code fragments in table cells containing `|` (e.g., shell OR, bitwise OR)
- Any literal pipe characters in descriptive table cells

### 6. Backslash escaping

Bare `\` in table cells or inline code must be escaped as `\\` for Hugo.
Example: `Ctrl-\` becomes `Ctrl-\\`.

### 7. No other content changes

The body text, code blocks, blockquotes, and section structure are otherwise
copied verbatim. The docs source is the source of truth.

## Task Decomposition

### Pre-flight (1 task, serial)

**Task H-00: Verify stubs and front matter**
- Type: Research
- Read all 10 Hugo stubs, extract front matter into a verification table
- Confirm: title, date, tags, step, tier, estimate, bootcamp=3
- Confirm _index.md has Bootcamp III listed
- Output: verification table (pass/fail per field per file)

### Conversion (10 tasks, all parallelizable)

Each task is identical in structure, differing only in the source and target file.

**Task H-01 through H-10: Convert step N**
- Type: Write
- Input: `docs/bootcamp/bootcamp3-{NN}-*.md` (source body)
- Input: `sites/oceanheart/content/bootcamp/iii-{NN}-*.md` (existing stub with front matter)
- Output: Updated Hugo file with full body

**Per-task instructions:**

1. Read the Hugo stub. Extract the TOML front matter block (everything between `+++` markers).
2. Read the docs source file.
3. Strip the H1 title line (line 1).
4. Strip the header metadata block (lines between H1 and first `---`).
5. Add the subtitle line: `Step N of 10 in Bootcamp III: Operational Analytics.`
6. Scan the remaining body for pipe characters inside markdown table cells and escape as `\|`.
7. Scan for backslash characters in table cells and escape as `\\`.
8. Assemble: front matter + blank line + subtitle + blank line + `---` + rest of body.
9. Write to the Hugo file path, replacing the stub.

**File mapping:**

| Source (docs/) | Target (sites/oceanheart/content/bootcamp/) |
|----------------|---------------------------------------------|
| bootcamp3-01-tabular-data.md | iii-01-tabular-data.md |
| bootcamp3-02-descriptive-stats.md | iii-02-descriptive-stats.md |
| bootcamp3-03-sql-analytics.md | iii-03-sql-analytics.md |
| bootcamp3-04-statistical-testing.md | iii-04-statistical-testing.md |
| bootcamp3-05-time-series.md | iii-05-time-series.md |
| bootcamp3-06-visualization.md | iii-06-visualisation.md |
| bootcamp3-07-log-analysis.md | iii-07-log-analysis.md |
| bootcamp3-08-cost-modeling.md | iii-08-cost-modelling.md |
| bootcamp3-09-text-analysis.md | iii-09-text-analysis.md |
| bootcamp3-10-notebook-workflows.md | iii-10-notebook-workflows.md |

Note the British spelling in Hugo targets: `visualisation` (not `visualization`),
`modelling` (not `modeling`). The stubs already use these spellings. The docs source
uses American spelling. This is a cosmetic difference that does NOT need to be
changed in the body text - only the filenames and front matter titles differ.

### Post-conversion verification (1 task, serial)

**Task H-11: Hugo build and verify**
- Type: Verification
- Run `hugo` in `sites/oceanheart/` to build the site
- Verify all 10 pages render without errors
- Spot-check 3 pages in the built HTML for:
  - Correct title rendering
  - Code blocks with syntax highlighting
  - Tables rendering correctly (pipe escaping worked)
  - AGENTIC GROUNDING blockquotes rendering
  - No raw TOML front matter leaking into page body
- Verify the bootcamp index page lists all 10 steps

## Execution Order

```
H-00 (verify stubs)
  |
  v
H-01 through H-10 (all parallel)
  |
  v
H-11 (hugo build + verify)
```

Total: 12 tasks, 10 parallelizable. The conversion is mechanical - each task
takes approximately the same effort regardless of step length.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pipe escaping missed in a table | Medium | Low (broken table rendering) | grep for unescaped pipes in table lines post-conversion |
| Front matter field wrong | Low | Medium (wrong metadata in Hugo) | H-00 pre-flight catches this |
| Hugo build failure | Low | Medium (site doesn't deploy) | H-11 catches this before any push |
| British/American spelling mismatch in body | Low | Cosmetic only | Not worth changing - body uses American, consistent with docs source |
| Content drift between docs/ and sites/ over time | High | Medium | The docs/ files are source of truth. Future edits go to docs/ first, then re-convert. Consider a Makefile target for this. |

## Automation Opportunity

The conversion is mechanical enough to script. A Python script could:

1. For each mapping pair (source, target):
   - Extract front matter from target
   - Extract body from source (strip H1 + header block)
   - Apply escaping rules
   - Assemble and write

This would make future re-conversion trivial when docs/ sources are updated.
The script would live at `bin/hugo-convert-bootcamp` and accept a bootcamp
number argument. Not required for the first conversion but worth building
if this pattern repeats for Bootcamp IV and V.

## Dependencies

- Hugo must be installed (check: `hugo version`)
- The Hugo theme must be present in `sites/oceanheart/themes/`
- All 10 source files must exist in `docs/bootcamp/` (verified: they do)
- All 10 stub files must exist in Hugo content (verified: they do)
