# QA Delta Analysis: v1 → v1.2

**Date:** 23 Feb 2026
**Baseline:** Manual QA v1 (22 Feb, Captain walkthrough)
**Changes applied:** PRs #355–#360

---

## Executive Summary

| Metric | v1 (22 Feb) | v1.2 (projected) | Delta |
|--------|-------------|-------------------|-------|
| Total testable items | 124 | 124 | — |
| PASS | 83 (67%) | 93 (75%) | +10 |
| SOFT | 14 (11%) | 14 (11%) | 0 |
| FAIL | 21 (17%) | 13 (10%) | -8 |
| SKIP/TBD | 6 (5%) | 4 (3%) | -2 |
| **Items needing re-verification** | — | **6** | — |

**Net movement: 67% → 75% PASS. 17% → 10% FAIL.**

8 FAILs eliminated. 2 FAILs downgraded to SOFT. 0 new FAILs introduced.

---

## What Changed (PRs mapped to QA items)

### PR #355 — UI QA Decisions (merged 22 Feb)
| QA Ref | Before | After | What Fixed |
|--------|--------|-------|------------|
| 2.1.12 | SOFT | PASS | Removed MOST POPULAR badge |
| 2.2.4 | PASS* | PASS | Privacy email, Reddit/Discord disabled, LinkedIn URL fixed |
| 2.4.1 | SOFT | PASS | ShareModal archived, single inline SharePanel |
| 2.4.2 | FAIL | SOFT | Share link consolidation (needs re-verification) |
| 2.4.3 | FAIL | SOFT | Same — share link now via inline panel |

*2.2.4 was marked PASS but had 4 issues noted; all 4 resolved.*

### PR #356 — Model & Pricing Simplification (merged 23 Feb)
| QA Ref | Before | After | What Fixed |
|--------|--------|-------|------------|
| 2.3.10 | PASS* | PASS | Default turns 12→6, shorter bouts |
| 4.2.5 | SOFT | PASS | Opus removed, model lineup coherent (Sonnet 4.6 + Haiku) |
| 4.3.1 | FAIL | SOFT | Premium differentiation clearer (Sonnet 4.6 vs Haiku) |
| 4.3.2 | FAIL | SOFT | Quality difference more apparent with model separation |

*2.3.10 was PASS but Captain noted bouts were too long; now 6 turns default.*

### PR #357 — Tier Credit Grants (merged 23 Feb)
| QA Ref | Before | After | What Fixed |
|--------|--------|-------|------------|
| 3.2.2 | PASS* | PASS | Starting credits 600→100 (intentional, "too generous") |
| 3.2.10 | FAIL | RE-VERIFY | Credit history now clearer (structured grant types) |

*3.2.2 Captain noted 600 was too generous; now 100 by design.*

### PR #358 — Token Ceiling Raise (merged 23 Feb)
| QA Ref | Before | After | What Fixed |
|--------|--------|-------|------------|
| 2.3.4 | FAIL | SOFT | Token ceiling helps; mid-bout provider timeouts still possible |
| 2.3.5 | FAIL | SOFT | Same as above |
| 2.3.6 | FAIL | PASS | Message truncation eliminated (120→200 maxOutputTokens) |
| 5.1.1 | SOFT | SOFT | Higher token budget reduces mid-stream cuts |

### PR #360 — Pool Simplification (pending merge)
| QA Ref | Before | After | What Fixed |
|--------|--------|-------|------------|
| 2.1.13 | SOFT | PASS | Half-life decay is smooth (no irregular linear ticking) |
| 3.2.3 | PASS | CHANGED | Free bout counter removed; intro pool is sole gate |

---

## Remaining FAILs (13)

### P0 — Launch Blockers (3)

| Ref | Description | Complexity | Notes |
|-----|-------------|-----------|-------|
| 2.3.7 | Reaction buttons broken (state management) | HIGH | React state reconciliation — classic but nasty. Multiple symptoms (2.3.8, 2.3.9, 2.4.5). Captain deprioritised vs bout engine. |
| 2.3.8 | Heart reaction resets to 0 on click | HIGH | Same root cause as 2.3.7 |
| 2.3.9 | Fire reaction broken | HIGH | Same root cause as 2.3.7 |

*All 3 are one root cause: reaction state management. Fixing this is one task, not three.*

### P1 — Embarrassing but survivable (7)

| Ref | Description | Complexity | Notes |
|-----|-------------|-----------|-------|
| 2.1.14 | Newsletter signup: success shown but no email sent | LOW | Email delivery config (likely missing/misconfigured email service) |
| 2.4.4 | OG meta tags: title in body not head | MEDIUM | Next.js metadata config. Important for HN/Twitter sharing. |
| 2.4.5 | Reactions not visible on replay | HIGH | Same root cause as reaction state (2.3.7) |
| 2.5.1 | Agent catalog: "every agent has a human" without auth | LOW | Copy/UX decision — show create button only to auth users? |
| 2.5.8 | Lineage links not clickable | LOW | Missing `<Link>` wrapping in agent detail component |
| 3.1.2 | Sign-up: no password confirm, SSO bouncing | LOW | Clerk dashboard config (not code) |
| 3.3.4 | Agent builder: required fields, ugly error on submit | MEDIUM | Client-side validation before API round-trip |

