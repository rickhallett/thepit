# Task 03 Findings: Python Analytics APIs (pandas 2.x, DuckDB 0.10+)

**Produced:** 2026-03-10
**Task type:** Research (read-only)
**Consumed by:** Tasks 06, 07, 08, 12, 13, 14

---

## pandas 2.x

### 1. DataFrame Creation

#### pd.DataFrame()

```python
pd.DataFrame(data=None, index=None, columns=None, dtype=None, copy=None)
```

Common forms:

```python
import pandas as pd

# From dict of lists (most common)
df = pd.DataFrame({"name": ["alice", "bob"], "score": [88, 92]})

# From list of dicts (natural for YAML/JSON records)
records = [{"name": "alice", "score": 88}, {"name": "bob", "score": 92}]
df = pd.DataFrame(records)
```

**Gotcha:** When constructing from a dict with scalar values, pandas raises `ValueError: If using all scalar values, you must pass an index`. Wrap scalars in a list or use `pd.DataFrame([the_dict])`.

**2.x change:** The `copy` parameter default changed from `False` to `None`. In 2.x, pandas uses copy-on-write by default (opt-in in 2.0, becoming default in 2.1+). This means `df2 = df` no longer guarantees shared memory. See Copy-on-Write section at the end.

---

#### pd.read_csv()

```python
pd.read_csv(
    filepath_or_buffer,
    sep=",",          # use "\t" for TSV
    header="infer",   # row number(s) for column names, None if no header
    names=None,       # explicit column names list
    index_col=None,
    dtype=None,        # dict of column->type
    parse_dates=False, # list of columns to parse as datetime
    na_values=None,
    encoding=None,
)
```

Minimal example - loading a TSV:

```python
df = pd.read_csv("catch-log.tsv", sep="\t", parse_dates=["date"])
```

**Gotcha:** `parse_dates=True` (boolean) tries to infer date columns, which is slow and unreliable. Always pass an explicit list of column names: `parse_dates=["date"]`.

**2.x change:** `pd.read_csv()` no longer silently falls back to the Python parser when the C parser fails. It now raises more explicit errors. Also, `date_parser` parameter was deprecated in 2.0 in favor of `date_format`.

---

#### pd.read_json()

```python
pd.read_json(
    path_or_buf,
    orient=None,  # "records", "columns", "index", "split", "values"
    typ="frame",
    dtype=None,
    convert_dates=True,
)
```

Minimal example:

```python
df = pd.read_json("findings.json", orient="records")
```

**Gotcha:** The default `orient` depends on the JSON structure. If your JSON is a list of objects (most common from API responses), use `orient="records"` explicitly. Without it, pandas may misinterpret the structure and produce transposed or nonsensical output.

**2.x change:** `read_json` now returns a `DataFrame` with consistent dtypes. In 1.x, integer columns with any null would silently become float64. In 2.x, they use `Int64` (nullable integer) if you pass `dtype_backend="numpy_nullable"`.

---

#### pd.json_normalize()

```python
pd.json_normalize(
    data,               # dict or list of dicts
    record_path=None,   # path to the records to normalize
    meta=None,          # fields to include as metadata
    sep=".",            # separator for nested keys
    max_level=None,     # maximum depth to normalize
)
```

Minimal example - flattening nested YAML/JSON:

```python
import yaml

with open("events.yaml") as f:
    raw = yaml.safe_load(f)

df = pd.json_normalize(raw, sep="_")
```

**Gotcha:** `json_normalize` expects a list of dicts or a single dict. If your YAML has a top-level key wrapping the records (e.g., `events: [{...}, {...}]`), you must pass `raw["events"]`, not `raw`. Passing the wrapper dict produces a single-row DataFrame with the list as a cell value.

**2.x change:** No major signature changes from 1.x. Still lives in `pandas.json_normalize` (moved from `pandas.io.json.json_normalize` in pandas 1.x).

---

#### YAML Loading Pattern

There is no `pd.read_yaml()`. The standard pattern:

```python
import yaml
import pandas as pd

with open("backlog.yaml") as f:
    data = yaml.safe_load(f)

# If data is a list of flat dicts:
df = pd.DataFrame(data)

# If data has nested structures:
df = pd.json_normalize(data, sep="_")
```

**Gotcha:** `yaml.safe_load()` returns `None` for an empty file, not an empty list. Guard against this: `data = yaml.safe_load(f) or []`.

---

#### TSV Loading

TSV is just CSV with `sep="\t"`:

```python
df = pd.read_csv("catch-log.tsv", sep="\t")
```

