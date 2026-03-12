# Bootcamp III: Operational Analytics for Agentic Engineering

**Date:** 2026-03-10
**Author:** Operator + Weaver
**Status:** OUTLINE - curriculum structure, not yet written
**Prerequisites:** Bootcamp I (Steps 1-5 especially), Bootcamp II (agentic practices)

---

## What This Is

The 20% of data science that does 80% of the heavy lifting for agentic engineers.

Agents generate data: structured logs, metrics YAML, review findings, cost records,
convergence matrices, TSV event streams. The engineer needs to analyze this data to
make operational decisions: Is this agent performing better after the prompt change?
Is cost trending up? Which model finds the most unique bugs? Is that metric drifting
or is it noise?

This is not academic data science. There are no proofs, no publication-grade statistics,
no deep learning. This is operational analytics - the kind that answers a question in
the next 10 minutes so you can make a decision in the next hour.

## Why This Exists

Bootcamp I teaches the substrate (Linux, bash, Python, make). Bootcamp II teaches
the agentic engineering practices. But between "I have structured data from my agents"
and "I made a good decision based on that data" lies a skills gap that neither
bootcamp addresses.

The gap is not large. An SWE who completes Bootcamp I Step 4 (text pipeline) and
Step 5 (Python CLI) already has 60% of the tooling. What's missing is:

1. **Statistical reasoning** - knowing when a change is real vs noise
2. **Visualization literacy** - making plots that reveal patterns instead of hiding them
3. **SQL analytics** - querying structured agent output with window functions and CTEs
4. **Time series intuition** - recognizing trends, seasonality, and anomalies in agent metrics
5. **Cost modeling** - turning token counts into budget forecasts

Each of these is a 2-6 hour investment that pays off for years.

## Principles

- Every topic connects to a concrete agentic engineering use case
- Prefer tools already in the stack: Python, pandas, DuckDB, matplotlib, uv
- "Good enough" statistics over rigorous statistics - operational decisions, not papers
- Exercises use the project's actual data formats (YAML metrics, TSV logs, JSON API responses)
- Jupyter notebooks as the primary delivery format (tool literacy from Bootcamp I Step 5.10)
- No emojis, no em-dashes

## Field Maturity Ratings

Each topic carries a maturity rating for how established the skill is in agentic
engineering specifically (not in data science generally):

- **Mature** - well-understood, tooling stable, widely practiced
- **Established** - solid foundations, tooling available, growing adoption
- **Emerging** - early practices forming, tooling exists but conventions are not settled
- **Novel** - few established patterns, mostly adapted from adjacent domains

## Total Estimated Time: 32-40 hours

---

## The Dependency Graph

```
Step 1: Tabular data (pandas, DuckDB)
├── Step 2: Descriptive statistics
│   ├── Step 4: Statistical testing
│   └── Step 5: Time series basics
├── Step 3: SQL analytics (DuckDB)
│   └── Step 5: Time series basics
├── Step 6: Visualization
├── Step 7: Log analysis patterns
└── Step 8: Cost modeling

Step 9: Text analysis basics (independent, can start after Step 1)
Step 10: Notebook workflows (independent, can start any time)
```

---

## The Steps

### Tier 1 - Foundations (everything else depends on these)

| Step | Topic | Est. Time | ROI | Maturity |
|------|-------|-----------|-----|----------|
| 1 | Tabular data with pandas and DuckDB | 4-5h | Daily | Mature |
| 2 | Descriptive statistics | 3-4h | Daily | Mature |
| 3 | SQL analytics with DuckDB | 4-5h | Daily | Mature |

### Tier 2 - Core Analysis (the skills that answer operational questions)

| Step | Topic | Est. Time | ROI | Maturity |
|------|-------|-----------|-----|----------|
| 4 | Statistical testing for practitioners | 3-4h | Weekly | Established |
| 5 | Time series basics | 3-4h | Weekly | Established |
| 6 | Visualization for decision-making | 4-5h | Daily | Mature |

### Tier 3 - Applied (domain-specific agentic analytics)

| Step | Topic | Est. Time | ROI | Maturity |
|------|-------|-----------|-----|----------|
| 7 | Log analysis patterns | 3-4h | Daily | Established |
| 8 | Cost modeling for API-based systems | 3-4h | Weekly | Emerging |
| 9 | Text analysis basics | 3-4h | Monthly | Emerging |
| 10 | Notebook-based analysis workflows | 2-3h | Daily | Mature |

---

## Step 1: Tabular Data with pandas and DuckDB

**Estimated time: 4-5 hours**
**Prerequisites:** Bootcamp I Step 5 (Python CLI tools), familiarity with CSV/JSON/YAML
**You will use this when:** loading agent output into a structure you can query, filter,
aggregate, and plot. This is the first thing you do with any data.

### Why This Step Exists

Agents produce structured output in various formats: YAML metrics from `bin/triangulate`,
TSV catch logs from `docs/internal/weaver/catch-log.tsv`, JSON API responses, CSV exports
from monitoring tools. Before you can analyze any of it, you need to load it into a
tabular structure where columns have types and rows can be filtered, grouped, and joined.

