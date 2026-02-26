# RT L3 — Artisan Report
Date: 2026-02-24
Agent: Artisan
Statement presentation order: C, B, A

## Pre-Launch Recommendations

These recommendations come from a fresh, unbiased reading of the frontend codebase — not from confirming or contradicting L2 findings. Each is grounded in what I actually see in the components, pages, and streaming UX.

### 1. Add `role="dialog"` and `aria-modal="true"` to AgentDetailsModal

The modal at `components/agent-details-modal.tsx` is missing these attributes. It already handles Escape-to-close and backdrop click, but screen readers cannot identify it as a modal overlay. This is a 2-line change. The modal also lacks focus trapping — Tab will escape into the page behind it. A minimal `focusTrap` effect (trap Tab/Shift+Tab within the modal container) would bring this to baseline. **Estimated effort: 15 minutes. Recommend doing before launch.**

### 2. The streaming UX is genuinely excellent — do not touch it

The thinking-delay pattern in `lib/use-bout.ts` is the single most differentiating piece of frontend engineering in this project. The 2-4s random buffer + flush creates an experience that feels alive rather than mechanical. The state machine is clean (`pending -> thinking -> streaming -> complete`), the SSE event handling covers all edge cases, and the auto-scroll with user-override is well-implemented. This is not an area that needs polish. Mentioning it because "don't fix what works" is a recommendation.

### 3. The DnaFingerprint visualisation is a genuine differentiator — protect it

The `components/dna-fingerprint.tsx` component is elegant: deterministic, symmetric, visually distinct across hashes, has proper `aria-label` and `role="img"`, handles invalid hashes gracefully, and the Tokyo Night palette is curated. This is the kind of detail that HN will notice and respect. It gives the cryptographic identity layer a visual hook. No changes needed. If anything, consider making the fingerprint slightly more prominent on the agent detail page (currently 40px in the modal header — could go to 56-64px without disrupting layout).

### 4. The copy/i18n system (`useCopy()`) is architecturally sound but adds indirection

Every component calls `useCopy()` and renders `c.arenaComponent.header.badge` style keys. This is correct architecture for a product that might internationalise, but for a Show HN launch, it means no reviewer can read the JSX and understand what the user sees. The copy is one level removed from the render tree. **This is not a problem to fix** — it's an observation that the codebase looks more complex than it is. If you write an HN post or README walkthrough, call this out as a deliberate design choice.

### 5. Mobile navigation is handled correctly

The `SiteHeader` has a proper hamburger toggle with `aria-label` and `aria-expanded`, auto-closes on pathname change, and renders AuthControls inside the mobile drawer. The "More" dropdown has `aria-haspopup` and closes on outside click. The responsive breakpoint (`lg:hidden` / `lg:flex`) is clean. The mobile nav is ready for launch.

### 6. Landing page information density is high — this is a strength, not a risk

The landing page (`app/page.tsx`) has 7 sections: hero, how-it-works, featured presets, research layer, builder showcase, pricing, and newsletter. For HN, this is the right density. The audience wants to see the full scope in one scroll. The pricing section is transparent (Free / GBP 3/mo / GBP 10/mo with clear feature lists). The research stats section gives academic credibility. The "Most Popular" badge was already removed (comment in code: "Captain's QA decision — too generic for HN"). Good call.

### 7. The Arena component is the largest and most complex — it holds up

At 644 lines, `components/arena.tsx` is the heaviest component. It composes well: `BoutHeader`, `MessageCard`, `WinnerVotePanel`, `RerollPanel`, `BoutError`, and `SharePanel` are all clean sub-components. The `MessageCard` has reaction buttons, per-message sharing (X, Reddit, LinkedIn, WhatsApp, Telegram), and copy functionality. The error handling is contextual: 401 shows sign-in, 402 shows get-credits, 429 shows rate-limit upgrade prompt. This is production-grade error UX.

### 8. Color-only status indicators in FreeBoutCounter

Flagged in my role definition's known issues list. The `free-bout-counter.tsx` uses color as the only indicator of state. A text or icon fallback should be added for colour-blind users. **Low effort, recommend doing before launch if time permits.** If not, it's P2 — it doesn't block launch.

### 9. Contact form label bindings

The `app/contact/page.tsx` is missing `htmlFor`/`id` bindings between labels and inputs. This is a basic accessibility requirement. **Estimated effort: 5 minutes.** Recommend fixing.

### 10. No critical performance concerns for launch

The component tree is well-structured: server-rendered landing page, client-only interactive components properly marked with `'use client'`, no unnecessary client bundles on static pages. The `ask-the-pit-lazy.tsx` wrapper suggests the AI FAQ widget is lazy-loaded. The engagement tracking (`initScrollDepthTracking`, `initActiveTimeTracking`) is initialised in effects with proper cleanup. No red flags.

### 11. Design system consistency is strong

Spot-checking across the landing page, arena, agent details modal, and header: the brutalist aesthetic is consistently applied. Uppercase tracking on labels, accent colour on CTAs, box shadows on cards, `cn()` used for class merging (not string concatenation). The `PitButton` and `PitBadge` primitives in the Arena suggest a UI primitive layer is emerging. The design system is coherent.

### Summary

**The frontend is launch-ready.** Three small accessibility fixes (modal ARIA + focus trap, contact form labels, colour-only indicator) would bring it to full compliance, totalling ~30 minutes of work. The streaming UX and DNA fingerprint visualisation are genuine differentiators that communicate engineering depth. The landing page density is appropriate for the HN audience. The design system is consistent and distinctive.

If the Captain has 30 minutes: fix items 1, 8, and 9. If not: ship as-is. None of these are launch-blocking.

## Strategic Framing — Rank Order
1st: B — "Ship over polish." The frontend I've reviewed is a complete, working product with a distinctive visual identity, production-grade streaming UX, and contextual error handling. The remaining gaps are P2 accessibility items, not structural deficiencies. The composition — brutalist design + DNA fingerprints + thinking-delay streaming + transparent pricing + research stats — is genuinely novel. HN rewards shipped ambition with honest trade-offs over theoretical perfection. The product communicates seriousness. Ship it.

2nd: A — "Polish for portfolio." There is real portfolio value here. The DnaFingerprint component alone demonstrates non-trivial frontend thinking (deterministic visual identity from cryptographic hashes). The streaming UX shows understanding of perceived performance. The copy system shows architecture for scale. But the project's value exceeds portfolio positioning — it is a working product with a monetisation path, not a demo. Reducing it to a portfolio piece underweights what exists.

3rd: C — "Applied engineering practice." The engineering practice is undeniably strong and transferable. But this framing implies the product itself is secondary — that the value was in the doing, not the done. From the frontend I've reviewed, the done is substantial. The product is not a learning exercise that produced incidental output; it is a finished product that happens to also demonstrate excellent process. The process was a means, not the end.
