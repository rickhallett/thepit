# Task 08: Write - Step 3: SQL Analytics with DuckDB

**Type:** Write
**Parallelizable with:** Tasks 06, 07 (Tier 1 steps share no content dependencies)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 03 (DuckDB APIs)
**Output:** `docs/bootcamp/bootcamp3-03-sql-analytics.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 3: SQL Analytics with DuckDB.
This is a Tier 1 foundation step. It teaches analytical SQL - the layer beyond
SELECT/WHERE/GROUP BY that most SWEs lack.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/03-research-python-analytics/findings.md` - DuckDB API patterns
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 242-308 - the outline for this step

## Content Specification

From the outline, this step covers 7 topics:

1. DuckDB setup and data loading
2. CTEs (Common Table Expressions)
3. Window functions (ROW_NUMBER, RANK, LAG, LEAD, SUM/AVG OVER)
4. Self-joins
5. Pivoting and unpivoting
6. Date/time operations
7. Analytical patterns (funnel, cohort, retention)

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template:

- Title: `# Step 3: SQL Analytics with DuckDB`
- `## Why This is Step 3` - analytical SQL is different from CRUD SQL. Window functions,
  CTEs, and self-joins turn raw data into insights. DuckDB runs locally with no server.
- Numbered content sections
- Challenges, Key Takeaways, Recommended Reading, What to Read Next

### Depth

This is the step where SQL stops being a data access language and becomes an analytical
tool. Each topic needs:

- **The pattern** - what analytical question this SQL pattern answers
- **The SQL** - complete, runnable DuckDB queries against project data files
- **The equivalent pandas** - brief comparison showing when SQL is clearer (window
  functions, complex aggregations) and when pandas is clearer (reshaping, iterative
  exploration)
- **Agentic grounding** - connecting the pattern to agent data analysis

### Window Functions Are the Core

Section 3 (window functions) is the most important section. It should be the longest
and most detailed. Window functions are the single biggest gap between "I know SQL" and
"I can analyze data with SQL." Cover:

- The OVER clause concept: "compute this for each row, using information from other rows"
- PARTITION BY vs ORDER BY within OVER
- Frame specification: ROWS BETWEEN N PRECEDING AND CURRENT ROW
- Each function with a concrete example on project data

### Code Format

- All SQL examples should be runnable via `duckdb.sql()` in Python
- Show the Python wrapper: `import duckdb; result = duckdb.sql("...").df()`
- Use project file paths in FROM clauses: `FROM 'docs/internal/weaver/catch-log.tsv'`
- 2-space indentation in SQL (matching project convention)

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 800-1100 lines. This is a 4-5 hour step with 7 topics.
- Emphasis on the practical: "here is the query, here is what it shows, here is when
  you use it"

## Quality Gate

- Every SQL query must be syntactically valid DuckDB SQL
- Window function examples must cover LAG, LEAD, ROW_NUMBER, RANK, running SUM/AVG
- CTE examples must show multi-stage composition (not just simple subquery replacement)
- File paths in FROM clauses must be real project paths
- No emojis, no em-dashes
