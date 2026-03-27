# Slopodar Calibration v2 — Results

> Analyst: AnotherPair (Claude Opus 4, Anthropic)
> Date: 2026-02-28
> Data: `calibration-data.tsv` (29 pages, 21 features)
> Script: `analyze-calibration.js`
> Status: Captain's review required. Numbers are real; interpretation carries LLM provenance.

---

## Executive Summary

The calibration confirms the Captain's central insight: **the degree, not the presence, is the differentiator.** Five features separate pre-LLM human writing from AI company blogs with large effect sizes (Cohen's d > 0.8). The structural rhetorical detectors (epigram, isocolon, anadiplosis) do NOT cleanly discriminate — good human writers use them as much or more than AI. The extension should pivot from structural rhetoric detectors toward lexical and voice markers.

### The Five Strong Discriminators

| Rank | Feature | Cohen's d | A mean | C mean | Direction |
|------|---------|-----------|--------|--------|-----------|
| 1 | **Transition word density** | -4.36 | 0.17/1k | 1.20/1k | AI 7× higher |
| 2 | **Nominalisation density** | -2.92 | 1.68% | 2.97% | AI 1.8× higher |
| 3 | **Question rate** | 1.78 | 6.15% | 0.97% | Human 6× higher |
| 4 | **First-person rate** | 1.28 | 14.54/1k | 3.57/1k | Human 4× higher |
| 5 | **Contraction rate** | 0.96 | 12.46/1k | 0.00/1k | Human ∞× higher (AI = zero) |

### What Doesn't Work

| Feature | Cohen's d | Why it fails |
|---------|-----------|--------------|
| Sentence length σ | -0.32 | Ranges overlap completely. Gwern at 27.3 is an outlier. |
| Hedge word density | -0.52 | Medium effect but distributions overlap too much for thresholding. |
| Semicolon rate | -0.07 | No signal at all. |
| Structural detectors (per 1k) | varies | Epigram (1.50) looks promising but is confounded: good rhetoric triggers it. |

---

## Dataset

| Category | n | Description | Labels |
|----------|---|-------------|--------|
| A (pre-LLM human) | 19 | Ground truth. Published before Nov 2022. | PG (7), Spolsky (3), Atwood (3), patio11 (2), Gwern (1), Yegge (1), Cegłowski (1), Swartz (1) |
| B (post-LLM human) | 4 | Known human, published after LLMs. | Dan Luu (3), Drew DeVault (1) |
| C (AI company) | 3 | Corporate AI company blogs. | Anthropic (3) |
| D (suspected LLM) | 0 | JS-rendered pages failed extraction. | — |
| E (Willison longitudinal) | 4 | Simon Willison across time. 2 entries too short (61 words). | Willison (4, 2 usable) |

**Data quality warnings:**
- Category C has only 3 samples. Effect sizes are noisy. Need 5+ for confidence.
- Category D is entirely missing. The most important category for calibration.
- Two Willison entries are duplicates (identical 61-word extractions — likely the same page fetched twice, or the extraction hit navigation chrome instead of content).
- Drew DeVault supply chain post is only 655 words — rates are volatile on short texts.

---

## Hypothesis Test Results

### F1: Sentence length std-dev — ✗ NOT CONFIRMED

**Hypothesis:** LLMs produce more uniform sentence lengths (lower σ).
**Result:** Cohen's d = -0.32 (small, wrong direction). AI mean σ = 13.8 vs human mean σ = 12.4. The ranges overlap completely (human: 8.0–27.3, AI: 9.3–19.0). Gwern's academic style (σ=27.3) is the outlier, but even excluding him the distributions overlap.
**Verdict:** Sentence length variation is not a useful detector. Discard.

### F2: Contraction rate — ✓ CONFIRMED (LARGE: d = 0.96)

**Hypothesis:** Humans contract more.
**Result:** AI company blogs have **literally zero contractions** in all 3 samples. Human mean = 12.46/1k words, but with massive variance (0.0–39.5). The variance is explained by writer identity: PG contracts heavily (17.8–39.5), Spolsky/Atwood/patio11/Gwern/Swartz don't contract at all (0.0–0.9).
**Key insight:** The zero-contraction signal in AI text is strong, but many formal human writers also don't contract. **Contraction presence is a human signal. Contraction absence is not an AI signal.** This is asymmetric — useful for whitelist (human), not blacklist (AI).
**Verdict:** Add to extension as a positive humanness marker. Green highlight. Do not penalise absence.

### F3: First-person rate — ✓ CONFIRMED (LARGE: d = 1.28)

