# Spec: Dependency Reduction

**Status:** Draft
**Author:** Dependency Audit
**Date:** 2026-02-12

## Overview

This spec documents opportunities to reduce the dependency footprint of TSPIT by replacing third-party packages with local implementations or built-in alternatives. The goal is to reduce supply chain risk, improve bundle size, and simplify maintenance without sacrificing functionality.

## Current State

TSPIT has 23 production dependencies in `package.json`. After exhaustive analysis, we categorize them into four tiers:

| Tier | Description | Count |
|------|-------------|-------|
| **Keep** | Framework/deeply integrated, no practical alternative | 13 |
| **Replace (Easy)** | Isolated usage, local implementation feasible | 4 |
| **Replace (Medium)** | Wrapped in abstraction, moderate effort | 3 |
| **Replace (Hard)** | Deep integration, large refactor required | 3 |

---

## Phase 1: Easy Wins

**Estimated effort:** 4 hours
**Dependencies removed:** 5

### 1.1 Drop `@vercel/analytics`

**Current usage:** Single `<Analytics />` component in `app/layout.tsx`

**Problem:** Adds a dependency for Web Vitals collection that Sentry already provides.

**Solution:** Remove the component. Web Vitals are already captured by `@sentry/nextjs` performance monitoring.

**Files to modify:**
- `app/layout.tsx` — Remove import and component
- `package.json` — Remove dependency

**Verification:** Confirm Sentry dashboard shows Web Vitals metrics.

---

### 1.2 Replace `@fontsource/*` with `next/font/google`

**Current usage:**
- `@fontsource/space-grotesk` — 4 weight imports in `globals.css`
- `@fontsource/ibm-plex-mono` — 4 weight imports in `globals.css`

**Problem:** Self-hosted fonts via npm add build complexity. Next.js has built-in Google Fonts optimization with automatic subsetting and zero layout shift.

**Solution:** Use `next/font/google` for both font families.

**Implementation:**

```typescript
// app/layout.tsx
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
});

// In <html> tag:
<html className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
```

**Files to modify:**
- `app/layout.tsx` — Add font imports, apply CSS variables
- `app/globals.css` — Remove `@import` statements (lines 1-8), keep CSS variable usage
- `package.json` — Remove both `@fontsource/*` dependencies

**Verification:** Visual inspection of headings (Space Grotesk) and body text (IBM Plex Mono).

---

### 1.3 Replace `canonicalize` with local implementation

**Current usage:** Single import in `lib/agent-dna.ts`, wrapped in helper functions.

**Problem:** External dependency for RFC 8785 JSON canonicalization, which is a simple algorithm.

**Solution:** Implement RFC 8785 locally (~30 lines).

**Implementation:**

```typescript
// lib/canonicalize.ts

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS)
 * Produces deterministic JSON output for consistent hashing.
 */
export function canonicalize(value: unknown): string | null {
  try {
    return JSON.stringify(value, (_, v) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return Object.keys(v)
          .sort()
          .reduce(
            (sorted, key) => {
              sorted[key] = v[key];
              return sorted;
            },
            {} as Record<string, unknown>
          );
      }
      return v;
    });
  } catch {
    return null;
  }
}
```

**Files to modify:**
- Create `lib/canonicalize.ts` with implementation above
- `lib/agent-dna.ts` — Change import from `canonicalize` to `@/lib/canonicalize`
- `package.json` — Remove `canonicalize` dependency

**Verification:** Run `pnpm test:unit` — existing `agent-dna.test.ts` covers this.

---

### 1.4 Replace `nanoid` with `crypto.randomUUID()`

**Current usage:** 12 calls across 6 files for ID generation.

| File | Usage | Length |
|------|-------|--------|
| `middleware.ts` | Request ID | 12 |
| `middleware.ts` | Session ID | 16 |
| `app/actions.ts` | Bout ID | 21 (default) |
| `app/api/agents/route.ts` | Agent ID | 21 (default) |
| `lib/short-links.ts` | Short slug | 8 |
| `lib/referrals.ts` | Referral code | 8 |

