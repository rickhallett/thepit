# Task 10: Write - Step 5: Time Series Basics

**Type:** Write
**Parallelizable with:** Tasks 09, 11, 12, 13, 14, 15 (Tier 2/3 steps)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 03 (pandas APIs), Task 04 (statsmodels)
**Output:** `docs/bootcamp/bootcamp3-05-time-series.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 5: Time Series Basics.
This is a Tier 2 core analysis step. It teaches the reader to recognize trends,
seasonality, and anomalies in agent metrics over time.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/03-research-python-analytics/findings.md` - pandas time series API
- `docs/bootcamp/tasks/04-research-statistics-apis/findings.md` - statsmodels decomposition
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 394-462 - the outline for this step

## Content Specification

From the outline, this step covers 6 topics:

1. Resampling and frequency conversion
2. Moving averages (SMA, EWMA)
3. Trend detection (linear regression on time)
4. Seasonality (decomposition with statsmodels)
5. Anomaly detection (z-score, IQR methods)
6. Change point detection (CUSUM)

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template. Title: `# Step 5: Time Series Basics`

### Prerequisites Are Real

This step depends on both Step 2 (descriptive stats) and Step 3 (SQL analytics). The
reader knows mean/std/percentiles and can write DuckDB window functions. Build on this:
moving averages are window functions applied to time-ordered data. Anomaly detection
uses z-scores (mean + std from Step 2).

### Practical Over Theoretical

The outline says "these are time series questions with practical answers that don't
require ARIMA models or Fourier transforms." Enforce this. The reader needs:

- "Is this going up?" - linear regression slope + p-value
- "Is there a weekly pattern?" - resample + visual inspection + decomposition
- "Is this spike an anomaly?" - z-score from rolling mean/std

They do not need: stationarity tests, differencing, autocorrelation functions,
forecasting models.

### Dual API Coverage

Show both pandas and DuckDB for each operation:
- pandas: `df.resample('W').sum()`, `df.rolling(7).mean()`, `df.ewm(span=7).mean()`
- DuckDB: `DATE_TRUNC`, `AVG() OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`

### The CUSUM Section

Change point detection (topic 6) is the most novel content. Explain CUSUM as:
cumulative sum of (value - mean). When the cumulative sum deviates sharply from zero,
something changed. Show the algorithm in 10 lines of Python. Apply it to a concrete
example: "the control firing rate changed after we updated the darkcat instructions."

### Code Examples

- Use `pd.to_datetime()`, `df.set_index()`, `df.resample()`, `df.rolling()`, `df.ewm()`
- Use `scipy.stats.linregress()` for trend detection
- Use `statsmodels.tsa.seasonal_decompose()` for decomposition
- All examples on project data: events.yaml dates, catch-log.tsv dates

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 700-1000 lines. This is a 3-4 hour step with 6 topics.
- Frame every technique as answering an operational question

## Quality Gate

- Every pandas time series operation must use DatetimeIndex correctly
- The CUSUM algorithm must be complete and correct
- Seasonal decomposition must specify model and period parameters
- Anomaly detection must show both z-score and IQR methods
- No ARIMA, no forecasting, no stationarity tests - stay practical
- No emojis, no em-dashes