pandas is the standard Python library for this. DuckDB is a SQL engine that reads
CSV/Parquet/JSON directly with zero setup. Together they cover the spectrum from
quick exploration (pandas in a notebook) to repeatable queries (DuckDB SQL in a script).

### Topics

1. **DataFrames from scratch** - creating DataFrames from dicts, lists of dicts, and
   reading from CSV/TSV/JSON/YAML. The project's `backlog.yaml`, `events.yaml`, and
   `catch-log.tsv` as real data sources.

2. **Column operations** - selecting, renaming, adding computed columns, type casting.
   Datetime parsing for timestamps in agent logs.

3. **Filtering and boolean indexing** - selecting rows by condition. "Show me all HIGH
   severity findings" on a real darkcat alley export.

4. **Groupby and aggregation** - the pandas equivalent of SQL GROUP BY. Count findings
   per model, sum tokens per day, average latency per endpoint.

5. **Joins and merges** - combining DataFrames. Join backlog items with event log
   entries by date. Join findings from different models by finding ID.

6. **Reshaping** - pivot tables, melt, stack/unstack. Turn a wide convergence matrix
   into a long format for plotting.

7. **DuckDB basics** - `duckdb.sql()` on CSV files with zero config. The same
   operations in SQL instead of pandas. When SQL is clearer (aggregations, window
   functions) and when pandas is clearer (reshaping, iterative exploration).

8. **Data cleaning patterns** - handling missing values, deduplication, type coercion,
   string normalization. Real-world agent output is messy: null fields, inconsistent
   casing, mixed types in the same column.

### Exercises

- Load `docs/internal/backlog.yaml` into a DataFrame. Count open items by priority.
  Compute days-since-creation for each item. Sort by age descending.
- Load `docs/internal/weaver/catch-log.tsv` into DuckDB. Query: which control has
  fired most frequently? Which agent has the most catches?
- Load a `bin/triangulate` metrics export. Reshape the convergence data from wide
  (one column per model) to long (model as a column) for downstream analysis.
- Join events.yaml with catch-log.tsv on date to see which events correspond to
  which catches.

### Agentic Grounding

Every step in this bootcamp starts here. The triangulate script's 8 metrics are
computed in Python, but exploring them, slicing them by model, comparing across runs -
that is pandas/DuckDB territory. When an agent exports a YAML metrics file, your
first action is `pd.json_normalize(yaml.safe_load(open('metrics.yaml')))` or
`duckdb.sql("SELECT * FROM 'metrics.yaml'")`.

---

## Step 2: Descriptive Statistics

**Estimated time: 3-4 hours**
**Prerequisites:** Step 1 (tabular data)
**You will use this when:** answering "what does this distribution look like?" and
"is this value unusual?" before making any claims about trends or differences.

### Why This Step Exists

Before hypothesis testing, before time series, before visualization - you need to
describe what you have. How many findings per model? What is the median severity?
What is the spread of match confidence scores? Is the distribution skewed?

Descriptive statistics is the cheapest, fastest form of analysis. It answers most
operational questions without needing anything fancier.

### Topics

1. **Central tendency** - mean, median, mode. When each is appropriate. Median for
   skewed distributions (token counts, latency). Mean when the distribution is
   roughly symmetric (match confidence scores).

2. **Spread** - standard deviation, variance, IQR, range. "The average latency is
   200ms" means nothing without "and the 95th percentile is 2000ms."

3. **Percentiles and quantiles** - p50, p90, p95, p99. The operational language of
   SLOs. "95% of agent responses complete in under 3 seconds."

4. **Distribution shape** - skewness, kurtosis (light treatment). Histograms as the
   visual equivalent. Token usage is right-skewed. Error rates are often
   zero-inflated. Recognizing these shapes matters for choosing the right summary.

5. **Correlation** - Pearson and Spearman. "Does finding count correlate with review
   file length?" "Does token usage correlate with task complexity?" Correlation is
   not causation, but it is a useful signal for where to look deeper.

6. **Crosstabs and contingency tables** - pandas crosstab for categorical data. "How
   does severity distribute across models?" The convergence matrix from triangulate
   is already a crosstab.

### Exercises

- Compute descriptive stats on triangulate match confidence scores across a run.
  Report: count, mean, median, std, min, max, p25, p75. Interpret: is the matching
  performing well?
- Build a severity-by-model crosstab from darkcat alley findings. Which model rates
  things more severely?
- Compute correlation between finding count and file size for a set of review files.
  Does a longer review file mean more findings?
- Analyze the catch-log.tsv: frequency of each control, distribution of catches per
  week, most active agent.

### Agentic Grounding

The triangulate script already computes several of these: convergence rate, severity
distribution, marginal value. But it computes them for one run. Descriptive statistics
across runs - "is convergence rate improving over time?" - requires the skills in this
step. When the Operator asks "are the models getting better at finding real issues?",
the answer starts with descriptive statistics on the false positive adjudication data.