**Problem:** External dependency for URL-safe ID generation that Node.js can do natively.

**Solution:** Create a local ID utility using `crypto.randomUUID()`.

**Implementation:**

```typescript
// lib/id.ts

/**
 * Generate a URL-safe random ID.
 * Uses crypto.randomUUID() as the entropy source.
 *
 * @param length - Desired ID length (default: 21, matching nanoid default)
 * @returns URL-safe alphanumeric string
 */
export function createId(length = 21): string {
  // UUID v4 has 122 bits of entropy; we extract characters from it
  const uuid = crypto.randomUUID().replace(/-/g, '');

  if (length <= 32) {
    return uuid.slice(0, length);
  }

  // For lengths > 32, concatenate multiple UUIDs
  let id = uuid;
  while (id.length < length) {
    id += crypto.randomUUID().replace(/-/g, '');
  }
  return id.slice(0, length);
}
```

**Files to modify:**
- Create `lib/id.ts` with implementation above
- `middleware.ts` — Replace `nanoid(12)` and `nanoid(16)` with `createId(12)` and `createId(16)`
- `app/actions.ts` — Replace `nanoid()` with `createId()`
- `app/api/agents/route.ts` — Replace `nanoid()` with `createId()`
- `lib/short-links.ts` — Replace `nanoid(8)` with `createId(8)`
- `lib/referrals.ts` — Replace `nanoid(8)` with `createId(8)`
- `package.json` — Remove `nanoid` dependency
- Update test mocks in `tests/unit/actions.test.ts`, `tests/unit/referrals.test.ts`

**Verification:**
- Run `pnpm test:unit` — existing tests use mocks
- Run `pnpm test:integration` — verifies DB constraints on ID uniqueness

**Note:** Database schema uses `varchar(21)` for bout IDs. The UUID-based approach produces hex characters (0-9, a-f), which is a subset of nanoid's alphabet but equally collision-resistant.

---

## Phase 2: Medium Effort

**Estimated effort:** 8-12 hours
**Dependencies potentially removed:** 3

### 2.1 Evaluate `posthog-js` replacement

**Current usage:**
- `components/posthog-provider.tsx` — Initialization, UTM tracking
- `lib/analytics.ts` — Event wrapper with 17 event types

**Assessment:** Already well-abstracted behind `trackEvent()` in `lib/analytics.ts`. The React provider and hooks add complexity.

**Options:**

| Option | Effort | Trade-off |
|--------|--------|-----------|
| Keep `posthog-js` | 0 | Status quo |
| Use PostHog HTTP API directly | 4h | Lose auto-capture, session replay |
| Switch to Segment | 8h | Additional service cost |
| Build minimal tracker | 6h | Custom maintenance |

**Recommendation:** Defer unless bundle size is critical. The abstraction is already in place for future migration.

---

### 2.2 Evaluate `@scalar/nextjs-api-reference` replacement

**Current usage:** Single route at `app/docs/api/route.ts`

**Options:**

| Option | Effort | Trade-off |
|--------|--------|-----------|
| Keep Scalar | 0 | Nice UI, maintained |
| Swagger UI React | 2h | More widely known |
| ReDoc | 2h | Clean docs, read-only |
| Remove API docs | 0.5h | Lose developer UX |

**Recommendation:** Keep unless API docs are unused. Scalar provides good DX.

---

### 2.3 Evaluate `lucide-react` replacement

**Current usage:** 45 icons mapped in `components/agent-icon.tsx`

**Assessment:** Well-isolated behind a single component. Tree-shaking reduces bundle impact.

**Options:**

| Option | Effort | Trade-off |
|--------|--------|-----------|
| Keep lucide-react | 0 | Works well |
| Heroicons | 4h | Fewer icons, may lack matches |
| Inline SVG strings | 8h | Zero dependencies, maintenance burden |
| Custom icon sprite | 6h | Single HTTP request, manual updates |

**Recommendation:** Keep. The abstraction in `agent-icon.tsx` makes future migration easy.

