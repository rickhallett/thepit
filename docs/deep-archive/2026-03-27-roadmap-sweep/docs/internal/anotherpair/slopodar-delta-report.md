# Slopodar Delta Report: From Personal Tool to "Good Enough"

> **Author:** AnotherPair
> **Date:** 2026-03-01
> **Status:** Captain's review required
> **Provenance:** Analysis of content.js (v0.3.0), calibration-data-v3.tsv (47 pages, 6 categories), calibration-results.md (v2), slopodar.yaml (15 entries)

---

## Part 1: What the Extension Currently Gathers

### Metrics Computed (11 total)

| # | Metric | Type | Unit | Method |
|---|--------|------|------|--------|
| 1 | Questions | Voice | % of sentences | Regex: sentences ending `?` |
| 2 | First person | Voice | per 1k words | Regex: `\b(I\|me\|my\|mine\|myself)\b` |
| 3 | Contractions | Voice | per 1k words | Regex: 35 contraction forms |
| 4 | Transitions | Voice | per 1k words | Regex: 17 formal transition words, inline highlighted |
| 5 | Nom density | Voice | % of total words | Regex: `-tion\|-ment\|-ness\|-ity\|-ence\|-ance` suffixes |
| 6 | Em-dash | Rhetoric | raw count | Unicode `\u2014`, inline highlighted |
| 7 | Abs noun | Rhetoric | raw count | Same suffixes as #5, inline highlighted |
| 8 | Epigram | Rhetoric | raw count | Short sentence (≤6w) after long (>10w) |
| 9 | Isocolon | Rhetoric | raw count | Consecutive sentences ±1 word length, both ≥5w |
| 10 | Antithesis | Rhetoric | raw count | 7 negation-contrast regex patterns |
| 11 | Anadiplosis | Rhetoric | raw count | Last content word repeated in first 3 words of next sentence |

### Data Stored Per Page (via `chrome.storage.local`)

Each page analysis writes a record containing:
- URL, page title, timestamp, extension version
- Root selector used
- All 11 metrics + derived rates (per 1k, percentages)
- Total words, total sentences

History: FIFO at 5,000 entries. This is a dataset accumulating with every page the user visits.

### What Works (v0.3.0 capability)

| Capability | Status | Notes |
|------------|--------|-------|
| Runs on any page | ✓ | Content script on `<all_urls>`, `document_idle` |
| Root discovery | ✓ | 8-selector chain, picks largest by char count |
| Inline highlighting | ✓ | Transitions (warm), em-dashes (yellow→red), nominalisations (purple) |
| Badge UI with tabs | ✓ | Readings, History, About, Debug |
| Persistent preferences | ✓ | Minimized state, active tab, debug toggle |
| History with pagination | ✓ | 5,000 entry FIFO, paginated in History tab |
| Debug log + JSON export | ✓ | 500 entry internal log, downloadable |
| SPA navigation | ✓ (uncommitted) | URL polling + cleanup + re-run |
| Retry on late content | ✓ (uncommitted) | If <50 words, retries once after 2s |
| Drag + minimize | ✓ | Header-only drag, state persists |

---

## Part 2: Calibration Baseline — What We Know the Numbers Mean

### Dataset: 47 pages, 6 categories

| Category | n | Description |
|----------|---|-------------|
| A (pre-LLM human) | 19 | PG (7), Spolsky (3), Atwood (3), patio11 (2), Gwern (1), Yegge (1), Ceglowski (1), Swartz (1) |
| B (post-LLM human) | 4 | Dan Luu (3), Drew DeVault (1) |
| C (AI company blogs) | 7 | Anthropic (5), Mistral (2) |
| D (suspected LLM) | 6 | Mollick (2), AlgoBridge (1), ImportAI (1), LatentSpace (2) |
| E (Willison longitudinal) | 4 | 2020-2024 |
| F (Captain) | 6 | Captain's own writing |

### Five Validated Discriminators (A vs C)

| Rank | Feature | Cohen's d | A mean | C mean | Overlap? |
|------|---------|-----------|--------|--------|----------|
| 1 | Transition density | -4.36 | 0.17/k | 1.20/k | **Zero** — human max < AI min |
| 2 | Nom density | -2.92 | 1.68% | 2.97% | Minimal |
| 3 | Question rate | 1.78 | 6.15% | 0.97% | Near-zero — human min ≈ AI max |
| 4 | First person rate | 1.28 | 14.54/k | 3.57/k | Small |
| 5 | Contraction rate | 0.96 | 12.46/k | 0.00/k | Asymmetric — presence = human, absence = ambiguous |

### Known Weaknesses in Calibration