---

## Step 3: SQL Analytics with DuckDB

**Estimated time: 4-5 hours**
**Prerequisites:** Step 1 (tabular data), basic SQL knowledge (SELECT/WHERE/GROUP BY)
**You will use this when:** querying agent output data that is naturally relational,
running analytical queries that would be awkward in pandas, or when you need
window functions.

### Why This Step Exists

Most SWEs know enough SQL for ORM-backed CRUD operations. Analytical SQL is different:
window functions, CTEs, self-joins, running totals, ranking, lag/lead. These are the
operations that turn raw agent data into insights.

DuckDB is the tool because it runs locally, reads CSV/Parquet/JSON directly with no
server, and supports full analytical SQL. It is SQLite for analytics.

### Topics

1. **DuckDB setup and data loading** - `duckdb.sql("SELECT * FROM 'file.csv'")`
   reads CSV directly. YAML needs a Python intermediary. Parquet for larger datasets.
   The `read_csv_auto()`, `read_json_auto()` functions.

2. **CTEs (Common Table Expressions)** - WITH clauses for readable, composable queries.
   Build a pipeline of transformations as named stages instead of nested subqueries.

3. **Window functions** - ROW_NUMBER, RANK, DENSE_RANK for ranking findings by
   severity within each model. LAG/LEAD for comparing current value to previous
   (token usage this week vs last week). SUM/AVG OVER for running totals and
   moving averages.

4. **Self-joins** - comparing a table to itself. "Which findings appear in model A
   but not model B?" "Which backlog items were created in the same week?"

5. **Pivoting and unpivoting** - PIVOT/UNPIVOT for reshaping. Turn a long findings
   table into a wide convergence matrix, or vice versa.

6. **Date/time operations** - EXTRACT, DATE_TRUNC, DATE_DIFF, interval arithmetic.
   "Group events by week." "How many days since each backlog item was created?"

7. **Analytical patterns** - funnel analysis (how many findings survive each
   verification stage), cohort analysis (agent performance by deployment week),
   retention (which findings persist across runs).

### Exercises

- Write a CTE pipeline that: loads catch-log.tsv, computes catches per week per
  control, ranks controls by total catches, and shows week-over-week change using LAG.

- Using the triangulate metrics export: write a window function query that ranks
  findings by match confidence within each severity level. Show the top 3 per severity.

- Self-join on events.yaml: find events that occurred on the same day as a catch-log
  entry. This reconstructs the timeline of "what happened and what caught it."

- Analytical pattern: given multiple triangulate runs over time, build a "finding
  survival" query - which findings from run 1 still appear (by title similarity) in
  run 3?

### Agentic Grounding

When agent systems scale, the data volume exceeds what pandas handles comfortably in
a notebook. DuckDB handles millions of rows on a laptop. More importantly, analytical
SQL is the lingua franca of data teams - if your agentic system produces data that a
data analyst needs to query, SQL is the interface. The triangulate script exports YAML,
but a DuckDB query over a directory of exports is how you do cross-run analysis.

---

## Step 4: Statistical Testing for Practitioners

**Estimated time: 3-4 hours**
**Prerequisites:** Step 2 (descriptive statistics)
**You will use this when:** someone changes a prompt and claims it improved output
quality, or a new model version comes out and you need to know if it actually finds
more bugs.

### Why This Step Exists

The Operator asks: "We changed the darkcat review instructions last week. Are the
models finding more real issues now?" Descriptive statistics can show that the mean
finding count went from 8.2 to 9.7. But is that a real improvement or Tuesday?

Statistical testing answers this specific question. You do not need to understand the
mathematical derivation. You need to know: which test, what the result means, and when
the result doesn't matter (practical significance vs statistical significance).

### Topics

1. **The logic of hypothesis testing** - null hypothesis, alternative hypothesis,
   p-value, significance level. Explained without mathematical notation. The analogy:
   "If nothing changed, how surprised should I be by this result?"

2. **t-tests** - comparing two means. "Is the mean finding count different between
   the old and new prompt?" Independent samples (two different prompts tested on
   different codebases) vs paired samples (same codebase, before and after).
   `scipy.stats.ttest_ind()`, `scipy.stats.ttest_rel()`.

3. **Mann-Whitney U test** - the non-parametric alternative when data is skewed or
   small-sample. Token counts are rarely normally distributed. Severity ratings are
   ordinal. Use Mann-Whitney when the t-test assumptions don't hold.
   `scipy.stats.mannwhitneyu()`.

4. **Chi-squared test** - for categorical data. "Is the distribution of severity
   ratings different between Model A and Model B?" This is what you use on the
   severity-by-model crosstab from Step 2. `scipy.stats.chi2_contingency()`.

5. **Effect size** - Cohen's d for continuous data, Cramer's V for categorical.
   A p-value tells you "is it real?" Effect size tells you "is it big enough to
   care about?" With enough data, everything is statistically significant. Effect
   size is the filter.

