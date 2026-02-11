[← Root](../README.md)

# components/

21 React components in a flat directory. All but two (`SiteFooter`, `PostHogProvider`) are marked `'use client'`. There are no subdirectories and no shared UI primitive layer — styling is applied directly via Tailwind classes with a consistent brutalist design vocabulary.

## Component Inventory

### Core Arena

| File | Component | Purpose |
|------|-----------|---------|
| `arena.tsx` | `Arena` | Bout viewer: streaming messages, reactions (heart/fire), winner voting, share buttons, auto-scroll |
| `arena-builder.tsx` | `ArenaBuilder` | Custom bout form: pick 2-6 agents, set topic/length/format/model, BYOK support |
| `preset-card.tsx` | `PresetCard` | Preset scenario card: name, agents, model selector, credit estimate |

### Agent System

| File | Component | Purpose |
|------|-----------|---------|
| `agent-builder.tsx` | `AgentBuilder` | 4-tab form (Basics/Personality/Tactics/Advanced) with live prompt preview |
| `agents-catalog.tsx` | `AgentsCatalog` | Searchable/filterable grid with preset, tier, and text filters |
| `agent-details-modal.tsx` | `AgentDetailsModal` | Full-screen DNA modal: prompt, hashes, attestation link, lineage, clone button |
| `clone-agent-button.tsx` | `CloneAgentButton` | Navigates to `/agents/clone?source={encoded-id}` |

### Leaderboard

| File | Component | Purpose |
|------|-----------|---------|
| `leaderboard-dashboard.tsx` | `LeaderboardDashboard` | Shell with PIT/PLAYER toggle and time range selector |
| `leaderboard-table.tsx` | `LeaderboardTable` | Agent rankings: bouts, wins, win rate, votes, best bout link |
| `player-leaderboard-table.tsx` | `PlayerLeaderboardTable` | Player rankings: bouts created, agents, votes, referrals |

### Platform Chrome

| File | Component | Purpose |
|------|-----------|---------|
| `site-header.tsx` | `SiteHeader` | Navigation bar with route links and auth controls |
| `site-footer.tsx` | `SiteFooter` | Footer with legal/info links |
| `auth-controls.tsx` | `AuthControls` | Clerk sign-in/up buttons or UserButton |

### Economy & Engagement

| File | Component | Purpose |
|------|-----------|---------|
| `buy-credits-button.tsx` | `BuyCreditsButton` | Submit button with `useFormStatus` pending state |
| `checkout-banner.tsx` | `CheckoutBanner` | Post-checkout banner (success/cancel), auto-dismisses 6s |
| `free-bout-counter.tsx` | `FreeBoutCounter` | Daily free bout pool progress bar |
| `intro-pool-counter.tsx` | `IntroPoolCounter` | Live-ticking community credit pool, accounts for drain rate |
| `darwin-countdown.tsx` | `DarwinCountdown` | Countdown timer to Darwin Day launch |

### Platform Features

| File | Component | Purpose |
|------|-----------|---------|
| `ask-the-pit.tsx` | `AskThePit` | Floating chat FAB for AI Q&A via streaming |
| `newsletter-signup.tsx` | `NewsletterSignup` | Email signup form |
| `posthog-provider.tsx` | `PostHogProvider` | PostHog analytics context provider |

## Composition Hierarchy

```
RootLayout (server)
  ├── SiteHeader
  │   └── AuthControls
  ├── [page content]
  ├── SiteFooter
  ├── AskThePit
  └── PostHogProvider (wraps all)

LeaderboardDashboard
  ├── LeaderboardTable
  │   └── AgentDetailsModal
  │       └── CloneAgentButton
  └── PlayerLeaderboardTable

AgentsCatalog
  └── AgentDetailsModal
      └── CloneAgentButton

Arena ← useBout hook for streaming state
PresetCard ← standalone form, server action binding
ArenaBuilder ← standalone form, server action binding
AgentBuilder ← standalone form, POSTs to /api/agents
```

**Key reuse:** `AgentDetailsModal` is shared between `LeaderboardTable` and `AgentsCatalog` — the only shared modal pattern in the codebase.

## State Management

**No global state.** No context providers (beyond Clerk and PostHog), no stores, no state management libraries. All state is component-local:

| Pattern | Usage |
|---------|-------|
| `useState` | Form inputs, filters, loading flags, selected items |
| `useMemo` | Filtered/sorted lists, share payloads, alignment maps |
| `useRef` | Scroll targets, BYOK stash flags, thinking-delay refs |
| `useEffect` | Scroll listeners, keyboard handlers (Escape), timers, SSE connection |
| `useFormStatus` | Pending state for server action form submissions |
| `useBout` (custom) | SSE streaming lifecycle — the only custom hook (from `lib/use-bout.ts`) |

## Styling Conventions

All components use Tailwind CSS v4 directly. The `cn()` utility (`clsx` + `tailwind-merge` from `lib/cn.ts`) is the only styling abstraction. Recurring patterns form a consistent brutalist design language:

- **Pill buttons:** `rounded-full border-2 border-foreground/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em]`
- **Card containers:** `border-2 border-foreground/60 bg-black/50 p-6`
- **Drop shadows:** `shadow-[6px_6px_0_rgba(255,255,255,0.2)]`
- **Typography:** IBM Plex Mono + Space Grotesk via `@fontsource`

## Design Decisions & Trade-offs

- **No shared UI primitive layer** — There's no `ui/button.tsx` or `ui/input.tsx`. Every component applies Tailwind classes directly. This works well at the current scale (21 components) because the design vocabulary is tight and consistent. If the component count grows past ~35 or if a second contributor joins, extracting shared primitives (Button, Input, Card, Modal) would reduce duplication and enforce consistency.
- **Flat directory** — No subdirectories. Components are grouped by naming convention (e.g., `agent-*`, `leaderboard-*`). Consider introducing subdirectories if component count doubles.
- **All client components** — Nearly every component is `'use client'`. This is appropriate: the components handle user interaction (forms, streaming, modals, counters). Server components are the page-level files in `app/`.

---

[← Root](../README.md) · [App](../app/README.md) · [Lib](../lib/README.md) · [DB](../db/README.md)
