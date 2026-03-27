# Artisan Review — Frontend Zombie Code Audit
Date: 2026-02-28
Reviewer: Artisan
HEAD: 89f6a07

## Executive Summary

The frontend layer is remarkably clean for an agentic-built codebase. All 38 component files are imported and rendered in at least one live page or parent component, all custom hooks are consumed, all API routes are referenced by client code or tests, and no unused npm dependencies were found. The primary findings are: (1) one fully dead component (`free-bout-counter.tsx`, explicitly commented out), (2) one expired event component (`darwin-countdown.tsx`, launch countdown for a date 15 days ago, never imported in any page), (3) an archived file that should be deleted, (4) Hugo-generated static files that are superseded by the Next.js sitemap/robots system, and (5) one unreferenced static asset. Estimated safe LOC reduction: ~400 lines across source + data files.

## Methodology

1. Listed all 38 component files in `components/` and all files in `app/`, `lib/`, `public/`
2. Cross-referenced every component against imports in pages, layouts, and other components using `rg -l`
3. Verified every `lib/*.ts` file has external references (all do)
4. Checked every `package.json` dependency for actual import in source files
5. Scanned `public/` for unreferenced static assets
6. Compared `b/[id]` vs `bout/[id]` routes (confirmed: different functionality, not duplicates)
7. Checked copy schema interfaces and JSON data for orphaned sections

## Findings by Risk Level

### SAFE — Remove with high confidence (no regression risk)

#### 1. `components/free-bout-counter.tsx` — Dead component (52 LOC)
- **Evidence**: The only reference outside its own file is a comment in `app/arena/page.tsx:1`:
  ```
  // FreeBoutCounter removed — free bout pool replaced by intro pool half-life decay
  ```
- The component is never imported or rendered anywhere. The free bout pool mechanic was replaced by the intro pool half-life decay system.
- **Action**: Delete `components/free-bout-counter.tsx`. Remove the stale comment from `app/arena/page.tsx`.
- **LOC reduction**: ~52

#### 2. `archive/share-modal.tsx` — Archived file still in repo (189 LOC)
- **Evidence**: The `archive/` directory contains a single file, `share-modal.tsx`. It is never imported anywhere. The component `arena.tsx` contains a comment: `{/* ShareModal archived — inline SharePanel is the primary share surface (Captain's QA decision) */}`
- The `tests/unit/share-modal-guard.test.ts` file does NOT import from archive — it defines its own inline pure function to test the guard logic. The test is self-contained and valid.
- **Action**: Delete `archive/` directory entirely.
- **LOC reduction**: ~189

#### 3. Hugo-generated XML files in `public/` — Dead static assets (44 LOC)
- **Files**:
  - `public/index.xml` (11 lines) — Hugo RSS feed referencing `//localhost:1313/`
  - `public/sitemap.xml` (11 lines) — Hugo sitemap referencing `//localhost:1313/`
  - `public/categories/index.xml` (11 lines) — Hugo categories feed
  - `public/tags/index.xml` (11 lines) — Hugo tags feed
- **Evidence**: All four files contain `//localhost:1313/` URLs from a Hugo static site generator. The Next.js app generates its own sitemap via `app/sitemap.ts` (dynamic, revalidates hourly) and robots via `app/robots.ts`. These files are never referenced in any TypeScript/TSX source. They are served as static files by Next.js and could confuse crawlers with stale localhost URLs.
- **Action**: Delete all four XML files and the empty `public/categories/` and `public/tags/` directories.
- **LOC reduction**: ~44

#### 4. `public/pit-logo.svg` — Unreferenced static asset (39 LOC)
- **Evidence**: Exhaustive search (`rg 'pit-logo'` across all `.tsx`, `.ts`, `.css`, `.html`, `.json` files) found zero references in the Next.js application source. The logo is never imported, never referenced as a URL path (`/pit-logo.svg`), never used in OG images, header, or footer. The only hits were in `sites/oceanheart/Makefile` and `slopodar.yaml` (neither is part of the Next.js app).
- **Action**: Delete `public/pit-logo.svg`.
- **LOC reduction**: ~39