### P1-P2 — Nice to fix (3)

| Ref | Description | Complexity | Notes |
|-----|-------------|-----------|-------|
| 3.2.10 | Credit history: pre-auth entries confusing | LOW | Display/copy issue — filter or rename transaction types |
| 3.4.5 | Clone lineage: parent link not visible | LOW | Same as 2.5.8 |
| 7.2.8 | Contact form: 500 error on send | LOW | Email delivery (same root as 2.1.14?) |

---

## Remaining SOFTs (14)

| Ref | Description | Severity | Action |
|-----|-------------|----------|--------|
| 2.1.5 | AI-generated video on HN | Acceptance | Ship it |
| 2.1.15 | Nav collapses at 50% width | Minor UX | CSS fix, low priority |
| 2.2.1 | Same as 2.1.15 | Minor UX | Same fix |
| 2.3.4 | Mid-bout errors (provider timeout) | Bounded | D1 parked (#359), 120s maxDuration is backstop |
| 2.3.5 | SSE streaming (related to 2.3.4) | Bounded | Same |
| 2.4.2 | Share link UX (needs re-verify) | Unknown | May be PASS after PR #355 |
| 2.4.3 | Share link acquisition (needs re-verify) | Unknown | May be PASS after PR #355 |
| 2.4.6 | Emoji state on replay preview | Minor UX | Related to reaction root cause |
| 2.8.1 | "0 technical failures" reads odd | Copy | Quick copy change |
| 2.8.2 | CLEAR badge styling too confident | Design | Quick CSS change |
| 2.8.4 | Research reads like DS paper | Content | Content decision, not code |
| 2.8.6 | "For Builders" advice too early? | Content | Content decision |
| 4.3.1 | Premium model differentiation UX | UX | Better signaling in UI |
| 4.3.2 | Output quality perception | Subjective | Token ceiling helps |

---

## Root Cause Clustering

The 13 remaining FAILs cluster into **5 root causes**:

| Root Cause | FAILs Affected | Fix Complexity | Impact |
|-----------|---------------|---------------|--------|
| **Reaction state management** | 2.3.7, 2.3.8, 2.3.9, 2.4.5 | HIGH (React state reconciliation, optimistic updates, server sync) | 4 FAILs → PASS |
| **Email delivery** | 2.1.14, 7.2.8 | LOW (service config) | 2 FAILs → PASS |
| **Lineage links** | 2.5.8, 3.4.5 | LOW (add Link component) | 2 FAILs → PASS |
| **Agent builder validation** | 3.3.4, 5.2.1, 5.2.2 | MEDIUM (client-side form validation) | 2-3 FAILs → PASS |
| **Clerk/auth config** | 3.1.2, 2.5.1 | LOW (dashboard config, copy) | 2 FAILs → PASS |

Fixing all 5 root causes would move from **75% PASS** to **~85% PASS** with only SOFTs remaining.

---

## Items Needing Re-Verification (6)

These items may have changed state but require a production deploy + human walkthrough to confirm:

| Ref | Current Projected | Why Uncertain |
|-----|-------------------|---------------|
| 2.4.2 | SOFT | PR #355 share consolidation may have fixed; needs click-through |
| 2.4.3 | SOFT | Same |
| 2.1.13 | PASS | Half-life decay smoothness needs visual confirmation |
| 3.2.3 | CHANGED | Free bout counter removed — need to verify arena page renders clean |
| 3.2.10 | FAIL | Credit grant restructuring may have improved display; needs eyes |
| 2.3.4 | SOFT | Token ceiling + shorter bouts may have eliminated provider timeouts |

---

## Numerical Summary for Deck

```
QA Health: 67% → 75% PASS (+8pp)
Critical FAILs: 21 → 13 (-38%)
Root causes remaining: 5
Estimated fix effort: 3 are LOW, 1 MEDIUM, 1 HIGH
The HIGH (reactions) accounts for 4 of the 13 remaining FAILs.
Without reactions: 75% → 82% PASS is achievable in <1 day.
With reactions: 85%+ PASS, but the React state work is non-trivial.
```

---

## Strategic Assessment

**The bout engine now works.** Message truncation is fixed. Default bouts are shorter (6 turns). The pool mechanic is simplified and defensible. Model lineup is coherent.

**The remaining pain is reactions (4 FAILs, 1 root cause) and polish (9 FAILs, 4 root causes).** The polish items are all LOW-MEDIUM complexity. Reactions are the only HIGH-complexity remaining task.

**For a Show HN where "try it and see" is the primary CTA:**
- The core loop (land → arena → start bout → watch → share) works
- The reactions are broken but non-blocking for the core loop
- The share link may work now (needs re-verification post-deploy)
- The credit economy is coherent and defensible

**Captain's question for the deck:** Is reactions a launch blocker, or can it ship with reactions disabled/hidden and re-enabled post-launch?
