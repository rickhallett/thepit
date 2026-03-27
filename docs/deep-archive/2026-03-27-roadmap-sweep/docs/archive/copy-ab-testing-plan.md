# Copy A/B Testing Infrastructure — End-to-End Plan

> Created: 2026-02-15
> Status: Approved, in progress
> Branch: `feat/copy-ab-testing`

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD TIME                               │
│                                                                 │
│  copy/base.json ──→ pnpm run copy:generate ──→ copy/variants/  │
│  (extracted from      (LLM transforms          ├── control.json │
│   current site)        with dimension           ├── hype.json   │
│                        parameters)              └── precise.json│
│                                                                 │
│  copy/experiment.json ← traffic allocation config               │
│  { "variants": { "control": 40, "hype": 30, "precise": 30 } }  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       REQUEST TIME                              │
│                                                                 │
│  middleware.ts                                                  │
│  ├── Read pit_variant cookie                                    │
│  ├── If missing: weighted random assignment → set cookie        │
│  ├── ?variant=xyz URL override (QA/testing)                     │
│  └── Propagate variant via x-copy-variant header                │
│                                                                 │
│  lib/copy.ts                                                    │
│  ├── getCopy() → resolves from active variant JSON              │
│  ├── Server: reads header to determine variant                  │
│  └── Caches parsed JSON per variant (module-level Map)          │
│                                                                 │
│  Pages & Components                                             │
│  ├── Server components: const c = getCopy(); c.hero.title       │
│  └── Client components: useCopy() hook → CopyContext            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ANALYTICS                                 │
│                                                                 │
│  PostHog: variant registered as super property                  │
│  ├── Every event auto-tagged with copy_variant                  │
│  ├── Funnel analysis by variant                                 │
│  └── Engagement metrics segmented by variant                    │
│                                                                 │
│  Server logs: variant injected into request context             │
│  ├── log.metric('copy_variant_served', { variant, path })       │
│  └── All withLogging calls auto-include variant                 │
│                                                                 │
│  DB: page_views gains copy_variant column                       │
│  └── Enables SQL-level analysis without PostHog dependency      │
└─────────────────────────────────────────────────────────────────┘
```

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Legal page scope | Include everything | Externalized but marked immutable |
| Resolution strategy | Server-side | Better SEO, no flash of content |
| Variant generation | LLM at build time | CLI outputs JSON, committed to git |
| User assignment | Cookie-based sticky | 30-day cookie, weighted random |
| Concurrency model | Full A/B split | Config specifies traffic weights |
| Launch scope | 3 variants | control + hype + precise |
| API key | CLI arg with project key default | Falls back to ANTHROPIC_API_KEY |
| Prompt engineering | XML-style | Project standard |

## PR Strategy

1. **PR 1: Infrastructure** — Schema, runtime, middleware, analytics, unit tests
2. **PR 2: Copy extraction** — Extract all copy, replace hardcoded strings
3. **PR 3: Variants** — Generation CLI, 3 variants, E2E tests
