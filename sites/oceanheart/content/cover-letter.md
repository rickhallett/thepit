+++
title = "Cover Letter"
description = "Richard (Kai) Hallett - Senior Software Engineer"
layout = "page"
draft = true
+++

Hi,

I'm a senior software engineer with 5 years shipping TypeScript, Python, and Go across retail analytics (EDITED), social intelligence (Brandwatch), and network security (Telesoft). Before that I spent 15 years as a cognitive behavioural therapist. The career change sounds stranger than it is - the core skill in both fields is the same: noticing when a system is producing confident, coherent output that is wrong.

I am looking for a senior engineering role where that combination is useful.

For the last year I have been building The Pit, a full-stack evaluation platform (Next.js, TypeScript, Drizzle, Neon Postgres) where AI models compete in structured debate formats. The product is real - credit-based access, real-time SSE streaming, Stripe payments, public roadmap - but the interesting part is underneath: I built an agentic engineering layer to ship it. Eight specialised AI agents governed by integration discipline, multi-model adversarial code review (Claude, Codex, Gemini reviewing every commit independently), cryptographically attested commits tied to git tree hashes, and operator fatigue monitoring that will shut down the OS if cognitive reserves deplete. The repo is public. The git log is the proof.

The test suite is at 1,340 tests with 95% coverage. The verification pipeline is a real thing, not a slide. Every code change survives three independent model reviews against a structured adversarial prompt before it enters the branch. I built the anti-pattern taxonomy (49 named failure modes, each caught in the wild), the context engineering vocabulary, and the operator telemetry. These came from the practical problems, not from a research agenda.

What I bring that is harder to find: I have direct experience of what happens when you give AI agents real responsibilities and hold them accountable. Not toy examples - production features shipped through a verification pipeline I designed and iterated over hundreds of commits. I know where the models fail (sycophantic drift, not hallucination, was the crisis point), what the structural controls are, and why process is the product when your co-workers are probabilistic.

I also know when the tooling does not help. This week I evaluated a multi-agent orchestration platform. Manual single-agent dispatch with my verification pipeline produced 40 PRs in a day. The autonomous six-agent swarm produced 3, plus a cleanup operation. I wrote up the findings honestly rather than pretending it worked. Engineering judgment about when not to adopt a tool matters as much as knowing how to use one.

The psychology background is not decoration. The pitkeel daemon (operator telemetry) came directly from CBT's model of cognitive load and behavioural activation. The anti-pattern taxonomy applies the same pattern recognition I used in clinical work - noticing when plausible output is wrong - to LLM output at scale. The context-window management maps to working memory. These are not analogies; they are the same problem in a different substrate.

The repo is at github.com/rickhallett/thepit. The site is at oceanheart.ai. Everything I claim is auditable.

I would welcome the chance to talk about what I have built and how it might be useful to you.

Rick Hallett
kai@oceanheart.ai