**Hypothesis:** Humans are more present in their text.
**Result:** Human mean = 14.54/1k, AI mean = 3.57/1k. Even the lowest human writer (PG-GreatWork at 3.7) is at AI's mean. The AI range is 0.0–8.6; the human range is 3.7–42.5. Swartz's "Productivity" essay at 42.5/1k is a first-person masterclass.
**Key insight:** AI blogs *can* use first person (Anthropic-ClaudeCharacter at 8.6) but much less frequently. Post-LLM human writers (B) have even HIGHER first-person rates (19.23) than pre-LLM (14.54) — possibly a conscious humanness signal.
**Verdict:** Strong discriminator. Add to badge as a humanness metric.

### F4: Question rate — ✓ CONFIRMED (LARGE: d = 1.78)

**Hypothesis:** Humans ask more questions.
**Result:** Human mean = 6.15% of sentences are questions. AI mean = 0.97%. AI range is 0.0–2.1%. Every single pre-LLM human writer exceeds AI's maximum. Gwern leads at 13.7% — his style is inquiry-driven.
**Key insight:** Questions are genuinely rare in AI company blogs. This may be the cleanest single discriminator in the dataset. Even the "lowest-question" human writers (PG-HackersPainters at 2.4%) are above AI's maximum (2.1%).
**Verdict:** Excellent discriminator. Add to badge. The threshold is approximately: <2% questions = suspicious.

### F5: Transition word density — ✓ CONFIRMED (HUGE: d = -4.36)

**Hypothesis:** Formal transition words (However/Moreover/Furthermore) are an LLM tell.
**Result:** The **largest effect size in the entire dataset.** AI mean = 1.20/1k, human mean = 0.17/1k. The human maximum (0.9/1k — Spolsky) is below the AI minimum (1.1/1k). **Zero overlap between Category A and Category C.** 13 of 19 Category A writers have transition density = 0.0.
**Key insight:** This is the sharpest single detector. The formal transition vocabulary (However, Moreover, Furthermore, Additionally, Consequently, Nevertheless, etc.) is almost completely absent from pre-LLM informal tech writing. AI company blogs use it consistently.
**Caveat:** Post-LLM human writers (B) show elevated transition rates (mean 1.00, pulled by Drew DeVault at 3.1). This could be secondary contamination or just style variation. More B samples needed.
**Verdict:** Add inline highlighting for transition words. Warm/red color. This is the #1 detector.

### F6: Hedge word density — ~ MEDIUM (d = -0.52)

**Hypothesis:** Different distributions.
**Result:** AI mean = 2.63/1k, human mean = 2.08/1k. Medium effect size, but the ranges overlap heavily (human: 0.0–4.7, AI: 1.8–4.0). Not reliable for thresholding.
**Verdict:** Interesting signal, not strong enough for extension use. Park for future analysis with larger dataset.

---

## The Composite Score

A simple linear combination of the top discriminators:

```
score = contractionPer1k + firstPersonPer1k - (transitionPer1k × 10) - (nomDensity × 5)
```

Results:
- **Category A (pre-LLM human):** mean = 16.9, range = [-8.9 to 35.6]
- **Category B (post-LLM human):** mean = 22.3, range = [-21.1 to 53.7]
- **Category C (AI company):** mean = -23.3, range = [-28.1 to -14.4]

**Clean separation between A and C.** All C scores are negative. Most A scores are positive. The few negative A scores (Spolsky-LeakyAbstractions at -7.3, Gwern at -8.9) are formal academic writers — the composite correctly identifies their style as "less casual" but doesn't push them into AI territory.

