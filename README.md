# The Pit v2 (Phase 2)

Governance evolution and verification tooling for The Pit.

This repo was the second phase of development. It rebuilt The Pit's product codebase from scratch while developing the operational controls that emerged from the first attempt: a multi-model adversarial review pipeline, deterministic build orchestration via Make, session analysis tooling (pitkeel), and a structured anti-pattern taxonomy.

## What's here

**Verification pipeline (the gauntlet).** Every commit passed through typecheck, lint, test, adversarial review by independent Claude and OpenAI instances, session analysis, and a human walkthrough requiring OS-level authentication. Pre-commit hooks enforce the pipeline. Attestation identity is the git tree hash, not the commit SHA.

**Governance framework.** 12 agent identity files with defined responsibility boundaries. A lexicon of operational terms version-tracked across 321 session decisions. A 12-layer model of the human-agent system. The framework was refined when it broke, not when it worked.

**Tooling.** Makefile with 26 polecat tasks. Pitkeel (Python session analysis). Triangulate (cross-model review parser). Backlog CLI. Voice log processor. Darkcat adversarial review prompts.

**Research materials.** Cross-model convergence analysis, strategy documents, field notes, voice transcripts with digests.

The product code (Next.js, 274 tests, Clerk/Stripe) was built on feature branches and later stripped from main when the project pivoted to Phase 3.

## Consolidated

This repo's contents and git history have been consolidated into [thepit-cloud](https://github.com/rickhallett/thepit-cloud) via subtree merge. Development continues there. This repo is kept for reference.

Richard Hallett - [oceanheart.ai](https://oceanheart.ai)
