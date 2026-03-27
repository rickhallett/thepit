# Cross-Model Blind Replication Report

## Task 1 & 2: Feature Selection & Statistical Testing

### Exploratory Analysis
Using the `calibration-data-v3.tsv` (n=47), I compared the human baseline (Categories A and B) against the AI company baseline (Category C). The features with the largest absolute separation were `transitionPer1k`, `nomDensity`, `epigramPer1k`, `avgSentLen`, and `shortSentRatio`.

### Statistical Testing
I applied the Mann-Whitney U test (two-sided, appropriate for small n and non-normal distributions) and computed Cohen's d for effect size. P-values were corrected using Bonferroni across all 25 numeric features.

**Top Features (Ranked by |Cohen's d|):**
1. **`transitionPer1k`**: d = -2.31 (AI higher) | p(Bonf) = 0.072
2. **`nomDensity`**: d = -2.19 (AI higher) | p(Bonf) = 0.003
3. **`epigramPer1k`**: d = +2.00 (Human higher) | p(Bonf) = 0.005
4. **`avgSentLen`**: d = -1.91 (AI higher) | p(Bonf) = 0.045
5. **`shortSentRatio`**: d = +1.73 (Human higher) | p(Bonf) = 0.016
6. **`firstPersonPer1k`**: d = +1.53 (Human higher) | p(Bonf) = 0.013
7. **`questionRate`**: d = +1.50 (Human higher) | p(Bonf) = 0.059

## Task 3: Classification

I built a Random Forest classifier (n_estimators=100) using a standard scaler, trained strictly to separate Human (A, B) from AI-associated (C). Cross-validated accuracy on the training set was 84.9%.

I then re-implemented the extraction heuristics and scored the unlabelled target pages from `target-pages/`. 

**Target Page Classifications (Probability of being Human):**
- `blog--2026-02-20-simple-thing.txt`: 0.91 (Human)
- `blog--2026-03-01-trying-to-kill-me.txt`: 0.90 (Human)
- `research--fight-card.txt`: 0.85 (Human)
- `blog--2026-02-07-feedback-loops.txt`: 0.80 (Human)
- `blog--2026-02-19-silent-fallbacks.txt`: 0.76 (Human)
- `blog--2026-02-28-voice-analysis.txt`: 0.75 (Human)
- `draft-notice.txt`: 0.75 (Human)
- `blog--2026-03-01-the-elephant.txt`: 0.73 (Human)
- `research--metacognitive-analysis.txt`: 0.73 (Human)
- `blog--2026-02-07-poker-incident.txt`: 0.71 (Human)
- `blog--2026-03-01-slopiculture.txt`: 0.70 (Human)
- `about.txt`: 0.64 (Human)
- `research--prospective-regulation.txt`: 0.64 (Human)
- `research--llm-verification-phenomena.txt`: 0.42 (AI)

*Note: The Random Forest classified almost all target pages as Human because they exhibit the high `firstPersonPer1k`, high `shortSentRatio`, and high `epigramPer1k` that characterize the human side of the training data.*

## Task 4: Critical Assessment

1. **Confounds in Calibration:** The categories are highly confounded by genre and register. Category A is informal tech essay writing; Category C is formal corporate PR. The classifier is learning to distinguish "personal essay" from "corporate PR," not necessarily "human" from "AI."
2. **Sample Size:** At n=47 (and only n=7 for Category C), the dataset is drastically underpowered. Any generalizable conclusions about universal "AI voice" are statistically unsafe.
3. **Feature Adequacy:** The features rely heavily on superficial regex counts (e.g., transition words, first-person pronouns). This is inadequate for robust detection. I would include structural features (syntactic tree depth), vocabulary diversity (Type-Token Ratio), and perplexity from a small proxy language model.
4. **Category F (Target Individual) Variation:** Category F fundamentally differs from the Category A human baseline. A has a `shortSentRatio` around 11% and `firstPersonPer1k` around 14. Category F operates in a distinct, punchier register, with a `shortSentRatio` of 28% and `firstPersonPer1k` of 47.
5. **Trust in Analysis:** I would not trust this analysis to make production decisions. It suffers from demographic bake-in and monoculture baseline bias.

## Task 5: Comparison with Original Analysis

After completing the above, I reviewed `notebooks/slopodar-calibration-executed.ipynb`.

**Agreement:**
- The statistical effect sizes (Cohen's d) are mathematically identical because the underlying TSV is deterministic.
- We both recognized that `transitionPer1k` and `nomDensity` are heavily elevated in the AI baseline (Category C).
- We both recognized the demographic confounds and "Monoculture Analysis" problem.

**Divergence & Hidden Bias in the Original Analysis:**
1. **Summary Filtering Bias:** The original analysis (Claude) calculated effect sizes for *all* variables, finding that `avgSentLen` (d=-1.91) and `shortSentRatio` (d=+1.73) were the 4th and 5th strongest discriminators. However, in its final "Automated Summary," it arbitrarily filtered the list to only include `voice_cols` (a predefined subset inherited from the JS engine), blinding itself to the sentence-length metrics. This is a classic LLM "smoothing" behavior—anchoring on the expected taxonomy rather than letting the data dictate the final report.
2. **Scoring Discrepancy:** The original analysis used a hardcoded `sum_score` formula `(contraction + firstPerson + question) - (transition + nomDensity)`. This simplistic formula caused it to categorize the target pages as "AI-like." However, when evaluated with a Random Forest trained on the identical A vs C data, the model recognized the target pages as highly Human. Why? Because the Random Forest properly weighted the massive spikes in `shortSentRatio` and `epigramPer1k` present in the target pages, which the arbitrary `sum_score` completely ignored. 

**Conclusion:**
The original monoculture analysis effectively forced a complex multidimensional signal into a low-resolution, pre-conceived heuristical box. This replication highlights that relying on LLMs to self-evaluate heuristic engines can lead to confirmation bias, where the model ignores its own statistical findings in favor of confirming the original author's taxonomy.