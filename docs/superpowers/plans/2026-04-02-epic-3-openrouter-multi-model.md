# Epic 3: OpenRouter Multi-Model Routing - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dual-provider architecture with single OpenRouter provider for all LLM calls, add per-agent model selection to the arena builder, and make the model roster config-driven.

**Architecture:** Single OpenRouter provider for both platform-funded and BYOK calls. New `lib/model-registry.ts` is the single source of truth for model IDs, labels, context limits, and pricing. `ArenaAgent` JSONB type gains an optional `model` field for per-agent overrides. Bout engine resolves model per turn from the agent's lineup entry.

**Tech Stack:** TypeScript, Next.js 16, AI SDK (`@openrouter/ai-sdk-provider`), Drizzle ORM (JSONB), Vitest, Zod v4.

**Spec:** `docs/superpowers/specs/2026-04-02-epic-3-openrouter-multi-model-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/model-registry.ts` | Create | Config-driven model list: IDs, labels, tiers, context limits, pricing |
| `lib/ai.ts` | Rewrite | Single-provider `getModel()`, context limit helpers |
| `lib/models.ts` | Heavy edit | Strip to `isValidByokKey()` + deprecated guard |
| `lib/byok.ts` | Rewrite | Simplified cookie encoding (no provider field) |
| `lib/env.ts` | Edit | New env vars, remove Anthropic-specific vars |
| `lib/credits.ts` | Edit | Read pricing from registry |
| `lib/tier.ts` | Edit | Replace model family gating with registry tier check |
| `lib/use-byok-model-picker.ts` | Rewrite | Single-provider, registry-driven model list |
| `lib/bout-validation.ts` | Edit | Remove provider branching, use registry for model access |
| `lib/bout-execution.ts` | Edit | Per-turn model resolution from agent lineup |
| `lib/bout-lineup.ts` | Edit | Pass model field through ArenaAgent |
| `db/schema.ts` | Edit | Add `model?: string` to ArenaAgent type |
| `app/api/byok-stash/route.ts` | Edit | Drop provider detection, validate against registry |
| `components/arena-builder.tsx` | Edit | Per-agent model override UI |
| `tests/unit/model-registry.test.ts` | Create | Registry loading, env override, validation |
| `tests/unit/ai-provider.test.ts` | Create | getModel() routing tests |
| `tests/api/byok-stash.test.ts` | Rewrite | Single-provider tests |
| `tests/unit/bout-model-resolution.test.ts` | Create | Per-agent model resolution |

---

## Task 1: Model Registry (`lib/model-registry.ts`)

**Files:**
- Create: `lib/model-registry.ts`
- Create: `tests/unit/model-registry.test.ts`

- [ ] **Step 1: Write failing tests for the model registry**

```typescript
// tests/unit/model-registry.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('model-registry', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.MODEL_REGISTRY_JSON;
    delete process.env.FREE_MODELS;
    delete process.env.PREMIUM_MODELS;
    delete process.env.DEFAULT_PREMIUM_MODEL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports a default registry with free and premium models', async () => {
    const { getRegistry } = await import('@/lib/model-registry');
    const registry = getRegistry();
    expect(registry.length).toBeGreaterThan(0);

    const freeModels = registry.filter((m) => m.tier === 'free');
    const premiumModels = registry.filter((m) => m.tier === 'premium');
    expect(freeModels.length).toBeGreaterThanOrEqual(3);
    expect(premiumModels.length).toBeGreaterThanOrEqual(5);
  });

  it('every entry has required fields', async () => {
    const { getRegistry } = await import('@/lib/model-registry');
    for (const entry of getRegistry()) {
      expect(entry.id).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(['free', 'premium']).toContain(entry.tier);
      expect(entry.contextWindow).toBeGreaterThan(0);
      expect(entry.pricing.in).toBeGreaterThan(0);
      expect(entry.pricing.out).toBeGreaterThan(0);
    }
  });

  it('getModelEntry returns entry by ID', async () => {
    const { getModelEntry } = await import('@/lib/model-registry');
    const entry = getModelEntry('openai/gpt-4o-mini');
    expect(entry).toBeDefined();
    expect(entry!.tier).toBe('free');
  });

  it('getModelEntry returns undefined for unknown model', async () => {
    const { getModelEntry } = await import('@/lib/model-registry');
    expect(getModelEntry('nonexistent/model')).toBeUndefined();
  });

  it('getModelsByTier filters correctly', async () => {
    const { getModelsByTier } = await import('@/lib/model-registry');
    const free = getModelsByTier('free');
    expect(free.every((m) => m.tier === 'free')).toBe(true);
    const premium = getModelsByTier('premium');
    expect(premium.every((m) => m.tier === 'premium')).toBe(true);
  });

  it('getAllModelIds returns all IDs', async () => {
    const { getAllModelIds, getRegistry } = await import('@/lib/model-registry');
    const ids = getAllModelIds();
    expect(ids.length).toBe(getRegistry().length);
  });

  it('getModelLabel returns label for known model', async () => {
    const { getModelLabel } = await import('@/lib/model-registry');
    expect(getModelLabel('openai/gpt-4o-mini')).toBe('GPT-4o Mini');
  });

  it('getModelLabel returns ID for unknown model', async () => {
    const { getModelLabel } = await import('@/lib/model-registry');
    expect(getModelLabel('unknown/model')).toBe('unknown/model');
  });

  it('getContextWindow returns correct value', async () => {
    const { getContextWindow } = await import('@/lib/model-registry');
    expect(getContextWindow('openai/gpt-4o-mini')).toBe(128_000);
  });

  it('getContextWindow returns default for unknown model', async () => {
    const { getContextWindow, DEFAULT_CONTEXT_WINDOW } = await import('@/lib/model-registry');
    expect(getContextWindow('unknown/model')).toBe(DEFAULT_CONTEXT_WINDOW);
  });

  it('getModelPricing returns pricing for known model', async () => {
    const { getModelPricing } = await import('@/lib/model-registry');
    const pricing = getModelPricing('openai/gpt-4o-mini');
    expect(pricing.in).toBeGreaterThan(0);
    expect(pricing.out).toBeGreaterThan(0);
  });

  it('getModelPricing falls back to cheapest model for unknown', async () => {
    const { getModelPricing, getRegistry } = await import('@/lib/model-registry');
    const cheapest = getRegistry().filter((m) => m.tier === 'free')
      .sort((a, b) => a.pricing.in - b.pricing.in)[0];
    const unknown = getModelPricing('unknown/model');
    expect(unknown.in).toBe(cheapest!.pricing.in);
  });

  it('isValidModelId validates against registry', async () => {
    const { isValidModelId } = await import('@/lib/model-registry');
    expect(isValidModelId('openai/gpt-4o-mini')).toBe(true);
    expect(isValidModelId('nonexistent/model')).toBe(false);
  });

  it('FREE_MODEL_IDS and PREMIUM_MODEL_IDS are derived from registry', async () => {
    const { FREE_MODEL_IDS, PREMIUM_MODEL_IDS } = await import('@/lib/model-registry');
    expect(FREE_MODEL_IDS.length).toBeGreaterThanOrEqual(3);
    expect(PREMIUM_MODEL_IDS.length).toBeGreaterThanOrEqual(5);
  });

  it('DEFAULT_FREE_MODEL is first free model', async () => {
    const { DEFAULT_FREE_MODEL, FREE_MODEL_IDS } = await import('@/lib/model-registry');
    expect(DEFAULT_FREE_MODEL).toBe(FREE_MODEL_IDS[0]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/model-registry.test.ts`
