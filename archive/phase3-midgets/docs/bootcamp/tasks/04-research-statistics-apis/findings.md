# Task 04 Findings: Statistics APIs (scipy.stats, statsmodels, numpy)

**Date:** 2026-03-10
**Status:** Complete
**Consumers:** Task 09 (Step 4: Statistical Testing), Task 10 (Step 5: Time Series)

---

## 1. Hypothesis Testing - scipy.stats

### 1.1 Independent Samples t-test

```python
from scipy.stats import ttest_ind

result = ttest_ind(a, b, equal_var=True, alternative='two-sided')
# result.statistic  -> float: the t-statistic
# result.pvalue     -> float: two-tailed p-value (or one-tailed if alternative is set)
```

**Key parameters:**
- `a`, `b` - array-like, the two independent samples
- `equal_var=True` - if True, assumes equal population variances (Student's t-test). Set `equal_var=False` for Welch's t-test, which is safer as a default since it does not assume equal variances.
- `alternative='two-sided'` - options: `'two-sided'`, `'less'`, `'greater'`. Controls whether the test is two-tailed or one-tailed. `'less'` tests whether the mean of `a` is less than the mean of `b`.
- `nan_policy='propagate'` - options: `'propagate'`, `'raise'`, `'omit'`. Set to `'omit'` to drop NaN values before computing.

**Return value:** `TtestResult` named tuple (scipy 1.11+) with `.statistic` and `.pvalue` attributes. In older scipy versions, returns a plain tuple `(statistic, pvalue)`.

**Interpretation:** If `pvalue < alpha` (typically 0.05), reject the null hypothesis that the two samples have equal means. The difference is statistically significant at that alpha level.

**Common mistake:** Using `equal_var=True` (the default) without checking whether variances are actually similar. When in doubt, use `equal_var=False` (Welch's t-test). Welch's test is valid even when variances are equal - it just loses a tiny bit of power. The reverse error (assuming equal variances when they differ) can produce misleading p-values.

**When to use:** Comparing two group means when data is approximately normally distributed and sample sizes are moderate (roughly n > 20 per group). Example: "Is the mean convergence rate different between the old and new prompt?"

### 1.2 Paired Samples t-test

```python
from scipy.stats import ttest_rel

result = ttest_rel(a, b, alternative='two-sided')
# result.statistic  -> float: the t-statistic
# result.pvalue     -> float: p-value
```

**Key parameters:**
- `a`, `b` - array-like, must have the same length. Each element `a[i]` is paired with `b[i]`.
- `alternative='two-sided'` - same options as `ttest_ind`.
- `nan_policy='propagate'` - same as `ttest_ind`.
- No `equal_var` parameter - it is not relevant for paired tests.

**Return value:** Same `TtestResult` named tuple as `ttest_ind`.

**Interpretation:** Same as `ttest_ind`, but tests whether the mean of the paired differences (`a[i] - b[i]`) is significantly different from zero.

**Common mistake:** Using `ttest_ind` when data is paired. If you measured the same codebase before and after a prompt change, the measurements are paired. Using `ttest_ind` ignores the pairing and reduces statistical power. Conversely, using `ttest_rel` on data that is not genuinely paired (different codebases, different sessions) is incorrect and can inflate significance.

**When to use:** When each observation in `a` has a natural pairing with an observation in `b`. Example: "Same 15 code files reviewed before and after the prompt change - did finding count per file change?"

### 1.3 Mann-Whitney U Test

```python
from scipy.stats import mannwhitneyu

result = mannwhitneyu(x, y, alternative='two-sided')
# result.statistic  -> float: the U statistic
# result.pvalue     -> float: p-value
```

**Key parameters:**
- `x`, `y` - array-like, the two independent samples. Do not need equal length.
- `alternative='two-sided'` - same three options. Note: before scipy 1.2, the default was `None` which meant one-sided. In modern scipy (1.2+), the default is `'two-sided'`. Always specify explicitly to be safe.
- `method='auto'` - method for computing the p-value. `'auto'` selects based on sample size. For small samples it uses exact calculation; for larger samples it uses a normal approximation.

**Return value:** `MannwhitneyuResult` named tuple with `.statistic` and `.pvalue`.

**Interpretation:** Tests whether one distribution is stochastically greater than the other. Informally: "are values from `x` systematically higher (or lower) than values from `y`?" If `pvalue < alpha`, the distributions differ.

**Common mistake:** Interpreting Mann-Whitney as a test of medians. It tests stochastic dominance, which is related but not identical to a median comparison. Two distributions can have the same median but different Mann-Whitney results because the shapes differ.

**When to use:** Non-parametric alternative to the t-test. Use when: data is not normally distributed (token counts, latency, severity ratings), sample sizes are small (under ~20), or data is ordinal rather than interval. Example: "Severity ratings (1-5) from Model A vs Model B - are they systematically different?"

### 1.4 Chi-Squared Test of Independence

```python
from scipy.stats import chi2_contingency
import pandas as pd

# Construct contingency table
table = pd.crosstab(df['model'], df['severity'])
# table is a DataFrame, works directly as a 2D array

chi2, p, dof, expected_freq = chi2_contingency(table)
```

**Key parameters:**
- `observed` - 2D array-like (DataFrame, numpy array, list of lists). The contingency table of observed frequencies. Rows and columns represent categories.
- `correction=True` - applies Yates' continuity correction for 2x2 tables. For larger tables, it has no effect.
- `lambda_=None` - power divergence statistic parameter. Default (None) computes Pearson's chi-squared. Leave as default unless you have a specific reason.

**Return value:** A tuple of four items (not a named tuple):
1. `chi2` (float) - the chi-squared test statistic
2. `p` (float) - the p-value
3. `dof` (int) - degrees of freedom, equals `(rows - 1) * (cols - 1)`
4. `expected_freq` (ndarray) - expected frequencies under the null hypothesis (same shape as `observed`)

**Constructing the contingency table:**

```python
# From raw data: each row is an observation with categorical columns
table = pd.crosstab(df['model'], df['severity'])

# From manual data: pass a 2D array directly
table = [[10, 20, 30],
         [15, 25, 10]]

# IMPORTANT: the input must be counts (frequencies), not proportions
```

**Interpretation:** If `p < alpha`, the row and column variables are not independent. The distribution of one variable differs across levels of the other. Example: "The severity distribution is significantly different across models (chi2=14.2, p=0.007, dof=4)."

**Common mistake:** Feeding proportions or percentages instead of raw counts. The chi-squared test requires integer counts of observations. Also: the test is unreliable when expected cell frequencies are below 5 (check the `expected_freq` output). If any expected cell is below 5, consider merging categories or using Fisher's exact test (`scipy.stats.fisher_exact` for 2x2 tables only).

**When to use:** Testing association between two categorical variables. Example: "Is severity distribution (low/medium/high) independent of which model produced the finding?"

---

## 2. Correlation - scipy.stats

### 2.1 Pearson Correlation

```python
from scipy.stats import pearsonr

r, p = pearsonr(x, y)
# r  -> float in [-1, 1]: Pearson correlation coefficient
# p  -> float: two-tailed p-value testing H0: r = 0
```

**Key parameters:**
- `x`, `y` - array-like, same length. Must be continuous numeric data.
- No additional parameters needed for basic use.

**Return value:** In scipy 1.11+, returns a `PearsonRResult` object where `result.statistic` and `result.pvalue` are available, but it also unpacks as `(r, p)` for backward compatibility. The unpacking form `r, p = pearsonr(x, y)` works across all versions.

**Interpretation:** `r` near +1 means strong positive linear relationship, near -1 means strong negative linear relationship, near 0 means no linear relationship. The p-value tests whether the correlation is significantly different from zero.

**Common mistake:** Pearson measures linear correlation only. A perfect U-shaped or quadratic relationship will produce `r` near zero. Always visualize with a scatter plot before relying on the number. Also: outliers have outsized influence on Pearson's r. A single extreme point can create or destroy a correlation.

**When to use:** When both variables are continuous and the relationship is expected to be linear. Example: "Does finding count correlate with file length?"

### 2.2 Spearman Rank Correlation

```python
from scipy.stats import spearmanr

result = spearmanr(a, b)
# result.statistic   -> float in [-1, 1]: Spearman rank correlation
# result.pvalue      -> float: two-tailed p-value
# Also unpacks: rho, p = spearmanr(a, b)
```

**Key parameters:**
- `a`, `b` - array-like, same length. Can be ordinal or continuous.
- `axis=0` - if `a` is a 2D array, compute correlations between columns. For two 1D arrays, this is irrelevant.
- `nan_policy='propagate'` - same options as other scipy.stats functions.
- `alternative='two-sided'` - scipy 1.9+, same three options.

**Return value:** `SpearmanrResult` named tuple with `.statistic` (previously `.correlation` in older versions) and `.pvalue`. The older `.correlation` attribute still works as an alias.

**Interpretation:** Same scale as Pearson (-1 to +1), but measures monotonic relationship (not just linear). A perfect monotonically increasing relationship gives rho = +1, even if it is not a straight line.

**Common mistake:** Using Pearson when data is ordinal (severity ratings 1-5, rank orderings). Pearson assumes interval data. Spearman works on ranks, so ordinal data is its natural domain.

**When to use Pearson vs Spearman:**
- Pearson: both variables continuous, relationship is linear, no extreme outliers
- Spearman: either variable is ordinal, relationship is monotonic but not necessarily linear, data has outliers, distribution is skewed

Example for Spearman: "Does task complexity rank correlate with token usage?"

---

## 3. Simple Linear Regression - scipy.stats

```python
from scipy.stats import linregress

result = linregress(x, y)
# result.slope      -> float: slope of the regression line
# result.intercept  -> float: y-intercept
# result.rvalue     -> float: Pearson correlation coefficient (same as pearsonr)
# result.pvalue     -> float: p-value for H0: slope = 0
# result.stderr     -> float: standard error of the slope estimate
# result.intercept_stderr -> float: standard error of the intercept (scipy 1.6+)
```

**Key parameters:**
- `x`, `y` - array-like, same length. `x` is the independent variable, `y` is the dependent variable.
- No additional parameters.

**Return value:** `LinregressResult` named tuple with six fields (five in scipy < 1.6, before `intercept_stderr` was added).

**Interpretation for trend detection:** The slope tells you the rate of change. The p-value tells you whether the slope is significantly different from zero. `rvalue` is the Pearson r, so `rvalue**2` gives R-squared (proportion of variance explained).

**Minimal pattern for trend detection:**

```python
import numpy as np
from scipy.stats import linregress

# x must be numeric - convert dates to ordinal or sequential integers
x = np.arange(len(y_values))
result = linregress(x, y_values)

if result.pvalue < 0.05:
    direction = "increasing" if result.slope > 0 else "decreasing"
    print(f"Significant {direction} trend: {result.slope:.4f} per unit time (p={result.pvalue:.4f})")
```

**Common mistake:** Using `linregress` with datetime objects as `x`. The function requires numeric input. Convert dates to sequential integers, ordinal values (`date.toordinal()`), or seconds since epoch.

**When to use:** Quick trend detection in time series (Step 5). "Is token usage per day going up?" This is simpler than a full regression model - one line in, one slope out. For multiple predictors or more complex models, use `statsmodels.OLS` instead.

---

## 4. Effect Size Calculations (Manual)

Neither scipy nor statsmodels provides built-in effect size functions for the common cases. These must be computed manually.

### 4.1 Cohen's d (for t-tests)

```python
import numpy as np

def cohens_d(group1, group2):
    n1, n2 = len(group1), len(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
    return (np.mean(group1) - np.mean(group2)) / pooled_std
```

**Interpretation thresholds (Cohen 1988):**
- |d| < 0.2 - negligible
- |d| around 0.2 - small effect
- |d| around 0.5 - medium effect
- |d| around 0.8 - large effect
- |d| > 1.2 - very large effect

**What it means operationally:** Cohen's d expresses the difference in units of standard deviations. A d of 0.5 means the groups differ by half a standard deviation. The sign indicates direction (which group has the higher mean).

**Common mistake:** Using population variance (`ddof=0`) instead of sample variance (`ddof=1`) in the pooled standard deviation calculation. For small samples, this meaningfully changes the result. Always use `ddof=1`.

**When to use:** Always compute alongside a t-test or Mann-Whitney. The p-value tells you "is it real?"; Cohen's d tells you "is it big enough to care about?"

### 4.2 Cramer's V (for chi-squared tests)

```python
import numpy as np
from scipy.stats import chi2_contingency

def cramers_v(contingency_table):
    chi2, p, dof, expected = chi2_contingency(contingency_table)
    n = np.sum(contingency_table)
    min_dim = min(contingency_table.shape) - 1
    return np.sqrt(chi2 / (n * min_dim))
```

**Interpretation thresholds (Cohen 1988, adjusted for df):**
- For df=1 (2x2 table): small 0.1, medium 0.3, large 0.5
- For df=2: small 0.07, medium 0.21, large 0.35
- For df=3: small 0.06, medium 0.17, large 0.29

A simpler rule of thumb that works across table sizes:
- V < 0.1 - negligible
- V around 0.1-0.3 - small to medium
- V > 0.3 - medium to large

**What it means operationally:** Cramer's V ranges from 0 (no association) to 1 (perfect association). It quantifies how strongly the row and column categories are associated.

**Common mistake:** Reporting the chi-squared statistic itself as a measure of association strength. Chi-squared is a test statistic that scales with sample size - a large chi-squared might reflect a large sample, not a large effect. Always convert to Cramer's V for interpretable effect size.

**When to use:** Always compute alongside a chi-squared test. "The severity distributions differ across models (p=0.003), with a medium association (Cramer's V=0.24)."

---

## 5. Bootstrap Confidence Intervals (numpy)

No special library is required. The pattern uses `numpy.random.choice` and `numpy.percentile`.

### 5.1 Basic Pattern

```python
import numpy as np

def bootstrap_ci(data, statistic_fn=np.mean, n_bootstrap=10000, ci=95):
    """Compute a bootstrap confidence interval for any statistic.
    
    Args:
        data: 1D array-like of observations
        statistic_fn: function that computes the statistic of interest (default: np.mean)
        n_bootstrap: number of bootstrap resamples (default: 10000)
        ci: confidence level as percentage (default: 95)
    
    Returns:
        (lower, upper) tuple: the confidence interval bounds
    """
    data = np.asarray(data)
    bootstrap_stats = np.array([
        statistic_fn(np.random.choice(data, size=len(data), replace=True))
        for _ in range(n_bootstrap)
    ])
    lower_pct = (100 - ci) / 2
    upper_pct = 100 - lower_pct
    return tuple(np.percentile(bootstrap_stats, [lower_pct, upper_pct]))
```

**Usage examples:**

```python
# 95% CI for the mean
lower, upper = bootstrap_ci(convergence_rates)

# 95% CI for the median
lower, upper = bootstrap_ci(convergence_rates, statistic_fn=np.median)

# 90% CI for the mean
lower, upper = bootstrap_ci(convergence_rates, ci=90)
```

**Key details:**
- `np.random.choice(data, size=len(data), replace=True)` - resamples with replacement. The resample is the same size as the original data.
- `np.percentile(bootstrap_stats, [2.5, 97.5])` - for a 95% CI, take the 2.5th and 97.5th percentiles of the bootstrap distribution.
- `n_bootstrap=10000` is standard. Use 1000 for quick exploration, 10000 for reporting. More than 10000 rarely changes the result meaningfully.

**Interpretation:** "We are 95% confident that the true mean convergence rate lies between [lower] and [upper]." If the CI does not contain the comparison value (e.g., the old mean), the difference is significant at that confidence level.

**Common mistake:** Using too few bootstrap iterations (under 1000) and getting unstable interval bounds. Also: forgetting `replace=True` in `np.random.choice` - without replacement, you are just permuting the data, which gives you the same statistic every time.

**When to use:** When you do not want to assume any particular distribution. Bootstrap is distribution-free. It works for any statistic (mean, median, 90th percentile, Cohen's d, anything you can compute from a sample). Especially useful with small samples where parametric test assumptions are doubtful.

### 5.2 Setting the Random Seed for Reproducibility

```python
rng = np.random.default_rng(seed=42)
bootstrap_stats = np.array([
    statistic_fn(rng.choice(data, size=len(data), replace=True))
    for _ in range(n_bootstrap)
])
```

Using `numpy.random.default_rng()` (Generator API, numpy 1.17+) is preferred over the legacy `numpy.random.seed()` global state. The Generator API is thread-safe and does not create hidden global state.

---

## 6. Multiple Comparisons Correction

### 6.1 Manual Bonferroni Correction

The simplest and most conservative approach.

```python
alpha = 0.05
n_tests = 10
bonferroni_alpha = alpha / n_tests  # 0.005

# Apply: reject only if p < bonferroni_alpha
for name, p in test_results:
    significant = p < bonferroni_alpha
    print(f"{name}: p={p:.4f}, significant={significant}")
```

**Interpretation:** If you run `n` tests at significance level `alpha`, the probability of at least one false positive is approximately `n * alpha`. Bonferroni corrects by dividing alpha by the number of tests, controlling the family-wise error rate.

**Common mistake:** Applying Bonferroni when tests are not independent. Bonferroni is valid regardless of dependence (it is conservative), but it becomes increasingly conservative as the number of tests grows. With 20+ tests, Bonferroni may reject everything - consider Holm-Bonferroni instead.

### 6.2 statsmodels multipletests

```python
from statsmodels.stats.multitest import multipletests

reject, pvals_corrected, alphacSidak, alphacBonf = multipletests(
    pvals,           # array of p-values from individual tests
    alpha=0.05,      # family-wise error rate
    method='bonferroni'  # or 'holm', 'fdr_bh', etc.
)
# reject           -> boolean array: which hypotheses to reject
# pvals_corrected  -> array: adjusted p-values
# alphacSidak      -> float: Sidak corrected alpha
# alphacBonf       -> float: Bonferroni corrected alpha
```

**Key parameters:**
- `pvals` - array-like of raw p-values from the individual tests
- `alpha=0.05` - the desired family-wise error rate
- `method` - correction method. Common choices:
  - `'bonferroni'` - most conservative, simplest
  - `'holm'` - uniformly more powerful than Bonferroni, still controls FWER. Recommended default.
  - `'fdr_bh'` - Benjamini-Hochberg, controls false discovery rate instead of FWER. Less conservative, better for exploratory analysis.

**Return value:** Tuple of four elements (not a named tuple):
1. `reject` (ndarray of bool) - True for each hypothesis that should be rejected
2. `pvals_corrected` (ndarray) - adjusted p-values. Compare these to `alpha` directly.
3. `alphacSidak` (float) - Sidak-corrected alpha. Informational.
4. `alphacBonf` (float) - Bonferroni-corrected alpha. Informational.

**Interpretation:** Use the `reject` array directly, or compare `pvals_corrected` to your alpha. "After Holm-Bonferroni correction, 3 of 10 tests remain significant."

**Common mistake:** Reporting raw p-values when multiple tests were run. If you tested 10 metrics for change after a prompt update, you must correct. Reporting the one metric with p=0.04 while ignoring the other 9 non-significant tests is p-hacking.

**Recommendation for the write task:** Teach Bonferroni manually first (it is a one-liner: `alpha / n_tests`). Then show `multipletests` for the Holm method. Recommend Holm as the default because it is strictly more powerful than Bonferroni with no added complexity.

---

## 7. Time Series - statsmodels

### 7.1 Seasonal Decomposition

```python
from statsmodels.tsa.seasonal import seasonal_decompose

result = seasonal_decompose(
    x,                    # Series or array-like with DatetimeIndex (or use period=)
    model='additive',     # 'additive' or 'multiplicative'
    period=None,          # required if x does not have a frequency-aware DatetimeIndex
    extrapolate_trend='freq'  # handles NaN at edges from the moving average
)
# result.observed   -> Series: original data
# result.trend      -> Series: trend component (moving average)
# result.seasonal   -> Series: seasonal component
# result.resid      -> Series: residual (observed - trend - seasonal for additive)
```

**Key parameters:**
- `x` - pandas Series (preferred) or 1D array. If a Series with a `DatetimeIndex` that has a frequency set (e.g., via `asfreq('D')`), the period is inferred automatically. Otherwise, `period` must be specified.
- `model='additive'` - additive (`observed = trend + seasonal + residual`) or multiplicative (`observed = trend * seasonal * residual`). Use additive when the seasonal variation is roughly constant over time. Use multiplicative when seasonal variation scales with the trend level.
- `period` - integer. The number of observations per seasonal cycle. For daily data with weekly seasonality: `period=7`. For monthly data with yearly seasonality: `period=12`. This is the most common source of errors.
- `extrapolate_trend='freq'` - by default, the trend component has NaN values at the start and end (because the moving average cannot be centered at the edges). Setting this to `'freq'` extrapolates to fill those NaN values.

**Return value:** `DecomposeResult` object with four attributes, each a pandas Series (or array):
- `.observed` - the original input data
- `.trend` - the trend component, extracted via a centered moving average of width `period`
- `.seasonal` - the seasonal component, one full cycle repeated
- `.resid` - the residual after removing trend and seasonal
- `.plot()` - convenience method that creates a 4-panel matplotlib figure

**Plotting:**

```python
fig = result.plot()
fig.set_size_inches(12, 8)
fig.tight_layout()
```

**Common mistake:** Not setting `period` when the DatetimeIndex lacks a frequency attribute. If you loaded dates from CSV and just did `pd.to_datetime()`, the index typically does not have a frequency. You must either call `df.asfreq('D')` (which requires no gaps) or pass `period=7` explicitly. The error message is: `ValueError: You must specify a period or x must be a pandas object with a PeriodIndex or a DatetimeIndex with a freq not set to None`.

**Second common mistake:** Choosing `period` incorrectly. If you have daily data and set `period=30` hoping to capture "monthly seasonality," you will get a trend that is over-smoothed. Think about the actual repeating pattern in your data. Weekly agent activity patterns need `period=7`.

**When to use:** When you suspect a regular repeating pattern in time series data and want to separate it from the trend and random noise. "Is there a weekday/weekend pattern in agent usage, and is the underlying trend going up after removing that pattern?"

### 7.2 Moving Averages (pandas, not statsmodels)

Note: Moving averages are handled by pandas, not statsmodels. Documenting here since the write task needs them for Step 5.

```python
# Simple Moving Average (SMA)
sma = df['value'].rolling(window=7).mean()
# First 6 values will be NaN (not enough data to fill the window)

# Exponentially Weighted Moving Average (EWMA)
ewma = df['value'].ewm(span=7).mean()
# No NaN values - EWMA is defined from the first observation

# Min periods - allow partial windows
sma_partial = df['value'].rolling(window=7, min_periods=1).mean()
# No NaN values - computes mean of whatever is available
```

**SMA vs EWMA:**
- SMA: equal weight to all observations in the window. Better for removing noise when all recent data points are equally relevant.
- EWMA: exponentially decaying weights, most recent observations have the most influence. Better when you want the smoothed line to track recent changes more closely. `span=7` means the center of mass is at 3 observations (roughly equivalent to a 7-period SMA in terms of lag).

---

## 8. Summary: Decision Matrix for Write Tasks

For the author of Step 4 (Statistical Testing):

| Question | Test | Function | Effect Size |
|----------|------|----------|-------------|
| "Are these two group means different?" (normal data) | t-test | `ttest_ind(a, b, equal_var=False)` | Cohen's d |
| "Same, but paired observations" | Paired t-test | `ttest_rel(a, b)` | Cohen's d on differences |
| "Are these two groups different?" (non-normal/ordinal) | Mann-Whitney U | `mannwhitneyu(x, y)` | Rank-biserial r (optional) |
| "Are categories distributed differently?" | Chi-squared | `chi2_contingency(table)` | Cramer's V |
| "Are these variables linearly related?" | Pearson | `pearsonr(x, y)` | r itself is the effect size |
| "Are these variables monotonically related?" | Spearman | `spearmanr(x, y)` | rho itself is the effect size |
| "What is the trend over time?" | Linear regression | `linregress(x, y)` | R-squared (rvalue**2) |
| "What is a reasonable range for this statistic?" | Bootstrap CI | Manual numpy loop | Width of CI |
| "I ran 10 tests - which are still significant?" | Multiple comparison | `multipletests(pvals, method='holm')` | N/A |

For the author of Step 5 (Time Series):

| Question | Technique | Function/Method |
|----------|-----------|-----------------|
| "Is there a trend?" | Linear regression on time index | `linregress(np.arange(n), y)` |
| "Is there a repeating pattern?" | Seasonal decomposition | `seasonal_decompose(s, period=N)` |
| "Smooth out the noise" | Moving average | `df.rolling(7).mean()` or `df.ewm(span=7).mean()` |
| "Is this spike abnormal?" | Z-score from rolling stats | `(val - rolling_mean) / rolling_std` |

---

## 9. Version Notes

All signatures verified against:
- scipy 1.11+ (where `TtestResult`, `MannwhitneyuResult`, `SpearmanrResult` named tuples are standard)
- statsmodels 0.14+ (where `seasonal_decompose` signature is stable)
- numpy 1.24+ (where `numpy.random.default_rng` is the recommended Generator API)
- pandas 2.0+ (where `.rolling()` and `.ewm()` interfaces are stable)

Backward compatibility note: scipy functions that return named tuples also support tuple unpacking (`stat, p = ttest_ind(a, b)`). This works across all scipy versions and is the safer pattern for instructional code that readers might run on older installations.
