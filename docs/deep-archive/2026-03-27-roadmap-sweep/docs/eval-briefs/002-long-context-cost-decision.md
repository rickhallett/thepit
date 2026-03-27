# Decision Record: Enable 1M Context Window for Claude Sonnet 4.6

**Date:** 2026-02-20
**Decision:** Enable the 1M token beta context window for all Claude Sonnet 4.6 evaluation runs.
**Status:** Accepted

---

## Context

The piteval engine bundles the tspit codebase into 7 sections (A-G) totalling ~679K tokens. Each evaluation panel specifies required and optional codebase sections. With Claude Sonnet 4.6's standard 200K context window, the assembler must either:

1. Drop optional sections to fit within 200K, or
2. Skip Claude entirely when even required sections exceed 200K.

Initial dry-run analysis revealed that **7 of 12 panels could not run on Claude** at the standard 200K limit, and **2 panels (101, 110) could not run on either Claude or GPT-5.2**, leaving only single-model (Gemini) coverage — which makes ICC computation impossible for those panels.

## Problem

| Coverage level | Panels | Statistical consequence |
|---------------|--------|------------------------|
| 3-model (Claude + GPT + Gemini) | 103, 104, 105, 106, 107, 109, 111 | Full ICC computable |
| 2-model (GPT + Gemini only) | 102, 108, 112 | ICC computable but reduced power |
| 1-model (Gemini only) | 101, 110 | **No ICC possible — no convergence data** |

Panels 101 (Architecture) and 110 (Engineering Culture) are among the most important for the overall evaluation narrative. Having only one evaluator makes their scores unfalsifiable opinions rather than statistical findings.

## Solution

Anthropic offers a 1M token context window for Claude Sonnet 4.6 via the beta header:

```
anthropic-beta: context-1m-2025-08-07
```

**Requirements:**
- Organization must be in usage tier 4 (or custom rate limits)
- No model change required — same `claude-sonnet-4-6` API ID

**Source:** https://docs.anthropic.com/en/about-claude/pricing#long-context-pricing
**Retrieved:** 2026-02-20

## Pricing Impact

### Standard vs Long-Context Rates (Claude Sonnet 4.6)

| Rate | Standard (<=200K input) | Long-context (>200K input) | Multiplier |
|------|------------------------|---------------------------|------------|
| Input | $3.00 / MTok | $6.00 / MTok | 2.0x |
| Output | $15.00 / MTok | $22.50 / MTok | 1.5x |

**Critical billing detail:** When input exceeds 200K tokens, ALL tokens in the request are billed at the premium rate — not just the tokens above the threshold.

### Per-Panel Cost Analysis (1 iteration)

The following table shows estimated costs for Claude Sonnet 4.6 per panel. "Prev" indicates the previous state (before this decision). Token estimates include both required and optional sections where context permits.

| Panel | Input tokens (est.) | Prev state | New input cost | New output cost (4K out) | Total per run |
|-------|-------------------|------------|---------------|------------------------|---------------|
| 101 Architecture | ~410K | **SKIPPED** | $2.46 | $0.09 | $2.55 |
| 102 Code Quality | ~211K | **SKIPPED** | $1.27 | $0.09 | $1.36 |
| 103 Security | ~140K | $0.42 (std) | $0.42 (std) | $0.06 | $0.48 |
| 104 Type System | ~123K | $0.37 (std) | $0.37 (std) | $0.06 | $0.43 |
| 105 Database | ~108K | $0.32 (std) | $0.32 (std) | $0.06 | $0.38 |
| 106 API Design | ~112K | $0.34 (std) | $0.34 (std) | $0.06 | $0.40 |
| 107 AI/LLM | ~92K | $0.28 (std) | $0.28 (std) | $0.06 | $0.34 |
| 108 Frontend | ~190K | **SKIPPED** | $0.57 (std) | $0.06 | $0.63 |
| 109 DevOps | ~102K | $0.31 (std) | $0.31 (std) | $0.06 | $0.37 |
| 110 Culture | ~681K | **SKIPPED** | $4.09 | $0.09 | $4.18 |
| 111 Scalability | ~138K | $0.41 (std) | $0.41 (std) | $0.06 | $0.47 |
| 112 Testing | ~262K | **SKIPPED** | $1.57 | $0.09 | $1.66 |

### Aggregate Cost Impact

| Metric | Before (200K limit) | After (1M enabled) | Delta |
|--------|--------------------|--------------------|-------|
| Claude panels per iteration | 7 / 12 | **12 / 12** | +5 panels |
| Claude cost per iteration | ~$2.45 | ~$12.25 | +$9.80 |
| Total 3-model panels | 7 / 12 | **12 / 12** | +5 panels |
| Panels with ICC coverage | 7 (full) + 3 (partial) + 2 (none) | **12 (full)** | Complete |

### Phased Cost Projection (all 3 models, all 12 panels)

| Phase | Iterations | Claude cost | GPT-5.2 cost | Gemini cost | Total (est.) |
|-------|-----------|-------------|-------------|-------------|-------------|
| Pilot 1 | 1 | ~$12 | ~$8 | ~$10 | ~$30 |
| Pilot 2 | 3 | ~$37 | ~$24 | ~$30 | ~$91 |
| Pilot 3 | 6 | ~$74 | ~$48 | ~$60 | ~$182 |
| Phase 4 | 12 | ~$147 | ~$96 | ~$120 | ~$363 |

## Decision Rationale

1. **Statistical completeness is non-negotiable.** The entire point of the multi-model protocol is convergence measurement via ICC. Single-model panels produce unfalsifiable scores. The $9.80/iteration premium buys statistical legitimacy for 5 additional panels (42% of the evaluation surface).

2. **The premium is modest relative to total spend.** Even at Phase 4 (12 iterations), the long-context premium adds ~$50 to a ~$363 total. That's 14% more for 71% more panel coverage on Claude.

3. **Claude is the most important evaluator for this codebase.** The codebase was built with Claude as the primary development tool. Claude's evaluation of code it helped create is a unique data point — it may show systematic biases (positive or negative) that are themselves valuable findings. Excluding it from 5 panels would be a significant methodological gap.

4. **No model change required.** Same API ID, same capabilities, just a header flag. The code change is minimal and backward-compatible.

## Implementation

- `piteval/piteval/models.py`: Claude `context_window` set to `1_000_000`. Added `long_context_threshold=200_000` and premium pricing fields.
- `piteval/piteval/caller.py`: Added `extra_headers={"anthropic-beta": "context-1m-2025-08-07"}` to all Anthropic API calls. Updated `CallResult.cost` to apply premium rates when input exceeds threshold.

## Risks

1. **Beta stability.** The 1M context is in beta. If Anthropic deprecates the beta header, runs would fail for panels requiring >200K. Mitigation: the assembler already falls back to required-only sections, and then to skipping, so failure is graceful.

2. **Quality at long context.** Model performance may degrade at 400K+ tokens compared to 200K. This is actually measurable by our protocol — if Claude's scores become noisier on high-token panels, within-model variance will increase and ICC will decrease, which the signal tier classification will detect automatically.

3. **Tier 4 requirement.** The 1M context beta requires usage tier 4. If the account is not tier 4, the API will reject requests exceeding 200K. The assembler's fallback logic handles this gracefully.
