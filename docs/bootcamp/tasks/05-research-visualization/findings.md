# Task 05 Findings: Visualization APIs (matplotlib 3.8+, seaborn 0.13+)

**Research type:** Training knowledge (no URLs fetched)
**Blocks:** Task 11 (Write Step 6: Visualization)
**Audience:** Write agent producing Step 6 content

---

## 1. Why OOP matplotlib, not pyplot

matplotlib has two interfaces:

- **pyplot state machine** (`plt.plot()`, `plt.xlabel()`) - operates on "current figure/axes" via global state. Works for quick one-offs but becomes fragile with multi-panel figures, leads to bugs when axes are not what you expect, and is not composable.
- **Object-oriented API** (`ax.plot()`, `ax.set_xlabel()`) - explicit handle to the Axes object. You always know which plot you are modifying. This is what production code and teaching material should use.

The rule: use `plt.subplots()` to create the figure and axes, then call methods on `ax` for everything else. The only `plt.*` calls should be `plt.subplots()`, `plt.colorbar()`, `plt.tight_layout()`, `plt.show()`, and `plt.savefig()` (or better, `fig.savefig()`).

---

## 2. Figure and Axes Creation

### Single plot

```python
fig, ax = plt.subplots(figsize=(10, 6))
```

- `figsize=(width, height)` in inches. Default is `(6.4, 4.8)`.
- Returns a `Figure` and a single `Axes`.

### Multi-panel (subplots grid)

```python
fig, axes = plt.subplots(nrows=2, ncols=3, figsize=(15, 8))
ax_top_left = axes[0, 0]
ax_top_left.plot(x, y)
```

- `axes` is a 2D numpy array of Axes objects when both nrows > 1 and ncols > 1.
- When nrows=1 or ncols=1, `axes` is 1D. Use `squeeze=False` to always get 2D indexing: `fig, axes = plt.subplots(1, 3, squeeze=False)`.
- Common optional parameters: `sharex=True`, `sharey=True` for linked axis ranges.

### Layout

```python
fig.tight_layout()        # auto-adjust spacing so labels don't overlap
fig.suptitle('Main Title', fontsize=14, y=1.02)  # figure-level title
```

`tight_layout()` should be called after all plotting is done. When using `suptitle`, you may need to adjust the `y` parameter or call `fig.subplots_adjust(top=0.92)` to make room.

---

## 3. Core Plot Types

### 3.1 Line Chart - `ax.plot()`

**Purpose:** Show trends over a continuous or ordered variable (time series, sequences).

**Signature:**
```python
ax.plot(x, y, color='tab:blue', linestyle='-', linewidth=1.5, marker='o', label='Series A')
```

**Required:** `x`, `y` (array-like, same length).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `color` | named color, hex, `'tab:blue'` | cycles through default color cycle |
| `linestyle` | `'-'`, `'--'`, `':'`, `'-.'` | `'-'` |
| `linewidth` | float | `1.5` |
| `marker` | `'o'`, `'s'`, `'^'`, `'D'`, `None` | `None` |
| `label` | string (for legend) | `None` |
| `alpha` | 0.0 to 1.0 | `1.0` |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(months, revenue, marker='o', label='Revenue')
ax.set_xlabel('Month')
ax.set_ylabel('Revenue ($)')
ax.set_title('Monthly Revenue')
ax.legend()
```

**Right choice:** Time series, continuous trends, comparing few (2-5) series on same scale.
**Wrong choice:** Categorical comparisons (use bar), showing distribution (use histogram), unordered data.

---

### 3.2 Scatter Plot - `ax.scatter()`

**Purpose:** Show relationship between two continuous variables, reveal clusters and outliers.

**Signature:**
```python
ax.scatter(x, y, c='tab:blue', s=20, alpha=0.7, marker='o', label='Group A')
```

**Required:** `x`, `y` (array-like, same length).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `c` | single color, array of values (for colormap), array of colors | `None` (uses color cycle) |
| `s` | float or array (point sizes) | `20` |
| `cmap` | colormap name (used when `c` is numeric array) | `'viridis'` |
| `alpha` | 0.0 to 1.0 | `1.0` |
| `marker` | marker style string | `'o'` |
| `edgecolors` | `'none'`, color | `'face'` |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 6))
scatter = ax.scatter(df['height'], df['weight'], c=df['age'], cmap='viridis', alpha=0.6)
ax.set_xlabel('Height (cm)')
ax.set_ylabel('Weight (kg)')
plt.colorbar(scatter, ax=ax, label='Age')
```

