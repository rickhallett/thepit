# Option B: Don't Post. Ship Fixes. Apply For Work.

**Status:** Off chain. For the Captain's contemplation before unplugging.
**Date:** 26 February 2026

---

## The Question

Should you post to Show HN at all? Or should you treat the project as what True North says it is -- a portfolio piece -- clean it up, and take it directly to hiring managers?

This analysis covers: the honest comparison, the git history question, five concrete paths, and what each path costs.

---

## The Honest Comparison

| Dimension | Show HN | Direct Job Application |
|-----------|---------|----------------------|
| **Audience** | Thousands of strangers, 15-second attention | 1-3 evaluators, 5-30 minute attention |
| **Feedback** | Public, permanent, uncontrolled | Private, contained, sometimes given |
| **Outcome if good** | Visibility, connections, possible job leads, community | Job interview, possible offer |
| **Outcome if bad** | Public record of dismissal or concern | Private rejection, no public trace |
| **Outcome if silence** | Obscurity (most likely) | Standard rejection cycle (normal) |
| **What you control** | The post, your first comment, nothing else | The application, the repo state, the framing |
| **What you can't control** | Comments, tone, whether anyone cares | Whether they read past the README |
| **Risk to mental health** | High (public exposure while vulnerable) | Low-medium (normal job search stress) |
| **Time investment** | Post + 6 hours in comments + ongoing | Per-application: 30 min custom, 5 min spray |
| **Reversibility** | Zero. Post is permanent. Thread is permanent. | Full. Each application is independent. |

**Key insight:** Show HN optimises for reach. Job applications optimise for conversion. These are different objectives. True North is "get hired, sharpened by truth first." Reach is a means to that end, not the end itself.

---

## What A Technical Hiring Manager Actually Evaluates

Based on observed patterns across engineering hiring in the 2024-2026 market, ranked by weight:

1. **Can you build things that work?** (40%)
   - Deployed product: YES (thepit.cloud, functional, streaming, payments)
   - Test suite: YES (1,125 passing)
   - Architecture: YES (clean separation, TypeScript strict, proper error handling)

2. **Can you think clearly?** (25%)
   - Research methodology: YES (pre-registered hypotheses, statistical analysis)
   - Technical writing: YES (README, ARCHITECTURE.md, code comments)
   - Problem decomposition: YES (8 Go CLI tools, modular design)

3. **Do you ship?** (15%)
   - 818 commits in 19 days: YES
   - Deployed to production: YES
   - Stripe integration live: YES

4. **Can you work with others?** (10%)
   - This is the gap. Solo project. No PRs from other humans.
   - The governance documentation partially addresses this -- it shows you think about coordination, process, review
   - But it could also read as: built an elaborate simulation of teamwork instead of doing teamwork

5. **Red flags?** (10%)
   - The volume of internal documentation
   - The emotional content in some documents
   - The health references
   - The governance-recursion self-diagnosis
   - SD-194: "It is possible my process complete dogshit"

**The calculus:** Items 1-3 are strong. Item 4 is a gap that HN can't fill (a commenter saying "nice project" is not evidence of collaboration). Item 5 is manageable with cleanup.

---

## The Git History Question

The repo has 818 commits over 19 days. All by one author. The history contains:

**Assets:**
- Clean commit messages (Conventional Commits throughout)
- Clear arc: init → features → research → hardening → governance → honest reckoning
- Evidence of discipline: PR-based workflow even as solo dev
- Evidence of self-correction: "go dark" → "go light" → honest about uncertainty

**Liabilities:**
- Personal files entered git in commits `f5ffff0` and `17c250e` (12 commits ago)
- "go dark on crew definitions" commit (`37f7f7f`) tells a story of hiding
- Health references, partner references, emotional content in internal docs
- SD-194 verbatim ("my process complete dogshit") in the latest commits
- The Hurt Locker, HN attack analysis, and Show HN drafts (if not gitignored before push)
- Commit `c608326`: "remove leaked strategy doc"
- Commit `132600d`: "remove accidentally re-added strategy doc"
- Commit `92ae746`: "resolve GitGuardian secrets"

**Key fact:** `git log --diff-filter=D` shows every file you've ever deleted. Even if HEAD is clean, the history tells the full story. Someone with `git log` and curiosity can reconstruct everything.

### Five Options For History

#### Path 1: Preserve Everything, Clean HEAD Only

**What:** Gitignore personal files, Hurt Locker family, and sensitive docs on HEAD. History remains intact. Anyone who runs `git log --all --diff-filter=D` can find them, but they'd need to actively dig.

**Cost:** 15 minutes of gitignore work.
**Risk:** Low. Most recruiters don't archaeologically excavate git history. Those who do are the kind of engineer you'd want to work with -- they'll see the full arc including the self-correction.
**Integrity:** High. You're not hiding the past; you're curating the present.
**Recommendation:** This is the right path for Option B.

#### Path 2: Interactive Rebase (Squash Sensitive Commits)

**What:** Rebase the last 12 commits (since personal files entered) into fewer, cleaner commits. Remove personal file additions entirely from history.

