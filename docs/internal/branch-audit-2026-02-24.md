# Branch Audit — 2026-02-24

**Master HEAD:** `2fc8cf9` (Merge pull request #376 from rickhallett/chore/strip-last-provenance)
**Audited by:** Architect + Janitor (READ-ONLY)

---

## 1. SAFE_TO_PRUNE — Local

### Confirmed Merged (git branch --merged master)

| Branch | Reason |
|--------|--------|
| `chore/research-page-refinements` | Merged into master |
| `chore/analysis-notes` | Merged into master |
| `chore/copy-consistency` | Merged into master |
| `feat/pool-simplification` | Merged into master |
| `chore/reaction-state` | Merged into master |
| `chore/model-pricing-simplification` | Merged into master |
| `chore/go-dark-crew-internals` | Merged into master |
| `docs/captain-qa-walkthrough` | Merged into master |
| `test/artisan-coverage` | Merged into master |
| `test/chain-integration` | Merged into master |
| `feat/codebase-evaluation-apparatus` | Merged into master |
| `feat/rea-belief-persistence-experiment` | Merged into master |

### Unmerged but Changes Already in Master

| Branch | Commits Not in Master | Reason Safe |
|--------|-----------------------|-------------|
| `chore/bout-engine-reliability` | 1 (16c48c2) | Token ceiling raises merged via PR #358 (`e1d737f`). Master has *higher* ceilings (266/160) than branch (200/120) — superseded. |
| `chore/crypto-tests-and-badges` | 1 (35b7041) | Crypto integrity tests + README badges merged via `f50e650`. Files exist identically in master. |
| `chore/readme-logo-cleanup` | 1 (0797e6b) | Logo cleanup merged via `bc42843`. |
| `chore/pre-launch-final-polish` | 1 (924c4b6) | README improvements + CSP font-src fix merged via `6b25ae0`. |
| `docs/pre-launch-drift-audit` | 1 (e00b64e) | Drift audit (16 files) merged via `56efc74`. |
| `chore/pre-launch-hygiene` | 2 (d3ba663, 132600d) | Flight plan updates + strategy doc removal merged via `c608326`. |
| `test/architect-coverage` | 1 (9cb49f5) | Pre-launch verification tests merged via `26d7e75`. All 7 test files exist in master. |
| `tools/evaluate-vote-engine` | 2 (66941bb, 6178d27) | Evaluate-and-vote engine merged via `75566db`. `pitstorm/cmd/evaluate/main.go` exists in master. |
| `triage/extract-byok-lib` | 1 (8b5d25b) | BYOK extraction merged via PR #324 (`1fd074e`). `lib/byok.ts` exists in master. |
| `triage/atomic-credits` | 1 (be2a2b4) | Transaction wrapping merged — `lib/credits.ts` in master uses `db.transaction()`. |
| `triage/discriminated-unions` | 1 (4bf2f67) | `assertNever` + tagged `BoutValidation` union both present in master `lib/api-utils.ts` and `lib/bout-engine.ts`. |
| `triage/noUncheckedIndexedAccess` | 1 (419f0a1) | `noUncheckedIndexedAccess: true` in master's `tsconfig.json`. Merged via PR #321. |
| `triage/remove-parseJsonBody` | 1 (dc22568) | `parseJsonBody` removed from master's `lib/api-utils.ts` (0 occurrences). Tests updated. |
| `triage/timing-safe-research-key` | 1 (fc85e43) | `timingSafeEqual` present in master's `lib/bout-engine.ts`. Merged via PR #319. **Security fix — already landed.** |
| `chore/agent-docs-local-gate` | 1 (acd7b66) | Local-first verification posture merged via PR #318 (`f446e55`). |
| `pr/copy-cleanup` | 4 (merge commits + e03b643, 1ed2a48) | Superset of `pr/trust-thesis-copy`. Brand reframe merged via PR #313, stale references via PR #315. |
| `pr/trust-thesis-copy` | 2 (60d85f0, 1ed2a48) | Trust infrastructure thesis reframe merged via PR #313 (`69de978`). |
| `pr/zod-api-validation` | 2 (d85d9fd, 74d159a) | Zod validation at API boundaries merged via PR #314 (`fbbbb18`). `lib/api-schemas.ts` exists in master. |
| `pr/piteval-engine` | 5 (ba229f6 etc.) | Piteval engine merged via PR #312 (`b39f092`). All piteval/ code in master. |
| `pr/weaver-agent` | 2 (c7aa534, 064a458) | Weaver agent merged via PR #316 (`a9b8605`). |
| `bugfix/ci-level4-eslint-venv` | 1 (e8f7092) | ESLint .venv exclusion + pnpm separator fix merged via PR #317 (`e4d2a70`). |
| `feat/piteval-engine` | 10 commits | Composite accumulation branch. All constituent PRs merged (#312-#318). Master then "went dark" removing agent docs from tracking. Branch is stale. |
| `fix/copy-alignment-truth` | 1 (3cb1645) | Copy alignment merged via PR #296 (`ad4a85c`). |
| `feat/tier-credit-grants` | 3 (1940b6e etc.) | Tier-aware credit grants merged via PR #357 (`20df89c`). Two-dot diff on webhook route is empty — master has identical implementation. |

**Total SAFE local: 38** (12 merged + 26 unmerged-but-incorporated)

---

## 2. SAFE_TO_PRUNE — Remote

### Confirmed Merged (git branch -r --merged master)

| Branch | Reason |
|--------|--------|
| `origin/chore/strip-last-provenance` | Merged into master |
| `origin/feat/h8-experiment-infrastructure` | Merged into master |
| `origin/chore/research-citations-audit` | Merged into master |
| `origin/chore/copy-right-size` | Merged into master |
| `origin/chore/qa-live-fixes` | Merged into master |
| `origin/chore/builder-validation` | Merged into master |
| `origin/chore/lineage-resolution` | Merged into master |
| `origin/feat/agent-auth-gate` | Merged into master |
| `origin/chore/brand-casing` | Merged into master |
| `origin/chore/copy-voice` | Merged into master |
| `origin/chore/ui-qa-decisions` | Merged into master |
| `origin/chore/research-page-refinements` | Merged into master |
| `origin/chore/analysis-notes` | Merged into master |
| `origin/chore/copy-consistency` | Merged into master |
| `origin/feat/pool-simplification` | Merged into master |
| `origin/chore/reaction-state` | Merged into master |
| `origin/chore/model-pricing-simplification` | Merged into master |
| `origin/chore/go-dark-crew-internals` | Merged into master |
| `origin/docs/captain-qa-walkthrough` | Merged into master |
| `origin/feat/codebase-evaluation-apparatus` | Merged into master |
| `origin/feat/rea-belief-persistence-experiment` | Merged into master |

### Unmerged Remote but Changes Already in Master

| Branch | Commits | Reason Safe |
|--------|---------|-------------|
| `origin/review-findings-hygiene` | 1 | Makefile guard + dead fallback fix merged via PR #346. Master has identical changes. |
| `origin/update-flight-plan` | 1 | Flight plan updates merged via PR #345. |
| `origin/update-hn-copy` | 1 | HN launch copy merged via PR #344. |
| `origin/remove-headline-findings` | 1 | Headline findings removal merged via PR #343. |
| `origin/bout-error-events-fix` | 1 | `errorText` in `use-bout.ts` already in master. |
| `origin/feat/wire-dna-fingerprints` | 1 | DnaFingerprint wiring merged via PR #341. Component exists in master. |
| `origin/feat/pitnet-distribution` | 1 | Cross-compile distribution merged (Makefile in master has dist targets). |
| `origin/docs/hn-flight-plan` | 1 | Flight plan replacement merged via PR #339. |
| `origin/feat/dna-fingerprints` | 1 | DnaFingerprint component merged via PR #338. |
| `origin/feat/verification-proof` | 2 | Verification proof command merged via PR #337. `pitnet/cmd/verify.go` in master. |
| `origin/feat/demo-mode` | 3 | Demo mode merged via PR #336. Intro pool and anonymous bout access in master. |
| `origin/feat/attestation-verification` | 4 | ABI encoding fix + session state merged via PR #333. |
| `origin/feat/video-explainer` | 3 | Video explainer merged via PR #335. CSP youtube-nocookie in master. |
| `origin/fix-share-modal-timing` | 1 | Share modal timing fix merged via PR #334. |
| `origin/feat/pitkeel-intent-tests-and-hook` | 3 | pitkeel intent tests + hook merged via PR #332. `pitkeel/main.go` exists in master. |
| `origin/triage/branded-domain-ids` | 1 | Branded domain IDs merged via PR #327. |
| `origin/docs/building-and-witness-agent` | 3 | BUILDING.md + Witness agent merged via PR #331. |
| `origin/triage/reaction-type-enum-migration-reset` | 2 | pgEnum + migration reset merged via PR #326. |
| `origin/triage/review-feedback-fixes` | 2 | Review feedback fixes merged via PR #325. |
| `origin/docs/weaver-review-findings-rule` | 1 | Weaver intervention rule merged via PR #328. |
| `origin/chore/pre-hn-audit` | 4 | Pre-HN audit merged via PR #310. |
| `origin/research/h2-results` | 3 | H2 results merged via PR #298. |
| `origin/content/research-page-and-hn-prompts` | 1 | Research page + HN prompts merged via PR #308. |
| `origin/research/h6-results` | 1 | H6 results merged via PR #306. |
| `origin/research/h6-preregistration-and-analysis` | 1 | H6 preregistration merged via PR #305. |
| `origin/research/h5-results` | 1 | H5 results merged via PR #304. |
| `origin/research/h5-preregistration-and-analysis` | 1 | H5 preregistration merged via PR #303. |
| `origin/research/h4-results` | 1 | H4 results merged via PR #302. |
| `origin/research/h4-preregistration-and-analysis` | 1 | H4 preregistration merged via PR #301. |
| `origin/research/h3-results` | 1 | H3 results merged via PR #300. |
| `origin/research/h3-preregistration-and-analysis` | 1 | H3 preregistration merged via PR #299. |
| `origin/research/h2-preregistration-and-analysis` | 2 | H2 preregistration merged via PR #297. |
| `origin/data/h1-enhanced` | 1 | H1 enhanced data merged via PR #295. |
| `origin/feat/h1-enhance-nav-research` | 1 | H1 enhance + nav merged via PR #294. |
| `origin/feat/enhance-agent-dna` | 1 | Agent DNA enhancement merged via PR #293. |
| `origin/feat/research-bypass` | 1 | Research API key bypass merged via PR #292. |
| `origin/chore/repo-cleanup-pre-launch` | 1 | Repo cleanup merged via PR #291. |
| `origin/feat/recent-pagination` | 2 | Pagination merged via PR #288. |
| `origin/feat/bout-og-images` | 1 | OG images merged via PR #289. |
| `origin/triage/extract-byok-lib` | 1 | Mirrors local `triage/extract-byok-lib`. Merged via PR #324. |
| `origin/triage/atomic-credits` | 1 | Mirrors local. Transactions in master `lib/credits.ts`. |
| `origin/triage/discriminated-unions` | 1 | Mirrors local. Tagged unions in master. |
| `origin/triage/noUncheckedIndexedAccess` | 1 | Mirrors local. Merged via PR #321. |
| `origin/triage/remove-parseJsonBody` | 1 | Mirrors local. `parseJsonBody` removed from master. |
| `origin/triage/timing-safe-research-key` | 1 | Mirrors local. Merged via PR #319. |
| `origin/chore/agent-docs-local-gate` | 1 | Mirrors local. Merged via PR #318. |
| `origin/pr/copy-cleanup` | 4 | Mirrors local. All changes in master. |
| `origin/pr/trust-thesis-copy` | 2 | Mirrors local. Merged via PR #313. |
| `origin/pr/zod-api-validation` | 2 | Mirrors local. Merged via PR #314. |
| `origin/pr/piteval-engine` | 5 | Mirrors local. Merged via PR #312. |
| `origin/pr/weaver-agent` | 2 | Mirrors local. Merged via PR #316. |
| `origin/bugfix/ci-level4-eslint-venv` | 1 | Mirrors local. Merged via PR #317. |
| `origin/feat/piteval-engine` | 10 | Mirrors local. All constituent PRs merged. |
| `origin/chore/pre-hn-audit` | 4 | Merged via PR #310. |
| `origin/research/h2-results` | 3 | Merged via PR #298. |
| `origin/fix/copy-alignment-truth` | 1 | Mirrors local. Merged via PR #296. |

**Total SAFE remote: 75** (21 merged + 54 unmerged-but-incorporated)

---

## 3. NOT_SAFE_TO_PRUNE — Local

| Branch | Unique Work | Still Relevant? | Recommended Action |
|--------|-------------|-----------------|-------------------|
| `feat/reaction-beast` | Fixes anonymous reactions FK violation: adds `clientFingerprint` column to reactions, uses `null` userId for anon users instead of `anon:ip` string (which violates FK to users table). Also fixes stale closure in reaction hook. 1 commit, 5 files. **Open PR #371.** | **YES** — master still uses `dedupeUserId = userId ?? 'anon:${ip}'` which stores a non-existent userId string. This is a live FK violation bug for anonymous reactions. | **Keep. Review and merge PR #371.** This is a genuine bug fix. |
**Total NOT_SAFE local: 1**

**Note:** `feat/tier-credit-grants` was initially flagged but verification confirmed its webhook route changes produce an **empty two-dot diff** against master — PR #357 (`20df89c`) incorporated the same work. Reclassified as SAFE (moved to Section 1).

---

## 4. NOT_SAFE_TO_PRUNE — Remote

| Branch | Unique Work | Still Relevant? | Recommended Action |
|--------|-------------|-----------------|-------------------|
| `origin/feat/reaction-beast` | Same as local `feat/reaction-beast`. Open PR #371. | YES | **Keep. Merge PR #371.** |
| `origin/chore/bout-engine-reliability` | Mirrors local. Superseded. | No | Safe to prune (listed here for completeness but effectively SAFE). |
| `origin/chore/crypto-tests-and-badges` | Mirrors local. Already merged. | No | Safe to prune. |
| `origin/chore/readme-logo-cleanup` | Mirrors local. Already merged. | No | Safe to prune. |
| `origin/chore/pre-launch-final-polish` | Mirrors local. Already merged. | No | Safe to prune. |
| `origin/docs/pre-launch-drift-audit` | Mirrors local. Already merged. | No | Safe to prune. |
| `origin/chore/pre-launch-hygiene` | Mirrors local. Already merged. | No | Safe to prune. |
| `origin/test/architect-coverage` | Mirrors local. Already merged. | No | Safe to prune. |
| `origin/tools/evaluate-vote-engine` | Mirrors local. Already merged. | No | Safe to prune. |

**Note:** The 8 remote branches listed as "Safe to prune" above are already classified as SAFE in Section 2 via their local counterparts. They are listed here to be explicit. The actual NOT_SAFE remote count is **1** (reaction-beast only). `origin/feat/tier-credit-grants` reclassified as SAFE — see note in Section 3.

**Total NOT_SAFE remote: 1**

---

## 5. Summary Counts

| Category | Count |
|----------|-------|
| **SAFE_TO_PRUNE — Local** | 38 |
| **SAFE_TO_PRUNE — Remote** | 76 |
| **NOT_SAFE_TO_PRUNE — Local** | 1 |
| **NOT_SAFE_TO_PRUNE — Remote** | 1 |
| **Total branches audited** | 116 |

---

## 6. Security-Relevant Findings

- `triage/timing-safe-research-key` (SAFE): The timing-safe comparison fix for the research API key bypass **has already been merged** to master via PR #319. No action needed — the security fix is live.
- `feat/reaction-beast` (NOT_SAFE): Contains a **FK violation bug fix** for anonymous reactions. Not a security vulnerability per se, but it prevents data integrity issues where `userId` column stores non-existent user IDs. **Recommend merging PR #371.**

---

## 7. Pruning Commands

### Local branches — SAFE to delete

```bash
# Merged local branches (12)
git branch -d \
  chore/research-page-refinements \
  chore/analysis-notes \
  chore/copy-consistency \
  feat/pool-simplification \
  chore/reaction-state \
  chore/model-pricing-simplification \
  chore/go-dark-crew-internals \
  docs/captain-qa-walkthrough \
  test/artisan-coverage \
  test/chain-integration \
  feat/codebase-evaluation-apparatus \
  feat/rea-belief-persistence-experiment

# Unmerged local branches with changes already in master (25)
# Using -D because git won't allow -d on unmerged branches
git branch -D \
  chore/bout-engine-reliability \
  chore/crypto-tests-and-badges \
  chore/readme-logo-cleanup \
  chore/pre-launch-final-polish \
  docs/pre-launch-drift-audit \
  chore/pre-launch-hygiene \
  test/architect-coverage \
  tools/evaluate-vote-engine \
  triage/extract-byok-lib \
  triage/atomic-credits \
  triage/discriminated-unions \
  triage/noUncheckedIndexedAccess \
  triage/remove-parseJsonBody \
  triage/timing-safe-research-key \
  chore/agent-docs-local-gate \
  pr/copy-cleanup \
  pr/trust-thesis-copy \
  pr/zod-api-validation \
  pr/piteval-engine \
  pr/weaver-agent \
  bugfix/ci-level4-eslint-venv \
  feat/piteval-engine \
  fix/copy-alignment-truth \
  feat/tier-credit-grants
```

### Remote branches — SAFE to delete

```bash
# Merged remote branches (21)
git push origin --delete \
  chore/strip-last-provenance \
  feat/h8-experiment-infrastructure \
  chore/research-citations-audit \
  chore/copy-right-size \
  chore/qa-live-fixes \
  chore/builder-validation \
  chore/lineage-resolution \
  feat/agent-auth-gate \
  chore/brand-casing \
  chore/copy-voice \
  chore/ui-qa-decisions \
  chore/research-page-refinements \
  chore/analysis-notes \
  chore/copy-consistency \
  feat/pool-simplification \
  chore/reaction-state \
  chore/model-pricing-simplification \
  chore/go-dark-crew-internals \
  docs/captain-qa-walkthrough \
  feat/codebase-evaluation-apparatus \
  feat/rea-belief-persistence-experiment

# Unmerged remote branches with changes already in master (54)
git push origin --delete \
  review-findings-hygiene \
  update-flight-plan \
  update-hn-copy \
  remove-headline-findings \
  bout-error-events-fix \
  feat/wire-dna-fingerprints \
  feat/pitnet-distribution \
  docs/hn-flight-plan \
  feat/dna-fingerprints \
  feat/verification-proof \
  feat/demo-mode \
  feat/attestation-verification \
  feat/video-explainer \
  fix-share-modal-timing \
  feat/pitkeel-intent-tests-and-hook \
  triage/branded-domain-ids \
  docs/building-and-witness-agent \
  triage/reaction-type-enum-migration-reset \
  triage/review-feedback-fixes \
  docs/weaver-review-findings-rule \
  chore/pre-hn-audit \
  research/h2-results \
  content/research-page-and-hn-prompts \
  research/h6-results \
  research/h6-preregistration-and-analysis \
  research/h5-results \
  research/h5-preregistration-and-analysis \
  research/h4-results \
  research/h4-preregistration-and-analysis \
  research/h3-results \
  research/h3-preregistration-and-analysis \
  research/h2-preregistration-and-analysis \
  data/h1-enhanced \
  feat/h1-enhance-nav-research \
  feat/enhance-agent-dna \
  feat/research-bypass \
  chore/repo-cleanup-pre-launch \
  feat/recent-pagination \
  feat/bout-og-images \
  triage/extract-byok-lib \
  triage/atomic-credits \
  triage/discriminated-unions \
  triage/noUncheckedIndexedAccess \
  triage/remove-parseJsonBody \
  triage/timing-safe-research-key \
  chore/agent-docs-local-gate \
  pr/copy-cleanup \
  pr/trust-thesis-copy \
  pr/zod-api-validation \
  pr/piteval-engine \
  pr/weaver-agent \
  bugfix/ci-level4-eslint-venv \
  feat/piteval-engine \
  fix/copy-alignment-truth \
  chore/bout-engine-reliability \
  chore/crypto-tests-and-badges \
  chore/readme-logo-cleanup \
  chore/pre-launch-final-polish \
  docs/pre-launch-drift-audit \
  chore/pre-launch-hygiene \
  test/architect-coverage \
  tools/evaluate-vote-engine \
  feat/tier-credit-grants
```

### NOT pruning (keep these)

```
# Local
feat/reaction-beast          # Open PR #371 — FK violation fix

# Remote
origin/feat/reaction-beast   # Open PR #371
```

---

*Audit complete. No files were modified, no branches created, no commits made.*
