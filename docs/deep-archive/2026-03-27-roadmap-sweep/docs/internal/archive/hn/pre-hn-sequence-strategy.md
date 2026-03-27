# Pre-HN Sequence Strategy

**Status:** Off chain. For Captain's O(1) triage on return.
**Date:** 26 February 2026

Each item is one decision: GO / NO / DEFER. No discussion needed. The rationale is here; the Captain approves or rejects.

---

## PHASE 1: CRITICAL (must be done before repo goes public)

### 1.1 Merge PR #371 -- Anonymous Reactions FK Violation

**What:** Live bug. Anonymous users clicking reactions get a 500 error. Fix is written, reviewed, pushed, gate green.
**State:** PR open on `feat/reaction-beast`. 2 commits (original fix + IP hashing). CodeRabbit finding resolved.
**Action:** `gh pr merge 371 --squash` then post-merge verify.
**Risk of not doing:** First HN user who clicks a heart emoji without signing in sees an error. Persona 6 (Security Hawk) writes it up.
**Time:** 5 minutes.
**Decision:** GO / NO

---

### 1.2 Remove Personal Files From Public Path

**What:** `docs/internal/postcaptain/2026-02-23-line-debrief.md` references your partner ("The First Lady"), a domestic boundary negotiation, and "The Line." Captain's logs reference health state (16hrs, not eaten, lightheaded, ketoadaptation).
**Action:** Add to `.gitignore` and `git rm --cached`:
- `docs/internal/postcaptain/`
- `docs/internal/doctor/`
- Any captain's log entries you decide are too personal (review the 4 files in `docs/internal/captain/captainslog/2026/02/`)
**Risk of not doing:** Persona 2 (Archaeologist) finds the partner file. Persona 4 (Concerned Builder) quotes the health state.
**Time:** 10 minutes (mostly your reading time to decide file by file).
**Decision:** GO / NO (per file)

Files to review:
- [ ] `postcaptain/2026-02-23-line-debrief.md` -- RECOMMEND REMOVE (partner, domestic)
- [ ] `captain/captainslog/2026/02/23-fair-winds.md` -- RECOMMEND REVIEW (health refs, but also core project narrative)
- [ ] `captain/captainslog/2026/02/23-the-still-point.md` -- RECOMMEND REVIEW
- [ ] `captain/captainslog/2026/02/24-the-output-is-the-answer.md` -- RECOMMEND REVIEW
- [ ] `captain/captainslog/2026/02/25-the-first-data-point.md` -- RECOMMEND REVIEW

---

### 1.3 Decide on press-manual-qa-v1.md

**What:** The QA review (`press-qa-review-2026-02-25.md`) flagged this file as "never intended for public consumption" and "not editable into a safe state." Contains emotionally raw internal process notes.
**Action:** Either gitignore or accept the risk.
**Risk of not doing:** Persona 2 (Archaeologist) reads it and quotes the raw parts.
**Time:** 5 minutes reading, 1 minute action.
**Decision:** KEEP PUBLIC / REMOVE

---

## PHASE 2: HIGH (should be done before posting)

### 2.1 Fix README Test Count

**What:** README line 79 says `Vitest (1,046)`. Actual count is 1,125 passing (1,146 total, 21 skipped). Site copy says 1,054*. Three different numbers.
**Action:** Update README to match actual count or use the 1,054* with asterisk convention.
**Risk of not doing:** Persona 9 (Copy Editor) counts.
**Time:** 2 minutes.
**Decision:** GO / NO / which number?

---

### 2.2 Fix "This the the" Typo

**What:** `copy/variants/control.json` line 90. Double "the" in hero subheadline.
**Action:** One character deletion.
**Risk of not doing:** Persona 9 again. Mundane embarrassment in a project with a governance apparatus that didn't catch a typo.
**Time:** 1 minute.
**Decision:** GO / NO

---

### 2.3 Decide on HN Prep Docs Visibility

