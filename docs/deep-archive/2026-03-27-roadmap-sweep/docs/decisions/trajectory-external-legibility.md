# Trajectory Assessment: External Legibility vs Intellectual Distinctiveness

**Date:** 2026-03-12
**Agents:** Architect (feasibility), Analyst (strategy), Weaver (synthesis)
**Trigger:** External feedback identifying local optima - bespoke terminology and tooling creating a barrier for hiring managers and external audiences.

---

## Diagnosis

The barrier is perceptual, not functional. `pnpm run test:ci` already works without any custom tooling. The Makefile, Go binaries, pitkeel, slopodar, and adversarial review pipeline are a separate governance layer that is not required for development. A hiring manager scanning the repo does not see this separation because the README mixes both layers.

The project's core tension cannot be fully resolved: the vocabulary is both the barrier and the contribution.

---

## Where all three agents converge (grounded in artifact inspection)

1. **The barrier is perceptual, not functional.** `pnpm run test:ci` works without custom tooling. Verified against package.json scripts.
2. **The README front-loads complexity.** Go binaries and bespoke terms appear before the 1,289-test-count signal. Reorder, don't rewrite.
3. **The custom tooling is genuinely novel.** pitcommit attestation, multi-model adversarial review, and the slopodar have no standard equivalents. Migration would lose functionality.
4. **External contribution is the highest-signal action** - and the only one that produces proof outside this repo.

## Where they diverge

- **Effort estimates:** Architect says 20min for README, Analyst says 1hr. Weaver sides with Architect's scoped version.
- **ARCHITECTURE.md:** Analyst recommended creating one. Weaver checked - it already exists (184 lines). Factual error in the Analyst's report. Just needs linking from README.
- **CONTRIBUTING.md:** Analyst recommends, Architect omits, Weaver rejects - private repo, solo developer, document would make promises the project doesn't keep.

## Monoculture flag

Both Architect and Analyst accept the slopodar's novelty without independently verifying it. Neither checks whether the anti-pattern taxonomy has equivalents in published literature. This could be shared-prior blindness. The Operator should verify externally before claiming novelty in any hiring context.

---

## Prioritized action list (ordered by ROI against true north)

| # | Action | Effort | Signal | Risk |
|---|--------|--------|--------|------|
| 1 | Fix package.json (name "tspit"->"thepit", description, engines) | 5 min | Eliminates contradictions | None |
| 2 | README restructure - test stats above fold, Go CLIs under "optional" header, one-line "standard tooling works without governance layer" | 20 min | First impression shows standard engineering | Low |
| 3 | Link ARCHITECTURE.md from README | 2 min | Technical evaluators find the deep doc | None |
| 4 | Rename Makefile targets: darkcat -> review, darkcat-all -> review-all | 15 min | External reader sees standard terms | Low |
| 5 | Add 3-line terminology note to README mapping bespoke -> standard | 10 min | Reduces vocabulary barrier without renaming | Low |
| 6 | One PR to OpenHands or Vercel AI SDK | 4-12hr Operator | Only proof outside own repo | High variance |

**Total agent-executable work: ~52 minutes.**

---

## Do NOT do

| Action | Why |
|--------|-----|
| CONTRIBUTING.md | Private repo, solo dev, empty promises |
| Create ARCHITECTURE.md | Already exists (184 lines) |
| Migrate to husky/commitlint | Replaces pre-commit attestation system with message linter - different problems |
| Makefile -> GitHub Actions | Loses pre-commit verification model, the actual contribution |
| Full vocabulary rename | 321 SDs, 43 slopodar entries, lexicon - cost exceeds value, alias approach sufficient |
| docker-compose at root | Neon branch workflow already covers local dev |

---

## The line between legibility and erasure

**Normalize the interface.** Anything a developer touches to build, run, or test the product: standard vocabulary. README, package.json, Makefile target names, CI config.

**Preserve the core.** Anything a researcher reads to understand the intellectual contribution: native vocabulary with mapping to standard terms. Slopodar, layer model, lexicon, session decision chain.

**The bridge.** External-facing docs use the pattern: "adversarial review (internally: darkcat) - three independent models review the same code snapshot." This translates without erasing.

---

## External contribution targets (Analyst's research)

| Tier | Repository | Why |
|------|-----------|-----|
| 1 | OpenHands (already forked) | Agentic coding platform. Container isolation, agent governance patterns directly applicable. |
| 1 | pydantic-ai | Python agent framework. Context management and structured output validation are core concerns. |
| 1 | Vercel AI SDK | Already in the stack. Multi-provider streaming, structured output, tool calling. |
| 2 | Anthropic Cookbook | Deep empirical data on multi-model prompting, sycophantic drift detection, anti-sycophancy. |
| 2 | LangChain/LangGraph | Agent orchestration. Multi-agent coordination and governance model relevant. |

Recommended start: OpenHands. Already forked. Directly relevant domain. Visible PR history.

---

## What a hiring manager sees (Analyst's audit)

**At 6 seconds:** "Full-stack solo project with custom tooling." Neutral-to-positive.

**At 60 seconds:** "Solid full-stack, interesting AI failure mode ideas, works alone." The 1,289-test-count is the strongest signal but it's below the fold.

**At 5 minutes:** Development History section is where the value lives but it's compressed into 8 lines. The intellectual contribution is mentioned but not linked.

**Missing:** No link to live product from README. No screenshots. package.json name/description contradicts README. Go binaries listed without context.

---

## Architect's tooling inventory

Custom tools assessed for migration feasibility:

| Tool | Standard equivalent? | Migrate? |
|------|---------------------|----------|
| pitcommit.py (tree-hash attestation) | No direct equivalent. Closest: cosign (sigstore). Tiered verification model is novel. | No |
| pitkeel (session telemetry) | No equivalent. Research instrument. | No |
| darkcat.mk (multi-model adversarial review) | No equivalent. Three LLM CLIs dispatched in parallel. | No (rename target only) |
| slopodar-* (anti-pattern detection) | No equivalent. Human-readable taxonomy, not a linter. | No |
| triangulate (convergence analysis) | No equivalent | No |
| pre-commit hook | lint-staged/husky | No - current hook does attestation, not linting |
| prepare-commit-msg | commitlint | Partial - could move telemetry to CI |
| gate.sh | Already mapped to pnpm run test:ci | Already done |

---

## Provenance

- Architect session: `ses_31ed049e3ffezOxN1CxuO7Yb8g`
- Analyst session: `ses_31ed01380ffe35i3ddjDcwt8bY`
- Weaver session: `ses_31eccb567ffeJU4XH9IfAB11CF`
