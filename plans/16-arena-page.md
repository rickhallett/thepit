# 16-arena-page

## Context
depends_on: [15]
produces: [app/arena/page.tsx, components/arena/preset-card.tsx]
domain: components/arena/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (UI Pages — /arena, Bout Flow — user picks preset)
- components/DOMAIN.md
- lib/bouts/presets.ts (getAllPresets, Preset type)
- app/bout/[id]/page.tsx (where user is redirected to)
- lib/credits/balance.ts (getCreditBalanceMicro)
- lib/auth/middleware.ts (getAuthUserId)

## Task

### 1. Arena page (server component)

Create `app/arena/page.tsx`:

```typescript
import { getAllPresets } from "@/lib/bouts/presets";
import { PresetCard } from "@/components/arena/preset-card";
import { getAuthUserId } from "@/lib/auth/middleware";
import { getCreditBalanceMicro } from "@/lib/credits/balance";
import { fromMicroCredits } from "@/lib/credits/catalog";

export default async function ArenaPage() {
  const presets = getAllPresets();
  const userId = await getAuthUserId();
  
  let creditBalance: number | null = null;
  if (userId) {
    const balanceMicro = await getCreditBalanceMicro(userId);
    creditBalance = fromMicroCredits(balanceMicro);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">The Arena</h1>
      {creditBalance !== null && (
        <p className="text-lg mb-6">Credits: {creditBalance}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset) => (
          <PresetCard key={preset.id} preset={preset} />
        ))}
      </div>
    </main>
  );
}
```

### 2. Preset card (client component)

Create `components/arena/preset-card.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import type { Preset } from "@/lib/bouts/presets";

interface PresetCardProps {
  preset: Preset;
}

export function PresetCard({ preset }: PresetCardProps)
```

Implementation:
- Display: preset name, description, agent names and colors (small pills/badges), max turns
- Model selector: dropdown with "Haiku" (default) option. Sonnet option shown but can be disabled for now.
- Optional topic input: text field for custom topic (uses preset description if empty)
- Submit button: "Start Debate"
- On submit:
  1. Generate boutId with `nanoid(21)`
  2. Navigate to `/bout/${boutId}?presetId=${preset.id}&topic=${topic}&model=${model}` using `router.push`

The bout page will read query params and auto-start the bout.

### 3. Update bout page to read query params

Update `app/bout/[id]/page.tsx` to pass `autoStart` props to Arena when query params are present:

```typescript
import { type NextRequest } from "next/server";

export default async function BoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ presetId?: string; topic?: string; model?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  
  // ... look up bout ...

  const autoStart = search.presetId
    ? { presetId: search.presetId, topic: search.topic, model: search.model }
    : undefined;

  return <Arena boutId={id} initialBout={bout || null} autoStart={autoStart} />;
}
```

### 4. E2e test stub

Add to `tests/e2e/bout-flow.spec.ts`:

```typescript
test.skip("navigate to /arena → see presets → click → redirect to bout page", async ({ page }) => {
  // Navigate to /arena
  // Verify preset cards are visible
  // Click "Start Debate" on first preset
  // Verify redirect to /bout/{id}
});
```

### Do NOT
- Add subscription upgrade UI — that's task 19
- Add credit pack purchase — that's task 19
- Implement custom arena builder (/arena/custom) — that's out of scope for MVP
- Add authentication wall — anonymous users can view the arena
- Build an elaborate model selector — simple dropdown is sufficient

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0
- `app/arena/page.tsx` is a server component that loads presets
- `components/arena/preset-card.tsx` is a client component with submit handler
- PresetCard generates a nanoid boutId and navigates to /bout/{id}
- Bout page reads searchParams and passes autoStart to Arena
- Credit balance displays for authenticated users
