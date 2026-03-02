# 22-short-links-sharing

## Context
depends_on: [21]
produces: [lib/sharing/short-links.ts, app/api/short-links/route.ts, components/engagement/share-panel.tsx, app/b/[id]/page.tsx, lib/sharing/short-links.test.ts]
domain: lib/sharing/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (API Contracts — POST /api/short-links, Social Flow, UI Pages — /b/[id])
- lib/sharing/DOMAIN.md
- db/schema.ts (short_links table — unique slug, unique bout_id)
- db/index.ts (db instance)
- lib/common/api-utils.ts (errorResponse, parseValidBody)
- components/arena/arena.tsx (bout viewer — where share panel will appear)

## Task

### 1. Short links library

Create `lib/sharing/short-links.ts`:

```typescript
import { nanoid } from "nanoid";
import { z } from "zod";

export const ShortLinkRequestSchema = z.object({
  boutId: z.string(),
});

export async function createShortLink(boutId: string): Promise<string>
// 1. Check if short link already exists for this boutId
//    SELECT slug FROM short_links WHERE bout_id = boutId
//    If found, return existing slug
// 2. Generate slug: nanoid(8)
// 3. INSERT INTO short_links (bout_id, slug) ON CONFLICT (bout_id) DO NOTHING
// 4. If INSERT was a no-op (race condition), SELECT again and return
// 5. Return slug

export async function resolveShortLink(slug: string): Promise<string | null>
// SELECT bout_id FROM short_links WHERE slug = slug
// Return boutId or null
```

### 2. API route

Create `app/api/short-links/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  // 1. Parse body with ShortLinkRequestSchema
  // 2. Verify bout exists (SELECT id FROM bouts WHERE id = boutId)
  //    If not found, return 404
  // 3. Create short link
  // 4. Return { ok: true, slug, url: `/b/${slug}` }
}
```

No auth required — anyone can create a short link for a public bout.

### 3. Share panel component

Create `components/engagement/share-panel.tsx`:

```typescript
"use client";

interface SharePanelProps {
  boutId: string;
  shareLine: string;
  shortSlug?: string;
}

export function SharePanel({ boutId, shareLine, shortSlug }: SharePanelProps)
```

Implementation:
- On mount, if no shortSlug provided, call POST /api/short-links to create one
- Show share buttons for: X (Twitter), Reddit, WhatsApp, Telegram, LinkedIn, Copy Link
- Each button opens the respective share URL in a new tab with pre-filled text (shareLine + link)
- Copy Link button copies `{origin}/b/{slug}` to clipboard
- Share URLs:
  - X: `https://x.com/intent/tweet?text=${text}&url=${url}`
  - Reddit: `https://reddit.com/submit?title=${text}&url=${url}`
  - WhatsApp: `https://wa.me/?text=${text} ${url}`
  - Telegram: `https://t.me/share/url?url=${url}&text=${text}`
  - LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
- `data-testid="share-panel"` for testing

### 4. Short link redirect page

Create `app/b/[id]/page.tsx`:

```typescript
import { redirect, notFound } from "next/navigation";
import { resolveShortLink } from "@/lib/sharing/short-links";

export default async function ShortLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boutId = await resolveShortLink(id);
  if (!boutId) notFound();
  redirect(`/bout/${boutId}`);
}
```

For now this is a simple redirect. Task 25 will convert this into a full replay page.

### 5. Wire share panel into arena

Update `components/arena/arena.tsx`:
- After bout completes (status === 'done'), render `<SharePanel>` below the transcript
- Pass boutId and shareLine from useBout hook

### 6. Unit tests

Create `lib/sharing/short-links.test.ts`:

Mock `db` for all tests.

Tests:
- Test createShortLink: no existing link → INSERT → return slug
- Test createShortLink: existing link → return existing slug (idempotent)
- Test resolveShortLink: known slug → return boutId
- Test resolveShortLink: unknown slug → return null
- Test slug is 8 characters (nanoid(8))

### Do NOT
- Build OpenGraph/meta tag generation — that's a polish task
- Add analytics tracking on share clicks
- Create a link shortener service — this is bout-specific only
- Add link expiration — short links are permanent

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — short-links tests pass
- `app/api/short-links/route.ts` exports POST handler
- `app/b/[id]/page.tsx` redirects to /bout/{boutId}
- Share panel shows 6 share options
- createShortLink is idempotent (same boutId → same slug)
- `data-testid="share-panel"` is present on the component