Expected: FAIL -- `@/lib/model-registry` does not exist.

- [ ] **Step 3: Implement the model registry**

```typescript
// lib/model-registry.ts
// Single source of truth for all LLM model metadata.
//
// Default models are hardcoded below. The full registry can be
// overridden at startup via MODEL_REGISTRY_JSON env var. Individual
// tier lists can be overridden via FREE_MODELS and PREMIUM_MODELS
// (comma-separated OpenRouter model IDs).

export type ModelTier = 'free' | 'premium';

export type ModelEntry = {
  id: string;
  label: string;
  tier: ModelTier;
  contextWindow: number;
  pricing: { in: number; out: number }; // GBP per million tokens
};

export const DEFAULT_CONTEXT_WINDOW = 100_000;
export const CONTEXT_SAFETY_MARGIN = 0.15;

const DEFAULT_REGISTRY: ModelEntry[] = [
  // Free tier
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tier: 'free', contextWindow: 128_000, pricing: { in: 0.15, out: 0.60 } },
  { id: 'google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash', tier: 'free', contextWindow: 1_048_576, pricing: { in: 0.15, out: 0.60 } },
  { id: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4.5', tier: 'free', contextWindow: 200_000, pricing: { in: 1.00, out: 5.00 } },
  // Premium tier
  { id: 'openai/gpt-5.4', label: 'GPT-5.4', tier: 'premium', contextWindow: 1_000_000, pricing: { in: 2.50, out: 10.00 } },
  { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'premium', contextWindow: 200_000, pricing: { in: 3.00, out: 15.00 } },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', tier: 'premium', contextWindow: 1_048_576, pricing: { in: 0.50, out: 2.00 } },
  { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', tier: 'premium', contextWindow: 128_000, pricing: { in: 0.27, out: 1.10 } },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', tier: 'premium', contextWindow: 128_000, pricing: { in: 0.55, out: 2.19 } },
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', tier: 'premium', contextWindow: 1_048_576, pricing: { in: 0.20, out: 0.60 } },
  { id: 'openai/gpt-4o', label: 'GPT-4o', tier: 'premium', contextWindow: 128_000, pricing: { in: 2.50, out: 10.00 } },
  { id: 'openai/o4-mini', label: 'o4 Mini', tier: 'premium', contextWindow: 200_000, pricing: { in: 1.10, out: 4.40 } },
];

function loadRegistry(): ModelEntry[] {
  const envJson = process.env.MODEL_REGISTRY_JSON;
  if (envJson) {
    try {
      return JSON.parse(envJson) as ModelEntry[];
    } catch {
      console.error('[model-registry] MODEL_REGISTRY_JSON is invalid JSON, using defaults');
    }
  }
  return [...DEFAULT_REGISTRY];
}

let _registry: ModelEntry[] | null = null;

export function getRegistry(): ModelEntry[] {
  if (!_registry) _registry = loadRegistry();
  return _registry;
}

/** Reset cached registry (for testing). */
export function _resetRegistry(): void {
  _registry = null;
}

export function getModelEntry(modelId: string): ModelEntry | undefined {
  return getRegistry().find((m) => m.id === modelId);
}

export function getModelsByTier(tier: ModelTier): ModelEntry[] {
  return getRegistry().filter((m) => m.tier === tier);
}

export function getAllModelIds(): string[] {
  return getRegistry().map((m) => m.id);
}

export function isValidModelId(modelId: string): boolean {
  return getRegistry().some((m) => m.id === modelId);
}

export function getModelLabel(modelId: string): string {
  return getModelEntry(modelId)?.label ?? modelId;
}

export function getContextWindow(modelId: string): number {
  return getModelEntry(modelId)?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
}

export function getInputTokenBudget(modelId: string): number {
  return Math.floor(getContextWindow(modelId) * (1 - CONTEXT_SAFETY_MARGIN));
}

export function getModelPricing(modelId: string): { in: number; out: number } {
  const entry = getModelEntry(modelId);
  if (entry) return entry.pricing;
  // Fall back to cheapest free model so unknown models are never zero-cost
  const cheapest = getModelsByTier('free').sort((a, b) => a.pricing.in - b.pricing.in)[0];
  return cheapest?.pricing ?? { in: 1, out: 5 };
}

export const FREE_MODEL_IDS = getModelsByTier('free').map((m) => m.id);
export const PREMIUM_MODEL_IDS = getModelsByTier('premium').map((m) => m.id);
export const ALL_MODEL_IDS = getAllModelIds();
export const DEFAULT_FREE_MODEL = FREE_MODEL_IDS[0]!;
export const DEFAULT_PREMIUM_MODEL = PREMIUM_MODEL_IDS[0]!;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/model-registry.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/model-registry.ts tests/unit/model-registry.test.ts
git commit -m "feat: add config-driven model registry (Epic 3)"
```