---

## Phase 3: Strategic Decisions (Out of Scope)

These dependencies are deeply integrated and replacement would be a strategic decision, not a dependency reduction task:

| Dependency | Files | Assessment |
|------------|-------|------------|
| `@clerk/nextjs` | 47 | Auth provider change = 2-3 week project |
| `@sentry/nextjs` | 9 | Error monitoring is critical; build plugin integration |
| `stripe` | 3 | Payment processor; no local replacement possible |
| `drizzle-orm` | 38 | ORM provides type safety; 50+ APIs used |
| `ai` + `@ai-sdk/anthropic` | 5 | Streaming protocol; tightly coupled to Anthropic |
| `ethers` + `@ethereum-attestation-service/eas-sdk` | 1 | Blockchain integration; protocol-specific |

---

## Dependency Matrix

### Keep (No Action)

| Package | Reason |
|---------|--------|
| `next` | Framework |
| `react`, `react-dom` | Framework |
| `drizzle-orm` | Deep integration (38 files, 50+ APIs) |
| `@neondatabase/serverless` | Database driver (single abstraction point) |
| `ai`, `@ai-sdk/anthropic` | Core streaming functionality |
| `@clerk/nextjs` | Auth provider (strategic decision) |
| `stripe` | Payment processing |
| `@sentry/nextjs` | Error monitoring (critical) |
| `clsx`, `tailwind-merge` | Already optimal (`lib/cn.ts` wrapper) |
| `ethers`, `@ethereum-attestation-service/eas-sdk` | Blockchain attestation |

### Remove in Phase 1

| Package | Replacement |
|---------|-------------|
| `@vercel/analytics` | Sentry Performance (already configured) |
| `@fontsource/space-grotesk` | `next/font/google` |
| `@fontsource/ibm-plex-mono` | `next/font/google` |
| `canonicalize` | `lib/canonicalize.ts` (~30 LOC) |
| `nanoid` | `lib/id.ts` using `crypto.randomUUID()` |

### Evaluate in Phase 2

| Package | Recommendation |
|---------|----------------|
| `posthog-js` | Keep (well-abstracted) |
| `@scalar/nextjs-api-reference` | Keep (good DX) |
| `lucide-react` | Keep (tree-shaking works) |

---

## Implementation Checklist

### Phase 1

- [ ] Remove `@vercel/analytics` from `app/layout.tsx`
- [ ] Remove `@vercel/analytics` from `package.json`
- [ ] Create font imports in `app/layout.tsx` using `next/font/google`
- [ ] Remove `@import` statements from `app/globals.css`
- [ ] Remove `@fontsource/*` from `package.json`
- [ ] Create `lib/canonicalize.ts`
- [ ] Update `lib/agent-dna.ts` import
- [ ] Remove `canonicalize` from `package.json`
- [ ] Create `lib/id.ts`
- [ ] Update all `nanoid` imports (6 files)
- [ ] Update test mocks for ID generation
- [ ] Remove `nanoid` from `package.json`
- [ ] Run `pnpm install` to update lockfile
- [ ] Run `pnpm test:ci` to verify all tests pass
- [ ] Run `pnpm build` to verify production build

---

## Success Metrics

| Metric | Before | After Phase 1 |
|--------|--------|---------------|
| Production dependencies | 23 | 18 |
| `node_modules` size | TBD | TBD |
| Bundle size (client) | TBD | TBD |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| `crypto.randomUUID()` produces different charset than nanoid | Existing IDs unaffected; new IDs are hex (0-9, a-f) which is valid for all use cases |
| Font loading regression | Test on slow connections; `next/font` has built-in optimization |
| Canonicalization edge cases | Existing tests cover usage; RFC 8785 is well-specified |
| Missing Web Vitals data | Verify Sentry Performance dashboard before removing Vercel Analytics |

---

## References

- [RFC 8785: JSON Canonicalization Scheme](https://datatracker.ietf.org/doc/html/rfc8785)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Node.js crypto.randomUUID()](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions)
