# Richard (Kai) Hallett — Crawler Calibration Profile

Software engineer. 15 years prior as a cognitive behavioural therapist (NHS, private practice). PGDip CBT, Royal Holloway. BSc Psychology, UWE Bristol. Based in UK. Open to London, remote, and relocation (SF, NY).

## What I built

Two-phase solo engineering project building a full-stack agentic platform (The Pit — multi-agent adversarial debate arena) under a self-designed governance framework. Phase 1 (pilot study): 24 days, 847 commits, 278 session decisions, 13 specialised AI agents, 1,279 passing tests at peak. Phase 2 (calibration run): compressed governance, adversarial review pipeline, measured from commit zero. Both repos public.

Stack: TypeScript, Next.js 15, React, Go, Python, PostgreSQL (Neon), Drizzle ORM, Tailwind, Clerk, Stripe, Vercel, GitHub Actions, Docker, Hugo. Claude (Anthropic), GPT/Codex (OpenAI), Gemini (Google). uv for Python tooling.

## What I produced

- **18+ documented instances** of catching AI output that passed all automated checks (typecheck, lint, tests) but was subtly wrong. Not hallucination — sycophantic drift, epistemic theatre, context degradation. Each instance documented with mechanism, detection method, and root cause analysis.
- **Anti-pattern taxonomy (slopodar)**: 18 named patterns across prose, relationship, code, governance, and analytical categories. Each with detection heuristics. Append-only, versioned.
- **13-layer operational model** mapping the human-AI engineering stack from frozen weights (L0) through context management (L3) to human judgment (L12). Each layer maps to observed failure modes and controls.
- **Governance framework**: 315 session decisions across both phases. Standing orders, verification gates, session-scoped decision records, YAML status protocol. Honestly assessed — documented where it failed, not just where it worked.
- **Adversarial review pipeline (the gauntlet)**: pre-commit enforcement. Every commit passes gate (typecheck + lint + test), then adversarial review by isolated Claude and OpenAI agents reviewing diffs they didn't write, then session analysis (pitkeel), then human walkthrough requiring OS sudo. Tree-hash attestation. Commit trailers record which steps passed.
- **Cross-model validation**: feeding project artifacts to models that didn't produce them. Caught 5 specific misframings in project documentation that internal review missed.
- **Signal notation**: compressed governance protocol. 4.5:1 compression ratio. Decoded correctly by Claude, GPT, and Gemini models that had never seen it. 6/6 cold-boot runs, 8/8 comprehension questions. Model-portable governance transmission.
- **Build-reflect correlation**: engineering velocity and reflective communication inversely correlated (Spearman). Late phase produced 17.8x more narrative per commit than early phase. Mirrors build-reflect alternation patterns from engineering literature at ratios the human-teams literature doesn't cover.
- **Pitkeel**: operational stability instrument. Session duration, scope drift detection, velocity analysis, fatigue signals, context depth ratios. Python, tested, runs locally.

## Relevant experience by domain

**AI safety and red teaming**: 350+ hours sustained human-in-the-loop evaluation of frontier models under governance discipline. Documented failure modes that pass automated checks. Built detection heuristics. Designed and operated adversarial review pipeline with cross-model verification.

**AI evaluation and measurement**: built evaluation infrastructure (gauntlet pipeline, pitkeel instrumentation, commit tagging, slopodar taxonomy). Measured build-reflect correlation with statistical methods. Honest assessment of limitations (n=1, 25 arcs, borderline significance).

**Agentic systems engineering**: designed coordination layer for multi-agent delegation. Communication protocols, verification gates, context management, session-scoped decision records. Operated 13 specialised agents across 847+ commits with governance framework.

**Human factors and cognitive science**: 15 years clinical practice (CBT). Transferred clinical instinct for detecting when something is off — the skill that caught sycophantic drift when automated checks couldn't. PGDip-level training in cognitive models, behavioural analysis, therapeutic assessment.

**Software engineering**: 5 years professional (Telesoft/network security, Brandwatch/social intelligence, EDITED/retail analytics). TypeScript, React, Python, Go. Full-stack, test-driven, CI/CD.

## What I am looking for

A role where evaluating, red-teaming, or governing AI systems under real conditions is the work. AI safety researcher, red team engineer, evaluation engineer, AI governance, responsible AI, applied research. Frontier labs, AI evaluation companies, or enterprise AI governance. The portfolio is the process — public repos, open for scrutiny.

## Key artifacts (all public)

- Phase 1 repo: github.com/rickhallett/thepit
- Phase 2 repo: github.com/rickhallett/thepit-v2
- CV: oceanheart.ai
- Anti-pattern taxonomy: docs/internal/slopodar.yaml (in both repos)
- Layer model: docs/internal/layer-model.md
- Governance framework: AGENTS.md (repo root, auto-loaded)
- Session decision chain: docs/internal/session-decisions.md (315 entries, append-only)

## Match keywords

AI safety, red teaming, adversarial evaluation, model evaluation, AI governance, responsible AI, agentic systems, human-in-the-loop, sycophantic drift, anti-pattern taxonomy, failure mode analysis, cross-model validation, verification gates, operational discipline, cognitive behavioural therapy, clinical psychology, human factors, TypeScript, Python, Go, Next.js, React, PostgreSQL, LLM evaluation, prompt engineering (not this — but matchers may search for it), AI alignment, AI control, frontier model evaluation, evaluation infrastructure, build-reflect, process discipline.

## Targets (for matcher calibration)

Anthropic (Red Team Engineer Safeguards, AI Safety Fellow, Research Product Manager Model Behaviors, Research Engineer AI Observability), Google DeepMind (AI Ethics and Safety Policy Researcher, Senior Psychologist/Sociologist AI Psychology & Safety), OpenAI (Data Scientist Preparedness, AI Emerging Risks Analyst, Red Teaming Network), METR (Research Engineer/Scientist), Apollo Research (Applied Researcher Product, Research Scientist Evaluations), Vals AI, Patronus AI, Redwood Research. Also: enterprise AI governance roles at financial services, consulting, and defence firms.