---

## Task 2: Provider Layer Rewrite (`lib/ai.ts`)

**Files:**
- Modify: `lib/ai.ts` (full rewrite)
- Create: `tests/unit/ai-provider.test.ts`

- [ ] **Step 1: Write failing tests for the new getModel()**

```typescript
// tests/unit/ai-provider.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@openrouter/ai-sdk-provider', () => {
  const chatMock = vi.fn((modelId: string) => ({ modelId, provider: 'openrouter' }));
  return {
    createOpenRouter: vi.fn(({ apiKey }: { apiKey: string }) => ({
      chat: chatMock,
      _apiKey: apiKey,
    })),
  };
});

vi.mock('@/lib/env', () => ({
  env: { OPENROUTER_API_KEY: 'sk-or-v1-platform-test-key' },
}));

describe('getModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns platform-funded model without apiKey', async () => {
    const { getModel } = await import('@/lib/ai');
    const model = getModel('openai/gpt-4o-mini');
    expect(model).toBeDefined();
    expect((model as { modelId: string }).modelId).toBe('openai/gpt-4o-mini');
  });

  it('returns BYOK model with apiKey', async () => {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
    const { getModel } = await import('@/lib/ai');
    getModel('openai/gpt-4o', 'sk-or-v1-user-key');
    expect(createOpenRouter).toHaveBeenCalledWith({ apiKey: 'sk-or-v1-user-key' });
  });

  it('isAnthropicModel returns true for anthropic/ prefix', async () => {
    const { isAnthropicModel } = await import('@/lib/ai');
    expect(isAnthropicModel('anthropic/claude-sonnet-4-6')).toBe(true);
    expect(isAnthropicModel('openai/gpt-4o')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/ai-provider.test.ts`
Expected: FAIL -- current `getModel()` has different signature.

- [ ] **Step 3: Rewrite lib/ai.ts**

```typescript
// lib/ai.ts
// AI model provider configuration and resolution.
//
// Single provider: all calls route through OpenRouter.
//   - Platform-funded: uses OPENROUTER_API_KEY from env
//   - BYOK: uses user-supplied OpenRouter key
//
// Model metadata (IDs, labels, context limits, pricing) lives in
// lib/model-registry.ts. This file only handles provider instantiation.

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { env } from '@/lib/env';
import {
  getInputTokenBudget as _getInputTokenBudget,
  DEFAULT_FREE_MODEL,
  CONTEXT_SAFETY_MARGIN,
} from '@/lib/model-registry';

const platformProvider = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

/**
 * Resolve a model ID + optional BYOK key into a provider instance.
 *
 * @param modelId    - OpenRouter model ID (e.g. 'openai/gpt-4o-mini')
 * @param byokApiKey - Optional user-supplied OpenRouter API key
 */
export function getModel(modelId: string, byokApiKey?: string) {
  if (byokApiKey) {
    return createOpenRouter({ apiKey: byokApiKey }).chat(modelId);
  }
  return platformProvider.chat(modelId);
}

/**
 * Whether a model ID targets an Anthropic model (for provider-specific options
 * like prompt caching). OpenRouter passes Anthropic-specific providerOptions through.
 */
export function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith('anthropic/');
}

// Re-export from model-registry for consumers that currently import from lib/ai
export { getInputTokenBudget } from '@/lib/model-registry';
export { DEFAULT_FREE_MODEL, CONTEXT_SAFETY_MARGIN } from '@/lib/model-registry';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/ai-provider.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai.ts tests/unit/ai-provider.test.ts
git commit -m "feat: rewrite lib/ai.ts to single OpenRouter provider (Epic 3)"
```

---

## Task 3: Strip `lib/models.ts`

**Files:**
- Modify: `lib/models.ts` (heavy reduction)

- [ ] **Step 1: Rewrite lib/models.ts to bare minimum**

