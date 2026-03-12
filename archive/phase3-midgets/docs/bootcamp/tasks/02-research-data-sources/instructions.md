# Task 02: Research - Project Data Sources

**Type:** Research (read-only)
**Parallelizable with:** Tasks 01, 03, 04, 05
**Blocks:** Tasks 06-16 (all write tasks)
**Output:** `docs/bootcamp/tasks/02-research-data-sources/findings.md`

---

## Objective

Examine the project's actual data files to understand their schemas, formats, sizes,
and content. The write tasks need realistic exercises grounded in these real data
sources. Without understanding what the data actually looks like, exercises will be
generic and disconnected from the project.

## Input Files

Read these files in full:

- `docs/internal/backlog.yaml` - task tracking with status, priority, dates
- `docs/internal/events.yaml` - timestamped project events with types and backrefs
- `docs/internal/weaver/catch-log.tsv` - control firing events with dates, agents, outcomes
- `docs/internal/slopodar.yaml` - anti-pattern taxonomy with severity, confidence, dates
- `docs/internal/session-decisions-index.yaml` - last N decisions with refs

Examine these directories for structure:

- `data/alley/` - triangulate exports (metrics, convergence, findings-union per run)
- `bin/triangulate` - the script that produces the data (read for schema understanding)

If `docs/internal/events.tsv` exists, read it for legacy format comparison.

## What to Extract

1. **Schema per source** - exact field names, types, nesting structure. For YAML files,
   document the top-level keys and the structure of each entry. For TSV, document the
   column headers and example values.

2. **Size and volume** - how many entries in each file? How many rows in catch-log?
   How many events? How many backlog items? This determines whether exercises need
   simulated data or can use the real files.

3. **Data quality observations** - any missing fields, inconsistent formats, mixed types?
   These become data cleaning exercise material.

4. **Relationships between sources** - which fields can be used to join across sources?
   Date fields for temporal joins. Agent names across catch-log and events. Finding IDs
   across triangulate exports.

5. **Triangulate output schema** - the exact structure of what `bin/triangulate` produces:
   metrics YAML, convergence data, findings-union format. This is referenced in Steps 1-6
   and needs precise documentation.

6. **Sample data snippets** - copy 2-3 representative entries from each source. Write
   tasks will use these as inline examples in exercises.

## Output Format

Write findings as structured markdown with one section per data source. Include literal
data snippets (not paraphrased). A write-task agent should be able to construct realistic
pandas/DuckDB code from these snippets without needing to read the original files.