**What:** These files will be visible when the repo goes public:
- `docs/internal/show-hn-draft-2026-02-24.md` (old Show HN draft)
- `docs/internal/show-hn-draft-2026-02-26.md` (new Show HN draft)
- `docs/internal/weaver-hn-attack-analysis-2026-02-24.md` (prepared HN attack responses)
- `docs/internal/the-hurt-locker.md` (this document's sibling)
- `docs/internal/the-hurt-locker-addendum.md` (your verbatim words about needing to unplug)
- `docs/internal/pre-hn-sequence-strategy.md` (this document)

If someone compares your actual HN post to the agent-drafted versions, they see how the sausage was made. The attack analysis shows you pre-scripted responses.

**Options:**
- A: Leave them all public. "Going light" means going light. The transparency is the point.
- B: Gitignore the Hurt Locker family (hurt locker, addendum, this file). Keep the drafts public.
- C: Gitignore all HN prep docs.

**Risk of A:** Persona 2 compares drafts to post, calculates "percentage of human authorship."
**Risk of C:** Contradicts the going-light philosophy. Creates a new "go dark" commit for the archaeologist.
**Risk of B:** Middle ground. The Hurt Locker is personal; the drafts are process.
**Time:** 2 minutes action, however long you need to decide.
**Decision:** A / B / C

---

### 2.4 Decide on "Built in Two Weeks" Claim

**What:** README line 25: "This is v1.0 -- built in two weeks, still improving." The project has been going longer than two weeks.
**Action:** Remove the time claim or update it.
**Time:** 1 minute.
**Decision:** REMOVE / UPDATE TO "___" / KEEP

---

## PHASE 3: MEDIUM (should verify before posting)

### 3.1 Demo Mode Load Test

**What:** If the post gets traction, many people will try the arena simultaneously. In-memory rate limiting per serverless instance means coordination across instances is not guaranteed.
**Action:** Open 5 browser tabs, run 5 simultaneous bouts, verify they all complete.
**Also check:** What happens when the intro pool credits hit zero? Is there a graceful message or does it error?
**Time:** 5 minutes.
**Decision:** GO / DEFER

---

### 3.2 Intro Pool Credit Balance

**What:** Every demo bout costs real money. If the post gets 100 demo users, each running 1-2 bouts, how many credits does the pool have? Will it survive the first hour?
**Action:** Check current balance via pitctl or DB query.
**Time:** 2 minutes.
**Decision:** CHECK / ACCEPT RISK

---

### 3.3 Mobile Spot Check

**What:** README says "Mobile is rough." HN users will try on phones.
**Action:** Open thepit.cloud on a phone. Run a bout. Note what's broken.
**Time:** 5 minutes.
**Decision:** CHECK / ACCEPT AND CAVEAT IN POST

---

## PHASE 4: POST-RETURN (after the break, before posting)

### 4.1 Rewrite the Show HN Post

**What:** The current drafts are agent-scaffolded. The post must be in your voice, written with fresh eyes after the break. The Hurt Locker insight: lead with the product, put the process in the first comment, keep the post under 60 seconds reading time.
**Action:** Write it yourself. Use the drafts as reference. Delete anything that smells like Weaver.
**Time:** Your time, not mine.

---

### 4.2 Make Repo Public

**What:** `gh repo edit --visibility public`. One-way door for git history. Everything in the repo becomes visible. Everything in git history becomes visible.
**Depends on:** Phase 1 complete (personal files removed), Phase 2 decisions made.
**Action:** Single command, irreversible.
**Decision:** After Phase 1 + 2 are resolved.

---

### 4.3 Post

**What:** Submit to HN. Be in the comments. Stay for as long as it takes or as long as it matters.
**Depends on:** Everything above. Fresh eyes. The break having done its job.

---

## TRIAGE SUMMARY

| # | Item | Priority | Time | Your call |
|---|------|----------|------|-----------|
| 1.1 | Merge PR #371 | CRITICAL | 5 min | GO / NO |
| 1.2 | Remove personal files | CRITICAL | 10 min | GO / NO (per file) |
| 1.3 | press-manual-qa-v1.md | CRITICAL | 5 min | KEEP / REMOVE |
| 2.1 | README test count | HIGH | 2 min | GO / NO / which number? |
| 2.2 | Double "the" typo | HIGH | 1 min | GO / NO |
| 2.3 | HN prep docs visibility | HIGH | 2 min | A / B / C |
| 2.4 | "Built in two weeks" | HIGH | 1 min | REMOVE / UPDATE / KEEP |
| 3.1 | Demo load test | MEDIUM | 5 min | GO / DEFER |
| 3.2 | Credit pool balance | MEDIUM | 2 min | CHECK / ACCEPT |
| 3.3 | Mobile spot check | MEDIUM | 5 min | CHECK / ACCEPT |
| 4.1 | Rewrite post | POST-RETURN | yours | -- |
| 4.2 | Repo public | POST-RETURN | 1 min | after 1+2 |
| 4.3 | Post to HN | POST-RETURN | -- | when ready |

Total pre-return mechanical work: ~30 minutes.
Total decisions requiring your judgment: 7.

Phase 1 can be done now or on return. Phase 2 can be done on return. Phase 3 is day-of. Phase 4 is after the break.
