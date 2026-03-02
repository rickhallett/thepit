# What I Built, What I Found, What I'm Looking For

## What I did

I built a full-stack product with 13 AI agents under a governance framework I designed, solo, in 24 days. 847 commits. The product is a platform for adversarial AI evaluation — agents argue, the system measures what they actually do, and everything is published. The code is open. The governance is open. The process documentation is open.

During that build, I adversarially evaluated the system against itself. I documented 16 instances where I caught systematic LLM failure modes that no automated check detected — confident, coherent, contextually plausible drift that passed type checks, passed tests, passed code review, and was wrong. Each instance is recorded with the exact quote, the mechanism it exploited, and how I caught it. I call it the fight card.

I then quantified what I'd experienced. Engineering velocity and narrative density are inversely correlated: Spearman's rho = -0.63 for PRs against reflective communication. The late phase of the project produced 17.8 times more narrative per commit than the early phase. The system builds without reflecting until a human arrives and starts the conversation. This mirrors established engineering patterns — build-reflect alternation, stop-the-line events, maker-manager schedule tension — but at ratios the human-teams literature doesn't cover.

## What I found

Agentic systems will build indefinitely without reflecting. The human must schedule the reflection. This is not a process recommendation — it is an empirical finding from 847 commits of data across 25 documented arcs.

The most dangerous failure mode is not wrong code. It is confident, coherent, contextually plausible drift that passes every automated check. After 137,000 tokens of accumulated agreement, the system's own judgment starts to bend. The detection instrument is human taste — the instinct that something is off before you can prove it — not a better test suite. I have a mental health background. I learned that instinct from sitting across from humans in crisis, not from a paper. It transfers directly.

Governance frameworks for probabilistic systems can be designed, built, and stress-tested. I built one, ran it for 277 session decisions, and caught it failing. I documented the failure honestly. The framework isn't the finding. The honest assessment of where it works and where it doesn't — that's the finding.

## What I'm looking for

A role where sustained adversarial evaluation of AI systems under real deployment conditions is the job, not a side project. I bring 350+ hours of documented human-in-the-loop field data, a taxonomy of 16 named LLM anti-patterns with detection heuristics, a governance framework that was tested against reality and honestly assessed, and the build-reflect cycle data that shows when humans actually matter in agentic engineering.

The portfolio is the process, not the product. The repo is public. The session decisions, the fight card, the slopodar, the correlation analysis — all open for scrutiny.

---

*[oceanheart.ai](https://oceanheart.ai) | [github.com/rickhallett/thepit](https://github.com/rickhallett/thepit)*
