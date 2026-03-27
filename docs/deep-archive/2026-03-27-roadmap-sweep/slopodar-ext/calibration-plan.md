# Slopodar Calibration Research Plan

## The Problem

Good human writers (PG, Spolsky, Atwood) score HIGHER on our structural detectors than AI company blogs. The detectors measure rhetorical devices that predate LLMs by millennia. Presence doesn't discriminate. Something about the *degree*, *distribution*, or *combination* does — because those writers don't sound like LLMs despite using the same devices. We need data to find what that something is.

## Core Hypothesis

> Humans and LLMs use the same rhetorical devices. The differentiator is not *what* they use but *how* — the variance, clustering, co-occurrence patterns, and ratio to simpler constructions.

## Phase 1: Feature Expansion

New programmatic features beyond the current 7, all regexable:

| # | Feature | Regex/Method | Hypothesis |
|---|---------|-------------|------------|
| F1 | Sentence length std-dev | Split sentences, calc σ of word counts | LLMs produce more uniform lengths. Humans vary wildly. |
| F2 | Contraction rate | `\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|didn't|doesn't)\b` per 1k words | Humans contract. LLMs tend formal. |
| F3 | First-person rate | `\b(I|me|my|mine|myself)\b` per 1k words | Humans are present in their text. LLMs write from nowhere. |
| F4 | Question rate | Sentences ending in `?` per total sentences | Humans wonder aloud. LLMs declare. |
| F5 | Transition word density | `\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|Nonetheless|Importantly|Specifically|Ultimately|Fundamentally)\b` per 1k words | LLM signature — formal transition words at sentence starts. |
| F6 | Hedge word density | `\b(perhaps|maybe|somewhat|fairly|quite|rather|slightly|arguably|potentially|essentially|generally|typically)\b` per 1k words | May differ in distribution. |
| F7 | Parenthetical rate | Count of `(...)` per 1k words | Humans aside. LLMs parenthesise less. |
| F8 | Exclamation rate | Sentences ending in `!` per total sentences | May vary by writer/context. |
| F9 | Avg sentence length | Total words / total sentences | Baseline metric. |
| F10 | Short sentence ratio | Sentences ≤ 5 words / total sentences | Burst of short sentences = human rhythm? |
| F11 | Long sentence ratio | Sentences ≥ 30 words / total sentences | Run-on tendency. |
| F12 | Semicolon rate | Count of `;` per 1k words | Stylistic marker. |
| F13 | Colon rate | Count of `:` per 1k words | Stylistic marker. |
| F14 | Paragraph length std-dev | σ of paragraph word counts (if extractable) | LLMs may produce more uniform paragraphs. |

## Phase 2: Dataset Expansion

Target: 40-60 pages across 5 categories.

### Category A: Pre-LLM Human (ground truth)
Paul Graham (5+ essays), Joel Spolsky (3+), Jeff Atwood (3+), patio11 (2+), Gwern (2+), Steve Yegge (2+), Maciej Cegłowski (2+), Aaron Swartz (2+)

### Category B: Post-LLM Known Human
Dan Luu, Julia Evans, Rachel Kroll, Hillel Wayne, Drew DeVault, Xe Iaso

### Category C: AI Company Blogs
Anthropic (3+), OpenAI (3+), Google DeepMind (2+), Cohere (2+)

### Category D: Known/Suspected LLM-Heavy
Medium posts on AI topics (recent), LinkedIn thought leadership, AI-generated sample content

### Category E: Simon Willison (longitudinal)
Early posts (2020-2022) vs recent (2024-2025) — same writer, potential secondary contamination signal

## Phase 3: Analysis

For each feature:
1. Mean and σ per category
2. Effect size (Cohen's d) between categories A and C
3. Which features discriminate at d > 0.5?

For feature combinations:
1. Do any 2-3 feature combinations separate cleanly?
2. Is there a simple composite that works better than our current one?

## Phase 4: Deliverable

Write findings to `sloptics-ext/calibration-results.md`:
- Raw data TSV
- Per-feature analysis
- Discriminating features ranked
- Recommended extension changes
