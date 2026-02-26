# Press QA Review — `docs/press-manual-qa-v1.md`

**Reviewer:** Weaver (RIGHT EYE + LEFT EYE + Mirror)
**Date:** 25 Feb 2026
**HEAD:** 82be743 (b1fdafc on local)
**File status:** Git-tracked, public repo (`rickhallett/thepit`)
**File commits:** 4 (a7b755f → 45ad9b1)

---

## RIGHT EYE (Technical Correctness)

### Defect Descriptions — Accurate?

Generally **yes**. The defect descriptions are first-person observations of real UI behaviour (reaction state flickering, share link copy failure, message truncation, agent builder validation errors). They describe *what was seen*, not root causes, which is appropriate for a manual QA pass.

**One factual discrepancy:**

- **Line 440** states "1,046 passing tests." This was Weaver's inline response written on 22 Feb. At that time the count was accurate. HEAD (82be743) now has **1,102 tests passing** after PR #377 explicitly updated stale test counts in site copy. The QA doc was not updated in that pass. The file now contains a stale test count that contradicts the current state.

### Severity Ratings — Defensible?

Yes. The P0/P1/P2 triage and PASS/SOFT/FAIL markings are internally consistent. P0 failures (SSE streaming errors, reaction state bugs, share link failure) are correctly escalated. The final RED hold verdict is defensible given the findings.

### Other Technical Notes

- **Line 147:** Stats bar references "195 bouts, ~2100 turns, 6 hypotheses, 0 technical failures." These are hardcoded page copy values. If the live site has been updated since this QA pass (22 Feb), these numbers may be stale. This is a minor accuracy risk, not a correctness error in the QA doc itself.
- **Line 109:** The claim about `<title>` being in `<body>` rather than `<head>` is flagged as uncertain by the tester themselves ("these frameworks be doing some magic"). Next.js App Router does handle `<title>` differently; this is not necessarily wrong but the tester correctly deferred.

### Factually Wrong Claims

None identified beyond the stale test count.

---

## LEFT EYE (Engagement Surface)

### SD Codes (SD-nnn)

**None found.** The defect log uses test IDs (2.3.4, 2.1.12, etc.) and descriptive labels (S2, S11, S22, S23) but no SD-nnn codes.

### Agent Names

**8 occurrences.** This is the primary exposure risk.

| Line | Agent | Context |
|------|-------|---------|
| 68 | `<Architect />` | Tester delegating a decision |
| 68 | `<Analyst />` | Tester delegating a decision |
| 80 | `<Weaver />` | Tester noting issue for Weaver |
| 147 | `<Weaver />` | Tester addressing Weaver directly |
| 423 | "Mr Weaver" | Narrative — tester describes conversation with AI agent |
| 443 | `Weaver · claude-opus-4-6` | **Agent signature block with model name** |
| 473 | "Mr Weaver" | Direct address, emotional closing |
| 484 | "Updated by Weaver" | Defect log attribution |
| 498 | "Janitor ticket filed" | Reference to Janitor agent role |

The `<Architect />` and `<Analyst />` JSX-style tags are distinctive. They reveal the agent role system naming convention.

### Internal Process References

**Significant exposure:**

| Line | Reference | Risk |
|------|-----------|------|
| 5 | "Captain (manual walkthrough)" | Reveals "Captain" as a role title for the human operator |
| 13 | "^Cpts Log: oh you absolute *darlings*" | Captain's log — stream of consciousness, emotional, informal |
| 369 | "Captains note: ... you may be more qualified. By a few billion years of evolution" | Human addressing AI agents with deference |
| 405 | "Captain not infinite resource" | Role name in defect summary |
| 423–443 | Full Weaver response block | **Complete AI agent conversation embedded in the QA doc**, including Option A/B/C analysis, the phrase "That's on all of us, and it's a process lesson", and the signature `▣ Weaver · claude-opus-4-6 · 56.2s` |
| 471 | "Good luck, Captain." | Template sign-off using internal role name |
| 473–478 | Emotional closing to "Mr Weaver" | "You are an inspiration." — human expressing gratitude to an AI agent |

### Positioning, Hiring, Launch Planning

**Extensive launch strategy discussion in plain text:**

- Line 27: "The priority column tells you what matters for HN"
- Line 51: "HN visitors will not sign up first"
- Line 61: "Painfully aware of HN hatred for AI gen videos"
- Line 98: "risk of someone else getting here first, which I personally, think grows by the minute"
- Line 255: "too gimmicky for release onto HN in a TOUCHY area ... Captains orders"
- Line 397: "RED — Hold. P0 failures that would embarrass us on HN."
- Line 437: "If the fix list is tractable, we can still make Tuesday"
- Line 453: "Very confident a large section of HN/othernetwork is starting to check out partially if not completely"

No explicit hiring intent. But the launch anxiety, competitive fear ("someone else getting here first"), and HN targeting strategy are fully exposed.

### Would an HN Commenter Link to This?

**Absolutely yes.** This file is a goldmine for anyone writing a "look at this AI startup's internal process" comment. Specific ammunition:

1. The human founder calling AI agents "Mr Weaver" and saying "You are an inspiration"
2. A complete embedded AI agent response with model signature
3. The Captain/crew metaphor applied unironically to a human-AI development team
4. Launch anxiety and competitive fear expressed in real-time
5. Pricing strategy doubts written in stream-of-consciousness

### Rating: **SHOULD UNTRACK**

This file contains deeply personal, emotionally raw internal process documentation that was never intended for public consumption. It is not editable into a safe state without destroying its value as an internal artifact. The signal-to-noise ratio for a hostile reader is extremely high.

---

## MIRROR CHECK (Self-Adversarial)