**Right choice:** Correlation between two variables, clusters, outlier detection, 3rd variable via color/size.
**Wrong choice:** Time series (use line), categorical data (use bar), too many overlapping points without alpha.

---

### 3.3 Bar Chart - `ax.bar()` / `ax.barh()`

**Purpose:** Compare quantities across categories.

**Signature:**
```python
ax.bar(x, height, width=0.8, color='tab:blue', edgecolor='black', label='Group')
ax.barh(y, width, height=0.8, color='tab:blue')  # horizontal
```

**Required:** `x` (category positions or labels), `height` (bar heights).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `width` | float (0.0 to 1.0) | `0.8` |
| `color` | single color or list | color cycle |
| `edgecolor` | color | `None` |
| `bottom` | array-like (for stacking) | `0` |
| `label` | string | `None` |
| `alpha` | 0.0 to 1.0 | `1.0` |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 5))
ax.bar(categories, values, color='steelblue', edgecolor='black')
ax.set_xlabel('Department')
ax.set_ylabel('Headcount')
ax.set_title('Headcount by Department')
```

**Stacked bars:**
```python
ax.bar(categories, values_a, label='Product A')
ax.bar(categories, values_b, bottom=values_a, label='Product B')
ax.legend()
```

**Grouped bars:**
```python
import numpy as np
x = np.arange(len(categories))
w = 0.35
ax.bar(x - w/2, values_a, w, label='2024')
ax.bar(x + w/2, values_b, w, label='2025')
ax.set_xticks(x)
ax.set_xticklabels(categories)
ax.legend()
```

**Right choice:** Comparing discrete categories, part-to-whole with stacked bars (few segments), ranked values.
**Wrong choice:** Continuous data (use histogram), trends over time (use line unless discrete periods).

**Use `ax.barh()` when:** category labels are long (horizontal bars give room for text), or when ranking items top to bottom.

---

### 3.4 Histogram - `ax.hist()`

**Purpose:** Show distribution of a single continuous variable.

**Signature:**
```python
ax.hist(data, bins=30, color='steelblue', edgecolor='black', alpha=0.7, density=False)
```

**Required:** `data` (1D array-like).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `bins` | int or sequence of edges | `10` |
| `color` | color | color cycle |
| `edgecolor` | color | `None` |
| `alpha` | 0.0 to 1.0 | `1.0` |
| `density` | bool (normalize to density) | `False` |
| `histtype` | `'bar'`, `'step'`, `'stepfilled'` | `'bar'` |
| `label` | string | `None` |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 5))
ax.hist(scores, bins=20, color='steelblue', edgecolor='black')
ax.set_xlabel('Score')
ax.set_ylabel('Frequency')
ax.set_title('Distribution of Test Scores')
```

**Right choice:** Understanding shape of one variable's distribution, identifying skew/outliers/modes.
**Wrong choice:** Categorical data (use bar), comparing distributions across groups (use boxplot or violin).

**Bin count guidance:** too few bins hides structure, too many creates noise. Sturges' rule (`bins = 1 + log2(n)`) is a starting point. 20-50 bins is usually reasonable for datasets with 1k+ rows.

---

### 3.5 Heatmap with imshow - `ax.imshow()`

**Purpose:** Visualize a 2D matrix of values (correlation matrix, confusion matrix, pivot table).

**Signature:**
```python
im = ax.imshow(matrix, cmap='viridis', aspect='auto', vmin=None, vmax=None)
```