**Gotcha:** Some TSV files use inconsistent whitespace (spaces mixed with tabs). If you get parse errors, try `sep="\t"` with `skipinitialspace=True`, or use the Python engine: `engine="python"`.

---

### 2. Column Operations

#### Selecting Columns

```python
# Single column (returns Series)
s = df["name"]

# Multiple columns (returns DataFrame)
sub = df[["name", "score"]]
```

**Gotcha:** `df["name"]` returns a `Series`. `df[["name"]]` returns a single-column `DataFrame`. This distinction matters for downstream operations that expect a DataFrame (e.g., `pd.merge()`).

---

#### Renaming Columns

```python
df.rename(columns={"old_name": "new_name", "old2": "new2"}, inplace=False)
```

Minimal example:

```python
df = df.rename(columns={"ts": "timestamp", "lvl": "severity"})
```

**Gotcha:** `rename` returns a new DataFrame by default. In 2.x, avoid `inplace=True` - it is discouraged and may be deprecated in a future version. Assign the result instead.

**2.x change:** With copy-on-write enabled, `inplace=True` may still create a new internal array. Prefer the assignment pattern.

---

#### Adding Computed Columns

```python
df["new_col"] = expression
```

Minimal example:

```python
df["age_days"] = (pd.Timestamp.now() - df["created_at"]).dt.days
```

**Gotcha (2.x - important):** In pandas 2.x with copy-on-write, chained assignment like `df[df["status"] == "open"]["priority"] = "high"` raises a `ChainedAssignmentError` (or silently does nothing). Use `df.loc[df["status"] == "open", "priority"] = "high"` instead. This was already best practice in 1.x but 2.x enforces it.

---

#### Type Casting

```python
df["col"].astype(dtype)
```

Common casts:

```python
df["count"] = df["count"].astype(int)
df["score"] = df["score"].astype(float)
df["status"] = df["status"].astype("category")
```

**Gotcha:** `astype(int)` raises on NaN values. Use `astype("Int64")` (capital I) for the nullable integer type, or `pd.to_numeric(df["col"], errors="coerce")` to convert non-numeric values to NaN.

**2.x change:** pandas 2.x defaults to using pyarrow-backed types when available (`dtype_backend="pyarrow"` in read functions). pyarrow types handle nullability natively: `ArrowDtype(pa.int64())` instead of the numpy `Int64` extension type. Both approaches work; pyarrow is faster for large datasets.

---

#### pd.to_datetime()

```python
pd.to_datetime(
    arg,
    format=None,       # strftime format string
    errors="raise",    # "raise", "coerce" (invalid -> NaT), "ignore"
    utc=False,
    dayfirst=False,
)
```

Minimal example:

```python
df["date"] = pd.to_datetime(df["date_str"], format="%Y-%m-%d")
```

**Gotcha:** Without `format=`, pandas infers the format per-element, which is slow and can produce mixed results in the same column (some MDY, some DMY). Always pass `format=` when you know it. For ISO 8601 strings, `format="ISO8601"` was added in pandas 2.0 as an explicit fast path.

**2.x change:** The `infer_datetime_format` parameter was deprecated in 2.0 and removed. Use `format="mixed"` if you need to handle multiple formats (slower but explicit). The `format="ISO8601"` option is new and much faster than inference.

---

### 3. Filtering

#### Boolean Indexing

```python
filtered = df[boolean_mask]
```

Minimal example:

```python
high_sev = df[df["severity"] == "HIGH"]
recent = df[df["date"] > "2026-01-01"]
combined = df[(df["severity"] == "HIGH") & (df["agent"] == "watchdog")]
```

**Gotcha:** Use `&` (bitwise and), not `and` (logical and) for combining conditions. Each condition must be in parentheses due to operator precedence: `df[(cond1) & (cond2)]`. Forgetting parentheses produces `ValueError: The truth value of a Series is ambiguous`.

---

#### .query()

```python
df.query(expr, inplace=False, **kwargs)
```

Minimal example:

```python
result = df.query("severity == 'HIGH' and agent == 'watchdog'")
result = df.query("score > @threshold")  # @ references local variables
```

**Gotcha:** Column names with spaces or special characters must be backtick-quoted: ``df.query("`col name` > 5")``. The `@` prefix references variables from the calling scope - do not use f-strings to inject values (SQL injection risk equivalent).

**2.x change:** No major changes. `query()` now uses `numexpr` more reliably for performance when installed.

---

#### .isin()

```python
df["col"].isin(values)
```

Minimal example:

```python
target_agents = ["watchdog", "sentinel", "weaver"]
df_filtered = df[df["agent"].isin(target_agents)]
```

