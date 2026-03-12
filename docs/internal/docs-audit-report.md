# Documentation Audit Report

**Date:** 2026-03-12
**Auditor:** polecat/nux
**Bead:** PIT-dkq
**Scope:** Full repo docs audit - staleness, drift, broken links

---

## Executive Summary

Comprehensive audit of thepit repository documentation. Found 27 issues across 6 categories. Most critical: README.md contains outdated prerequisites (Node 22+ vs required 24+). Documentation is generally accurate but shows signs of drift from rapid development.

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| MAJOR | 6 |
| MEDIUM | 8 |
| MINOR | 7 |
| LOW | 5 |

---

## Critical Findings

### C1. README.md Node Version Prerequisite (CRITICAL)

**File:** `/README.md`
**Issue:** README states "node 22+" but .nvmrc specifies 24.13.1 and package.json requires ">=24"
**Impact:** New developers following README will fail setup
**Fix:** Update README prerequisites to "node 24+"

---

## Major Findings

### M1. AGENTS.md: piteval Directory Type Mismatch (MAJOR)

**File:** `/AGENTS.md` (Filesystem Awareness BFS Depth Map)
**Issue:** Listed as `piteval/ -- Go CLI: evaluation` but actually contains Python (pyproject.toml)
**Impact:** Misleading tool classification
**Fix:** Update to `piteval/ -- Python CLI: evaluation`

### M2. README.md Database Table Count Incorrect (MAJOR)

**File:** `/README.md`
**Issue:** Claims "Drizzle ORM (22 tables)" but db/schema.ts has 24 tables
**Impact:** Inaccurate specification
**Fix:** Update to "24 tables"

### M3. README.md Commit Count Misleading (MAJOR)

**File:** `/README.md`
**Issue:** States "1,100+ commits" but current branch shows 6 commits
**Context:** May refer to pilot repo (thepit-pilot) which is separate
**Fix:** Clarify this refers to combined history or update count

### M4. README.md Test Coverage Unverifiable (MAJOR)

**File:** `/README.md`
**Issue:** Claims "1,289 tests | 96% coverage" but no coverage/ directory exists locally
**Reality:** Actual test count is 1,359 (higher than claimed)
**Fix:** Update test count; verify or remove coverage claim

### M5. pitctl/README.md Wrong Tier Names (MAJOR)

**File:** Referenced in `docs/archive/typescript-architecture-review-2026-02-11.md`
**Issue:** CLI examples use `pro`/`team` but schema enforces `['free', 'pass', 'lab']`
**Impact:** CLI examples would fail validation
**Fix:** Update pitctl documentation to use correct tier names

### M6. Spec Files Reference Missing Implementations (MAJOR)

**File:** `docs/specs/reduce-deps.md`
**Issue:** Documents `lib/canonicalize.ts` and `lib/id.ts` as planned but never implemented
**Impact:** Dependency removal task incomplete; nanoid still in use
**Fix:** Either implement the files or update spec status to abandoned/deferred

---

## Medium Findings

### MD1. Broken Internal Link in docs/README.md (MEDIUM)

**File:** `docs/README.md` (line 37)
**Issue:** Link to `examples/echo-signal-protocol-bearing-check.md` but file is at `archive/`
**Fix:**
```diff
- [examples/echo-signal-protocol-bearing-check.md](examples/echo-signal-protocol-bearing-check.md)
+ [archive/echo-signal-protocol-bearing-check.md](archive/echo-signal-protocol-bearing-check.md)
```

### MD2. GitHub Master Branch References (MEDIUM)

**Files:**
- `docs/archive/qa-report.md` (lines 121-124)
- `docs/internal/archive/hn/show-hn-draft-2026-02-26.md` (line 67)

**Issue:** URLs use `/tree/master/` or `/blob/master/` but repo uses `main` branch
**Fix:** Update all GitHub URLs from `/master/` to `/main/`

### MD3. Pilot Project References (MEDIUM)

