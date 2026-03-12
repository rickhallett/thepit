# MIGRATION-001: Three Phases, One Chain

**Date:** 2026-03-12
**Author:** Weaver (with Captain's rulings)
**Status:** APPROVED - EXECUTING
**Scope:** Consolidate tspit (Phase 1), noopit (Phase 2), midgets (Phase 3) into a single repository

---

## Decision

Consolidate three repositories into one, preserving all git histories via subtree merge. The product codebase (tspit `wake` branch) is the spine. Phase 2 and Phase 3 histories are brought in as subtree merges, telling the story of R&D sprints that feed back into more disciplined product development.

## Narrative

A product-minded engineer who ships features, runs R&D sprints to sharpen the tools (distilled lexicon, stricter adversarial testing, container-based agent isolation, auditable GUI interaction tooling), then folds those learnings back into product development. The git graph tells that story.

## Source Repositories (READ-ONLY until Phase 8)

| Phase | Repo | Path | GitHub | Commits | Base Branch |
|-------|------|------|--------|---------|-------------|
| 1 | tspit-ARCHIVED | `/home/mrkai/code/repo/tspit-ARCHIVED` | `rickhallett/thepit` | 878 | `wake` |
| 2 | noopit | `/home/mrkai/code/noopit` | `rickhallett/thepit-v2` | 147 | `main` |
| 3 | midgets | `/home/mrkai/code/midgets` | `rickhallett/phantoms` | 97 | `main` |

## Target

| Property | Value |
|----------|-------|
| Working directory | `/home/mrkai/code/thepit` |
| GitHub repo | `rickhallett/thepit-cloud` (new, public) |
| Default branch | `main` |
| Base | tspit `wake` branch (the running product) |

## Rulings (Captain's decisions, 2026-03-12)

1. **Container infra**: Bring Dockerfile, docker-compose, entrypoint, orchestrate.sh, crew/, steer/, tests/ from midgets - keep in `midgets/` subdirectory, not repo root.
2. **Directive files**: Keep `.todo.` in filenames, add `*.todo.*` to .gitignore. These are PR-sensitive and must not be committed to chain. Copy to working directory manually post-migration.
3. **READMEs**: All source repo READMEs updated before committing to chain. Written as cover cards - natural, understated, no slop. Consolidated repo README follows market.todo.md directives.
4. **GitHub remote**: New public repo `thepit-cloud` (or `thepit.cloud` if allowed). Not force-push to existing.
5. **coding-agent**: Remove from noopit before subtree add. Not our work.
6. **Ebook**: Comes along in `build/ebook/`.
7. **This plan**: Committed to chain as `docs/decisions/MIGRATION-001.md`.
8. **Pitkeel**: Keep both. Go version stays as `pitkeel/`. Python version renamed to `pitkeel-py/` with sub-README explaining its phase context. Whichever is used in product dev gets adjusted per market directives.
9. **SPEC/EVAL/PLAN**: tspit product versions stay at root. midgets versions go to `docs/spec/`.

---

## Phase 0: SNAPSHOT

Capture state of all three repos before any modification.

**Actions:**
- Record HEAD SHA on every branch for all three repos
- Record remote URLs and working tree status
- Record total commit counts
- Write to `docs/internal/migration-snapshot-2026-03-12.json`

**Gate:** Snapshot file written and reviewed.

---

## Phase 1: PREPARE

### 1a. Commit uncommitted work in midgets

| File | Action |
|------|--------|
| `bin/slopodar-muster` | Commit (finished tool) |
| `.gitignore` | Commit (todo section) |
| `docs/internal/backlog.yaml` | Commit (BL-012) |
| `docs/decisions/MIGRATION-001.md` | Commit (this plan) |
| `cv.todo.md` | Do NOT commit - PR sensitive, .todo. gitignored |
| `market.todo.md` | Do NOT commit - PR sensitive, .todo. gitignored |
| `so.todo.md` | Do NOT commit - PR sensitive, .todo. gitignored |

Add `*.todo.*` to `.gitignore` before committing. Push to origin.

**Gate:** `git status` clean in midgets (except .todo. files which are gitignored). Pushed.

### 1b. Clean noopit for subtree

Remove vendored coding-agent snapshot (not our work, 427 files).

```bash
cd /home/mrkai/code/noopit
git checkout -b clean-for-merge
git rm -r docs/research/pi/coding-agent/
git commit -m "chore: remove vendored coding-agent snapshot before consolidation

Not our work. 427 files, ~5MB. Removing before subtree merge
into consolidated repo per MIGRATION-001."
```

Subtree add will use `clean-for-merge` branch, not `main`. noopit's `main` stays untouched.

**Gate:** `clean-for-merge` branch exists, coding-agent removed, commit clean.

### 1c. Verify noopit state

Handle dirty symlinks in `.opencode/agents/` (typechanged files). Stash or commit.

**Gate:** Working tree clean or accounted for on `clean-for-merge`.

### 1d. Update source repo READMEs

Write cover-card READMEs for all three source repos before subtree adds capture them. Natural register, understated, no slop. Written as if informing the Captain personally of the repo's contents.

- tspit: commit README update on `wake` branch
- noopit: commit README update on `clean-for-merge` branch
- midgets: commit README update on `main`

**Gate:** All three READMEs updated, committed, pushed.

### 1e. Verify tspit `wake` gate

```bash
cd /home/mrkai/code/repo/tspit-ARCHIVED
git checkout wake
git pull origin wake
pnpm install
pnpm run typecheck && pnpm run lint && pnpm run test
```

**Risk:** Dependencies may have drifted. Node >=24 required. Neon database branch must be accessible.

**Gate:** Exit 0 on full test suite. If it fails, fix on wake before proceeding.

---

## Phase 2: CLONE + BRANCH

```bash
git clone /home/mrkai/code/repo/tspit-ARCHIVED /home/mrkai/code/thepit
cd /home/mrkai/code/thepit
git checkout wake
git checkout -b main
```

Verify product code is present: `ls app/ lib/ components/ tests/ package.json`

**Gate:** Gate passes on `main`. Product runs.

---

## Phase 3: SUBTREE ADD

Chronological order: Phase 2 first, then Phase 3.

```bash
cd /home/mrkai/code/thepit

# Phase 2 (noopit) - use clean-for-merge branch
git remote add phase2-noopit /home/mrkai/code/noopit
git fetch phase2-noopit
git subtree add --prefix=archive/phase2-noopit phase2-noopit/clean-for-merge \
  -m "chore: subtree merge phase 2 (noopit) - governance evolution, 147 commits

R&D sprint: lexicon distillation from naval narrative roots, cross-disciplinary
thinking formalised, adversarial review pipeline (darkcat alley), multi-model
ensemble review, pitkeel rewrite (Go to Python), context engineering vocabulary.
Session decisions SD-278 to SD-321."

# Phase 3 (midgets)
git remote add phase3-midgets /home/mrkai/code/midgets
git fetch phase3-midgets
git subtree add --prefix=archive/phase3-midgets phase3-midgets/main \
  -m "chore: subtree merge phase 3 (midgets) - research validation, 97 commits

R&D sprint: slopodar cross-model sweep (3 model families, 3108 instances,
3 confirmed new patterns), container-based agent isolation with auditable
GUI interaction tooling, bootcamp educational content, ebook.
97 commits of disciplined research feeding back into product practices."
```

### Post-subtree verification

```bash
git log --oneline archive/phase2-noopit/ | head -5
git log --oneline archive/phase3-midgets/ | head -5
git log --oneline --first-parent | head -10
git log --all --oneline | wc -l  # expect ~1122
```

**Gate:** SHA comparison matches Phase 0 snapshot. All histories present.

---

## Phase 4: GOVERNANCE REPLACEMENT

Manifest-driven. Extract Phase 3 files to proper locations in the product tree.

### A. Core Governance (overwrite Phase 1 versions)

| Source (archive/phase3-midgets/) | Destination | Action |
|----------------------------------|-------------|--------|
| AGENTS.md | AGENTS.md | Overwrite |
| CLAUDE.md | CLAUDE.md | Overwrite (recreate symlink) |
| .claude/agents/*.md | .claude/agents/*.md | Overwrite (12 files) |
| SPEC.md | docs/spec/SPEC-midgets.md | Preserve as reference |
| EVAL.md | docs/spec/EVAL-midgets.md | Preserve as reference |
| PLAN.md | docs/spec/PLAN-midgets.md | Preserve as reference |

### B. Internal Governance (Phase 3 wins on conflict)

| Source | Destination |
|--------|-------------|
| docs/internal/session-decisions.md | docs/internal/session-decisions.md |
| docs/internal/session-decisions-index.yaml | docs/internal/session-decisions-index.yaml |
| docs/internal/slopodar.yaml | docs/internal/slopodar.yaml |
| docs/internal/lexicon.md | docs/internal/lexicon.md |
| docs/internal/layer-model.md | docs/internal/layer-model.md |
| docs/internal/backlog.yaml | docs/internal/backlog.yaml |
| docs/internal/mode-larp.md | docs/internal/mode-larp.md |
| docs/internal/the-gauntlet.md | docs/internal/the-gauntlet.md |
| docs/internal/dead-reckoning.md | docs/internal/dead-reckoning.md |
| docs/internal/l12-affective-dynamics.md | docs/internal/l12-affective-dynamics.md |
| docs/internal/events.yaml | docs/internal/events.yaml |
| docs/internal/boot-sequence.md | docs/internal/boot-sequence.md |
| docs/internal/archaeology-*.md | docs/internal/ |
| docs/internal/weaver/* | docs/internal/weaver/ |
| docs/internal/strategy/* | docs/internal/strategy/ |
| docs/internal/research/* | docs/internal/research/ |

### C. Tools and Scripts

| Source | Destination |
|--------|-------------|
| bin/slopodar-sweep | bin/slopodar-sweep |
| bin/slopodar-muster | bin/slopodar-muster |
| bin/triangulate | bin/triangulate |
| bin/slopmop | bin/slopmop |
| bin/qa-progress | bin/qa-progress |
| bin/midgetctl | bin/midgetctl |
| bin/diagrams | bin/diagrams |
| bin/ebook-prep | bin/ebook-prep |
| bin/hugo-convert-bootcamp | bin/hugo-convert-bootcamp |
| bin/bootcamp-quiz | bin/bootcamp-quiz |
| bin/assemble-adversarial | bin/assemble-adversarial |
| bin/dispatch-adversarial | bin/dispatch-adversarial |
| bin/generate-adversarial-dispatches | bin/generate-adversarial-dispatches |
| scripts/backlog.py | scripts/backlog.py |
| scripts/pitcommit.py | scripts/pitcommit.py |
| scripts/slopticopter.py | scripts/slopticopter.py |
| scripts/voice-log.py | scripts/voice-log.py |
| scripts/slopodar-muster.py | scripts/slopodar-muster.py |
| scripts/pitask.py | scripts/pitask.py |
| scripts/darkcat.md | scripts/darkcat.md |
| scripts/darkcat-synth.md | scripts/darkcat-synth.md |
| mk/darkcat.mk | mk/darkcat.mk |
| mk/gauntlet.mk | mk/gauntlet.mk |
| mk/polecats.mk | mk/polecats.mk |
| Makefile | Makefile |
| pitkeel/ (Python) | pitkeel-py/ (with sub-README) |

### D. Container Infrastructure (subdirectory)

| Source | Destination |
|--------|-------------|
| Dockerfile | midgets/Dockerfile |
| docker-compose.yaml | midgets/docker-compose.yaml |
| entrypoint.sh | midgets/entrypoint.sh |
| orchestrate.sh | midgets/orchestrate.sh |
| crew/* | midgets/crew/* |
| steer/* | midgets/steer/* |
| tests/* | midgets/tests/* |
| assets/* | midgets/assets/ |

### E. Content and Research

| Source | Destination |
|--------|-------------|
| docs/bootcamp/ | docs/bootcamp/ |
| docs/field-notes/ | docs/field-notes/ |
| docs/decisions/* | docs/decisions/ (merge) |
| docs/operator/voice/ | docs/operator/voice/ (transcripts only) |
| docs/diagrams/ | docs/diagrams/ |
| docs/examples/ | docs/examples/ |
| sites/oceanheart/ | sites/oceanheart/ (overwrite - Phase 3 has latest) |
| data/sweep/aggregate.yaml | data/sweep/aggregate.yaml |
| data/alley/ | data/alley/ |
| data/signal-test/ | data/signal-test/ |
| build/ebook/ | build/ebook/ |
| evidence/ | evidence/ |
| slopodar-v2.yaml | slopodar-v2.yaml |

### F. Excluded from extraction

| Source | Reason |
|--------|--------|
| data/sweep/corpus/ | Bulk input, 12MB, gitignored |
| data/sweep/responses/ | Bulk output, 6.4MB, gitignored |
| docs/research/pi/coding-agent/ | Already removed from noopit clean-for-merge |
| *.todo.* files | PR sensitive, gitignored, copy manually |

### Commit

```
chore: consolidate phase 2-3 governance and tooling into product repo

- AGENTS.md, agent files, lexicon, layer model, slopodar (43 entries)
- Session decision chain (SD-001 to SD-321)
- Adversarial review tooling (darkcat, triangulate, slopodar-sweep)
- Pitkeel (Python, renamed pitkeel-py/), backlog CLI, voice-log tools
- Midgets container infrastructure (midgets/ subdirectory)
- Bootcamp content, research data, ebook
- Hugo site (oceanheart.ai) with bootcamp and slopodar browser
- Market sprint directives (gitignored, PR sensitive)

Phase 1 governance preserved in git history.
Phase 2-3 histories accessible via git log --all.
```

**Gate:** Files in place. No broken symlinks. Product code untouched.

---

## Phase 5: CLEANUP

### Remove archive working trees

```bash
git rm -r archive/
git commit -m "chore: remove archive working trees post-extraction

Subtree histories preserved in git graph. Accessible via:
  git log --all -- archive/phase2-noopit/
  git log --all -- archive/phase3-midgets/"
```

### Remove temporary remotes

```bash
git remote remove phase2-noopit
git remote remove phase3-midgets
```

### Consolidate .gitignore

Add entries from all three repos:
```
*.todo.*
data/sweep/corpus/
data/sweep/responses/
*.wav
.gauntlet/
.done/
.logs/
.next/
node_modules/
```

### Write consolidated README

Product-first README per market.todo.md directives. What The Pit is, how to run it, tech stack, architecture, the R&D context as depth-2.

### Write pitkeel-py/README.md

Explain: Python rewrite of pitkeel developed during Phase 2-3 R&D. Session analysis, context depth distribution, velocity tracking. Go version (pitkeel/) is the product version.

**Gate:** `git status` clean. No orphaned files.

---

## Phase 6: GATE

```bash
cd /home/mrkai/code/thepit
pnpm install
pnpm run typecheck && pnpm run lint && pnpm run test
```

**Expected risks:**
- Makefile references paths that don't exist in tspit structure
- Governance markdown files in lint scope
- pitkeel-py/ Python files in TS lint scope (should be excluded)
- Go workspace (go.work) may need updating

Fix each issue with a clear commit. Do not proceed until green.

**Gate:** Exit 0. Non-negotiable.

---

## Phase 7: REMOTE

### Create new GitHub repo

```bash
gh repo create rickhallett/thepit-cloud --public --description "The Pit - AI debate arena. Product, governance, and research in one chain."
```

If dot not allowed in repo name, use `thepit-cloud`.

### Push

```bash
cd /home/mrkai/code/thepit
git remote remove origin  # remove tspit remote
git remote add origin git@github.com:rickhallett/thepit-cloud.git
git push -u origin main
```

### Set default branch and verify

```bash
gh repo edit rickhallett/thepit-cloud --default-branch main
git log --oneline -5
git log --all --oneline | wc -l
```

**Gate:** Remote matches local. All histories present.

---

## Phase 8: ARCHIVE

### Update source repos

Update READMEs (already done in Phase 1d) and mark as archived:

```bash
gh repo edit rickhallett/thepit --description "ARCHIVED Phase 1 - consolidated into thepit-cloud"
gh repo edit rickhallett/thepit-v2 --description "ARCHIVED Phase 2 - consolidated into thepit-cloud"
gh repo edit rickhallett/phantoms --description "ARCHIVED Phase 3 - consolidated into thepit-cloud"
```

### Copy .todo. files to new working directory

```bash
cp /home/mrkai/code/midgets/cv.todo.md /home/mrkai/code/thepit/cv.todo.md
cp /home/mrkai/code/midgets/market.todo.md /home/mrkai/code/thepit/market.todo.md
cp /home/mrkai/code/midgets/so.todo.md /home/mrkai/code/thepit/so.todo.md
```

These are gitignored and stay local.

**Gate:** All three GitHub repos point to thepit-cloud. .todo. files present locally. Migration complete.

---

## Rollback

| Phase | Rollback |
|-------|----------|
| 0-6 | Delete `/home/mrkai/code/thepit`. Source repos untouched. |
| 7 | Delete GitHub repo `thepit-cloud`. Source repos untouched. |
| 8 | Re-edit GitHub descriptions on source repos. |

---

## Estimated Timeline

| Phase | Time |
|-------|------|
| 0: SNAPSHOT | 5 min |
| 1: PREPARE | 20-40 min (gate verification is the unknown) |
| 2: CLONE+BRANCH | 5 min |
| 3: SUBTREE ADD | 10 min |
| 4: GOVERNANCE | 30-45 min |
| 5: CLEANUP | 15 min |
| 6: GATE | 10-30 min |
| 7: REMOTE | 5 min |
| 8: ARCHIVE | 10 min |
| **Total** | **~110-165 min** |
