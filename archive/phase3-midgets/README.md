# Midgets (Phase 3)

Container-based agent isolation and a cross-model research sprint.

This repo was the third phase of development for [The Pit](https://github.com/rickhallett/thepit-cloud). It ran from late February through mid-March 2026 and covered two things: Docker containers as governance boundaries for AI agents, and a systematic cross-model sweep of LLM output anti-patterns.

## What's here

**Container infrastructure.** A Debian container where an AI agent can see a screen, type into terminals, and produce structured output. Docker mount flags enforce role constraints that prompts cannot - `:ro` is cheaper and more reliable than any system prompt instruction. 35 deterministic tests prove the stack works without any LLM calls. Three Claude instances in separate containers each found a planted defect independently. The orchestrator is bash. The job protocol is file-based YAML.

**Slopodar cross-model sweep.** Three model families (Claude, Gemini, Grok) reviewed 93 chunks of project output against the anti-pattern taxonomy. 3,108 pattern instances across 60 variants. Three new patterns confirmed by multi-model convergence. The sweep pipeline, aggregation tooling, and raw data are in `bin/` and `data/sweep/`.

**Governance files.** The latest version of the operational vocabulary - AGENTS.md, agent identity files, session decision chain (SD-001 to SD-321), lexicon, layer model, slopodar taxonomy (43 entries). These evolved across all three phases and represent the current state.

**Bootcamp and ebook.** Five training tracks and "The Agentic Engineer" ebook, both produced during this phase.

## Consolidated

This repo's contents and git history have been consolidated into [thepit-cloud](https://github.com/rickhallett/thepit-cloud) via subtree merge. Development continues there. This repo is kept for reference.

Richard Hallett - [oceanheart.ai](https://oceanheart.ai)
