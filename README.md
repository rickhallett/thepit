# The Pit (Phase 1)

The original build. A real-time AI debate arena where language models argue structured debates while generating behavioural data.

This repo contains the full product codebase from February-March 2026: a Next.js 16 application with Clerk authentication, Stripe payments, a credit economy, agent prompt DNA hashing, and 1,289 passing tests. Users pick debate presets, watch agents argue in real-time via SSE, vote on winners, and react to individual turns. 16 debate formats. Agent cloning. Demo mode. BYOK for subscribers.

Alongside the product, the repo contains 275+ timestamped session decisions recording every significant choice made during development - including the ones that turned out to be wrong. A taxonomy of LLM output failure modes, each caught in the wild. A governance methodology for coordinating LLM agents, built incrementally and revised when it broke. Eight Go CLI tools for the project's own workflow.

The interesting finding was not about the product. It was that sycophantic drift - agents performing honesty while being dishonest about their confidence - is harder to catch than hallucination, because it passes every surface-level check. The operational controls built to address this became the foundation for the next two phases.

## Stack

Next.js 16, TypeScript (strict), Go 1.25, Drizzle ORM, Neon Postgres, Clerk, Stripe, Vitest (1,289 tests), Playwright, Tailwind, Sentry, PostHog, EAS (Base L2).

## Consolidated

This repo's contents and git history have been consolidated into [thepit-cloud](https://github.com/rickhallett/thepit-cloud) via subtree merge. Development continues there. This repo is kept for reference.

Richard Hallett - [oceanheart.ai](https://oceanheart.ai)
