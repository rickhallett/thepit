# Task 14: Write - Step 9: Text Analysis Basics

**Type:** Write
**Parallelizable with:** Tasks 09, 10, 11, 12, 13, 15 (Tier 2/3 steps)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 03 (pandas/scikit-learn)
**Output:** `docs/bootcamp/bootcamp3-09-text-analysis.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 9: Text Analysis Basics.
This is a Tier 3 applied step. It teaches the reader to compare, classify, and search
agent text outputs using string similarity, TF-IDF, and simple embeddings.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/03-research-python-analytics/findings.md` - pandas/scikit-learn APIs
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 687-761 - the outline for this step
- `bin/triangulate` - read the matching algorithm (uses SequenceMatcher) for grounding

## Content Specification

From the outline, this step covers 6 topics:

1. String similarity (SequenceMatcher, Levenshtein, Jaccard)
2. TF-IDF (term frequency-inverse document frequency)
3. Embedding-based similarity (cosine similarity on vectors)
4. Simple text classification (keyword rules, LogisticRegression on TF-IDF)
5. Keyword and pattern extraction (regex, Counter-based frequency)
6. Diffing and change detection (difflib, structured diff)

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template. Title: `# Step 9: Text Analysis Basics`

### Field Maturity: Emerging

Acknowledge this. Text analysis for agent output comparison is an emerging practice.
String similarity is well-established; embedding-based comparison is newer; there are
no settled conventions for "how to compare agent reviews across models."

### The triangulate Connection

The triangulate script is the primary grounding for this step. Its matching algorithm
uses `SequenceMatcher` with a weighted composite score (0.3 * file_sim + 0.7 *
title_sim, threshold 0.6). This step teaches the reader to understand, evaluate, and
potentially improve this algorithm.

Read `bin/triangulate` to extract:
- The exact matching logic (line numbers, algorithm)
- The threshold value and weighting
- Where it works well and where it might fail

### No Deep NLP

The outline explicitly says "no transformers, no fine-tuning, no custom models." The
most advanced technique is `TfidfVectorizer` from scikit-learn and optionally
pre-computed embeddings via an API call. Stay pragmatic.

### The Escalation Path

1. String similarity (SequenceMatcher) - works when wording is similar
2. TF-IDF - works when key terms overlap but phrasing differs
3. Embeddings - works when meaning is similar but words are completely different

Frame this as an escalation: start simple, upgrade only when the simpler method fails.

### Code Examples

- `difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()` - direct from triangulate
- `sklearn.feature_extraction.text.TfidfVectorizer` - 5-line pattern
- Cosine similarity: `from sklearn.metrics.pairwise import cosine_similarity`
- Classification: `LogisticRegression` on TF-IDF features, 10-line pattern
- difflib: `difflib.unified_diff()` for text comparison

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 700-1000 lines. This is a 3-4 hour step with 6 topics.
- Ground every technique in "you have agent outputs and need to compare them"

## Quality Gate

- The triangulate matching algorithm must be accurately described with correct line refs
- SequenceMatcher, TF-IDF, and cosine similarity examples must be runnable
- The escalation path (string -> TF-IDF -> embeddings) must be clearly framed
- Classification example must use slopodar.yaml as the dataset
- No transformers, no fine-tuning, no custom model training
- No emojis, no em-dashes