### LOW RISK — Remove with basic verification

#### 5. `components/darwin-countdown.tsx` — Expired countdown component (102 LOC)
- **Evidence**: This component counts down to `2026-02-13T11:55:00Z` (Darwin Day launch). That date was 15 days ago. Post-launch, the component displays a "WE'RE LIVE" banner. However, it is **never imported in any page or layout**. The only references are:
  - Its own definition (`components/darwin-countdown.tsx`)
  - The copy schema type (`copy/schema.ts:292` — `DarwinCountdownCopy` interface)
  - Copy data in `copy/base.json` and 3 variant JSON files
- The component was likely used during pre-launch and removed from pages after launch, but the component file and its copy data were not cleaned up.
- **Action**: Delete `components/darwin-countdown.tsx`. Remove `DarwinCountdownCopy` interface from `copy/schema.ts` (~10 lines). Remove `darwinCountdown` key from `copy/base.json` (~10 lines) and variant JSON files (~10 lines each, 3 variants = ~30 lines). Remove `darwinCountdown` from the `CopySchema` interface property.
- **Verification**: Run `pnpm run typecheck` after removal to confirm no references break.
- **LOC reduction**: ~152 (102 component + ~50 copy schema/data)

#### 6. Copy schema/data for `DarwinCountdown` — Orphaned copy entries (~50 LOC)
- Captured in finding #5 above. The `DarwinCountdownCopy` interface in `copy/schema.ts`, the `darwinCountdown` key in `copy/base.json`, and matching entries in `copy/variants/control.json`, `copy/variants/precise.json`, and `copy/variants/field-notes.json` are all dead once the component is removed.

### MEDIUM RISK — Remove with careful verification

#### 7. Duplicate `loading.tsx` files for `b/[id]` and `bout/[id]` (24 LOC savings)
- **Files**: `app/b/[id]/loading.tsx` (24 LOC) and `app/bout/[id]/loading.tsx` (24 LOC)
- **Evidence**: These files are byte-for-byte identical (same MD5 hash) except the function name (`ReplayLoading` vs `BoutLoading`). Both render the same skeleton UI.
- **Note**: Next.js requires `loading.tsx` to be physically present in each route segment — you cannot share one file across routes. This is structural duplication mandated by the framework, not zombie code. However, both could import a shared skeleton component to reduce the duplication.
- **Action**: Extract the shared skeleton markup to a `components/bout-skeleton.tsx` and have both loading files import it. This reduces 48 LOC to ~15 LOC total (shared component + two thin wrappers).
- **LOC reduction**: ~24 (net, after shared component)

#### 8. Identical `opengraph-image.tsx` for `b/[id]` and `bout/[id]` (15 LOC savings)
- **Files**: `app/b/[id]/opengraph-image.tsx` and `app/bout/[id]/opengraph-image.tsx`
- **Evidence**: MD5 identical (`d431905ee8cb8a81a80b4ea4eb577659`). Both delegate to `renderBoutOGImage(id)`.
- **Note**: Same framework constraint as loading.tsx — Next.js requires the file in each route segment. These are structurally necessary. Could use a shared re-export pattern but the savings are minimal.
- **Action**: Optional. Both are 15 LOC and already delegate to a shared function. Low value to refactor.
- **LOC reduction**: ~0 (already thin wrappers)

### HIGH RISK — Investigate before removing

#### 9. `slopodar.yaml` — Corrupted/non-standard file in repo root (145 LOC)
- **Evidence**: This is a 145-line UTF-8 text file in the repo root containing what appears to be data with repeated `pit-logo` string concatenations (hundreds of times per line). `file` identifies it as Unicode text. It is referenced by `copy/variants/control.json` and `sites/oceanheart/` templates, suggesting it's part of the oceanheart/slopodar subsystem, not the Next.js frontend.
- **Note**: This is outside the frontend scope but flagged because it's unusual. The Captain or Weaver should investigate whether this is intentional data or a corrupted artifact.
- **Action**: Defer to Captain/Weaver. Not a frontend concern.

## Unused Frontend Dependencies