**File:** `docs/building.md` (lines 36, 59, 61)
**Issue:** References `thepit-pilot` repo which is separate/private precursor
**URLs:**
- `https://github.com/rickhallett/thepit-pilot/pull/325`
- `https://github.com/rickhallett/thepit-pilot/pull/328`
- `https://github.com/rickhallett/thepit-pilot/issues/330`

**Fix:** Remove or add note that these are historical references to pilot repo

### MD4. Broken Anthropic API Documentation Links (MEDIUM)

**Files:**
- `docs/bootcamp/tasks-v/04-research-state-external/findings.md` (line 136)
- `docs/bootcamp/tasks-v/06-research-production-external/findings.md` (line 155)

**Issue:** Links to docs.anthropic.com return 404 (noted in documents themselves)
**Fix:** Update to current documentation URLs or note as archived

### MD5. Decision Files Not Indexed (MEDIUM)

**Files:**
- `docs/decisions/MIGRATION-001.md` (ACTIVE)
- `docs/decisions/oceanheart-reframe-plan.md` (COMPLETE)
- `docs/decisions/trajectory-external-legibility.md` (COMPLETE)

**Issue:** Not discoverable from any index or navigation
**Fix:** Create `docs/decisions/README.md` with table of all decision files

### MD6. Spec Files Not Indexed (MEDIUM)

**Files:**
- `docs/spec/PLAN-midgets.md`
- `docs/spec/SPEC-midgets.md`
- `docs/spec/EVAL-midgets.md`

**Issue:** Preserved per MIGRATION-001 but not linked or documented
**Fix:** Create `docs/spec/README.md` explaining these are archived references

### MD7. Potentially Inactive Subdomains (MEDIUM)

**File:** `docs/archive/agentic-qa-results.md` (lines 102-103)
**URLs:**
- `https://reddit.thepit.cloud`
- `https://discord.thepit.cloud`
- `https://x.thepit.cloud`

**Issue:** May be placeholders or not yet configured
**Fix:** Verify these resolve or remove references

### MD8. Dead Code Reference Marked Stale (MEDIUM - Informational)

**File:** `docs/internal/weaver/qa-signoff-T007-T022.md` (line 85)
**Issue:** References removed `getCountsForTurn` function
**Status:** PROPERLY ANNOTATED with strikethrough - no action needed

---

## Minor Findings

### MN1. AGENTS.md: operatorslog.md Location Inconsistency (MINOR)

**Issue:** Listed in "Also on disk (not active crew)" as `.opencode/agents/operatorslog.md` but exists only at `.claude/agents/operatorslog.md`
**Fix:** Update AGENTS.md to reflect actual location

### MN2. AGENTS.md: Undocumented Directories (MINOR)

**Issue:** Not mentioned in Filesystem Awareness BFS Depth Map:
- `.opencode/plans/`
- `.agents/skills/neon-postgres/`
- `.runtime/`

**Fix:** Add to BFS map or note as ephemeral/runtime directories

### MN3. AGENTS.md: boot-sequence.md Status Unclear (MINOR)

**Issue:** Says "superseded by AGENTS.md" but doesn't clarify if it should be archived
**File:** `docs/internal/boot-sequence.md` exists
**Fix:** Add clarification or move to archive

### MN4. Hook Implementation vs Proposal Mismatch (MINOR)

**File:** `docs/archive/review-action-plan-2026-02-13.md` (lines 200-203)
**Issue:** Proposes `lib/use-bout-engagement.ts` but actual implementation is `lib/engagement.ts`
**Status:** Archive document - actual implementation works correctly
**Fix:** None required (archive is historical record)

### MN5. Test File Reference in Comments (MINOR)

**File:** `docs/archive/press-security-audit.md` (line 103)
**Issue:** References `dna_parity_test.go` which doesn't exist
**Status:** Acknowledged in document as "likely from a refactored package"
**Fix:** None required (already annotated)

### MN6. resolveClientIp() Proposal (MINOR)

**File:** `docs/archive/review-action-plan-2026-02-13.md` (lines 72, 86, 88)
**Issue:** Proposes function that may differ from actual implementation
**Fix:** Verify against `lib/rate-limit.ts` and `lib/ip.ts`

### MN7. App Router Route Count (MINOR)