6. **Multiple comparisons** - if you test 20 metrics for change after a prompt update,
   one will be "significant" by chance. Bonferroni correction (divide alpha by number
   of tests). The family-wise error rate problem.

7. **Practical significance vs statistical significance** - a 0.3% improvement in
   convergence rate might be statistically significant with enough data but operationally
   meaningless. Define the minimum effect you care about before running the test.

8. **Bootstrap confidence intervals** - when you don't know the distribution, resample
   and compute. A pragmatic alternative to parametric tests. 5 lines of Python with
   `numpy.random.choice()`.

### Exercises

- Given two sets of triangulate metrics (before and after a prompt change), test
  whether convergence rate changed significantly. Use both t-test and Mann-Whitney.
  Compute effect size. Report: "The change is/isn't statistically significant
  (p=X), with an effect size of Y (small/medium/large)."

- Build a chi-squared test for the severity distribution across three models from
  a real darkcat alley run. Are the models calibrated similarly?

- Generate synthetic agent performance data with a known small improvement. Run
  the test with N=10, N=50, N=200. Show how sample size affects power. Learn to
  answer: "How many runs do I need before I can detect a 10% improvement?"

- Bootstrap exercise: compute a 95% confidence interval for median match confidence
  from a triangulate run, without assuming any distribution.

### Agentic Grounding

The project's multi-model ensemble review (SD-318) compares findings across models.
The severity calibration metric in triangulate checks whether models agree on severity.
Statistical testing formalizes this: instead of "they seem to agree most of the time,"
you can say "severity agreement is significantly better than chance (chi-squared,
p < 0.01)." This matters when deciding whether to trust convergence as a signal or
dismiss it as coincidence.

---

## Step 5: Time Series Basics

**Estimated time: 3-4 hours**
**Prerequisites:** Step 2 (descriptive statistics), Step 3 (SQL analytics)
**You will use this when:** tracking agent metrics over time - tokens per day, errors
per week, cost per month, convergence rate per sprint.

### Why This Step Exists

Agent metrics are time series. Token usage per day. Error rate per hour. Cost per week.
Finding count per review cycle. The catch-log has dates. The events log has dates.
Every backlog item has a creation timestamp.

You need to recognize: is this going up? Is there a weekly pattern? Is that spike an
anomaly or a trend change? These are time series questions with practical answers that
don't require ARIMA models or Fourier transforms.

### Topics

1. **Resampling and frequency conversion** - daily data to weekly, hourly to daily.
   `df.resample('W').sum()`. DuckDB `DATE_TRUNC('week', timestamp)`. Choosing the
   right frequency for the question.

2. **Moving averages** - simple moving average (SMA) and exponentially weighted moving
   average (EWMA). SMA for smoothing noise, EWMA for recency-weighted smoothing.
   `df.rolling(7).mean()` for 7-day SMA. `df.ewm(span=7).mean()` for EWMA.
   DuckDB `AVG() OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`.

3. **Trend detection** - is it going up or down? Linear regression on time
   (`scipy.stats.linregress()`). The slope is the trend. The p-value tells you if
   the trend is real. Visualization (Step 6) is often more useful than the number.

4. **Seasonality** - weekly and monthly patterns. Agent usage often shows weekday/weekend
   patterns. Cost shows monthly billing cycles. Decompose into trend + seasonal +
   residual with `statsmodels.tsa.seasonal_decompose()` (brief treatment - the
   decomposition, not the theory).

5. **Anomaly detection (practical)** - z-score method: how many standard deviations
   from the moving average? IQR method: outside 1.5x IQR of the rolling window?
   These catch: "token usage spiked 3x today - is that a bug or a big task?"
   No ML required.

6. **Change point detection** - "something changed around March 5th." The CUSUM
   algorithm (cumulative sum of deviations from mean). Useful for detecting when a
   prompt change or model update actually took effect vs when it was deployed.

### Exercises

- Load events.yaml by date. Plot event frequency over time. Apply a 7-day moving
  average. Is event frequency increasing?

- Simulate daily token usage data with a known trend and weekly seasonality. Apply
  seasonal decomposition. Can you recover the components?

- Given cost data per day for an API-based agent system, implement z-score anomaly
  detection. Flag days where spending exceeds 2 standard deviations from the 7-day
  moving average.

- Using catch-log.tsv dates, detect whether the control firing rate changed after a
  process change (CUSUM or simple before/after comparison).

### Agentic Grounding

The events.yaml is the project's temporal spine. The catch-log.tsv records control
firings with dates. Together, these form a time series of project health. "Are we
catching more issues?" is a trend question. "Did the darkcat alley process improve
catch rate?" is a change point question. Time series basics turn the event log from
an append-only record into an operational instrument.

---

## Step 6: Visualization for Decision-Making

**Estimated time: 4-5 hours**
**Prerequisites:** Steps 1-2 (tabular data, descriptive statistics)
**You will use this when:** you need to see a pattern that numbers alone won't reveal,
or communicate a finding to someone who won't read a table.