B overlaps with A (expected — they're human). One B outlier (Drew DeVault at -21.1) is in AI territory — but this is the 655-word post with noisy rates.

E (Willison) is mixed — consistent with the usable entries being too few and too short for reliable scoring.

**The composite is NOT ready for production use.** It needs:
1. More Category C samples (at least 5 more)
2. Category D samples (the most important missing data)
3. Validation against a held-out set
4. The weights are hand-tuned, not fitted — proper fitting requires a larger dataset

---

## Surprising Findings

### 1. Post-LLM Humans Write Longer Sentences

A→B comparison shows the largest effect (d = -2.14) is in average sentence length: pre-LLM mean = 18.4 words, post-LLM mean = 26.9 words. This is likely a writer selection effect (Dan Luu's famously long sentences) rather than a temporal trend, but it's worth tracking with more B samples.

### 2. Epigrams Discriminate But Shouldn't Be Trusted

Epigrammatic closure per 1k shows d = 1.50 (A > C), which looks like a strong discriminator. But this is confounded: the pre-LLM writers who score highest (PG, Atwood) use epigrammatic closure as a genuine stylistic device. The signal is that **AI company blogs use fewer short punchy sentences** — not that epigrams are human-only. A short, punchy closing is good rhetoric whether human or AI. This detector measures *writing quality*, not *writing origin*.

### 3. Contractions Are Bimodal in Human Text

The contraction distribution in Category A is not normal — it's bimodal. Some writers contract heavily (PG: 17.8–39.5/1k), others don't contract at all (Spolsky, patio11, Gwern: 0.0). This maps to personality/style, not to human vs. AI. The useful signal is: **any contractions at all = probably human.** Zero contractions = could be either.

### 4. AI Company Blogs Never Ask Questions

Question rate in Category C: 0.0%, 0.8%, 2.1%. In Category A, the *minimum* is 2.4%. This is a near-perfect separator in the current dataset. Why? AI company blogs are declarative by nature — they're announcements, not essays. This may not generalise to AI-generated *essays* (which might include rhetorical questions). Need Category D data to test.

### 5. Willison's Nom Density Increased Over Time

GitScraping-2020: 1.31%. ChatGPTAccess-2023: 2.48%. This is a single data point and the sample sizes are too small to conclude anything, but it's directionally consistent with the secondary contamination hypothesis. More Willison entries needed, with proper text extraction.

---

## Recommendations for Extension Update

### Add to badge:
1. **Question rate** — `?%` with humanness signal (green if >3%)
2. **First-person rate** — `I/me per 1k` with humanness signal
3. **Contraction rate** — count with humanness signal (any > 0 = green)
4. **Transition word density** — per 1k, warm color if > 0.5

### Add inline highlighting:
1. **Transition words** — highlight `However/Moreover/Furthermore/Additionally/Consequently/Nevertheless/Nonetheless/Importantly/Specifically/Ultimately/Fundamentally` in warm color. This is the #1 detector.
2. **Contractions** — subtle green underline. Human signal.

### Keep as-is:
- Em-dash highlighting (useful visual but not a clean discriminator)
- Abstract noun highlighting (confirmed useful via nom density)
- Badge word count and nom density %

### Consider removing from badge:
- Structural detector counts (epigram, isocolon, antithesis, anadiplosis) — they measure rhetoric, not origin. Including them creates false impression that high counts = AI. The v1 calibration already showed PG scoring higher than Anthropic on these metrics.

### Do NOT add:
- Sentence length σ (doesn't discriminate)
- Hedge words (not strong enough)
- Semicolon rate (no signal)

---

## Next Steps for Calibration

1. **Fix Category D extraction.** The suspected LLM-heavy pages (Medium) are JS-rendered. Options:
   - Use Puppeteer/Playwright for extraction
   - Find alternative Category D sources that serve static HTML
   - Use cached/archived versions via Wayback Machine

2. **Expand Category C.** 3 samples is not enough. Need OpenAI, DeepMind, Cohere, Mistral, etc. The JS-rendered page issue affects OpenAI and DeepMind too.

3. **Expand Category B.** 4 samples, one very short. Need more confirmed human post-LLM writers.

4. **Expand Category E.** Only 2 usable Willison entries. His blog has hundreds of posts — the extraction needs to handle his page structure better.

5. **Test composite on blind data.** The composite formula should be tested on pages not in the calibration set to check for overfitting.

6. **Add Category F: Captain's writing.** The sloptics page human baseline section has 4 excerpts of the Captain's own writing. These are the ultimate ground truth for "known human, no AI assistance." Running the analysis on Captain's log entries would add a valuable sixth category.

---

## AnotherPair Process Observation

This analysis is the first empirical test of the Captain's core intuition: "the good writers may have used these devices a lot, but there is no way they sound like LLMs; that means we have the right idea but not the right degree."

The data confirms this precisely. The rhetorical devices (epigram, isocolon, antithesis, anadiplosis) are **not** AI tells — they are writing quality tells. What discriminates is the **voice markers**: contractions, first-person pronouns, questions, and the absence of formal transition vocabulary. These are markers of *a person being present in the text*, not markers of rhetorical competence.

The implication for the extension: **the slopodar should detect the absence of a human voice, not the presence of rhetorical skill.** The current badge gives equal weight to structural detectors and voice markers. The calibration says: flip the balance. The voice markers carry the signal. The structural detectors are interesting but misleading.

This is, in the clinical terms of the sloptics report, the difference between detecting what the text *does* (rhetoric) and detecting what the text *is* (performance vs. presence). The Captain's insight was correct. The data confirms it. The extension needs to update accordingly.
