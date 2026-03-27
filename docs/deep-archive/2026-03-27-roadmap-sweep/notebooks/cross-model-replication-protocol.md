# Cross-Model Blind Replication Protocol

## Purpose

This protocol enables an independent AI system (or human analyst) to validate or challenge the findings of a voice-distance analysis performed on web text. The original analysis was conducted entirely by one model family (Claude, Anthropic). This replication protocol exists to detect hidden bias introduced by monoculture analysis.

**You should NOT read any other files in this repository before completing this protocol.** The original analysis, its conclusions, its feature rankings, and its taxonomy are deliberately withheld. Your job is to arrive at your own conclusions from the raw data, then compare.

## Research Question

Given a corpus of web writing from known categories (pre-LLM human, post-LLM human, AI company blogs, suspected AI-assisted, and one specific individual's writing), can you:

1. Identify which **textual features** best discriminate human writing from AI-generated or AI-assisted writing?
2. Rank those features by discriminative power with formal statistical tests?
3. Score a set of **unlabelled target pages** and classify them relative to the known categories?
4. Assess whether the target pages would pass as human-written to a discerning reader?

## Data

### Calibration Corpus

The file `calibration-data-v3.tsv` (included alongside this protocol) contains pre-computed features for 47 web pages across 6 categories:

| Category | Code | N | Description |
|----------|------|---|-------------|
| Pre-LLM Human | A-human-pre | 19 | Essays by known human authors published before widespread LLM availability (2000-2023). Tech essayists: Paul Graham, Joel Spolsky, Jeff Atwood, Patrick McKenzie, Gwern, Steve Yegge, Maciej Ceglowski, Aaron Swartz. |
| Post-LLM Human | B-human-post | 4 | Known human authors publishing after LLM availability. Dan Luu, Drew DeVault. |
| AI Company Blogs | C-ai-co | 7 | Blog posts from AI companies: Anthropic, Mistral, Cohere. Corporate communications about AI products/research. |
| Suspected AI-Assisted | D-suspected | 6 | Newsletter and blog content from post-LLM era with suspected AI assistance. Ethan Mollick, Latent Space, Import AI, The Algorithmic Bridge. |
| Known Human (Willison) | E-willison | 4 | Simon Willison's blog posts (2020-2024). Known human, prolific AI commentator. |
| Target Individual | F-captain | 6 | Writing samples from a specific individual whose web presence is being evaluated. Informal register, short-form. |

**TSV columns:**
- `cat`: category code
- `label`: sample identifier
- `totalWords`, `totalSentences`: document length
- `avgSentLen`, `sentLenStdDev`: sentence length statistics
- `shortSentRatio`, `longSentRatio`: % sentences below/above thresholds
- `emdash`, `emdashPer1k`: em-dash count and per-1000-word rate
- `absnoun`, `nomDensity`: abstract noun count and % of total words
- `epigram`, `epigramPer1k`: epigrammatic closure count and rate
- `isocolon`, `isocolonPer1k`: balanced sentence pairs and rate
- `antithesis`, `antithesisPer1k`: negation contrast patterns and rate
- `anadiplosis`, `anadipPer1k`: word-chain repetition and rate
- `contractionPer1k`: English contractions per 1000 words
- `firstPersonPer1k`: first-person pronouns (I/me/my/mine/myself) per 1000 words
- `questionRate`: % of sentences ending with ?
- `transitionPer1k`: formal transition words per 1000 words
- `hedgePer1k`: hedge words per 1000 words
- `parenPer1k`: parenthetical asides per 1000 words
- `exclamationRate`: % of sentences ending with !
- `semicolonPer1k`: semicolons per 1000 words
- `colonPer1k`: colons per 1000 words

### Target Pages

The directory `target-pages/` (included alongside this protocol) contains plain text files extracted from a personal website. Each file is named by its URL path. These are the pages to be scored and classified.

## Your Tasks

### Task 1: Exploratory Analysis
- Load the calibration data
- Explore distributions of all features by category
- Identify which features show the largest separation between categories
- Note any features that do NOT discriminate — these are informative too

### Task 2: Feature Selection & Statistical Testing
- Using only the calibration data, determine which features best separate human writing (categories A, B) from AI-associated writing (category C)
- Apply appropriate statistical tests (your choice — justify your selection)
- Report effect sizes with confidence intervals
- Apply multiple comparison correction
- Rank features by discriminative power

### Task 3: Classification
- Build a classifier (your choice of method — justify it) trained on the calibration data
- Report cross-validated accuracy
- Score the target pages
- For each target page, report: predicted category, confidence, and which features drove the classification

### Task 4: Critical Assessment
Answer honestly:
- Are the calibration categories well-defined? Are there confounds?
- Is the sample size sufficient for the conclusions drawn?
- Is the feature set adequate? What features are MISSING that you would include?
- Does category F (target individual) genuinely differ from categories A and B? Or is it within normal variation?
- Would you trust this analysis to make decisions? What would you need to see to trust it?

### Task 5: Comparison (ONLY after completing Tasks 1-4)
After you have your own conclusions, read the original analysis at `notebooks/slopodar-calibration-executed.ipynb` in this repository. Compare:
- Do your feature rankings agree? Where do they diverge?
- Do your statistical tests reach the same conclusions?
- Do your classifications of the target pages agree?
- What did you find that the original analysis missed?
- What did the original analysis find that you did not?
- Where do you suspect hidden bias in either analysis?

## Methodological Notes

- The calibration data was computed by a JavaScript heuristic engine (no ML, no embeddings, pure regex and counting). The features are deterministic.
- The original analysis was performed entirely by Claude (Anthropic). If you are also Claude, this replication has reduced value — declare this.
- The "human" baseline (Category A) is 19 English-language tech essays by predominantly male authors published 2000-2023. This is a demographic, not a universal.
- Category C (AI company blogs) may be human-written with AI editing, not pure AI output. The label is "AI company blogs," not "AI-generated text."
- Small sample sizes throughout. Be honest about statistical power.

## Output Format

Produce a report with:
1. Your feature rankings with effect sizes and p-values
2. Your classifier accuracy and method
3. Your target page classifications
4. Your critical assessment (Task 4)
5. Your comparison findings (Task 5) — this section is the most valuable part
