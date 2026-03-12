# Task 04: Research - Statistics APIs (scipy.stats, statsmodels, numpy)

**Type:** Research (read-only)
**Parallelizable with:** Tasks 01, 02, 03, 05
**Blocks:** Tasks 09, 10 (statistical testing, time series)
**Output:** `docs/bootcamp/tasks/04-research-statistics-apis/findings.md`

---

## Objective

Document the scipy.stats and statsmodels APIs that Steps 4 (Statistical Testing)
and 5 (Time Series) will teach. The write agent needs accurate function signatures,
return value formats, and interpretation guidelines to produce correct instructional
content.

## Research Scope

### scipy.stats (target: 1.11+)

1. **t-tests**
   - `scipy.stats.ttest_ind(a, b)` - independent samples t-test
   - `scipy.stats.ttest_rel(a, b)` - paired samples t-test
   - Return value: `TtestResult(statistic, pvalue)` (named tuple in recent versions)
   - Parameters: `equal_var=True/False` (Welch's t-test), `alternative='two-sided'`

2. **Mann-Whitney U test**
   - `scipy.stats.mannwhitneyu(x, y)`
   - When to use: non-normal data, ordinal data, small samples
   - Return value format, `alternative` parameter

3. **Chi-squared test**
   - `scipy.stats.chi2_contingency(observed)` - takes a contingency table (2D array)
   - Return value: `(chi2, p, dof, expected_freq)`
   - How to construct the contingency table from `pd.crosstab()`

4. **Linear regression (simple)**
   - `scipy.stats.linregress(x, y)`
   - Return: `LinregressResult(slope, intercept, rvalue, pvalue, stderr)`
   - Use case: trend detection in time series (Step 5)

5. **Pearson and Spearman correlation**
   - `scipy.stats.pearsonr(x, y)` - returns `(r, p)`
   - `scipy.stats.spearmanr(x, y)` - returns `SpearmanrResult(correlation, pvalue)`
   - When to use each

### Effect Size Calculations

- Cohen's d: manual computation `(mean1 - mean2) / pooled_std`
- Cramer's V: manual from chi2 statistic
- Interpretation thresholds: small (0.2), medium (0.5), large (0.8) for Cohen's d

### Bootstrap Confidence Intervals

- `numpy.random.choice(data, size=len(data), replace=True)` in a loop
- `numpy.percentile(bootstrap_stats, [2.5, 97.5])` for 95% CI
- Practical pattern: 5-10 lines of code, no special library needed

### statsmodels (target: 0.14+)

1. **Seasonal decomposition**
   - `statsmodels.tsa.seasonal_decompose(series, model='additive', period=N)`
   - Return: `DecomposeResult` with `.trend`, `.seasonal`, `.resid`, `.observed`
   - Requires a DatetimeIndex or explicit period

2. **Moving averages** - note that pandas `.rolling()` and `.ewm()` handle this;
   statsmodels is needed primarily for decomposition

### Multiple Comparisons

- Bonferroni correction: divide alpha by number of tests
- `statsmodels.stats.multitest.multipletests()` if available, or manual

## What to Document

For each function:
- Exact signature with key parameters
- Return value structure (what fields, what types)
- One-line interpretation guide ("if p < 0.05, the difference is statistically significant")
- Common mistake or misinterpretation

## Output Format

Structured markdown. Group by topic (testing, correlation, effect size, time series).
Include the minimal code pattern for each test - the write agent will expand these
into full instructional examples.