**Required:** `matrix` (2D array-like).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `cmap` | colormap name | `'viridis'` |
| `aspect` | `'auto'`, `'equal'`, float | `'equal'` |
| `vmin`, `vmax` | float (colormap range) | data min/max |
| `interpolation` | `'nearest'`, `'bilinear'` | `'antialiased'` |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 6))
im = ax.imshow(correlation_matrix, cmap='coolwarm', vmin=-1, vmax=1)
ax.set_xticks(range(len(labels)))
ax.set_xticklabels(labels, rotation=45, ha='right')
ax.set_yticks(range(len(labels)))
ax.set_yticklabels(labels)
plt.colorbar(im, ax=ax, label='Correlation')
```

**Right choice:** Correlation matrices, confusion matrices, any dense numeric grid.
**Wrong choice:** Sparse data (most cells empty), data with very different scales across rows.

**Note:** For annotated heatmaps, `sns.heatmap()` is often simpler (see seaborn section).

---

## 4. Labeling and Formatting

### Essential labels (every chart needs these)

```python
ax.set_xlabel('X Axis Label', fontsize=12)
ax.set_ylabel('Y Axis Label', fontsize=12)
ax.set_title('Chart Title', fontsize=14, fontweight='bold')
```

### Axis limits and ticks

```python
ax.set_xlim(0, 100)
ax.set_ylim(0, 50)
ax.set_xticks([0, 25, 50, 75, 100])
ax.set_xticklabels(['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], rotation=45, ha='right')
ax.tick_params(axis='both', labelsize=10)
```

### Legend

```python
ax.legend(loc='upper right', fontsize=10, frameon=True)
# loc options: 'best', 'upper left', 'upper right', 'lower left', 'lower right', 'center'
```

Only add a legend when there are multiple series. A single-series chart does not need one.

### Figure-level title for multi-panel

```python
fig.suptitle('Overall Title', fontsize=16, fontweight='bold')
fig.tight_layout()
fig.subplots_adjust(top=0.92)  # make room for suptitle
```

---

## 5. Annotations and Reference Lines

### Horizontal and vertical reference lines

```python
ax.axhline(y=mean_val, color='red', linestyle='--', linewidth=1, label='Mean')
ax.axvline(x=threshold, color='gray', linestyle=':', linewidth=1, label='Threshold')
```

Use these to mark baselines, thresholds, targets, or averages. They span the full axis range.

### Point annotation

```python
ax.annotate(
    'Peak',
    xy=(peak_x, peak_y),           # point being annotated
    xytext=(peak_x + 1, peak_y + 5),  # text position
    arrowprops=dict(arrowstyle='->', color='black'),
    fontsize=10
)
```

- `xy` = the point the arrow points to.
- `xytext` = where the label text is placed.
- `arrowprops` = dict controlling arrow style. Common: `arrowstyle='->'`, `color`, `lw`.

### Free text

```python
ax.text(x, y, 'Label', fontsize=10, ha='center', va='bottom')
```

- `ha` (horizontal alignment): `'left'`, `'center'`, `'right'`
- `va` (vertical alignment): `'top'`, `'center'`, `'bottom'`

---

## 6. Colormaps

### Sequential colormaps

Use for data that goes from low to high (counts, magnitudes, temperatures).

| Name | Character |
|------|-----------|
| `'viridis'` | Default. Perceptually uniform, colorblind-safe. Best general choice. |
| `'plasma'` | Perceptually uniform, wider hue range than viridis. |
| `'Blues'` | Single-hue. Good for "intensity" without distraction. |
| `'YlOrRd'` | Yellow to red. Good for "heat" metaphor. |

### Diverging colormaps

Use for data with a meaningful center point (correlation coefficients centered at 0, deviation from average).

| Name | Character |
|------|-----------|
| `'RdBu'` | Red-white-blue. Strong contrast. Set `vmin=-X, vmax=X` to center at 0. |
| `'coolwarm'` | Similar to RdBu but softer. Good for correlation matrices. |

### Rules

- **Sequential data (magnitude):** use sequential colormap.
- **Diverging data (deviation from center):** use diverging colormap with center at the meaningful midpoint (`vmin=-1, vmax=1` for correlations).
- **Never use rainbow/jet** for sequential data. It creates false boundaries and is not colorblind-safe.

### Adding a colorbar

```python
im = ax.imshow(data, cmap='viridis')
cbar = plt.colorbar(im, ax=ax)
cbar.set_label('Intensity')
```

For scatter with color-mapped points:
```python
scatter = ax.scatter(x, y, c=values, cmap='viridis')
plt.colorbar(scatter, ax=ax, label='Value')
```

---

## 7. Saving Figures

```python
fig.savefig('output/chart.png', dpi=150, bbox_inches='tight', facecolor='white')
```

| Parameter | Purpose | Recommended |
|-----------|---------|-------------|
| `dpi` | Resolution (dots per inch) | 150 for screen, 300 for print |
| `bbox_inches` | Crop whitespace | Always `'tight'` to avoid clipped labels |
| `facecolor` | Background color | `'white'` (default is transparent in some backends) |

**Format by extension:**
- `.png` - raster, good for web and slides
- `.svg` - vector, good for web, scales perfectly
- `.pdf` - vector, good for papers and reports

Call `savefig()` before `plt.show()`, because `show()` can clear the figure in some backends.

---

## 8. Seaborn (0.13+)

Seaborn builds on matplotlib. Every seaborn plot function returns a matplotlib Axes and accepts an `ax=` parameter, so seaborn plots embed naturally into matplotlib figures.

### 8.1 Box Plot - `sns.boxplot()`

**Purpose:** Show distribution of a continuous variable across categories. Displays median, quartiles, whiskers, and outliers.

**Signature:**
```python
sns.boxplot(data=df, x='category', y='value', hue='group', ax=ax)
```

**Required (typical usage):** `data` (DataFrame), `x` (categorical column), `y` (numeric column).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `hue` | column name for sub-grouping | `None` |
| `palette` | colormap name or list | seaborn default |
| `width` | float | `0.8` |
| `ax` | matplotlib Axes | current axes |
| `order` | list of category values | data order |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 5))
sns.boxplot(data=df, x='department', y='salary', ax=ax)
ax.set_title('Salary Distribution by Department')
ax.set_ylabel('Salary ($)')
```

**Right choice:** Comparing distributions across groups, identifying outliers, showing spread and skew.
**Wrong choice:** When you need to see the full shape of the distribution (use violin), or when you have very few data points per group (show the points directly).

---

### 8.2 Violin Plot - `sns.violinplot()`

**Purpose:** Like boxplot but shows the full density shape of the distribution. Reveals bimodality and other features that boxplots hide.

**Signature:**
```python
sns.violinplot(data=df, x='category', y='value', hue='group', ax=ax)
```

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `hue` | column name | `None` |
| `split` | bool (split violins when hue has 2 levels) | `False` |
| `inner` | `'box'`, `'quart'`, `'point'`, `'stick'`, `None` | `'box'` |
| `palette` | colormap name or list | seaborn default |
| `ax` | matplotlib Axes | current axes |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 5))
sns.violinplot(data=df, x='category', y='score', inner='quart', ax=ax)
ax.set_title('Score Distribution by Category')
```

**Right choice:** When distribution shape matters (bimodal, skewed), comparing shapes across groups.
**Wrong choice:** Many categories (gets crowded), when exact quartile values matter more than shape (use boxplot).

---

### 8.3 Heatmap - `sns.heatmap()`

**Purpose:** Annotated 2D matrix visualization. Simpler than `ax.imshow()` for labeled matrices.

**Signature:**
```python
sns.heatmap(data, annot=True, fmt='.2f', cmap='coolwarm', ax=ax)
```

**Required:** `data` (2D array or DataFrame).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `annot` | bool or array (show values in cells) | `False` |
| `fmt` | format string for annotations | `'.2g'` |
| `cmap` | colormap name | `'rocket'` (seaborn default) |
| `vmin`, `vmax` | float (colorbar range) | data min/max |
| `center` | float (center of colormap) | `None` |
| `linewidths` | float (grid line width) | `0` |
| `square` | bool | `False` |
| `ax` | matplotlib Axes | current axes |
| `xticklabels`, `yticklabels` | bool, list, or int | auto |

**Minimal example:**
```python
fig, ax = plt.subplots(figsize=(8, 6))
sns.heatmap(df.corr(), annot=True, fmt='.2f', cmap='coolwarm',
            vmin=-1, vmax=1, center=0, ax=ax)