### Why This Step Exists

A table of numbers showing convergence rate per run is data. A line chart showing
convergence rate climbing over 10 runs is a story. Visualization is not decoration -
it is the fastest path from data to pattern recognition.

The goal is not beautiful charts. The goal is functional plots that answer questions:
"Is this metric trending?" "Are these distributions different?" "Where are the
outliers?" matplotlib is the tool because it is the default, it is scriptable, and
every other Python plotting library wraps or extends it.

### Topics

1. **matplotlib fundamentals** - figures, axes, the object-oriented API (not pyplot
   state machine). `fig, ax = plt.subplots()`. Line plots, scatter plots, bar charts,
   histograms. Labeling axes, adding titles, setting limits.

2. **The right chart for the question** - line chart for trends over time, bar chart
   for comparisons across categories, histogram for distributions, scatter plot for
   relationships, heatmap for matrices. Choosing wrong obscures the answer.

3. **Multi-panel figures** - subplots for showing related views. Side-by-side severity
   distributions for three models. Token usage trend above, cost trend below.
   `fig, axes = plt.subplots(2, 2, figsize=(12, 8))`.

4. **Heatmaps** - `matplotlib.pyplot.imshow()` or `seaborn.heatmap()`. The convergence
   matrix from triangulate is naturally a heatmap. Correlation matrices. Severity
   calibration across models.

5. **Annotations and reference lines** - marking change points, adding threshold lines,
   annotating outliers. `ax.axhline()`, `ax.axvline()`, `ax.annotate()`. A cost chart
   with a budget line. A latency chart with an SLO target.

6. **Saving and exporting** - `fig.savefig('plot.png', dpi=150, bbox_inches='tight')`.
   SVG for documentation. PNG for reports. PDF for printing.

7. **Common mistakes** - truncated axes that exaggerate differences, pie charts for
   anything with more than 3 categories, 3D charts that obscure rather than reveal,
   missing axis labels, rainbow color maps on sequential data.

8. **Seaborn for statistical plots** - light introduction. `sns.boxplot()`,
   `sns.violinplot()`, `sns.pairplot()`. When seaborn saves time vs raw matplotlib.

### Exercises

- Plot the convergence matrix from a triangulate export as a heatmap. Models on one
  axis, findings on the other. Color intensity = match confidence.

- Create a multi-panel figure: (1) finding count per model as a bar chart, (2)
  severity distribution per model as stacked bars, (3) match confidence distribution
  as a histogram, (4) marginal value curve as a line chart. All from one triangulate
  metrics export.

- Time series plot of catch-log entries per week with a 4-week moving average overlay.
  Annotate any weeks with zero catches.

- Build a "model comparison dashboard" as a single figure with 4 subplots comparing
  two darkcat alley runs (before/after a prompt change).

### Agentic Grounding

The project has plotting capabilities implied but not heavily used. This step makes
them explicit. The triangulate script exports data; visualization turns that data into
something the Operator can glance at and immediately see: "Model A is finding more
unique issues than B and C." "Convergence rate improved after SD-318." The YAML HUD
is text-based status reporting. Visualization is its graphical complement.

---

## Step 7: Log Analysis Patterns

**Estimated time: 3-4 hours**
**Prerequisites:** Bootcamp I Step 4 (text pipeline), Step 1 (tabular data)
**You will use this when:** parsing agent execution logs, LLM API response logs,
application logs with agent interactions, error logs from multi-agent systems.

### Why This Step Exists

Agent systems produce logs. Lots of logs. The LLM API returns structured responses
(JSON), but the orchestration layer logs semi-structured text (timestamps, log levels,
free-text messages). Agent execution traces are deeply nested. Error messages reference
tool calls, context IDs, and session identifiers.

The text pipeline tools from Bootcamp I Step 4 (grep, awk, jq) handle single-pass
extraction. This step covers the patterns that require statefulness: session
reconstruction, error rate computation over windows, latency percentile tracking,
and multi-line log record parsing.

### Topics

1. **Log format parsing** - regex extraction from common formats. JSON logs (one
   object per line - JSONL). Structured logging with key=value pairs. Timestamp
   parsing across formats (ISO 8601, syslog, custom).

2. **Session reconstruction** - grouping log lines by session/request/trace ID.
   Computing per-session metrics: duration, token count, error count, tool call count.
   This is a group-by on a non-obvious key extracted from the log line.

3. **Error rate computation** - errors per time window, errors per session, error
   rate trends. Distinguishing transient errors (API rate limits, timeouts) from
   persistent errors (bad prompts, schema violations). Classification by error type
   using regex or structured fields.

4. **Latency analysis** - extracting request duration from logs. Percentile computation
   (p50, p95, p99). Latency by endpoint, by model, by time of day. Identifying slow
   requests and their characteristics.

5. **Multi-line log records** - stack traces, multi-line JSON responses, agent
   reasoning blocks. Strategies: grep context lines (`grep -A`/`-B`/`-C`), awk range
   patterns, Python stateful parsing.