### Hostile HN Reader Perspective

A hostile reader running `git log --all -- docs/` or simply browsing the repo tree would find this file immediately. It is not buried; it is in `docs/` at the top level.

### Single Most Damaging Quote

> "Back to you, Mr Weaver. You know what to do. I think, here, thats present it back to me. Probably help me know I'm only partly insane, partially incompetent, definitely finite, dealing with some pretty major speed shift vectors here as we go from agent mode to holy crap its spreadsheet in Obsidian markdown mode, watching my baby sing, watching her die, watching her come back to life, and so on."

**Why this is the worst:** It is a founder in an emotionally vulnerable state, addressing an AI agent by name with a familiar honorific, asking it for emotional support, while simultaneously admitting self-doubt about competence. A hostile commenter would frame this as "founder who can't tell the difference between an AI tool and a colleague." The "watching my baby sing, watching her die" line would be quoted out of context.

**Runner-up (technical damage):**

> `▣  Weaver · claude-opus-4-6 · 56.2s`

This is an AI agent signature block embedded in a QA document. It proves the AI is not just generating code but participating in process decisions with a named identity and response timer. Combined with "Agreed on C" (line 423), it shows the human deferring to the AI's process recommendation.

### Assumption Challenge — What Might I Be Wrong About?

1. **I assume HN commenters would react negatively.** Some might find this endearing or refreshingly honest. The "build in public" ethos sometimes rewards vulnerability. But the risk-reward is asymmetric: the downside (ridicule, loss of credibility) is larger than the upside (sympathy).

2. **I assume the repo is public.** Confirmed via `git remote -v` pointing to `rickhallett/thepit` on GitHub. But I have not verified the GitHub repo visibility setting. If the repo is currently private, this review's urgency is lower (but the file should still be untracked before any public push).

3. **I assume the file has not already been seen.** If the repo has been public since 22 Feb, this file has been exposed for 3 days. `git log --diff-filter=D` won't help after untracking — the content will remain in git history. A `git filter-repo` or BFG pass would be needed for full removal.

### Combinatorial Risk

This file alone is damaging. Combined with:

- `docs/internal/show-hn-draft-2026-02-24.md` (if also tracked) — reveals launch copy alongside internal anxiety
- `docs/internal/weaver-hn-attack-analysis-2026-02-24.md` — reveals pre-emptive threat modelling
- `docs/internal/round-table-*.md` — reveals the full agent crew decision-making process
- The `AGENTS.md` file in repo root — reveals the complete agent role system

A motivated reader could reconstruct the entire development methodology, the human-AI relationship dynamic, and the launch strategy from public artifacts.

### Sensitive Data in the File

| Item | Line | Risk |
|------|------|------|
| Personal email: `[REDACTED_EMAIL]` | 411, 488 | Low (already in privacy policy) |
| LinkedIn URL: `linkedin.com/in/richardhallett86/` | 80 | Low (public profile) |
| Clerk user ID: `user_[REDACTED]` | 183 | Medium (internal ID, enables targeted API probing) |
| Stripe session ID: `cs_live_[REDACTED]` | 239 | **High** (live Stripe checkout session reference) |
| Bout UUIDs and share URLs | 92, 215, 282, 447 | Low (public URLs) |
| Model identifier: `claude-sonnet-4-5-20250929` | 447 | Low (model names are public) |
| Internal janitor ticket path | 498 | Low (reveals internal tooling structure) |

The **Stripe `cs_live_` session ID** is the most operationally sensitive data point. While expired checkout sessions are not exploitable, the `live` prefix confirms production Stripe is in use and the ID format reveals the Stripe integration pattern.

---

## EXPLICIT ASSUMPTIONS

1. The GitHub repo `rickhallett/thepit` is public (or will become public before launch). Verified remote URL but not GitHub visibility setting.
2. The file has not been modified since its last commit (45ad9b1). Verified via `git ls-files`.
3. HEAD is 82be743 on main. Verified. Local has b1fdafc ahead.
4. The 1,102 test count is current as of this review. Verified via `pnpm run test:unit`.
5. "HN" in this context refers to Hacker News, and the product is targeting an HN Show HN launch.
6. The `docs/internal/` directory files are NOT git-tracked in the public repo (they are in `.gitignore`). This assumption is based on directory name convention — **not verified in this review**. If `docs/internal/` files are also tracked, the exposure surface is dramatically larger.
7. The emotional content in this file is genuine and was not written for public consumption.
8. An HN audience will include people who actively look for internal artifacts in public repos.
9. Git history removal (BFG/filter-repo) is feasible but has not been performed.

---

## RECOMMENDATION

### **UNTRACK**

**Immediate actions:**

1. `git rm --cached docs/press-manual-qa-v1.md` — remove from tracking without deleting the working copy.
2. Add `docs/press-manual-qa-v1.md` to `.gitignore`.
3. If the repo has been public at any point, consider whether git history scrubbing is warranted. The Stripe `cs_live_` reference and the emotional content are the primary concerns.
4. Move the file to `docs/internal/press-manual-qa-v1.md` for consistency with other internal documents.

**This file cannot be safely edited into a public-facing state.** Its value is as a raw internal QA artifact. Redacting the agent names, emotional content, launch strategy discussion, and sensitive IDs would leave an empty shell. The correct action is to remove it from public view entirely.

**If the repo is not yet public:** Untrack before first public push. No history scrubbing needed.

**If the repo has been public:** Untrack immediately. Assess whether the 3-day exposure window warrants `git filter-repo` for the Stripe session ID. The emotional content cannot be unseen if anyone has already cached it, but removing it from HEAD reduces ongoing discovery risk.