ax.set_title('Correlation Matrix')
```

**Right choice:** Correlation matrices, confusion matrices, pivot tables with numeric values.
**Wrong choice:** Sparse matrices (mostly zeros/NaN), very large matrices where annotations are unreadable.

**Advantage over `ax.imshow()`:** Automatic tick labels from DataFrame index/columns, built-in annotation, `center` parameter for diverging colormaps.

---

### 8.4 Pair Plot - `sns.pairplot()`

**Purpose:** Matrix of scatter plots for every pair of numeric columns, with histograms/KDEs on the diagonal. Exploratory tool for seeing all pairwise relationships at once.

**Signature:**
```python
sns.pairplot(df, hue='species', diag_kind='hist')
```

**Required:** `data` (DataFrame).

**Common optional:**
| Parameter | Values | Default |
|-----------|--------|---------|
| `hue` | column name for color grouping | `None` |
| `vars` | list of column names to include | all numeric columns |
| `diag_kind` | `'hist'`, `'kde'` | `'auto'` |
| `kind` | `'scatter'`, `'kde'`, `'hist'`, `'reg'` | `'scatter'` |
| `palette` | colormap name or list | seaborn default |
| `corner` | bool (lower triangle only) | `False` |
| `height` | float (size of each facet in inches) | `2.5` |

**Minimal example:**
```python
g = sns.pairplot(df[['age', 'income', 'score', 'group']], hue='group',
                 diag_kind='hist', corner=True)