**Cost:** 30-60 minutes of careful rebasing. Force push required. Any existing branches/PRs invalidated.
**Risk:** Medium. Rewriting published history (if anyone has cloned). Creates a discontinuity in the commit timeline.
**Integrity:** Medium. You're editing history. Not lying (the code is the same), but curating more aggressively than Path 1.
**Concern:** The project's philosophy is transparency. Rewriting history contradicts that.

#### Path 3: BFG Repo Cleaner (Surgical History Scrub)

**What:** Use BFG or `git filter-branch` to remove specific files from all history. The files never existed as far as git is concerned.

**Cost:** 1-2 hours. Force push. All commit hashes change. Every clone is orphaned.
**Risk:** Medium-high. If anyone has already seen the repo (automated bots, CI caches), the old hashes persist somewhere.
**Integrity:** Low. This is rewriting history in the deepest sense. The commits still happened; you're pretending they didn't.
**Concern:** If someone finds the old hashes (GitHub caches, mirrors), this looks worse than the original content.

#### Path 4: Fresh Repo From Current State

**What:** Create a new repo. Copy the current working tree. Add a single "initial commit" or a small number of staged commits. Old repo stays private or is deleted.

**Cost:** 30 minutes.
**Risk:** Low (clean start) but high signal cost. 818 commits becomes 1. The engineering arc disappears.
**Integrity:** Low. You lose the single most impressive thing about the project: that one person wrote 818 disciplined commits in 19 days.
**Concern:** "Where's the git history?" is a question recruiters ask about suspiciously clean repos.

#### Path 5: Keep Repo Private, Share Selectively

**What:** Repo stays private. You share access with specific recruiters/hiring managers via GitHub collaborator invites. They see everything, but only by your invitation.

**Cost:** Zero technical work. Per-application cost: one collaborator invite.
**Risk:** Very low. Exposure is controlled. You can revoke access.
**Integrity:** High. Nothing is hidden or rewritten. Access is gated, which is different from deception.
**Concern:** "Code is open" claim on the site becomes false. The product is live but the source is closed. This changes the framing from "transparent engineer" to "normal private repo."

---

## Recommendation

**Path 1 (clean HEAD, preserve history) + Path 5 (selective sharing) as a hybrid.**

Here is how it works:

1. **Now (before unplugging):**
   - Gitignore personal files (postcaptain, doctor, captain's logs you decide are too personal)
   - Gitignore Hurt Locker family
   - Gitignore HN prep docs (show-hn-drafts, attack analysis)
   - Merge PR #371 (the bug fix stands on its own merit regardless of HN)
   - Fix the typo, fix the README test count
   - Commit this as a clean "pre-portfolio tidying" commit

2. **After the break:**
   - Repo stays private
   - For each job application, decide: share repo access or just share the deployed product URL
   - For strong-fit roles (agentic engineering, AI governance, process-heavy teams): share repo access. The internal docs become a feature, not a bug. SD-134 (truth first) is exactly the kind of signal these teams value.
   - For standard roles (senior frontend, fullstack, etc.): share the deployed product. Link to the public README. The governance story is irrelevant to them.

3. **HN decision deferred, not cancelled:**
   - After applying to jobs and getting some signal back from the market, you'll know whether the project resonates or confuses
   - If the market signal is positive ("your process documentation is fascinating"), then HN becomes lower-risk because you have evidence the framing works
   - If the market signal is negative ("I couldn't tell what this is"), then you know to simplify before going public
   - Either way, you post from a position of data rather than fear

---

## What This Path Preserves

- The full git history (818 commits, the arc, the discipline)
- The deployed product (thepit.cloud, functional, demo mode)
- The research (pre-registered, methodology public on the site)
- The governance documentation (session decisions, round tables) -- visible to those you grant access
- Your control over who sees what and when
- The option to go public later with better framing and fresh eyes

## What This Path Costs

- No HN visibility (for now)
- No crowd feedback (for now)
- No viral moment (probably wasn't going to happen anyway -- base rate)
- The "code is open" claim needs qualifying or removing from copy
- The psychological cost of not posting when you'd built up to it

## What This Path Avoids

- Public exposure while too close to the bare metal
- The silence scenario (Version A) with no recovery
- Personal files being found by strangers
- "Are you OK?" in a public forum
- The feedback loop between fear and urgency
- Posting from a state the Captain himself identified as unreliable for asking for help in the right way

---

## The True North Check

SD-134: truth first. SD-110: get hired.

Path 1+5 serves both:
- Truth: nothing is rewritten, hidden, or lied about. Access is controlled, which is different from deception.
- Hired: the portfolio is deployed, functional, testable, and sharable. The internal docs are available for roles where they matter.

Show HN serves reach but at the cost of control. Job applications serve conversion with full control. True North says conversion.

---

## Before You Unplug

If you want to do the mechanical work now (so it's done when you come back):

1. Merge PR #371: `gh pr merge 371 --squash && git pull && pnpm run typecheck && pnpm run lint && pnpm run test:unit`
2. Gitignore personal + Hurt Locker files (I can do this on your word)
3. Fix typo + README test count (I can do this on your word)
4. One clean commit, push, walk away

Or: walk away now, do it all fresh. Both are valid. The work will be here.

---

*The still point is not a place you go. It's what happens when you stop going.*