**Gotcha:** `isin()` treats NaN inconsistently across versions. In 2.x with nullable dtypes, `pd.NA.isin(["anything"])` returns `pd.NA`, not `False`. If your column has nulls, chain with `.fillna(False)`: `df[df["col"].isin(values).fillna(False)]`.

---

#### .between()

```python
df["col"].between(left, right, inclusive="both")
```

Minimal example:

```python
mid_range = df[df["score"].between(40, 80)]
```

**Gotcha:** The `inclusive` parameter changed from a boolean (`True`/`False`) in pandas 1.x to a string (`"both"`, `"neither"`, `"left"`, `"right"`) in pandas 1.3+. Old code using `inclusive=True` still works but `inclusive=False` was dropped. Use `inclusive="neither"` to exclude both bounds.

---

### 4. Groupby and Aggregation

#### df.groupby().agg()

```python
df.groupby(by, axis=0, sort=True, group_keys=True, observed=True, dropna=True)
```

Minimal example:

```python
summary = df.groupby("agent").agg(
    total_catches=("catches", "sum"),
    avg_severity=("severity_score", "mean"),
    count=("id", "count"),
)
```

The named aggregation syntax (shown above) uses keyword arguments where each value is a tuple of `(column, aggfunc)`. This is the recommended approach in pandas 2.x.

**Gotcha:** The `as_index=False` parameter is commonly needed when you want the group columns as regular columns rather than index: `df.groupby("agent", as_index=False).sum()`.

**2.x change (important):** `observed=True` is now the default in pandas 2.2+. In 1.x, the default was `observed=False`, which included all categories in a categorical column even if they had no data. This produced unexpected rows of zeros. The 2.x change is a breaking behavior change that produces different output with no error.

**2.x change:** `axis=1` groupby is deprecated. Group over columns using `df.T.groupby(...)` instead.

---

#### Named Aggregation (pd.NamedAgg)

```python
pd.NamedAgg(column, aggfunc)
```

This is the type behind the named aggregation tuples:

```python
# These are equivalent:
df.groupby("model").agg(total=("score", "sum"))
df.groupby("model").agg(total=pd.NamedAgg(column="score", aggfunc="sum"))
```

**Gotcha:** You cannot mix named aggregation with positional. Either all keyword (named) or pass a dict. Mixing produces `TypeError`.

---

#### .transform()

```python
df.groupby("col").transform(func)
```

Minimal example:

```python
# Add a column showing each row's value as % of its group total
df["pct_of_group"] = df.groupby("model")["score"].transform(
    lambda x: x / x.sum()
)
```

**Gotcha:** `transform` must return a result the same shape as the input group. If your function reduces (returns a scalar), use `agg()`, not `transform()`. A common mistake is writing `df.groupby("a")["b"].transform("mean")` and expecting a scalar - it actually works because the scalar is broadcast, but `transform(lambda x: x.mean() + x.std())` also works because the result is broadcast.

---

### 5. Joins and Merges

#### pd.merge()

```python
pd.merge(
    left,
    right,
    how="inner",       # "left", "right", "outer", "inner", "cross"
    on=None,           # column name(s) if same in both
    left_on=None,      # column name(s) in left
    right_on=None,     # column name(s) in right
    suffixes=("_x", "_y"),
    validate=None,     # "one_to_one", "one_to_many", "many_to_one", "many_to_many"
    indicator=False,   # adds _merge column showing source
)
```

Minimal example:

```python
merged = pd.merge(events_df, catches_df, on="date", how="left")

# Multiple keys
merged = pd.merge(df1, df2, on=["model", "run_id"], how="inner")
```

**Gotcha:** If join columns have different names, you must use `left_on`/`right_on`. Forgetting this when column names differ produces `KeyError`. Also, merge on float columns almost never works as expected due to floating point equality - cast to string or round first.

**2.x change:** The `validate` parameter is now more strict. In 1.x, validation was best-effort; in 2.x, it raises `MergeError` reliably when the constraint is violated. Always use `validate=` when you expect a specific cardinality.

---

#### df.join()

```python
df.join(other, on=None, how="left", lsuffix="", rsuffix="", sort=False)
```

Minimal example:

```python
# Join on index (default behavior)
result = df1.join(df2, lsuffix="_left", rsuffix="_right")

# Join using a column from the left on the right's index
result = df1.join(df2, on="model_name")
```

**Gotcha:** `df.join()` joins on the index by default, not on columns. For column-to-column joins, use `pd.merge()`. If you call `df.join(other)` and neither has a meaningful index, you get incorrect row alignment. Explicitly set the index with `df.set_index()` first, or just use `pd.merge()`.