**File:** `/README.md`
**Issue:** Claims "30+ routes" but actual count is 32
**Status:** Acceptable for marketing copy ("30+")
**Fix:** None required

---

## Low Priority Findings

### L1. HTTP PDF Links (LOW)

**File:** `docs/bootcamp/tasks/04-research-tier2-external/findings.md`
**Issue:** HTTP links to academic PDFs:
- `http://denninginstitute.com/pjd/PUBS/WSModel_1968.pdf`
- `http://homepage.psy.utexas.edu/homepage/group/helmreichlab/publications/pubfiles/Pub235.pdf`

**Fix:** Verify existence; upgrade to HTTPS if available

### L2. HTTP supervisord.org Link (LOW)

**File:** `docs/bootcamp/11-process-supervision.md` (line 2173)
**Issue:** Uses `http://supervisord.org` instead of HTTPS
**Fix:** Upgrade to HTTPS

### L3. Orphaned Decision Files Should Be Archived (LOW)

**Files:**
- `docs/decisions/oceanheart-reframe-plan.md` (COMPLETE)
- `docs/decisions/trajectory-external-legibility.md` (COMPLETE)

**Issue:** Completed decisions not moved to archive
**Fix:** Consider creating `docs/decisions/archive/` for completed decisions

### L4. AGENTS.md Recent Decisions Missing MIGRATION-001 (LOW)

**Issue:** MIGRATION-001.md is active but not listed in "Recent Decisions" section
**Fix:** Add SD reference or link to MIGRATION-001

### L5. Test Count Higher Than Documented (LOW)

**File:** `/README.md`
**Issue:** Claims 1,289 tests but actual count is 1,359
**Status:** Conservative estimate - not critical
**Fix:** Update to current count

---

## Verification Summary - Items Confirmed Accurate

The following were verified as correct:

- All 14 agent files exist at `.opencode/agents/` with symlinks to `.claude/agents/`
- All Go CLI tools exist: pitctl, pitforge, pitlab, pitbench, pitnet, pitstorm, pitlinear
- pitkeel-py Python CLI has all three files: pitkeel.py, daemon.py, analysis.py
- All justfile targets exist: gate, darkcat, darkcat-openai, darkcat-gemini, darkcat-all, darkcat-synth, darkcat-ref, gauntlet, install-hooks
- All npm/pnpm scripts in package.json match documentation
- pitcommit.py exists and is executable at scripts/pitcommit.py
- backlog.py CLI exists at scripts/backlog.py
- All core directories exist: lib/, components/, shared/, app/, db/, drizzle/, tests/, scripts/, docs/internal/, presets/, qa/, evidence/, ops/, midgets/, slopodar-ext/
- Test directory structure: unit/, integration/, api/, e2e/, simulation/
- Node engine >=24 matches .nvmrc 24.13.1
- pnpm 10.28.2 documented correctly
- 2-space indentation convention documented
- Neon Postgres ID masked correctly

---

## Remediation Priority

### Immediate (Block new developer onboarding)
1. Fix README.md Node version prerequisite (C1)
2. Fix docs/README.md broken link (MD1)

### Short-term (Documentation accuracy)
3. Update AGENTS.md piteval description (M1)
4. Update README.md table count (M2)
5. Clarify README.md commit count (M3)
6. Update GitHub URLs from master to main (MD2)

### Medium-term (Navigation/discoverability)
7. Create docs/decisions/README.md index (MD5)
8. Create docs/spec/README.md (MD6)
9. Verify/update external URLs (MD3, MD4)

### Low priority (Housekeeping)
10. Remaining minor and low findings

---

## Appendix: Files Audited

| Category | Count |
|----------|-------|
| Total markdown files in docs/ | 453 |
| Root documentation files (README, AGENTS, CLAUDE) | 3 |
| Agent definition files | 14 |
| Skill reference files | 70+ |
| Decision files | 3 |
| Spec files | 6 |
| Archive files | 50+ |
| Bootcamp modules | 30+ |

---

*Report generated by polecat/nux as part of PIT-dkq docs audit task.*
