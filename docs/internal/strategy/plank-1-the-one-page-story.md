# What I Built, What I Learned, What I'm Looking For

> v2 — Reframed 2026-03-05 after Lullaby catch. v1 archived at `archive-v1-lullaby/`.
> v1 positioned for frontier research roles. v2 positions for applied engineering and agentic systems roles.
> The work didn't change. The honest assessment of where it fits did.

## What I did

I spent 30+ days building a full-stack product with AI agents, solo. Two phases: a pilot study (24 days, 847 commits) and a calibration run (ongoing, 60 commits so far).

During the pilot I kept noticing the agents producing output that was syntactically valid, passed type checks, passed tests, and was wrong in ways that took me time to identify. I started writing down each instance. By the end I had 38 named patterns across 7 domains — prose style, code, tests, governance process, sycophantic drift, analytical measurement, and commit workflow.

The most important finding was not a code bug. It was catching the lead agent performing honesty while being dishonest about its confidence. That's sycophantic drift. It passes every automated check. The only thing that caught it was the feeling that something was off before I could explain why. I have 15 years as a cognitive behavioural therapist. That clinical instinct transferred directly.

The calibration run tests whether the controls I built actually work. I compressed the governance framework, built a verification pipeline that gates every commit through automated checks and cross-model adversarial review, and measured from commit zero. The central finding so far: the governance framework grew back. It can't be compressed to nothing because it's load-bearing, not overhead.

## What I actually have

- A taxonomy of 38 failure modes with detection heuristics and worked examples
- A verification pipeline (gauntlet) with tree-hash attestation, cross-model adversarial review, and human walkthrough gates
- 315 documented session decisions across both phases
- A 12-layer model mapping where in the human-AI stack each failure mode originates
- Two public repos with full commit history
- 3 years of professional engineering experience (TypeScript, React, Next.js, Python, PostgreSQL)
- 15 years of clinical practice (cognitive behavioural therapy, NHS and private)

## What I'm looking for

An applied engineering role where building with AI agents and knowing where they fail is the work. An engineering seat where the failure mode taxonomy, the verification discipline, and the clinical instinct for "something is off" are directly useful.

The portfolio is the process. Both repos are public.

---

*[oceanheart.ai](https://oceanheart.ai) | [github.com/rickhallett/thepit](https://github.com/rickhallett/thepit) | [github.com/rickhallett/thepit-v2](https://github.com/rickhallett/thepit-v2)*