6. **Log aggregation in DuckDB** - loading JSONL logs directly into DuckDB for SQL
   analysis. When grep+awk pipelines become unwieldy, switch to SQL.

### Exercises

- Parse the catch-log.tsv and events.yaml into a unified timeline. For each event,
  show whether a catch-log entry exists within 24 hours. This is the "did our controls
  fire when something happened?" analysis.

- Given a JSONL log of LLM API calls (simulated), compute: requests per minute,
  median latency, error rate, tokens per request. Produce a one-page summary.

- Reconstruct agent sessions from a multi-agent log file (simulated). Each session
  has a session ID, multiple tool calls, and an outcome. Compute success rate per
  agent role.

- Build a "log health dashboard" script that reads a log file and outputs: total
  lines, error count, error rate, top 5 error messages, hourly volume chart.

### Agentic Grounding

The project's catch-log.tsv is already a structured log of control firings. The
events.yaml is a structured event log. In production agentic systems, these grow to
thousands of entries. The patterns in this step scale from the project's current dozen
entries to production-scale log analysis without changing the approach - only the
tooling (grep for small, DuckDB for large, dedicated log infrastructure for
production).

---

## Step 8: Cost Modeling for API-Based Systems

**Estimated time: 3-4 hours**
**Prerequisites:** Step 1 (tabular data), Step 5 (time series basics)
**You will use this when:** managing the budget for an agent system that makes API calls
with per-token pricing, or when deciding whether a more expensive model is worth the
cost for a specific task.

### Why This Step Exists

API-based agent systems have a direct cost per action. Every LLM call has a token
count and a price. Every tool invocation has a latency and sometimes a cost. Multi-agent
orchestration multiplies these costs. The darkcat alley process runs 3 models on the
same code - that is 3x the review cost. Is the marginal value of the third model worth
its marginal cost?

This is not abstract financial modeling. It is: "This agent pipeline costs $4.20 per
run. We run it 50 times a month. The budget is $250/month. Can we add a fourth model?"

### Topics

1. **Token counting and pricing** - input vs output tokens, pricing tiers across
   providers (Anthropic, OpenAI, Google). Cached vs uncached tokens. Context window
   utilization and its cost implications. `tiktoken` for OpenAI, Anthropic's token
   counting API.

2. **Cost per task** - decomposing a multi-step agent workflow into its API calls.
   Computing cost per step and total cost per task. The triangulate pipeline:
   3 reviews (each a model call) + parsing + metrics computation. What does each
   step cost?

3. **Cost trend analysis** - applying time series basics (Step 5) to cost data.
   Daily/weekly/monthly cost. Trend detection. Budget burn rate. "At this rate, we
   exhaust the monthly budget by the 22nd."

4. **Marginal cost analysis** - the triangulate marginal value metric already exists.
   Pair it with marginal cost: "The third model adds 3.2 unique findings at a cost
   of $1.40. The second model added 5.1 unique findings at $1.40. The third model's
   cost-per-unique-finding is $0.44 vs the second model's $0.27."

5. **Cost optimization patterns** - prompt caching, shorter prompts, model selection
   by task complexity (cheap model for simple tasks, expensive model for complex ones),
   early termination when convergence is reached.

6. **Budget forecasting** - simple linear projection from current burn rate. Scenario
   modeling: "If we add this new agent task at 10 runs/day, what's the monthly cost
   impact?" Spreadsheet-grade modeling in pandas.

### Exercises

- Given a month of API usage data (simulated), compute: total cost, cost per model,
  cost per task type, daily cost trend. Plot the budget burn curve with a reference
  line at the monthly budget.

- Compute the cost-per-unique-finding for each model in a darkcat alley run using the
  triangulate marginal value data. Which model has the best ROI?

- Build a budget forecasting notebook: input current daily costs and monthly budget,
  output projected exhaustion date, cost by category, and recommended optimization
  actions.

- Cost sensitivity analysis: if the per-token price drops 20% (as it tends to over
  time), how does the optimal number of review models change?

### Agentic Grounding

The project's true north is "hired = proof > claim." Every dollar spent on API calls
is an investment that must produce portfolio value. The darkcat alley pipeline's
marginal value metric (computed by triangulate) is already a cost-effectiveness tool.
This step generalizes: from the specific (is the third model worth it?) to the
systematic (what is our cost per unit of verified quality?).

---

## Step 9: Text Analysis Basics

**Estimated time: 3-4 hours**
**Prerequisites:** Step 1 (tabular data), Bootcamp I Step 4 (text pipeline)
**You will use this when:** comparing agent outputs across runs, classifying agent
response quality, searching for similar findings across reviews, or building simple
content quality signals.

### Why This Step Exists

Agents produce text. Reviews, code, explanations, recommendations. Comparing this text
across models, across runs, or against a reference is a common task. The triangulate
script already does text similarity matching (SequenceMatcher). This step covers the
broader toolkit.

