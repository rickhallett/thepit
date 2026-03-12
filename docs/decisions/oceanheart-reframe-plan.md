# Plan: oceanheart.ai Reframe for Market Proof

**Issued by:** Weaver
**Date:** 2026-03-12
**Status:** COMPLETE - executed on feat/slopodar-cv-session-patterns
**Directives consumed:** cv.todo.md, market.todo.md, so.todo.md
**Branch strategy:** planned as feature branch per PR; executed as single branch (deviation noted)
**Execution date:** 2026-03-12
**Post-execution verification:** hugo build green, zero stale identity strings, repo links consistent

---

## Objective

Resequence and reframe oceanheart.ai/cv, oceanheart.ai/about, and the homepage so that a hiring manager answers "senior engineer who ships" within 10 seconds, not "AI researcher who might also code."

No content is deleted. Substance is sound. Ordering is wrong for target audience.

---

## PR Decomposition

4 PRs planned, ordered by impact. Each was 1 concern, mergeable independently, verifiable by `hugo build`.

| PR | Branch | Scope | Files | Priority | Status |
|----|--------|-------|-------|----------|--------|
| 1 | `feat/cv-reframe` | CV page rewrite | `content/cv.md`, `layouts/_default/cv.html` | CRITICAL | COMPLETE (on feat/slopodar-cv-session-patterns) |
| 2 | `feat/about-reframe` | About page rewrite | `content/about.md` | HIGH | COMPLETE (on feat/slopodar-cv-session-patterns) |
| 3 | `feat/homepage-identity` | Homepage + site config alignment | `hugo.toml`, `layouts/index.html` | MEDIUM | COMPLETE (on feat/slopodar-cv-session-patterns) |
| 4 | (post-merge sweep) | Consistency check for stale "Agentic Systems Engineer" strings | any remaining | LOW | COMPLETE - zero stale matches found |

**Deviation from plan:** PRs 1-3 were executed on a single branch rather than decomposed into separate PRs. The work is correct and verified but violated the 1-PR-per-concern decomposition. Noted for future discipline.

---

## PR 1: CV Page Rewrite

**Branch:** `feat/cv-reframe`
**Files:** `content/cv.md`, `layouts/_default/cv.html`
**Verify:** `hugo build` in `sites/oceanheart/`

### 1.1 content/cv.md

COMPLETE. Description updated to "Senior Software Engineer".

### 1.2 layouts/_default/cv.html - Header

COMPLETE. Title changed to "Senior Software Engineer".

### 1.3 layouts/_default/cv.html - Opening paragraph

COMPLETE. Engineering-first rewrite implemented. Leads with "Senior software engineer with 5 years shipping production code..."

### 1.4-1.6 Section reorder

COMPLETE. "How a commit works" moved above "What I built". "What I built" reordered: Deterministic build first, Gauntlet second, Pitkeel third, Slopodar fourth, Bootcamp fifth.

### 1.7 layouts/_default/cv.html - Experience entries expanded

COMPLETE. All entries updated by Operator:
- Oceanheart: "Senior Software Engineer", product-first description, repo link updated to thepit-cloud
- EDITED (2023-2024): Expanded with role description, partnered with backend engineers
- Brandwatch (2021-2023): Monitor project, React components, mentoring
- Telesoft (2020-2021): "Full Stack Engineer", cybersecurity apps, TypeScript/Angular/Node.js
- School Business Services (2019-2020): New entry added, Vue.js
- CBT (2004-2019): Kept with load-bearing bridge narrative

**Operator decisions:** Role dates adjusted from plan draft. School Business Services added (not in original plan).

### 1.8 layouts/_default/cv.html - Technical skills reorder

COMPLETE. Regrouped as: Languages, Frontend, Backend & infrastructure, Testing & quality, AI-augmented development. Conventional skills first, differentiator last. Playwright added to Testing.

---

## PR 2: About Page Rewrite

COMPLETE on `feat/slopodar-cv-session-patterns`.

Changes implemented:
1. Frontmatter description: "senior software engineer"
2. Opening: engineering first, therapy second, connecting insight third
3. The Pit: product-first description (debate formats, credit economy, scoring), then stack, then agentic layer
4. "Slopodar" renamed to "Slop Failure Modes" (external legibility)
5. LinkedIn added to contact section
6. Em-dashes replaced with dashes throughout

---

## PR 3: Homepage + Site Config Alignment

COMPLETE on `feat/slopodar-cv-session-patterns`.

Changes implemented:
1. `hugo.toml` description: "senior software engineer", stack named, The Pit named
2. `index.html` hero subtitle: "Senior software engineer. Shipping production TypeScript, Python, and Go."

---

## PR 4: Post-merge Consistency Sweep

COMPLETE. Executed as post-implementation verification rather than a separate PR.

Results:
- `rg -i "agentic systems engineer" sites/oceanheart/` returned zero matches
- Repo links: all structural links point to `thepit-cloud` (current repo). Historical references to `thepit-v2` in blog posts and `decisions.json` are correct and immutable per SD-266.
- No stale identity framing found.

---

## Operator Input - Resolved

All gaps were filled by the Operator during implementation:

| Item | Resolution |
|------|-----------|
| **Brandwatch role details** | Provided: Monitor project, React components, Backbone modernisation, mentoring |
| **Telesoft role details** | Provided: cybersecurity apps, TypeScript/Angular/Node.js, Python utilities |
| **EDITED expansion** | Provided: data visualisation features, partnered with backend (Python/Django), enterprise clients |
| **The Pit product description** | Confirmed: structured debate formats, credit economy, real-time scoring |
| **Title preference** | Decided: "Senior Software Engineer" |
| **Homepage tagline** | Kept: "earth. lets stop the slop." |

---

## Verification Protocol

Each PR:
1. Branch from main
2. Make changes
3. `hugo build` in `sites/oceanheart/` - must succeed
4. Visual check of rendered pages (hugo server)
5. Gate on main repo: `pnpm run typecheck && pnpm run lint && pnpm run test` (these pages are outside the TS codebase but gate must stay green)
6. PR with description per market.todo.md rules (product language, for external reader)
7. Merge, post-merge verify

---

## Execution Estimate (Actual)

- PRs 1-3 (batched): executed by Operator + agent in prior session
- PR 4 (verification sweep): ~5 agent-minutes
- Plan file update: ~10 agent-minutes
- Total verification pass: ~15 agent-minutes

---

## Risk Assessment (Post-Execution)

| Risk | Status |
|------|--------|
| Overcorrection - strip the distinctive voice | Clear - agentic work preserved at position 2, voice intact |
| Inaccurate role descriptions | Clear - Operator provided all role details directly |
| Hugo build breaks | Clear - `hugo build` green (757 pages, 678ms) |
| SEO/meta description drift | Clear - `head.html` uses `.Description` from frontmatter, all updated |
| Stale cached pages on Vercel | PENDING - verify after merge to main and deploy |
| Repo link inconsistency | Clear - all structural links point to thepit-cloud, historical refs to thepit-v2 are correct |