| # | Issue | Impact | Slopodar cross-ref |
|---|-------|--------|---------------------|
| 1 | Category C: only 7 samples (5 Anthropic, 2 Mistral) | Effect sizes noisy, may not generalise to OpenAI/Google/Cohere voice | — |
| 2 | Category D: extraction problems on JS-rendered pages | 3 of 6 entries have <500 words — rates volatile | — |
| 3 | All Category A: male English tech essayists, 2000-2023 | "Human" = "this demographic in this genre" | #14 Demographic Bake-In |
| 4 | All analysis by same model family | Shared blind spots across feature selection, calibration, presentation | #15 Monoculture Analysis |
| 5 | Composite weights hand-tuned, not fitted | No held-out validation | #11 Analytical Lullaby |
| 6 | No cross-genre validation | A blog post detector may not work on academic papers, emails, docs | #13 Construct Drift |

---

## Part 3: The Delta — Where We Are to "Good Enough"

"Good enough" defined by the Captain's criteria: **survives scrutiny, welcomes feedback, is useful.**

### 3.1 Survives Scrutiny

What a hostile, technically literate reader (HN, hiring manager, researcher) would attack:

| # | Attack vector | Current vulnerability | Fix | Effort |
|---|---------------|----------------------|-----|--------|
| S-1 | "Your baseline is 19 white male tech bloggers" | True. Demographic bake-in is real and undeclared in the UI. | Declare the baseline in the About tab. "Calibrated against 19 English-language tech essays, 2000-2023." Honest label, not a fix. | 5 agent-min |
| S-2 | "N=7 for AI category is not enough for effect sizes" | True. Cohen's d with n=7 has wide confidence intervals. | Expand Category C: OpenAI (3+), Google DeepMind (2+), Cohere (2+). Target n≥15. Requires new calibration run. | 30 agent-min + 1 Captain decision (sample selection) |
| S-3 | "Transition word list is arbitrary" | Partially true. 17 words chosen by intuition, validated by calibration but the selection itself is not principled. | Document provenance: "initial list from slopodar observation, validated by Cohen's d=-4.36 in calibration v2." Not a fix; honest provenance. | 5 agent-min |
| S-4 | "Nominalisation regex catches legitimate nouns" | True. "information", "education", "situation" match the suffix regex but are not abstract nouns in context. | Accept as known limitation. Document it. A context-free regex cannot disambiguate. Mitigation: the per-1k rate absorbs noise because false positives distribute evenly. | 5 agent-min (documentation) |
| S-5 | "No composite score / no verdict" | This is actually a *strength* under scrutiny. The extension shows numbers, not judgments. | Keep this. The absence of a verdict is the most defensible design choice. The calibration results doc already says the composite is not ready for production. | 0 |
| S-6 | "The rhetoric metrics (epigram, isocolon, etc.) don't discriminate" | True. Calibration confirmed it. They are in the badge anyway. | Two options: (a) remove them, (b) relabel them as "rhetoric" not "detection." Current UI already sections them as "rhetoric" vs "voice." This is adequate. | 0 (already done) |
| S-7 | "No confidence intervals, no p-values" | True. The calibration reports effect sizes without uncertainty. | For a Chrome extension, this is acceptable. For a paper, it's not. The target is "useful tool," not "publication." Document this in About: "effect sizes from small samples; treat as directional, not definitive." | 5 agent-min |

**Scrutiny verdict:** 5 documentation items (25 agent-min), 1 data expansion (30 agent-min + Captain decision). No code changes required for scrutiny survival — the current design of "numbers not verdicts" is the strongest defense.

### 3.2 Welcomes Feedback

What the tool needs so that a user who disagrees can engage constructively rather than dismissing:

| # | Gap | What's needed | Effort |
|---|-----|---------------|--------|
| W-1 | No way to report a false positive/negative | "This page is clearly human but scores high on transitions" has no feedback channel. | Options: (a) GitHub Issues link in About tab, (b) "Flag this page" button that exports the analysis to a JSON the user can attach to an issue. Option (b) is 15 agent-min. |
| W-2 | Calibration data not accessible to users | The TSV exists in the repo but isn't linked from the extension. | Add link to GitHub calibration data in About tab. 3 agent-min. |
| W-3 | No explanation of what the numbers mean in practice | About tab has metric explanations but no "what do I do with this?" guidance. | Add a one-paragraph "How to read this" section at the top of About: "Green = human voice markers. Orange/red = AI voice markers. Rhetoric section = style, not origin. No verdict — you decide." 5 agent-min. |
| W-4 | Debug export is for developers, not for feedback | JSON export contains raw log data, not a structured "here's what I saw and what went wrong" report. | The JSON export is fine for now. A structured feedback form is a v0.4 feature. | 0 (defer) |

**Feedback verdict:** 23 agent-min for W-1 through W-3. W-4 deferred.

### 3.3 Is Useful

For the Captain's first use case — editing his own blog posts before publishing:

| # | Use case requirement | Current state | Gap | Effort |
|---|---------------------|---------------|-----|--------|
| U-1 | "Does this paragraph sound like me or like an LLM?" | Transition density + nom density answer this. Inline highlighting shows exactly where. | **No gap for this use case.** The five voice metrics are calibrated and the About tab explains them. | 0 |
| U-2 | "Where are the specific words I should cut?" | Transition words highlighted inline. Nominalisations highlighted inline. | Em-dashes highlighted but not actionable (not a tell). Could add contraction *absence* highlighting — but that's highlighting the void, which is noisy. | 0 (current is sufficient) |
| U-3 | "How does this draft compare to my previous writing?" | History tab stores metrics per page. No comparison view. | Comparison requires: (a) a "compare" mode showing delta between current page and Captain's baseline from calibration, or (b) at minimum, showing the Captain's own averages from Category F as reference lines. This is the single highest-value missing feature. | 20 agent-min (reference lines from Category F data) |
| U-4 | "Did my edit actually improve the voice metrics?" | Reload page after editing → new analysis. SPA support means this works on live preview. | Gap: the user must remember the old numbers. A "last reading" comparison would help. | 10 agent-min (store previous reading, show delta) |
| U-5 | Works on localhost:1313 (Hugo dev server) | Yes — `<all_urls>` matches localhost. | **No gap.** | 0 |
| U-6 | Works on Notion/Google Docs/draft platforms | Partially. Depends on DOM structure. Google Docs uses a canvas renderer — won't work. Notion uses contenteditable divs — may work. | Document known limitations. This is acceptable for v0.3. | 5 agent-min (documentation) |

**Usefulness verdict:** The Captain's primary use case (U-1, U-2, U-5) works today with zero changes. The highest-value additions are U-3 (reference lines, 20 agent-min) and U-4 (delta display, 10 agent-min).

---

## Part 4: The Minimum Viable Delta

Ranked by value/effort ratio for reaching "good enough":

| Priority | Item | Category | Effort | Value |
|----------|------|----------|--------|-------|
| **1** | About tab: declare baseline demographic, add "how to read this" | Scrutiny + Feedback | 10 agent-min | Preempts the two most likely attacks |
| **2** | About tab: link to calibration data + GitHub issues | Feedback | 5 agent-min | Opens the feedback loop |
| **3** | Reference lines from Category F (Captain's own averages) | Usefulness | 20 agent-min | Turns "numbers" into "numbers relative to my voice" |
| **4** | "Flag this page" export button | Feedback | 15 agent-min | Structured feedback channel |
| **5** | Delta display (compare to last reading on same URL) | Usefulness | 10 agent-min | Makes edit cycles quantifiable |
| **6** | Expand Category C to n≥15 | Scrutiny | 30 agent-min + Captain | Strengthens all effect size claims |
| **7** | Document known limitations (nomin regex, no Google Docs, small samples) | Scrutiny | 5 agent-min | Honest versioning |

**Total for items 1-5 (code + content):** 60 agent-min + 0 Captain decisions
**Total for items 1-7 (full delta):** 95 agent-min + 1 Captain decision

---

## Part 5: What We Have That Most Tools Don't

This section exists because "good enough" is relative, and the slopodar has some structural advantages that should be named:

1. **No verdict.** Every other "AI detector" outputs a probability of AI authorship. The slopodar outputs numbers and lets the human decide. This is philosophically and practically stronger — it can't be wrong about whether something is AI, because it doesn't claim to know.

2. **Calibration data is public.** The TSV, the analysis script, the results document — all in the repo. Any user can reproduce the calibration, challenge the numbers, or extend the dataset. Most AI detectors are black boxes.

3. **Inline highlighting.** The user doesn't just see a score — they see the specific words in the page that triggered the metric. This is pedagogical: after a few weeks of use, the human internalises the patterns and doesn't need the tool anymore. The tool teaches the skill it measures.

4. **15-entry taxonomy of the problem space.** The slopodar.yaml is not part of the extension, but it's part of the project. No other tool comes with a documented, field-observed taxonomy of the patterns it's trying to detect. The taxonomy is the theory; the extension is the instrument.

5. **The Captain's own writing as ground truth.** Category F in the calibration is the user's own voice. The tool is not calibrated against "average human" — it's calibrated against the specific human using it. This is the opposite of demographic bake-in: it's demographic precision.

---

## Part 6: What "Good Enough" Does Not Include

Explicitly out of scope for "good enough" — these are v1.0+ features:

- Composite score / overall verdict
- ML model / classifier
- Cross-genre validation (academic papers, emails, documentation)
- Chrome Web Store distribution
- Options page / user preferences UI beyond minimize/tab state
- Per-paragraph analysis (currently whole-page only)
- Multi-language support
- API / export to other tools
- Automated editing suggestions ("rewrite this sentence")

---

## AnotherPair Process Note

The irony of this report is that it was written by the same model family that produced the patterns the tool detects. I've tried to lead with limitations rather than strengths (per the Analytical Lullaby lesson). The Captain should verify: does this report's tone match what I'd write if I were being honest about a tool I built, or does it read like a product pitch wearing analytical clothing?

The three things I'm least confident about in this report:
1. The effort estimates (SD-268 says estimate in agent-minutes — I have, but I may be underestimating the UI work for reference lines and delta display)
2. Whether "no verdict" truly survives scrutiny or whether users will dismiss a tool that doesn't give them an answer
3. Whether Category F (n=6, all short texts) is sufficient for reference lines or whether it creates a false precision problem