g.figure.suptitle('Pairwise Relationships', y=1.02)
```

**Right choice:** Initial exploration, seeing all correlations at a glance, identifying clusters by group.
**Wrong choice:** More than 6-7 variables (plots become tiny and unreadable), final presentation (too much information - pick the interesting pairs and make individual plots).

**Note:** `pairplot()` creates its own figure. It does not accept an `ax=` parameter. Access the underlying figure via `g.figure`.

---

### 8.5 Seaborn + matplotlib Integration Pattern

The standard pattern for embedding seaborn in a matplotlib figure:

```python
fig, axes = plt.subplots(1, 3, figsize=(18, 5))

sns.boxplot(data=df, x='group', y='value', ax=axes[0])
axes[0].set_title('Distribution')

sns.heatmap(df.corr(), annot=True, ax=axes[1])
axes[1].set_title('Correlations')

axes[2].scatter(df['x'], df['y'])
axes[2].set_title('Scatter')

fig.suptitle('Dashboard', fontsize=16)
fig.tight_layout()
```

Key point: matplotlib creates the figure and axes, seaborn renders into them via `ax=`. All labeling and formatting uses matplotlib's OOP API on the axes.

---

## 9. Common Visualization Mistakes

These should be taught explicitly in Step 6 as anti-patterns.

### 9.1 Truncated Y-Axis

**Problem:** Starting the y-axis at a non-zero value exaggerates small differences. A bar going from 98 to 100 looks like a 100% increase when the axis starts at 97.

**Fix:** Default to starting at 0 for bar charts. If you must truncate, use a broken axis or clearly mark it. Line charts are more forgiving since the focus is on trend shape.

### 9.2 Pie Charts for More Than 3 Categories

**Problem:** Humans are bad at comparing angles and areas. With 4+ slices, it becomes impossible to judge relative sizes.

**Fix:** Use a horizontal bar chart (`ax.barh()`). Sorted bars are trivially easy to read for any number of categories.

### 9.3 3D Charts

**Problem:** 3D bar charts, 3D pie charts, and most 3D scatter plots obscure data through perspective distortion and occlusion. Values behind other values are hidden.

**Fix:** Use 2D alternatives. If you need a 3rd dimension, encode it as color or size in a 2D scatter. Use facets (subplots) for the 3rd variable.

### 9.4 Missing Axis Labels

**Problem:** A chart without axis labels requires the viewer to guess what they are looking at. It is incomplete communication.

**Fix:** Always call `ax.set_xlabel()`, `ax.set_ylabel()`, and `ax.set_title()`. Include units in parentheses: `'Temperature (C)'`.

### 9.5 Rainbow Colormaps on Sequential Data

**Problem:** Rainbow (jet) colormaps create artificial visual boundaries between colors that do not correspond to boundaries in the data. They are also not accessible to colorblind viewers.

**Fix:** Use `'viridis'` (perceptually uniform, colorblind-safe) for sequential data. Use `'RdBu'` or `'coolwarm'` for diverging data.

### 9.6 Missing `tight_layout` or `bbox_inches='tight'`

**Problem:** Labels and titles get clipped when matplotlib's default spacing is too tight for long text.

**Fix:** Call `fig.tight_layout()` after plotting, or use `fig.savefig(..., bbox_inches='tight')`.

---

## 10. Decision Tree: Which Chart for Which Question

| Question | Chart Type | API | Notes |
|----------|-----------|-----|-------|
| How does this value change over time? | Line chart | `ax.plot()` | Use markers if fewer than 20 points |
| How are two variables related? | Scatter plot | `ax.scatter()` | Add color for 3rd variable |
| How do categories compare? | Bar chart (vertical) | `ax.bar()` | Sort by value for ranking |
| How do categories rank? | Bar chart (horizontal) | `ax.barh()` | Best when labels are long |
| What is the distribution of one variable? | Histogram | `ax.hist()` | Tune bin count |
| How do distributions compare across groups? | Box plot | `sns.boxplot()` | Shows median, quartiles, outliers |
| What is the shape of a distribution? | Violin plot | `sns.violinplot()` | Reveals bimodality |
| What is the correlation between many variables? | Heatmap | `sns.heatmap()` | Use diverging colormap centered at 0 |
| How do all pairs of variables relate? | Pair plot | `sns.pairplot()` | Exploratory only, limit to 6-7 vars |
| What is the composition of a total? | Stacked bar | `ax.bar()` with `bottom=` | Keep to 3-4 segments max |
| Where is one value relative to a threshold? | Reference line | `ax.axhline()` / `ax.axvline()` | Combine with any chart type |

### Expanded guidance

**"I want to show a trend"** - line chart. If comparing 2-3 trends, overlay on same axes. If comparing 5+, use small multiples (subplots grid).

**"I want to compare groups"** - bar chart for counts/totals, boxplot for distributions, grouped bar for two factors.

**"I want to show correlation"** - scatter for two variables, heatmap for many variables at once.

**"I want to show composition"** - stacked bar for few segments over categories. Avoid pie charts.

**"I want to find outliers"** - boxplot (outliers shown as points beyond whiskers), scatter (visual inspection).

---

## 11. Quick Reference: pyplot vs OOP Equivalents

For the write agent - this table maps the common pyplot calls to their OOP equivalents, since students may encounter pyplot patterns online.

| pyplot (avoid) | OOP (teach this) |
|----------------|------------------|
| `plt.plot(x, y)` | `ax.plot(x, y)` |
| `plt.scatter(x, y)` | `ax.scatter(x, y)` |
| `plt.bar(x, h)` | `ax.bar(x, h)` |
| `plt.hist(data)` | `ax.hist(data)` |
| `plt.xlabel('X')` | `ax.set_xlabel('X')` |
| `plt.ylabel('Y')` | `ax.set_ylabel('Y')` |
| `plt.title('T')` | `ax.set_title('T')` |
| `plt.xlim(0, 10)` | `ax.set_xlim(0, 10)` |
| `plt.legend()` | `ax.legend()` |
| `plt.savefig(f)` | `fig.savefig(f)` |

Note the naming pattern: pyplot uses bare names (`xlabel`), OOP uses `set_` prefix (`set_xlabel`). This is a consistent rule across all Axes setter methods.

---

## 12. Version Notes

### matplotlib 3.8+

- `figsize` in `subplots()` is stable and unchanged.
- The OOP API documented here has been stable since matplotlib 2.x. No breaking changes in 3.8.
- `bbox_inches='tight'` is well-established.

### seaborn 0.13+

- The `objects` interface (new in 0.12) is an alternative declarative API. It is not covered here because the function-based API (`sns.boxplot()`, etc.) is more established, better documented, and what most tutorials and Stack Overflow answers use.
- `sns.heatmap()` and `sns.pairplot()` APIs are stable across 0.12-0.13.
- The `ax=` integration pattern works the same across all seaborn versions that support it.

---

## Summary for Write Agent

The Step 6 content should:

1. **Teach OOP from the start.** `fig, ax = plt.subplots()` as the first line of every example.
2. **Cover 6 chart types:** line, scatter, bar, histogram, boxplot, heatmap.
3. **Include the decision tree** so students know which chart fits which question.
4. **Teach the anti-patterns** explicitly - truncated axes, pie charts, rainbow colormaps, missing labels.
5. **Show seaborn integration** via `ax=` parameter pattern.
6. **Always include axis labels and titles** in every example - model good habits.
7. **Use `viridis` as default** colormap, `coolwarm` or `RdBu` for diverging data.