---

### 6. Reshaping

#### df.pivot_table()

```python
df.pivot_table(
    values=None,       # column(s) to aggregate
    index=None,        # row grouper
    columns=None,      # column grouper
    aggfunc="mean",    # aggregation function
    fill_value=None,   # fill NaN
    margins=False,     # add row/col totals
    observed=True,     # (2.x default)
)
```

Minimal example:

```python
pt = df.pivot_table(
    values="score",
    index="model",
    columns="severity",
    aggfunc="count",
    fill_value=0,
)
```

**Gotcha:** `pivot_table` vs `pivot`: `pivot` does not aggregate - it raises `ValueError` on duplicate entries. `pivot_table` aggregates duplicates. Rule of thumb: if your data might have duplicates in the index/column combination, use `pivot_table`.

**2.x change:** `observed=True` is the default for categorical columns in 2.2+, same as `groupby`.

---

#### pd.melt()

```python
pd.melt(
    frame,
    id_vars=None,      # columns to keep as-is
    value_vars=None,    # columns to unpivot
    var_name=None,      # name for the variable column
    value_name="value", # name for the value column
)
```

Minimal example - wide to long:

```python
# Wide: columns = [model, claude_score, gpt_score, gemini_score]
long = pd.melt(
    df,
    id_vars=["finding_id"],
    value_vars=["claude_score", "gpt_score", "gemini_score"],
    var_name="model",
    value_name="score",
)
```

**Gotcha:** If `value_vars` is not specified, all columns not in `id_vars` are melted. This can silently include columns you did not intend to unpivot (like `id` or `timestamp`). Always specify `value_vars` explicitly.

---

#### df.stack() / df.unstack()

```python
df.stack(level=-1, dropna=True, sort=True, future_stack=False)
df.unstack(level=-1, fill_value=None, sort=True)
```

Minimal example:

```python
# Pivot table to long format
stacked = pivot_table.stack()  # MultiIndex Series

# Long to wide
unstacked = df.set_index(["model", "metric"])["value"].unstack(level="metric")
```

**Gotcha:** `stack()`/`unstack()` work on the index. If your data is in columns, you need `set_index()` first. The result of `stack()` is a Series with a MultiIndex - use `.reset_index()` to get back to a flat DataFrame.

**2.x change:** In pandas 2.1+, `stack` gained a `future_stack` parameter (default `False`) that changes behavior to not drop rows with all-NA. Set `future_stack=True` to get the forward-compatible behavior. This will become the default in a future version.

---

### 7. Descriptive Statistics

#### df.describe()

```python
df.describe(percentiles=None, include=None, exclude=None)
```

Minimal example:

```python
# Numeric columns only (default)
df.describe()

# Include all column types
df.describe(include="all")

# Custom percentiles
df.describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95, 0.99])
```

**Gotcha:** `describe()` only includes numeric columns by default. Categorical and string columns are silently skipped. Use `include="all"` or `include=["object", "category"]` to see frequency stats for non-numeric columns.

---

#### .mean(), .median(), .std(), .quantile()

```python
df["col"].mean()
df["col"].median()
df["col"].std(ddof=1)            # sample std (default)
df["col"].quantile(q=0.5)       # single quantile
df["col"].quantile([0.25, 0.75]) # multiple quantiles
```

**Gotcha:** `.std()` uses `ddof=1` (sample standard deviation) by default, matching statistics convention. NumPy's `np.std()` uses `ddof=0` (population standard deviation) by default. This difference produces different results on the same data.

**2.x change:** In pandas 2.x, these methods skip NA by default (`skipna=True`). If all values are NA, they return `pd.NA` (nullable) instead of `np.nan` (numpy) when using nullable dtypes. This can affect downstream comparisons: `pd.NA == pd.NA` raises, while `np.nan == np.nan` is `False`.

---

#### .corr()

```python
df.corr(method="pearson", min_periods=1, numeric_only=False)
# method: "pearson", "kendall", "spearman"
```

Minimal example:

```python
corr_matrix = df[["token_count", "latency", "score"]].corr()
```

**Gotcha:** `.corr()` returns a square matrix of all pairwise correlations. In 2.x, `numeric_only` defaults to `False`, so non-numeric columns raise `TypeError` instead of being silently dropped. Either select numeric columns first or pass `numeric_only=True`.

**2.x change:** `numeric_only` default changed from `True` (1.x) to `False` (2.x). This is a breaking change - code that relied on silent column exclusion will now raise errors.

