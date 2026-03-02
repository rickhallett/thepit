# 25-replay-page

## Context
depends_on: [15, 22]
produces: [app/b/[id]/page.tsx, components/engagement/bout-hero.tsx]
domain: components/engagement
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md — "UI Pages" section for /b/[id]
- components/engagement/share-panel.tsx — existing share panel (from task 22)
- components/arena/arena.tsx — existing Arena component (from task 15)
- components/arena/message-card.tsx — existing message card
- lib/engagement/reactions.ts — getReactionCounts, getMostReactedTurnIndex (if exists)
- lib/engagement/votes.ts — getWinnerVoteCounts
- lib/sharing/short-links.ts — resolveShortLink
- db/schema.ts — bouts table for transcript shape

## Task
Create the short-link replay page and bout hero component.

### app/b/[id]/page.tsx (server component)
- Look up bout by ID (param is the bout ID, NOT the short link slug)
- If not found, return 404
- Fetch: bout record, reaction counts, winner vote counts
- Render BoutHero above fold, then full Arena component in read-only mode
- No streaming — render complete transcript statically
- For signed-out users: show a CTA banner at bottom ("Create your own debate")
- Use data-testid="replay-page" on wrapper
- Generate dynamic metadata (OG title, description from share line)

### components/engagement/bout-hero.tsx (server component)
- Props: presetName, agents (name + color), shareLine, transcript, mostReactedTurn
- Display the "hero quote": most-reacted turn's content, or shareLine, or first transcript entry (fallback chain)
- Show agent name and color indicator
- Show reaction counts for the hero turn (if applicable)
- Use data-testid="bout-hero" on wrapper
- Use data-testid="hero-quote" on the quote text

### Update app/b/[id]/page.tsx short link resolution
- If the URL is /b/{id} where id looks like a short link slug (8 chars), resolve via resolveShortLink first
- If it's a bout ID (21 chars), look up directly
- This dual-resolution allows both /b/{boutId} and /b/{slug} to work

### E2e test (update tests/e2e/sharing-flow.spec.ts)
- Complete a bout → get short link → navigate to /b/{slug} → see replay
- Verify bout hero shows quote text
- Verify transcript is fully rendered (not streaming)
- Verify CTA banner appears for signed-out users

## Do NOT
- Do NOT implement click analytics for short links
- Do NOT implement social meta image generation (OG image)
- Do NOT implement "replay speed" or animated replay — render static transcript
- Do NOT duplicate the Arena component — reuse it in read-only mode (pass a prop like `readOnly={true}` or `isReplay={true}`)

## Verification
After implementing, verify:
- `pnpm run typecheck` passes
- E2e: navigate to /b/{boutId} → see full transcript with hero
- Manual: verify bout hero shows the most relevant quote
