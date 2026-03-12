# Task 05: Research - Visualization APIs (matplotlib, seaborn)

**Type:** Research (read-only)
**Parallelizable with:** Tasks 01, 02, 03, 04
**Blocks:** Task 11 (Write Step 6: Visualization)
**Output:** `docs/bootcamp/tasks/05-research-visualization/findings.md`

---

## Objective

Document the matplotlib and seaborn APIs that Step 6 (Visualization for Decision-Making)
will teach. The write agent needs correct API patterns for the object-oriented matplotlib
interface (not the pyplot state machine) and the seaborn statistical plotting functions.

## Research Scope

### matplotlib (target: 3.8+)

1. **Figure and Axes creation**
   - `fig, ax = plt.subplots()` - single plot
   - `fig, axes = plt.subplots(nrows, ncols, figsize=(w, h))` - multi-panel
   - `fig, ax = plt.subplots(figsize=(10, 6))` - sizing convention
   - The OOP API vs the pyplot state machine - why OOP is taught

2. **Core plot types on Axes objects**
   - `ax.plot(x, y)` - line chart
   - `ax.scatter(x, y)` - scatter plot
   - `ax.bar(x, height)` / `ax.barh(y, width)` - bar charts
   - `ax.hist(data, bins=N)` - histogram
   - `ax.imshow(matrix)` - heatmap (with colorbar)
   - Stacked bars: `ax.bar(x, h1); ax.bar(x, h2, bottom=h1)`

3. **Labeling and formatting**
   - `ax.set_xlabel()`, `ax.set_ylabel()`, `ax.set_title()`
   - `ax.set_xlim()`, `ax.set_ylim()`
   - `ax.legend()`
   - `ax.tick_params()`, `ax.set_xticks()`, `ax.set_xticklabels(rotation=45)`
   - `fig.suptitle()` for multi-panel figure titles

4. **Annotations and reference lines**
   - `ax.axhline(y, color, linestyle)` - horizontal reference line
   - `ax.axvline(x, color, linestyle)` - vertical reference line
   - `ax.annotate(text, xy, xytext, arrowprops)` - annotate a point
   - `ax.text(x, y, text)` - place text at coordinates

5. **Colormaps**
   - Sequential: `'viridis'`, `'plasma'`, `'Blues'`
   - Diverging: `'RdBu'`, `'coolwarm'`
   - When to use each (sequential for magnitude, diverging for deviation from center)
   - `plt.colorbar(im, ax=ax)` - adding a colorbar

6. **Saving**
   - `fig.savefig('plot.png', dpi=150, bbox_inches='tight')`
   - Format options: PNG, SVG, PDF
   - `bbox_inches='tight'` to avoid clipped labels

### seaborn (target: 0.13+)

1. **Statistical plots**
   - `sns.boxplot(data=df, x='category', y='value', ax=ax)`
   - `sns.violinplot(data=df, x='category', y='value', ax=ax)`
   - `sns.heatmap(matrix, annot=True, fmt='.2f', ax=ax)`
   - `sns.pairplot(df)` - pairwise relationships

2. **Integration with matplotlib**
   - Seaborn functions accept an `ax` parameter for embedding in matplotlib figures
   - `sns.set_theme()` for styling (optional, not required)

### Common Mistakes (document for the write task)

- Truncated y-axis exaggerating differences
- Pie charts for more than 3 categories
- 3D charts that obscure rather than reveal
- Missing axis labels
- Rainbow colormaps on sequential data
- Not calling `plt.tight_layout()` or using `bbox_inches='tight'`

## What to Document

For each plot type:
- The correct OOP API call (on `ax`, not `plt`)
- Required parameters and common optional ones
- One minimal example (3-5 lines)
- When this chart type is the right choice vs wrong choice

## Output Format

Structured markdown with sections per plot type. Include the decision tree for "which
chart for which question" as a reference table. Code examples should be copy-pasteable
into a Jupyter notebook cell.