---

#### .value_counts()

```python
df["col"].value_counts(
    normalize=False,   # True for proportions instead of counts
    sort=True,
    ascending=False,
    dropna=True,
)
```

Minimal example:

```python
df["severity"].value_counts()
df["severity"].value_counts(normalize=True)  # proportions
```

**Gotcha:** `value_counts()` is a Series method, not a DataFrame method (though `df.value_counts()` was added in 1.1 for multi-column combinations). Calling `df.value_counts()` without arguments counts unique row combinations, which is rarely what you want.

---

#### pd.crosstab()

```python
pd.crosstab(
    index,          # row grouper (Series or list of Series)
    columns,        # column grouper
    values=None,    # values to aggregate
    aggfunc=None,   # aggregation function if values given
    margins=False,  # add row/column totals
    normalize=False, # "all", "index", "columns", or True (= "all")
)
```

Minimal example:

```python
ct = pd.crosstab(
    df["model"],
    df["severity"],
    margins=True,
)
```

**Gotcha:** Without `values` and `aggfunc`, `crosstab` counts frequencies. With `values` and `aggfunc`, it aggregates (like `pivot_table`). The `normalize` parameter is powerful but easy to misuse: `normalize="index"` normalizes each row to sum to 1; `normalize="columns"` normalizes each column; `normalize=True` normalizes the entire table.

---

### 8. Time Series

#### pd.to_datetime() (see also Section 2)

Already covered above. Additional time series context:

```python
# Create a DatetimeIndex for time series operations
df["date"] = pd.to_datetime(df["date"])
df = df.set_index("date")
df = df.sort_index()  # resample requires sorted index
```

**Gotcha:** `resample()`, `rolling()`, and `ewm()` all require the DataFrame to have a DatetimeIndex (or specify the `on=` parameter). Forgetting `set_index()` produces `TypeError: Only valid with DatetimeIndex, TimedeltaIndex or PeriodIndex`.

---

#### df.resample()

```python
df.resample(rule, on=None, closed=None, label=None)
# rule: "D" (day), "W" (week), "ME" (month-end), "h" (hour), etc.
```

Minimal example:

```python
weekly = df.resample("W")["events"].sum()
daily_avg = df.resample("D")["score"].mean()
```

**Gotcha:** Resampling to a lower frequency (daily to weekly) requires an aggregation function - `resample("W")` alone returns a `Resampler` object, not data. You must chain `.sum()`, `.mean()`, `.count()`, or `.agg()`.

**2.x change (important):** Month frequency alias changed from `"M"` to `"ME"` (month-end) in pandas 2.2. Year changed from `"Y"` to `"YE"`. Using the old aliases produces `FutureWarning` in 2.1 and `ValueError` in 2.2+. Similarly, `"H"` became `"h"`, `"T"` became `"min"`, `"S"` became `"s"`.

Full alias changes:
- `"M"` -> `"ME"` (month-end)
- `"Y"` -> `"YE"` (year-end)
- `"H"` -> `"h"` (hour)
- `"T"` -> `"min"` (minute)
- `"S"` -> `"s"` (second)
- `"MS"` remains `"MS"` (month-start, unchanged)

---

#### df.rolling()

```python
df.rolling(
    window,          # int (rows) or offset (e.g., "7D")
    min_periods=None,
    center=False,
    on=None,         # column to use instead of index
)
```

Minimal example:

```python
df["sma_7"] = df["token_count"].rolling(7).mean()
df["sma_7d"] = df["token_count"].rolling("7D").mean()  # calendar-based
```

**Gotcha:** Integer `window=7` means 7 rows, not 7 days. If your data has gaps (missing days), use a string offset `"7D"` for calendar-based windows. With integer windows, `min_periods` defaults to `window` (all values required); with offset windows, `min_periods` defaults to 1.

---

#### df.ewm()

```python
df.ewm(
    com=None,     # center of mass (one of com, span, halflife, alpha required)
    span=None,    # decay in terms of span
    halflife=None,
    alpha=None,   # smoothing factor 0 < alpha <= 1
    min_periods=0,
    adjust=True,
)
```

Minimal example:

```python
df["ewma"] = df["daily_cost"].ewm(span=7).mean()
```

**Gotcha:** You must specify exactly one of `com`, `span`, `halflife`, or `alpha`. They are interrelated: `alpha = 2 / (span + 1)`. `span=7` means the center of mass is at 3 periods, and the effective window captures about 86% of the total weight within the last 7 periods.

---

### pandas 2.x Cross-Cutting Changes