**None found.** Every `dependencies` and `devDependencies` entry in `package.json` has verified imports in source files:

| Package | Used in |
|---------|---------|
| `@fontsource/ibm-plex-mono` | `app/globals.css` |
| `@fontsource/space-grotesk` | `app/globals.css` |
| `lucide-react` | `components/agent-icon.tsx` (single consumer, but active) |
| `clsx` | `components/dna-fingerprint.tsx`, `lib/cn.ts` |
| `tailwind-merge` | `lib/cn.ts` |
| `posthog-js` | `lib/analytics.ts`, `components/posthog-provider.tsx` |
| `posthog-node` | `lib/posthog-server.ts` |
| `@vercel/analytics` | `app/layout.tsx` |
| `@clerk/nextjs` | `middleware.ts`, multiple components |
| `@clerk/themes` | `app/layout.tsx` |
| `@scalar/nextjs-api-reference` | `app/docs/api/route.ts` |
| `@sentry/nextjs` | `lib/bout-engine.ts`, sentry config files |
| `nanoid` | `app/actions.ts`, tests |
| `stripe` | `lib/stripe.ts`, `db/schema.ts` |
| `langsmith` | `lib/bout-engine.ts`, `lib/langsmith.ts` |
| `ethers` | `lib/eas.ts` |
| `@ethereum-attestation-service/eas-sdk` | `lib/eas.ts` |
| `canonicalize` | `lib/agent-dna.ts` |
| `@openrouter/ai-sdk-provider` | `lib/ai.ts` |

No Aceternity, Framer Motion, three.js, GSAP, or other abandoned UI library references were found.

## Items Confirmed NOT Dead (False Positive Avoidance)

- **`b/[id]` vs `bout/[id]`**: Different pages. `b/[id]` is a simpler replay page with `BoutHero` and a sign-up CTA banner. `bout/[id]` is the full bout page with search params, model selection, credit estimation, and DB backfill logic.
- **All 5 `loading.tsx` files**: Next.js App Router convention — auto-used as Suspense boundaries. Not dead.
- **`components/ui/button.tsx` and `components/ui/badge.tsx`**: Both used. Button used in 3 components + archive. Badge used in `arena.tsx`.
- **All custom hooks** (`use-bout`, `use-bout-reactions`, `use-bout-sharing`, `use-bout-voting`, `use-byok-model-picker`): All imported and used in components.
- **All lib/ files**: Every file has at least 1 external reference (verified via `rg`).
- **Copy schema interfaces**: Used internally by the copy system. The `CopySchema` root interface is referenced by 4 files outside `copy/`. Individual sub-interfaces are consumed through typed access. Only `DarwinCountdownCopy` is orphaned (no consuming component).
- **`tests/unit/share-modal-guard.test.ts`**: Self-contained test with inline function. Does NOT depend on `archive/share-modal.tsx`. Valid test.
- **`app/globals.css`**: Lean (61 LOC). Only custom class is `.text-sm` override which is intentional.

## Estimated Total LOC Reduction

| Finding | Category | LOC |
|---------|----------|-----|
| `free-bout-counter.tsx` | Dead component | 52 |
| `archive/share-modal.tsx` | Archived file | 189 |
| Hugo XML files + dirs | Dead static assets | 44 |
| `pit-logo.svg` | Unreferenced asset | 39 |
| `darwin-countdown.tsx` | Expired component | 102 |
| DarwinCountdown copy data | Orphaned copy entries | ~50 |
| Loading.tsx dedup (optional) | Structural cleanup | ~24 |
| **Total (SAFE + LOW RISK)** | | **~476** |
| **Total (including MEDIUM)** | | **~500** |

## Assessment

The frontend is disciplined. 38 components, all live. 5 custom hooks, all consumed. Zero unused npm packages. The dead code is a small tail: one explicitly retired component, one expired launch countdown, an archived file that should have been deleted, and Hugo artifacts from a previous static site that leaked into the Next.js `public/` directory. The cleanup is straightforward and low-risk. The codebase does not have the "feature graveyard" pattern common in agentic-built projects — someone (or some agent) has been maintaining hygiene during iteration.