This is not NLP research. There are no transformers, no fine-tuning, no custom models.
This is pragmatic text analysis: string similarity, basic embedding search, keyword
extraction, and simple classification.

### Topics

1. **String similarity** - the SequenceMatcher approach used by triangulate (0.3 *
   file_sim + 0.7 * title_sim). Levenshtein distance. Jaccard similarity on token
   sets. When each is appropriate: SequenceMatcher for ordered text, Jaccard for
   bag-of-words comparison, Levenshtein for typo detection.

2. **TF-IDF** - term frequency-inverse document frequency. Identifies which words
   are distinctive to a document relative to a corpus. "What terms are unique to
   Model A's findings that don't appear in Model B's?" scikit-learn's
   `TfidfVectorizer` in 5 lines.

3. **Embedding-based similarity** - using pre-computed embeddings (OpenAI, Anthropic,
   or local via sentence-transformers) to find semantically similar findings even
   when the wording is different. Cosine similarity on embedding vectors. When
   string matching fails (different words, same meaning) and embeddings help.

4. **Simple text classification** - classifying agent outputs by type (bug report,
   style issue, security finding, false positive) using keyword rules or simple
   ML. scikit-learn's LogisticRegression on TF-IDF features. The slopodar taxonomy
   as a classification scheme.

5. **Keyword and pattern extraction** - regex for structured patterns (file paths,
   line numbers, severity labels). Counter-based keyword frequency. Identifying
   the most common themes in a collection of agent findings.

6. **Diffing and change detection** - Python's difflib for comparing agent outputs
   across runs. "What changed in the agent's review after the prompt update?"
   Structured diff on YAML/JSON outputs vs text diff on prose outputs.

### Exercises

- Implement the triangulate matching algorithm from scratch using SequenceMatcher.
  Given two lists of findings (dicts with title/file/severity), produce matched
  pairs with confidence scores. Compare your results to the actual triangulate output.

- Using TF-IDF, find the most distinctive terms in each model's findings from a
  darkcat alley run. "Model A talks about security; Model B talks about error
  handling; Model C talks about style."

- Build a simple classifier that labels slopodar entries by domain using keyword
  rules. Input: the slopodar.yaml file. Output: predicted domain per entry.
  Compare to the actual domain labels. What accuracy do keyword rules achieve?

- Diff two versions of an agent's review output. Highlight what was added, removed,
  and changed. Present as a structured summary, not raw diff.

### Agentic Grounding

The triangulate script's finding matcher uses string similarity at its core (line 156:
`SequenceMatcher(None, a.lower(), b.lower()).ratio()`). The match threshold (default
0.6) is a tuning parameter that determines convergence rates. Understanding text
similarity deeply - what the 0.6 means, when it fails, when embeddings would do
better - is what turns the triangulate user into a triangulate improver.

---

## Step 10: Notebook-Based Analysis Workflows

**Estimated time: 2-3 hours**
**Prerequisites:** Bootcamp I Step 5.10 (Jupyter introduction), Step 1 (tabular data)
**You will use this when:** doing exploratory analysis, building a repeatable analysis
template, creating analysis reports that mix code, output, and interpretation.

### Why This Step Exists

Bootcamp I Step 5.10 introduced Jupyter as a tool. This step covers how to use it
effectively for analytical work: organizing notebooks, making analyses reproducible,
when to keep analysis in a notebook vs extract to a script, and the notebook-to-script
pipeline.

### Topics

1. **Notebook organization** - one notebook per analysis question. Clear naming:
   `2026-03-10-convergence-trend-analysis.ipynb`. Standard sections: Context, Data
   Loading, Analysis, Findings, Next Steps.

2. **Reproducibility** - declaring dependencies with PEP 723 metadata in the first
   cell (via a helper script that installs them). Pinning data file paths. Using
   relative paths from a known root. `%load_ext autoreload` for iterating on
   imported modules.

3. **The exploration-to-script pipeline** - explore in a notebook, extract the useful
   parts into a Python script with argparse. The notebook is the lab; the script is
   the factory. triangulate started as exploration and became `bin/triangulate`.

4. **Magic commands for analytics** - `%%time` and `%%timeit` for performance.
   `%%bash` for shell pipelines. `%matplotlib inline` for plots. `%store` for
   persisting variables across notebooks.

5. **nbstripout and version control** - stripping output before commit. Git filter
   configuration. Why notebooks in version control need this.

6. **Analysis templates** - building a reusable notebook template for common analyses.
   "Agent performance review" template: load metrics, compute descriptive stats,
   run statistical tests, generate visualizations, summarize findings.

### Exercises

- Create an analysis notebook that loads a triangulate metrics export, computes
  descriptive statistics, generates a 4-panel visualization, and writes a 3-sentence
  summary of findings.

- Extract the data loading and metric computation from the notebook into a reusable
  Python module. Import it in a second notebook that compares two runs.

- Set up nbstripout for the project. Demonstrate that committing a notebook with
  output produces a clean diff.