These affect multiple API surfaces and are worth calling out separately.

#### Copy-on-Write (CoW)

Enabled by default in pandas 2.1+. Any DataFrame derived from another (via indexing, slicing, or methods) initially shares data. A copy is made only when one of them is modified.

**Impact:**
- Chained indexing (`df["a"]["b"] = val`) no longer works for assignment. Use `.loc[]`.
- `inplace=True` may be slower than reassignment because it has to copy anyway.
- `df.values` returns a read-only view; use `df.to_numpy(copy=True)` for a mutable array.

#### Nullable Dtypes

pandas 2.x encourages nullable extension types: `Int64`, `Float64`, `boolean`, `string` (instead of numpy's `int64`, `float64`, `bool`, `object`). These use `pd.NA` instead of `np.nan` for missing values.

**Impact:**
- `pd.NA` propagates differently from `np.nan`: `pd.NA + 1` is `pd.NA`; `np.nan + 1` is `np.nan`. But `pd.NA == pd.NA` raises `TypeError`, while `np.nan == np.nan` is `False`.
- Use `pd.isna()` to check for missing values consistently across both systems.

#### Default Backend

When reading files, pandas 2.x allows `dtype_backend="numpy_nullable"` or `dtype_backend="pyarrow"` in all `read_*` functions. The pyarrow backend is significantly faster for large files and handles nested types better.

---

## DuckDB Python API (0.10+)

### 1. Direct File Queries

#### duckdb.sql()

```python
duckdb.sql(query: str) -> DuckDBPyRelation
```

Minimal example:

```python
import duckdb

result = duckdb.sql("SELECT * FROM 'events.csv' LIMIT 10")
print(result.fetchdf())  # returns pandas DataFrame
```

DuckDB auto-detects CSV, Parquet, and JSON files by extension when referenced in FROM clauses.

**Gotcha:** `duckdb.sql()` uses the default in-memory database connection. Each call to `duckdb.sql()` in the module-level (default connection) is not thread-safe. For multi-threaded use, create an explicit connection: `con = duckdb.connect()` and use `con.sql()`.

---

#### read_csv_auto() / read_json_auto() / read_parquet()

These are DuckDB SQL functions, not Python functions. Use them inside SQL strings:

```sql
SELECT * FROM read_csv_auto('catch-log.tsv')
SELECT * FROM read_csv_auto('data.csv', header=true, sep=',')
SELECT * FROM read_json_auto('events.json')
SELECT * FROM read_parquet('data.parquet')
```

Minimal Python example:

```python
df = duckdb.sql("""
    SELECT * FROM read_csv_auto('catch-log.tsv', delim='\t')
""").fetchdf()
```

**Gotcha:** `read_csv_auto` parameter names differ from pandas: `delim` not `sep`, `header` is a boolean not `"infer"`. For TSV files, you need `delim='\t'` explicitly - auto-detection sometimes guesses wrong on tab-delimited files with few columns.

**0.10+ change:** `read_csv_auto` was renamed from `read_csv` in earlier versions to clarify that it performs auto-detection. Both names still work in 0.10+, but `read_csv_auto` is canonical. Also, `read_json_auto` now supports JSONL (newline-delimited JSON) natively with `format='newline_delimited'`.

---

### 2. pandas Integration

#### Querying DataFrames Directly

```python
import pandas as pd
import duckdb

df = pd.DataFrame({"name": ["alice", "bob"], "score": [88, 92]})
result = duckdb.sql("SELECT * FROM df WHERE score > 90")
```

DuckDB automatically detects Python variables that are pandas DataFrames and makes them available as virtual tables in SQL.

**Gotcha:** The DataFrame variable name must be a valid SQL identifier. If your variable is named `my-data` (with a hyphen) or starts with a number, DuckDB cannot reference it. Use `duckdb.sql("SELECT * FROM $1", params=[df])` for arbitrary variable names - but note this syntax is not supported on the default connection in some versions. The simplest fix: use Python-valid, SQL-valid variable names (letters, underscores, digits not leading).

---

#### .fetchdf() / .df()

```python
result = duckdb.sql("SELECT ...")
pandas_df = result.fetchdf()   # returns pandas DataFrame
pandas_df = result.df()        # alias for fetchdf()
```

Additional conversion methods:

```python
result.fetchnumpy()    # dict of numpy arrays
result.fetchall()      # list of tuples
result.fetchone()      # single tuple
result.fetch_arrow_table()  # PyArrow Table (zero-copy, fastest)
```

**Gotcha:** `.fetchdf()` materializes the entire result into memory as a pandas DataFrame. For large results, use `.fetch_arrow_table()` for better memory efficiency, then convert specific columns as needed. Also, calling `.fetchdf()` twice on the same result raises an error - the result is consumed on first fetch.

**0.10+ change:** `.df()` was added as a short alias for `.fetchdf()` in 0.9. Both work in 0.10+. The `.fetch_arrow_table()` method is preferred for large results since pandas 2.x can consume Arrow tables efficiently via `pyarrow`.

---

### 3. Analytical SQL

#### CTEs (Common Table Expressions)

```sql
WITH
  base AS (
    SELECT * FROM read_csv_auto('catch-log.tsv', delim='\t')
  ),
  weekly AS (
    SELECT
      DATE_TRUNC('week', date) AS week,
      control,
      COUNT(*) AS catches
    FROM base
    GROUP BY 1, 2
  )
SELECT * FROM weekly ORDER BY week, catches DESC
```

Python usage:

```python
result = duckdb.sql("""
    WITH base AS (SELECT * FROM read_csv_auto('log.tsv', delim='\t'))
    SELECT agent, COUNT(*) as n FROM base GROUP BY agent
""").fetchdf()
```

**Gotcha:** CTEs in DuckDB are not materialized by default (they are inlined like views). If you reference a CTE multiple times, it may be recomputed each time. For performance-critical queries with reused CTEs, consider using `CREATE TEMP TABLE` instead.

---

#### Window Functions

```sql
-- ROW_NUMBER, RANK, DENSE_RANK
SELECT
  *,
  ROW_NUMBER() OVER (PARTITION BY model ORDER BY score DESC) as rank
FROM findings

-- LAG / LEAD
SELECT
  date,
  cost,
  LAG(cost, 1) OVER (ORDER BY date) as prev_cost,
  cost - LAG(cost, 1) OVER (ORDER BY date) as daily_change
FROM daily_costs

-- Running totals
SELECT
  date,
  cost,
  SUM(cost) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cumulative_cost
FROM daily_costs

-- Moving average
SELECT
  date,
  value,
  AVG(value) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as sma_7
FROM metrics
```

**Gotcha:** `ROWS BETWEEN` counts physical rows; `RANGE BETWEEN` counts logical values. For time series with gaps, `ROWS BETWEEN 6 PRECEDING` gives the last 7 rows regardless of date gaps, while `RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW` gives the actual last 7 calendar days. DuckDB supports both.

---

#### PIVOT / UNPIVOT

```sql
-- PIVOT: long to wide
PIVOT findings
ON model
USING COUNT(*) AS finding_count
GROUP BY severity

-- UNPIVOT: wide to long
UNPIVOT convergence_matrix
ON claude_score, gpt_score, gemini_score
INTO NAME model VALUE score
```

Python example:

```python
result = duckdb.sql("""
    PIVOT (SELECT model, severity, COUNT(*) as n FROM findings GROUP BY ALL)
    ON severity
    USING SUM(n)
    GROUP BY model
""").fetchdf()
```

**Gotcha:** `PIVOT` and `UNPIVOT` are DuckDB extensions to SQL, not standard SQL. The syntax differs from SQL Server's PIVOT. The `ON` clause specifies which column's values become column names. If the values contain spaces or special characters, the resulting column names will too - which can be awkward in downstream processing.

**0.10+ change:** PIVOT/UNPIVOT syntax stabilized in 0.9. In 0.10+, `PIVOT` supports multiple aggregation functions in a single statement and `GROUP BY ALL` shorthand.

---

#### Date/Time Functions

```sql
-- DATE_TRUNC: truncate to a time unit
SELECT DATE_TRUNC('week', timestamp_col) AS week FROM events

-- DATE_DIFF: difference between dates
SELECT DATE_DIFF('day', created_date, CURRENT_DATE) AS age_days FROM backlog

-- EXTRACT: pull a component
SELECT EXTRACT(dow FROM date_col) AS day_of_week FROM events
-- dow: 0 = Sunday, 6 = Saturday

-- Interval arithmetic
SELECT date_col + INTERVAL 7 DAY AS next_week FROM events

-- Current date/time
SELECT CURRENT_DATE, CURRENT_TIMESTAMP
```

**Gotcha:** `DATE_DIFF` argument order is `(unit, start, end)`, returning `end - start`. Getting the order wrong gives negative values. Also, `DATE_DIFF('month', '2026-01-31', '2026-02-28')` returns 0, not 1 - it counts complete unit crossings, not calendar months. Use `DATEDIFF('day', ...)` and divide by 30 for approximate months if needed.

**0.10+ change:** DuckDB 0.10 added `MAKE_TIMESTAMP`, `MAKE_DATE`, and improved `TRY_CAST` for date parsing. `STRFTIME` and `STRPTIME` are the format/parse functions (opposite of C convention where strftime formats and strptime parses - DuckDB follows the same convention, just noting it for clarity).

---

### 4. Current Gotchas and Version Notes

#### Thread Safety

DuckDB's default connection (`duckdb.sql()`) is NOT thread-safe. Each thread must use its own connection:

```python
import duckdb

# Thread-safe pattern
con = duckdb.connect()  # or duckdb.connect(":memory:")
result = con.sql("SELECT 42").fetchone()
con.close()
```

For read-only concurrent access to the same database file, multiple connections can open the same file with `read_only=True`:

```python
con = duckdb.connect("analytics.db", read_only=True)
```

**0.10+ change:** Connection handling was refactored in 0.10. The `duckdb.connect()` function now returns a `DuckDBPyConnection` that supports context managers:

```python
with duckdb.connect() as con:
    result = con.sql("SELECT 42").fetchone()
# connection auto-closed
```

---

#### In-Memory vs File-Based

```python
# In-memory (default, lost when connection closes)
con = duckdb.connect()

# File-based (persisted to disk)
con = duckdb.connect("my_analytics.db")
```

**Gotcha:** A file-based DuckDB database can only have one write connection at a time. Attempting a second write connection raises `IOException: Could not set lock on file`. For multi-process workflows, use separate database files or coordinate access.

---

#### API Changes from 0.9 to 0.10+

Key breaking changes:

1. **`duckdb.query()` removed** - Use `duckdb.sql()` instead. The `query()` function was deprecated in 0.9 and removed in 0.10.

2. **Relation API changes** - `DuckDBPyRelation` methods were cleaned up. `.execute()` was removed in favor of `.fetchall()` / `.fetchdf()`.

3. **Type system** - DuckDB 0.10 introduced `UNION` type, improved `MAP` type, and better `STRUCT` handling. `read_json_auto` handles nested JSON more reliably.

4. **Python 3.12+ support** - DuckDB 0.10+ fully supports Python 3.12. Earlier versions had compatibility issues.

5. **Replacement scans** - The mechanism by which DuckDB finds pandas DataFrames in the local scope (replacement scans) was made more robust in 0.10. Variables that shadow built-in table names no longer cause silent conflicts.

---

#### DuckDB + pandas 2.x Interop Notes

- DuckDB 0.10+ natively understands pandas nullable dtypes (`Int64`, `Float64`, `string`, `boolean`). In 0.9, these sometimes caused type errors.
- Arrow-backed pandas DataFrames (`dtype_backend="pyarrow"`) are transferred to DuckDB with zero-copy, making them significantly faster than numpy-backed DataFrames for large datasets.
- `fetchdf()` returns a DataFrame with numpy dtypes by default. Use `fetch_arrow_table().to_pandas(types_mapper=pd.ArrowDtype)` to get pyarrow-backed pandas types.

---

## Summary: Common Patterns for Bootcamp III Steps

### Loading project data files

```python
import yaml
import pandas as pd
import duckdb

# YAML -> DataFrame
with open("docs/internal/events.yaml") as f:
    events = pd.DataFrame(yaml.safe_load(f) or [])

# TSV -> DataFrame
catches = pd.read_csv("docs/internal/weaver/catch-log.tsv", sep="\t")

# TSV via DuckDB
catches_ddb = duckdb.sql("""
    SELECT * FROM read_csv_auto('docs/internal/weaver/catch-log.tsv', delim='\t')
""").fetchdf()
```

### Quick aggregation

```python
# pandas
catches.groupby("control")["outcome"].count().sort_values(ascending=False)

# DuckDB
duckdb.sql("""
    SELECT control, COUNT(*) as n
    FROM catches
    GROUP BY control
    ORDER BY n DESC
""").fetchdf()
```

### Time series basics

```python
# pandas
events["date"] = pd.to_datetime(events["date"])
events.set_index("date").resample("W")["type"].count()

# DuckDB
duckdb.sql("""
    SELECT DATE_TRUNC('week', date) as week, COUNT(*) as n
    FROM events
    GROUP BY 1
    ORDER BY 1
""").fetchdf()
```

---

## Sources

All content documented from training knowledge (pandas 2.0-2.2 documentation, DuckDB 0.9-0.10 documentation, release notes, and migration guides). Not fetched from live URLs. Write agents should verify specific signatures against current docs if precision is critical.