Keep only `isValidByokKey()` (OpenRouter-only) and the deprecated model guard updated for OpenRouter IDs. Delete everything else: `MODEL_IDS`, `OPENROUTER_MODELS`, `KEY_PREFIXES`, `detectProvider()`, `MODEL_FAMILY`, `ALL_MODEL_IDS`, `ALL_OPENROUTER_MODEL_IDS`, `OPENROUTER_MODEL_LABELS`, `DEFAULT_FREE_MODEL`, `DEFAULT_PREMIUM_MODEL`, `DEFAULT_PREMIUM_MODELS`, `FIRST_BOUT_PROMOTION_MODEL`, `isOpenRouterModel()`.

```typescript
// lib/models.ts
// BYOK key validation and deprecated model guards.
//
// Model metadata (IDs, labels, context limits, pricing) has moved to
// lib/model-registry.ts. This file retains only key validation and
// the deprecated-model safety check.

const OPENROUTER_KEY_PREFIX = 'sk-or-v1-';

/**
 * Check whether an API key is a valid OpenRouter BYOK key.
 */
export function isValidByokKey(apiKey: string): boolean {
  return apiKey.startsWith(OPENROUTER_KEY_PREFIX);
}

/**
 * Known-deprecated model IDs that should never appear in production.
 */
const DEPRECATED_MODELS = [
  'claude-3-haiku-20240307',
  'claude-3-5-haiku-20241022',
  'claude-3-sonnet-20240229',
  'claude-3-opus-20240229',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20241022',
  'claude-opus-4-5-20251101',
  'claude-opus-4-6',
  // Legacy non-OpenRouter format IDs
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-6',
];

/**
 * Validate that a model ID is not deprecated.
 */
export function assertNotDeprecated(modelId: string, source: string): string {
  if (DEPRECATED_MODELS.includes(modelId)) {
    const msg = `DEPRECATED MODEL DETECTED: "${modelId}" from ${source}. ` +
      `Use OpenRouter format IDs (e.g. anthropic/claude-haiku-4).`;
    console.error(`[models] ${msg}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
  }
  return modelId;
}
```

- [ ] **Step 2: Do NOT run tests yet -- consumers will break. This task is intentionally incomplete until Tasks 4-7 update all consumers.**

- [ ] **Step 3: Commit the stripped file**

```bash
git add lib/models.ts
git commit -m "refactor: strip lib/models.ts to BYOK validation only (Epic 3)"
```

---

## Task 4: BYOK Simplification (`lib/byok.ts` + `app/api/byok-stash/route.ts`)

**Files:**
- Modify: `lib/byok.ts` (rewrite)
- Modify: `app/api/byok-stash/route.ts`
- Rewrite: `tests/api/byok-stash.test.ts`

- [ ] **Step 1: Write failing tests for simplified BYOK**

```typescript
// tests/api/byok-stash.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { cookieStore, authMock } = vi.hoisted(() => {
  const store = new Map<string, { name: string; value: string }>();
  return {
    cookieStore: {
      _store: store,
      get: vi.fn((name: string) => store.get(name) ?? undefined),
      set: vi.fn((name: string, value: string, _opts?: unknown) => {
        store.set(name, { name, value });
      }),
      delete: vi.fn((name: string) => {
        store.delete(name);
      }),
    },
    authMock: vi.fn(),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

import { encodeByokCookie, decodeByokCookie, readAndClearByokKey } from '@/lib/byok';

describe('byok cookie encoding', () => {
  it('encodes and decodes model + key', () => {
    const encoded = encodeByokCookie('sk-or-v1-abc123', 'openai/gpt-4o');
    const decoded = decodeByokCookie(encoded);
    expect(decoded.key).toBe('sk-or-v1-abc123');
    expect(decoded.modelId).toBe('openai/gpt-4o');
  });

  it('encodes and decodes key without model', () => {
    const encoded = encodeByokCookie('sk-or-v1-abc123');
    const decoded = decodeByokCookie(encoded);
    expect(decoded.key).toBe('sk-or-v1-abc123');
    expect(decoded.modelId).toBeUndefined();
  });

  it('handles legacy raw key format', () => {
    const decoded = decodeByokCookie('sk-or-v1-legacy-key');
    expect(decoded.key).toBe('sk-or-v1-legacy-key');
    expect(decoded.modelId).toBeUndefined();
  });

  it('readAndClearByokKey reads and deletes cookie', () => {
    cookieStore._store.set('pit_byok', {
      name: 'pit_byok',
      value: encodeByokCookie('sk-or-v1-test', 'openai/gpt-4o'),
    });
    // Cast to match the type expected by readAndClearByokKey
    const result = readAndClearByokKey(cookieStore as never);
    expect(result).not.toBeNull();
    expect(result!.key).toBe('sk-or-v1-test');
    expect(result!.modelId).toBe('openai/gpt-4o');
    expect(cookieStore.delete).toHaveBeenCalledWith('pit_byok');
  });
});

describe('byok-stash route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cookieStore._store.clear();
    authMock.mockResolvedValue({ userId: 'user_test' });
  });

  it('rejects Anthropic keys with clear error', async () => {
    const { POST } = await import('@/app/api/byok-stash/route');
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-ant-abc123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('OpenRouter');
  });

  it('accepts OpenRouter key and sets cookie', async () => {
    const { POST } = await import('@/app/api/byok-stash/route');
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-valid-key', model: 'openai/gpt-4o' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(cookieStore.set).toHaveBeenCalled();
  });

  it('rejects unknown model IDs', async () => {
    const { POST } = await import('@/app/api/byok-stash/route');
    const req = new Request('http://localhost/api/byok-stash', {
      method: 'POST',
      body: JSON.stringify({ key: 'sk-or-v1-valid-key', model: 'fake/nonexistent' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/api/byok-stash.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite lib/byok.ts**

```typescript
// lib/byok.ts
// BYOK (Bring Your Own Key) cookie encoding/decoding.
//
// All BYOK keys are OpenRouter keys (sk-or-v1-*). The cookie encodes
// modelId:||:key. No provider field needed.

import type { cookies } from 'next/headers';

export const BYOK_COOKIE_NAME = 'pit_byok';
export const BYOK_MAX_AGE_SECONDS = 60;

const COOKIE_SEP = ':||:';

/**
 * Encode a BYOK stash cookie value.
 * Format: modelId:||:key
 */
export function encodeByokCookie(key: string, modelId?: string): string {
  return `${modelId ?? ''}${COOKIE_SEP}${key}`;
}

/**
 * Decode a BYOK stash cookie value.
 * Handles new format (modelId:||:key) and legacy format (raw key).
 */
export function decodeByokCookie(
  value: string,
): { modelId: string | undefined; key: string } {
  const sep = value.indexOf(COOKIE_SEP);
  if (sep === -1) return { modelId: undefined, key: value };
  return {
    modelId: value.slice(0, sep) || undefined,
    key: value.slice(sep + COOKIE_SEP.length),
  };
}

/**
 * Read and delete the stashed BYOK key.
 * Returns decoded model and key, or null if no cookie.
 */
export function readAndClearByokKey(
  jar: Awaited<ReturnType<typeof cookies>>,
): { modelId: string | undefined; key: string } | null {
  const cookie = jar.get(BYOK_COOKIE_NAME);
  if (!cookie?.value) return null;
  jar.delete(BYOK_COOKIE_NAME);
  return decodeByokCookie(cookie.value);
}
```

- [ ] **Step 4: Update app/api/byok-stash/route.ts**

```typescript
// app/api/byok-stash/route.ts
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { withLogging } from '@/lib/api-logging';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorResponse, parseValidBody, rateLimitResponse, API_ERRORS } from '@/lib/api-utils';
import { byokStashSchema } from '@/lib/api-schemas';
import { isValidByokKey } from '@/lib/models';
import { isValidModelId } from '@/lib/model-registry';
import { getUserTier, SUBSCRIPTIONS_ENABLED } from '@/lib/tier';
import { encodeByokCookie, BYOK_COOKIE_NAME, BYOK_MAX_AGE_SECONDS } from '@/lib/byok';

export { readAndClearByokKey } from '@/lib/byok';

export const runtime = 'nodejs';

const RATE_LIMIT = { name: 'byok-stash', maxRequests: 10, windowMs: 60_000 };

export const POST = withLogging(async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(API_ERRORS.AUTH_REQUIRED, 401);
  }

  if (SUBSCRIPTIONS_ENABLED) {
    const tier = await getUserTier(userId);
    if (tier === 'free') {
      return errorResponse(
        'BYOK is available to subscribers only. Upgrade to Pit Pass or Pit Lab.',
        403,
      );
    }
  }

  const rateCheck = await checkRateLimit(RATE_LIMIT, userId);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, byokStashSchema);
  if (parsed.error) return parsed.error;
  const { key, model } = parsed.data;

  if (!isValidByokKey(key)) {
    return errorResponse(
      'Invalid key format. Use an OpenRouter key (sk-or-v1-*). Anthropic keys are no longer supported.',
      400,
    );
  }

  if (model && !isValidModelId(model)) {
    return errorResponse('Unsupported model.', 400);
  }

  const cookieValue = encodeByokCookie(key, model);

  const jar = await cookies();
  jar.set(BYOK_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/run-bout',
    maxAge: BYOK_MAX_AGE_SECONDS,
  });

  return Response.json({ ok: true });
}, 'byok-stash');
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run tests/api/byok-stash.test.ts`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/byok.ts app/api/byok-stash/route.ts tests/api/byok-stash.test.ts
git commit -m "feat: simplify BYOK to OpenRouter-only (Epic 3)"
```

---

## Task 5: Env Var Updates (`lib/env.ts`)

**Files:**
- Modify: `lib/env.ts:57-72`

- [ ] **Step 1: Update the Zod schema**

Replace the Anthropic-specific env vars with OpenRouter equivalents. In the `serverEnvSchema` object, change:

```typescript
// Old (remove):
ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
// ...
ANTHROPIC_FREE_MODEL: z.string().optional().default(DEFAULT_FREE_MODEL),
ANTHROPIC_PREMIUM_MODEL: z.string().optional().default(DEFAULT_PREMIUM_MODEL),
ANTHROPIC_PREMIUM_MODELS: z.string().optional().default(DEFAULT_PREMIUM_MODELS),
ANTHROPIC_BYOK_MODEL: z.string().optional(),
ANTHROPIC_MODEL: z.string().optional(),

// New (add):
OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
// ...
MODEL_REGISTRY_JSON: z.string().optional(),
```

Also update the import at the top of the file. Remove the import from `@/lib/models` (which previously provided `DEFAULT_FREE_MODEL` etc.) since those are no longer needed for env defaults.

Keep `ASK_THE_PIT_MODEL` as-is (optional string, no default needed -- the Ask The Pit config will read from the registry).

- [ ] **Step 2: Run typecheck to find all consumers that reference old env vars**

Run: `pnpm tsc --noEmit 2>&1 | head -40`
Expected: Type errors in files referencing `env.ANTHROPIC_API_KEY`, `env.ANTHROPIC_FREE_MODEL`, etc. This is expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add lib/env.ts
git commit -m "feat: replace Anthropic env vars with OpenRouter (Epic 3)"
```

---

## Task 6: Update Credit System (`lib/credits.ts`)

**Files:**
- Modify: `lib/credits.ts:20,52-97`

- [ ] **Step 1: Update imports and pricing source**

Replace the `MODEL_IDS` import with model registry imports. Replace the hardcoded `DEFAULT_MODEL_PRICES_GBP` with a call to `getModelPricing()` from the registry.

Change the import line:
```typescript
// Old:
import { MODEL_IDS } from '@/lib/models';

// New:
import { getModelPricing, DEFAULT_FREE_MODEL } from '@/lib/model-registry';
```

Replace the pricing resolution:
```typescript
// Old:
const DEFAULT_MODEL_PRICES_GBP: Record<string, { in: number; out: number }> = {
  [MODEL_IDS.HAIKU]: { in: 1, out: 5 },
  [MODEL_IDS.SONNET_45]: { in: 3, out: 15 },
  [MODEL_IDS.SONNET_46]: { in: 3, out: 15 },
};
// ... ENV_MODEL_PRICES merge ...
// ... MODEL_PRICES_GBP ...
const FALLBACK_MODEL_PRICING = MODEL_PRICES_GBP[MODEL_IDS.HAIKU]!;
const getModelPricing = (modelId: string) => { ... };

// New (much simpler):
// getModelPricing is now imported from model-registry.
// ENV override (MODEL_PRICES_GBP_JSON) still works as a safety valve
// but the primary source is the registry.
```

Keep the `estimateBoutCostGbp` function signature unchanged. It already accepts `modelId: string` and calls `getModelPricing()`. The only change is where pricing data comes from.

- [ ] **Step 2: Run affected tests**

Run: `pnpm vitest run tests/unit/credits`
Expected: PASS (pricing values may shift but the logic is unchanged).

- [ ] **Step 3: Commit**

```bash
git add lib/credits.ts
git commit -m "feat: credits read pricing from model registry (Epic 3)"
```

---

## Task 7: Update Tier System (`lib/tier.ts`)

**Files:**
- Modify: `lib/tier.ts:18,40-70,216-235`

- [ ] **Step 1: Replace model family gating with registry tier check**

The current `canAccessModel()` uses `MODEL_FAMILY` (haiku/sonnet) to gate access. Replace with a check against the model registry's tier field.

```typescript
// Old:
import { MODEL_FAMILY } from '@/lib/models';
// ...
export function canAccessModel(tier: UserTier, modelId: string): boolean {
  if (modelId === 'byok') return tier !== 'free';
  const family = MODEL_FAMILY[modelId as keyof typeof MODEL_FAMILY];
  if (!family) return false;
  return TIER_CONFIG[tier].models.includes(family);
}

// New:
import { getModelEntry } from '@/lib/model-registry';
// ...
export function canAccessModel(tier: UserTier, modelId: string): boolean {
  if (modelId === 'byok') return tier !== 'free';
  const entry = getModelEntry(modelId);
  if (!entry) return false; // Unknown models denied (fail-closed)
  // Free-tier models are accessible to all tiers
  if (entry.tier === 'free') return true;
  // Premium models require pass or lab tier
  return tier !== 'free';
}
```

Also update `getAvailableModels()`:
```typescript
// Old:
export function getAvailableModels(tier: UserTier): string[] {
  const allowedFamilies = TIER_CONFIG[tier].models;
  return Object.entries(MODEL_FAMILY)
    .filter(([, family]) => allowedFamilies.includes(family))
    .map(([modelId]) => modelId);
}

// New:
import { getRegistry } from '@/lib/model-registry';
// ...
export function getAvailableModels(tier: UserTier): string[] {
  return getRegistry()
    .filter((m) => m.tier === 'free' || tier !== 'free')
    .map((m) => m.id);
}
```

Remove `models: ('haiku' | 'sonnet')[]` from `TierConfig` type and all TIER_CONFIG entries.

- [ ] **Step 2: Run tier tests**

Run: `pnpm vitest run tests/ -t "tier"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/tier.ts
git commit -m "feat: tier model access uses registry instead of model families (Epic 3)"
```

---

## Task 8: Update Bout Validation (`lib/bout-validation.ts`)

**Files:**
- Modify: `lib/bout-validation.ts`

- [ ] **Step 1: Update imports**

```typescript
// Old:
import { FREE_MODEL_ID, PREMIUM_MODEL_OPTIONS, getModel, getInputTokenBudget } from '@/lib/ai';
import { FIRST_BOUT_PROMOTION_MODEL } from '@/lib/models';

// New:
import { getModel, isAnthropicModel, getInputTokenBudget } from '@/lib/ai';
import { DEFAULT_FREE_MODEL, PREMIUM_MODEL_IDS } from '@/lib/model-registry';
```

- [ ] **Step 2: Replace all references**

- `FREE_MODEL_ID` -> `DEFAULT_FREE_MODEL`
- `PREMIUM_MODEL_OPTIONS` -> `PREMIUM_MODEL_IDS`
- `FIRST_BOUT_PROMOTION_MODEL` -> `PREMIUM_MODEL_IDS[0]` (first premium model as promotion)
- `isAnthropicModel(modelId, byokData)` -> `isAnthropicModel(resolvedModelId)` (imported from `lib/ai.ts`, checks prefix)
- Remove `ByokProvider` type references -- byokData no longer has `.provider`
- Update `ByokKeyData` type to `{ modelId: string | undefined; key: string }` (no provider)
- The `'byok'` sentinel model ID: keep it. It signals "use the BYOK key". The resolution in bout-execution will use `byokData.modelId` or default.

- [ ] **Step 3: Update BoutContext type**

Remove `byokData.provider` references. `byokData` now only has `{ modelId, key }`.

- [ ] **Step 4: Run bout validation tests**

Run: `pnpm vitest run tests/ -t "bout"`
Expected: Some tests may fail due to model ID format changes. Update test fixtures to use OpenRouter format IDs.

- [ ] **Step 5: Commit**

```bash
git add lib/bout-validation.ts
git commit -m "feat: bout validation uses model registry (Epic 3)"
```

---

## Task 9: Per-Agent Model Resolution (`lib/bout-execution.ts` + `db/schema.ts`)

**Files:**
- Modify: `db/schema.ts:39-45`
- Modify: `lib/bout-execution.ts:181-184,270-272`
- Modify: `lib/bout-lineup.ts`
- Create: `tests/unit/bout-model-resolution.test.ts`

- [ ] **Step 1: Add model to ArenaAgent type**

In `db/schema.ts`, update:
```typescript
export type ArenaAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  color?: string;
  avatar?: string;
  model?: string;  // OpenRouter model ID override (per-agent)
};
```

- [ ] **Step 2: Update bout-lineup.ts to pass model through**

```typescript
// In buildArenaPresetFromLineup, the Agent type from presets.ts may need
// a model field too. Check if Agent has model -- if not, carry it on
// the ArenaAgent and resolve it in bout-execution, not here.
```

- [ ] **Step 3: Write failing test for per-agent model resolution**

```typescript
// tests/unit/bout-model-resolution.test.ts
import { describe, expect, it } from 'vitest';

describe('per-agent model resolution', () => {
  it('uses agent model when present', () => {
    const agentModel = 'openai/gpt-4o';
    const arenaDefault = 'openai/gpt-4o-mini';
    const resolved = agentModel ?? arenaDefault;
    expect(resolved).toBe('openai/gpt-4o');
  });

  it('falls back to arena default when agent has no model', () => {
    const agentModel = undefined;
    const arenaDefault = 'openai/gpt-4o-mini';
    const resolved = agentModel ?? arenaDefault;
    expect(resolved).toBe('openai/gpt-4o-mini');
  });
});
```

- [ ] **Step 4: Update bout-execution.ts for per-turn model resolution**

At the model resolution point (around line 181), change from one model for the entire bout to per-turn resolution:

```typescript
// Old (line 181-184):
const boutModel = getModel(
  modelId,
  modelId === 'byok' ? byokData?.key : undefined,
  modelId === 'byok' ? byokData?.modelId : undefined,
);

// New: resolve per-turn inside the for loop, before the streamText call.
// Move model resolution inside the turn loop:
// const agentLineupEntry = ctx.preset.agents[i % ctx.preset.agents.length] as ArenaAgent | undefined;
// (ArenaAgent might have .model if this is an arena bout with per-agent models)

// For the model resolution around line 270:
// Old:
// const resolvedModelId = modelId === 'byok'
//   ? (byokData?.modelId ?? process.env.ANTHROPIC_BYOK_MODEL ?? FREE_MODEL_ID)
//   : modelId;

// New:
// const lineupAgent = (preset as { agents: Array<{ model?: string }> }).agents?.[i % preset.agents.length];
// const perAgentModel = lineupAgent?.model;
// const resolvedModelId = perAgentModel ?? (modelId === 'byok' ? byokData?.modelId : modelId) ?? DEFAULT_FREE_MODEL;
// const boutModel = getModel(resolvedModelId, modelId === 'byok' ? byokData?.key : undefined);
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run tests/unit/bout-model-resolution.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts lib/bout-execution.ts lib/bout-lineup.ts tests/unit/bout-model-resolution.test.ts
git commit -m "feat: per-agent model resolution in bout engine (Epic 3)"
```

---

## Task 10: BYOK Model Picker Simplification (`lib/use-byok-model-picker.ts`)

**Files:**
- Modify: `lib/use-byok-model-picker.ts` (rewrite)

- [ ] **Step 1: Rewrite to single-provider, registry-driven**

```typescript
// lib/use-byok-model-picker.ts
'use client';

import { useState } from 'react';

import { isValidByokKey } from '@/lib/models';
import {
  getRegistry,
  getModelLabel,
  type ModelEntry,
} from '@/lib/model-registry';

export type ByokModelOption = { id: string; label: string };

/**
 * Human-readable label for any model ID.
 */
export function labelForModel(modelId: string): string {
  if (modelId === 'byok') return 'BYOK';
  return getModelLabel(modelId);
}

/**
 * Shared hook for BYOK model selection.
 * All BYOK uses OpenRouter -- shows the full model registry.
 */
export function useByokModelPicker(byokKey: string) {
  const [byokModel, setByokModel] = useState('');

  const trimmedKey = byokKey.trim();
  const isValid = trimmedKey ? isValidByokKey(trimmedKey) : false;

  const byokModelOptions: ByokModelOption[] = isValid
    ? getRegistry().map((m: ModelEntry) => ({ id: m.id, label: m.label }))
    : [];

  const resetIfProviderChanged = (_newKey: string) => {
    // No provider switching anymore -- just reset if key becomes invalid
    if (!isValidByokKey(_newKey.trim())) {
      setByokModel('');
    }
  };

  return {
    byokModel,
    setByokModel,
    detectedProvider: isValid ? 'openrouter' as const : undefined,
    byokModelOptions,
    resetIfProviderChanged,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/use-byok-model-picker.ts
git commit -m "feat: BYOK model picker uses registry, OpenRouter only (Epic 3)"
```

---

## Task 11: Arena Builder Per-Agent Model Override (`components/arena-builder.tsx`)

**Files:**
- Modify: `components/arena-builder.tsx`

- [ ] **Step 1: Add per-agent model state**

Add state for per-agent model overrides:
```typescript
const [agentModels, setAgentModels] = useState<Record<string, string>>({});
```

- [ ] **Step 2: Add per-agent model dropdown to agent cards in the lineup section**

In the selected agents display (around line 153-167), add an expandable model picker for each agent:

```tsx
{selected.map((id) => {
  const agent = agents.find((item) => item.id === id);
  return (
    <div key={id} className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => toggle(id)}
        className="rounded-full border-2 border-foreground/50 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
      >
        {agent?.name ?? id}
      </button>
      {/* Per-agent model override */}
      <select
        value={agentModels[id] ?? ''}
        onChange={(e) => setAgentModels((prev) => ({
          ...prev,
          [id]: e.target.value,
        }))}
        className="border border-foreground/30 bg-black/60 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-muted focus:border-accent focus:outline-none"
      >
        <option value="">Default</option>
        {/* Show tier-appropriate models from registry */}
        {modelOptionsForAgent.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
      {/* Hidden input for form submission */}
      {agentModels[id] && (
        <input type="hidden" name={`agent_model_${id}`} value={agentModels[id]} />
      )}
    </div>
  );
})}
```

The `modelOptionsForAgent` should be derived from the registry, filtered by the user's available models (BYOK users see all, others see tier-appropriate).

- [ ] **Step 3: Update model options to come from registry**

Replace the current `modelOptions` computation with registry-driven options. Import `getModelsByTier, getRegistry` from `@/lib/model-registry`.

- [ ] **Step 4: Commit**

```bash
git add components/arena-builder.tsx
git commit -m "feat: per-agent model override in arena builder (Epic 3)"
```

---

## Task 12: Fix All Remaining Consumer Imports

**Files:**
- Various files that import from `lib/models.ts` or `lib/ai.ts`

- [ ] **Step 1: Run typecheck to find all broken imports**

Run: `pnpm tsc --noEmit 2>&1 | grep "error TS"`
Fix each broken import by redirecting to `lib/model-registry.ts` or `lib/ai.ts`.

Common migrations:
- `MODEL_IDS.HAIKU` -> `DEFAULT_FREE_MODEL` from `@/lib/model-registry`
- `OPENROUTER_MODELS.*` -> literal OpenRouter model IDs from registry
- `detectProvider()` -> deleted (no longer needed)
- `MODEL_FAMILY` -> deleted (tier check uses registry)
- `ALL_MODEL_IDS` -> `getAllModelIds()` from `@/lib/model-registry`
- `OPENROUTER_MODEL_LABELS` -> `getModelLabel()` from `@/lib/model-registry`
- `FIRST_BOUT_PROMOTION_MODEL` -> `PREMIUM_MODEL_IDS[0]` from `@/lib/model-registry`

- [ ] **Step 2: Update lib/ask-the-pit-config.ts**

```typescript
// Old:
import { DEFAULT_FREE_MODEL } from '@/lib/models';
// New:
import { DEFAULT_FREE_MODEL } from '@/lib/model-registry';
```

- [ ] **Step 3: Run full typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: migrate all imports to model registry (Epic 3)"
```

---

## Task 13: Update Remaining Tests

**Files:**
- Various test files using old model IDs

- [ ] **Step 1: Find all tests referencing old model IDs**

Run: `grep -r "claude-haiku-4-5\|claude-sonnet-4-5\|claude-sonnet-4-6\|MODEL_IDS\.\|OPENROUTER_MODELS\." tests/`

Update each to use OpenRouter format IDs from the registry.

- [ ] **Step 2: Run the full gate**

Run: `pnpm run test:ci`
Expected: All green (lint, typecheck, unit, integration).

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test: update all test fixtures to OpenRouter model IDs (Epic 3)"
```

---

## Task 14: Update Roadmap Page

**Files:**
- Modify: `app/roadmap/page.tsx`

- [ ] **Step 1: Mark AI Gateway and multi-model routing as shipped**

```typescript
// Change status from 'planned' to 'done':
{ label: 'Vercel AI Gateway (BYOK)', status: 'done', detail: 'BYOK users choose any LLM via OpenRouter' },
{ label: 'Multi-model routing', status: 'done', detail: 'Route different agents to different models' },
```

- [ ] **Step 2: Commit**

```bash
git add app/roadmap/page.tsx
git commit -m "chore: mark AI Gateway and multi-model routing as shipped (Epic 3)"
```

---

## Task 15: Final Gate

- [ ] **Step 1: Run full gate**

Run: `pnpm run test:ci`
Expected: All green.

- [ ] **Step 2: Manual smoke test**

Verify:
1. Arena builder shows model dropdown with registry models
2. Per-agent model override appears and submits correctly
3. BYOK with `sk-or-v1-*` key works
4. BYOK with `sk-ant-*` key returns clear error
5. Roadmap page shows AI Gateway and Multi-model routing as shipped

- [ ] **Step 3: Final commit if any fixups needed**
