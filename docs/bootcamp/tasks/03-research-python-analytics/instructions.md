# Task 03: Research - Python Analytics APIs (pandas, DuckDB)

**Type:** Research (read-only)
**Parallelizable with:** Tasks 01, 02, 04, 05
**Blocks:** Tasks 06, 07, 08, 12, 13, 14 (steps that use pandas/DuckDB directly)
**Output:** `docs/bootcamp/tasks/03-research-python-analytics/findings.md`

---

## Objective

Document the current (2025-2026) pandas and DuckDB Python APIs that Bootcamp III steps
will teach. The write tasks need accurate API signatures, current best practices, and
known gotchas. This prevents the write agent from teaching deprecated patterns or
inventing API calls that do not exist.

## Research Scope

### pandas (target: 2.x)

1. **DataFrame creation** - `pd.DataFrame()`, `pd.read_csv()`, `pd.read_json()`,
   `pd.json_normalize()`. How to load YAML (via `yaml.safe_load` + DataFrame constructor).
   How to load TSV (`pd.read_csv(sep='\t')`).

2. **Column operations** - selecting (`df['col']`, `df[['a','b']]`), renaming
   (`df.rename()`), adding computed columns (`df['new'] = ...`), type casting
   (`df['col'].astype()`, `pd.to_datetime()`).

3. **Filtering** - boolean indexing (`df[df['col'] > 5]`), `.query()` method,
   `.isin()`, `.between()`.

4. **Groupby** - `df.groupby().agg()`, named aggregation (`pd.NamedAgg`), `.transform()`.
   What changed between pandas 1.x and 2.x.

5. **Joins** - `pd.merge()`, `df.join()`, join types (left, right, inner, outer).
   Merge on single vs multiple keys.

6. **Reshaping** - `df.pivot_table()`, `pd.melt()`, `df.stack()`/`.unstack()`.
   The difference between pivot and pivot_table.

7. **Descriptive stats** - `df.describe()`, `.mean()`, `.median()`, `.std()`,
   `.quantile()`, `.corr()`, `.value_counts()`, `pd.crosstab()`.

8. **Time series** - `pd.to_datetime()`, `df.set_index()` with DatetimeIndex,
   `df.resample()`, `df.rolling()`, `df.ewm()`.

### DuckDB Python API (target: 0.10+)

1. **Direct file queries** - `duckdb.sql("SELECT * FROM 'file.csv'")`,
   `read_csv_auto()`, `read_json_auto()`, `read_parquet()`.

2. **Integration with pandas** - `duckdb.sql("SELECT * FROM df")` where df is a
   pandas DataFrame. Converting results back: `.fetchdf()`, `.df()`.

3. **Analytical SQL** - CTEs, window functions (ROW_NUMBER, RANK, LAG, LEAD,
   SUM OVER, AVG OVER), PIVOT/UNPIVOT, DATE_TRUNC, DATE_DIFF, EXTRACT.

4. **Current gotchas** - any API changes between 0.9 and 0.10+. Thread safety notes.
   In-memory vs file-based databases.

## What to Document

For each API surface:
- Correct function signature with common parameters
- One minimal working example (3-5 lines)
- One common mistake or gotcha
- pandas 2.x deprecations or changes from 1.x that a learner might encounter

## Output Format

Structured markdown with sections matching the research scope above. Code examples
should be copy-pasteable. Note version-specific behavior where it matters.

## Sources

- pandas official docs: https://pandas.pydata.org/docs/
- DuckDB Python API docs: https://duckdb.org/docs/api/python/overview
- Do NOT fetch these URLs during research. Document from training knowledge. The write
  agent will verify against docs if needed.
