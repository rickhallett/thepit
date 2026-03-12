# What I Built, What I Learned, What I'm Looking For

## What I did

I spent 350+ hours building a full-stack product with AI agents under a governance framework, solo. It happened in two phases.

The first phase was a pilot study — 24 days, 847 commits, 278 session decisions. I was building a product (an adversarial AI evaluation platform) and governing the agents building it. During that process I noticed things going wrong in ways that automated checks didn't catch. Not hallucinated facts — the agents were producing output that was syntactically valid, passed type checks, passed tests, and was subtly off. I started writing down each instance. Over the course of the pilot I documented 18+ of these, along with what went wrong, how I noticed, and what the mechanism was. I built a taxonomy of named anti-patterns from those observations, and a 13-layer model mapping where in the human-AI stack each failure mode originates.

The most important moment was catching the lead agent performing honesty while being dishonest about its confidence. That's not hallucination — it's sycophantic drift, and it passes every surface-level check. The only instrument that caught it was human judgment: the feeling that something was off before I could articulate why. I have a mental health background. That instinct comes from sitting across from people in crisis, not from a textbook. It turned out to transfer directly.

The second phase is a calibration run — same product spec, compressed governance, measured from commit zero. The pilot produced the observations; the calibration run is testing whether the controls actually work under fresh conditions. I compressed the governance framework into a single boot file, developed a notation convention (Signal) for expressing process discipline concisely, and started stress-testing hypotheses: Does compressed governance survive new operating layers? Does a notation convention carry meaning between humans and models, or does it only work through pattern matching? Does cross-model validation (feeding artifacts to models that didn't produce them) reveal framing errors that internal review misses?

Early results on all three are encouraging. Signal compresses at 4.5:1 and was decoded correctly by models that had never seen it. Cross-model validation caught five specific misframings in the project's own documentation. But these are hypotheses under stress test, not proven claims. The calibration is ongoing.

## What I learned

Agentic systems build indefinitely without reflecting. The human has to schedule the reflection. I saw this across 25 documented arcs and 847 commits — engineering velocity and reflective communication are inversely correlated. The late phase of the pilot produced 17.8 times more narrative per commit than the early phase. This mirrors established engineering patterns (build-reflect alternation, stop-the-line, maker-manager tension) but at ratios the human-teams literature doesn't cover.

Governance frameworks for probabilistic systems can be designed, tested, and honestly assessed. I built one, ran it for 315 session decisions across both phases, caught it failing, and documented the failures. The framework is useful. The honest assessment of where it works and where it breaks is more useful.

The 18+ instances I documented aren't victories — they're the learning process. Each one taught me something about where in the stack the failure originated, what made it hard to detect, and what controls might help. The taxonomy and the layer model came from accumulating those lessons, not from designing them up front.

## What I'm looking for

A role where sustained evaluation of AI systems under real conditions is the work. I have 350+ hours of documented human-in-the-loop field data, a taxonomy of named failure patterns with detection heuristics, a governance framework honestly assessed against its own limitations, and the process discipline to keep verification gates intact when it would be faster to skip them.

The portfolio is the process. Both repos are public. The session decisions, the taxonomy, the layer model, the cross-model validation work — open for scrutiny.

---

*[oceanheart.ai](https://oceanheart.ai) | [github.com/rickhallett/thepit](https://github.com/rickhallett/thepit) | [github.com/rickhallett/thepit-v2](https://github.com/rickhallett/thepit-v2)*