- Build an "agent review dashboard" notebook template with placeholder cells for:
  data loading, finding count summary, convergence analysis, severity distribution,
  cost estimate, and recommendation.

### Agentic Grounding

The Makefile currently targets scripts (`bin/triangulate`). Notebooks occupy a
different niche: they are the Operator's analytical workbench. When the Operator asks
"should we add a fourth model to the review pipeline?", the answer is not a script
run - it is a notebook that loads data from three runs, computes marginal value curves,
overlays cost data, and presents a recommendation with supporting evidence. The
notebook is the medium for analysis that requires human judgment (L12) alongside
computed metrics.

---

## Cross-Cutting Themes

### When to Use What

```
Question type                       Tool
------------------------------------------------------
"What happened?"                    Descriptive stats (Step 2)
"Is this real or noise?"            Statistical testing (Step 4)
"Is this trending?"                 Time series (Step 5)
"Show me the pattern"               Visualization (Step 6)
"What does the log say?"            Log analysis (Step 7)
"What does it cost?"                Cost modeling (Step 8)
"Are these outputs similar?"        Text analysis (Step 9)
"Let me explore this"               Notebook (Step 10)
"Give me a number"                  SQL/DuckDB (Step 3)
```

### The Tool Stack

| Tool | Role | Install |
|------|------|---------|
| pandas | Tabular data manipulation | `uv pip install pandas` |
| DuckDB | SQL analytics on local files | `uv pip install duckdb` |
| matplotlib | Plotting and visualization | `uv pip install matplotlib` |
| seaborn | Statistical visualization | `uv pip install seaborn` |
| scipy | Statistical tests | `uv pip install scipy` |
| scikit-learn | TF-IDF, simple classification | `uv pip install scikit-learn` |
| jupyter | Notebook environment | `uv pip install jupyter` |
| numpy | Numerical operations | (dependency of pandas) |
| statsmodels | Time series decomposition | `uv pip install statsmodels` |

All of these can be declared inline in a notebook or script using PEP 723 metadata
(Bootcamp I Step 5.4).

### What This Bootcamp Is Not

- **Not machine learning** - no model training, no neural networks, no deep learning.
  If you need ML, you need a different curriculum.
- **Not academic statistics** - no proofs, no measure theory, no Bayesian inference
  beyond the intuitive level. This is for operational decisions, not publications.
- **Not big data** - DuckDB on a laptop handles millions of rows. If you need
  distributed processing, you need Spark/Dask, which is a different problem.
- **Not data engineering** - no ETL pipelines, no data warehouses, no orchestration
  tools (Airflow, Dagster). This is analysis, not infrastructure.

---

## Project Data Sources for Exercises

Real data from the project, usable in exercises:

| Source | Format | Location | Contains |
|--------|--------|----------|----------|
| Backlog | YAML | `docs/internal/backlog.yaml` | Task tracking with status, priority, dates |
| Events | YAML | `docs/internal/events.yaml` | Timestamped project events with types and backrefs |
| Events (legacy) | TSV | `docs/internal/events.tsv` | Same data, older format |
| Catch log | TSV | `docs/internal/weaver/catch-log.tsv` | Control firing events with dates, agents, outcomes |
| Slopodar | YAML | `docs/internal/slopodar.yaml` | Anti-pattern taxonomy with severity, confidence, dates |
| Triangulate exports | YAML | `data/alley/*/` | Metrics, convergence, findings-union per run |
| Session decisions | YAML index | `docs/internal/session-decisions-index.yaml` | Last N decisions with refs |

Simulated data should be generated for exercises that need larger datasets (API logs,
token usage time series, multi-run metrics).

---

## Sequencing Recommendation

For an SWE with Bootcamp I complete:

**Week 1 (12-14h):** Steps 1, 2, 3 - tabular data, descriptive stats, SQL analytics.
These unlock all downstream steps and are immediately useful.

**Week 2 (10-13h):** Steps 6, 7, 10 - visualization, log analysis, notebooks. These
are daily-use skills that compound with Steps 1-3.

**Week 3 (9-12h):** Steps 4, 5, 8 - statistical testing, time series, cost modeling.
These are the analytical depth that turns data reading into data reasoning.

**As needed:** Step 9 - text analysis. Most useful when working on finding matching,
output comparison, or content quality signals.

---

## Provenance

Ranking criteria (same as Bootcamp I):

1. **Compositional leverage** - does this skill compose into the analytical tasks above it?
2. **Return per hour** - how much capability per unit of learning time?
3. **Irreplaceability** - can an agent compute this for you, or must you understand it?

The third criterion is again the differentiator. An agent can run `df.describe()` for
you. But interpreting whether a p-value of 0.03 means you should change your prompt
strategy, or whether a convergence rate of 0.45 is good or bad in context, or whether
a cost trend implies you need to optimize or just accept the expense - these require
statistical reasoning that the Operator must own. Delegating interpretation to the
agent creates the analytical lullaby (slopodar: analytical-lullaby).
