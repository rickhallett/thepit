# Epic 3: OpenRouter Multi-Model Routing

**Status:** approved
**Created:** 2026-04-02
**Author:** claude + operator
**Epic:** 3 - Vercel AI Gateway and Multi-Model Routing

## Summary

Replace the dual-provider architecture (Anthropic direct + OpenRouter BYOK)
with a single OpenRouter provider for all LLM calls -- platform-funded and
BYOK. Add per-agent model selection to the arena builder. Make the model
roster config-driven so it can be updated without deploys.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider strategy | OpenRouter for everything | One provider, one routing path. No Vercel AI Gateway tokens needed. |
| Anthropic direct BYOK | Dropped | Users who want Claude models use OpenRouter (Claude is available there). |
| BYOK key format | `sk-or-v1-*` only | Single key format. `sk-ant-*` no longer accepted. |
| Per-agent model selection | Arena-wide default + per-agent override | Common case stays clean; power users can mix models. |
| Free tier models | GPT-4o Mini, Gemini Flash, Haiku 4.5 | Cheap, capable, diverse providers. |
| Premium tier models | Wide range, config-driven | GPT-5.4, Sonnet 4.6, Gemini 3 Flash, DeepSeek V3.2, DeepSeek R1, Llama 4 Maverick, GPT-4o, o4 Mini. |
| Model roster management | Config-driven (env vars) | Changeable without deploys. |
| Credit pricing | Repriced to OpenRouter rates | Honest cost pass-through. |

## Architecture

### 1. Provider Layer (`lib/ai.ts` rewrite)

**Current:** `getModel(modelId, apiKey, byokModelId)` branches on key prefix
to route to Anthropic or OpenRouter. Three code paths, provider detection,
Anthropic-specific client construction.

**New:** Single-provider module. Two modes.

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '@/lib/env';

const platformProvider = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export function getModel(modelId: string, byokApiKey?: string) {
  if (byokApiKey) {
    return createOpenRouter({ apiKey: byokApiKey }).chat(modelId);
  }
  return platformProvider.chat(modelId);
}
```

The entire provider abstraction becomes ~15 lines. No `detectProvider()`,
no key prefix routing, no Anthropic client construction.

**Anthropic-specific providerOptions:** The bout engine currently applies
Anthropic prompt caching via `providerOptions.anthropic.cacheControl` when
`isAnthropicModel()` returns true. This still works through OpenRouter --
OpenRouter passes provider-specific options through. The check becomes:
`modelId.startsWith('anthropic/')`.

### 2. Model Registry (`lib/model-registry.ts` -- new file)

Config-driven model list replacing hardcoded constants across `lib/models.ts`,
`lib/ai.ts`, and `lib/credits.ts`.

```typescript
type ModelTier = 'free' | 'premium';

type ModelEntry = {
  id: string;           // OpenRouter format: 'provider/model'
  label: string;        // Human-readable: 'GPT-4o Mini'
  tier: ModelTier;      // Which tier(s) can use this model
  contextWindow: number; // Max tokens
  pricing: {            // GBP per million tokens (OpenRouter rates)
    in: number;
    out: number;
  };
};
```

**Default registry** is hardcoded in the module (the free/premium lists from
the decisions table above). **Env override:** `MODEL_REGISTRY_JSON` env var
can replace or extend the default list at startup. This is the single source
of truth for model IDs, labels, context limits, and pricing.

Consumers:
- `getModel()` validates modelId against registry
- Arena builder reads labels and tier for dropdowns
- Credit system reads pricing from registry
- Bout engine reads context limits from registry

**Replaces:**
- `MODEL_IDS`, `OPENROUTER_MODELS`, `ALL_MODEL_IDS`, `ALL_OPENROUTER_MODEL_IDS` in `lib/models.ts`
- `OPENROUTER_MODEL_LABELS` in `lib/models.ts`
- `MODEL_CONTEXT_LIMITS` in `lib/ai.ts`
- `DEFAULT_MODEL_PRICES_GBP` in `lib/credits.ts`

### 3. BYOK Simplification (`lib/byok.ts` rewrite)

**Current:** Cookie encodes `provider:||:modelId:||:key`. Provider detection
from key prefix. Two provider paths.

**New:** Cookie encodes `modelId:||:key`. No provider field (always OpenRouter).
`isValidByokKey()` checks for `sk-or-v1-*` only.

```typescript
export function encodeByokCookie(key: string, modelId?: string): string {
  return `${modelId ?? ''}:||:${key}`;
}

export function decodeByokCookie(value: string): {
  modelId: string | undefined;
  key: string;
} {
  const sep = value.indexOf(':||:');
  if (sep === -1) return { modelId: undefined, key: value }; // legacy
  return {
    modelId: value.slice(0, sep) || undefined,
    key: value.slice(sep + 4),
  };
}
```

**BYOK stash route** (`app/api/byok-stash/route.ts`): Drop provider detection.
Validate key starts with `sk-or-v1-`. Validate model against registry. Encode
without provider.

**Legacy key migration:** Old `sk-ant-*` keys get a 400 response with a clear
message: "Anthropic keys are no longer supported. Use an OpenRouter key
(sk-or-v1-*) instead."

### 4. Per-Agent Model Selection

#### 4a. Schema change

`ArenaAgent` type in `db/schema.ts` gets an optional `model` field:

```typescript
export type ArenaAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  color?: string;
  avatar?: string;
  model?: string;  // OpenRouter model ID override
};
```

No DB migration needed -- `ArenaAgent` is a JSONB type, not a column.
Existing rows without `model` field default to the arena-wide model.

#### 4b. Arena builder UI

**Current:** Single `selectedModel` dropdown for the whole arena.

**New:** Keep the arena-wide model dropdown (unchanged UX for the common case).
Add an optional per-agent model override on each agent card in the lineup.
Collapsed by default -- small "Model" link or icon that expands to a dropdown.
Options come from the model registry, filtered by the user's tier.

When the user has a BYOK key entered, all models from the registry are
available (BYOK unlocks everything). Without BYOK, only the user's tier
models show.

#### 4c. Form submission

Arena builder's `FormData` currently sends a single `model` field. New
behavior: still sends `model` as the arena-wide default, plus
`agent_model_<agentId>=<modelId>` for any per-agent overrides.

The `createArenaBout` server action reads per-agent models from FormData
and populates `ArenaAgent.model` in the lineup JSONB.

#### 4d. Bout engine model resolution

In `bout-execution.ts`, the turn loop currently calls
`getModel(modelId, byokKey, byokModelId)` with one model for the entire
bout. New behavior: resolve model per turn from the agent's lineup entry.

```
resolvedModelId = currentAgent.model ?? ctx.modelId  // per-agent or arena default
```

For BYOK bouts, the BYOK key is shared across all agents (one key per bout).
The per-agent model just changes which model that key routes to.

For platform-funded bouts, per-agent model selection is tier-gated: free
users can only pick from free-tier models, premium users from premium-tier.

### 5. Credit System Updates (`lib/credits.ts`)

**Pricing source:** Move from `DEFAULT_MODEL_PRICES_GBP` hardcoded map to
reading pricing from the model registry.

**BYOK pricing:** BYOK bouts currently use a flat fee
(`BYOK_FEE_GBP_PER_1K_TOKENS`). Keep this -- the platform charges a small
service fee regardless of which model the user picks. The actual API cost
is on the user's OpenRouter bill.

**Platform-funded pricing:** Replace Anthropic-specific rates with OpenRouter
rates from the model registry. The `MODEL_PRICES_GBP_JSON` env override
still works as a safety valve.

**Per-agent cost estimation:** When the arena has mixed models, estimate
cost per agent based on their assigned model, then sum. This affects the
credit pre-authorization amount shown to the user before bout creation.

### 6. Env Var Changes

| Removed | Added | Notes |
|---------|-------|-------|
| `ANTHROPIC_API_KEY` | `OPENROUTER_API_KEY` | Platform-funded key |
| `ANTHROPIC_MODEL` | -- | Replaced by registry |
| `ANTHROPIC_FREE_MODEL` | `FREE_MODELS` | Comma-separated OpenRouter IDs |
| `ANTHROPIC_PREMIUM_MODEL` | `DEFAULT_PREMIUM_MODEL` | Single OpenRouter ID |
| `ANTHROPIC_PREMIUM_MODELS` | `PREMIUM_MODELS` | Comma-separated OpenRouter IDs |
| `ANTHROPIC_BYOK_MODEL` | -- | Registry handles defaults |
| `ASK_THE_PIT_MODEL` | `ASK_THE_PIT_MODEL` | Kept, but default changes to OpenRouter format |
| -- | `MODEL_REGISTRY_JSON` | Optional full registry override |

`lib/env.ts` Zod schema updated accordingly.

### 7. `lib/models.ts` Fate

Most of `lib/models.ts` is replaced by the model registry. What remains:

- `isValidByokKey()` -- simplified to check `sk-or-v1-*` only
- Deprecated model guard (`DEPRECATED_MODELS`, `validateModelEnvVars()`) --
  updated to check OpenRouter format IDs

Everything else (`MODEL_IDS`, `OPENROUTER_MODELS`, `KEY_PREFIXES`,
`detectProvider()`, `MODEL_FAMILY`, label maps) is deleted. Consumers
import from `lib/model-registry.ts` instead.

### 8. `use-byok-model-picker.ts` Simplification

**Current:** Detects provider from key prefix, shows different model lists
for Anthropic vs OpenRouter keys.

**New:** Only accepts OpenRouter keys. Shows one model list from the registry.
No provider detection. `labelForModel()` reads labels from the registry.

### 9. Test Strategy

| Area | Test Type | Notes |
|------|-----------|-------|
| Model registry | Unit | Load default, load from env override, validate entries |
| `getModel()` | Unit | Platform-funded path, BYOK path, invalid model rejection |
| BYOK stash | Integration | New cookie format, legacy key rejection, model validation |
| Per-agent model resolution | Unit | Arena default, per-agent override, missing override fallback |
| Credit estimation (mixed models) | Unit | Different models per agent, correct per-agent pricing |
| Arena builder form | Unit/E2E | Per-agent model picker renders, submits correct FormData |
| Bout engine | Integration | Per-turn model resolution from lineup, BYOK key shared across agents |
| Backward compat | Unit | Old `sk-ant-*` keys get clear error message |

Existing tests in `tests/api/byok-stash.test.ts` rewrite to match new
single-provider behavior. Existing bout engine tests update model IDs from
Anthropic format to OpenRouter format.

### 10. Migration Path

This is a breaking change for BYOK users with Anthropic keys. Mitigation:

1. BYOK stash returns a clear 400 error for `sk-ant-*` keys with instructions
   to switch to OpenRouter.
2. The BYOK input field placeholder text updates from
   "sk-ant-* or sk-or-v1-*" to "sk-or-v1-*".
3. No DB migration required -- ArenaAgent JSONB schema is additive.
4. Env vars must be updated on deploy (ANTHROPIC_API_KEY replaced by
   OPENROUTER_API_KEY, model env vars renamed).

### 11. Files Changed

| File | Action | Scope |
|------|--------|-------|
| `lib/ai.ts` | Rewrite | Single-provider getModel(), remove Anthropic client |
| `lib/model-registry.ts` | New | Config-driven model list, labels, limits, pricing |
| `lib/models.ts` | Heavy edit | Strip to isValidByokKey() + deprecated guard only |
| `lib/byok.ts` | Rewrite | Drop provider encoding, simplify cookie format |
| `lib/credits.ts` | Edit | Read pricing from registry, per-agent cost estimation |
| `lib/env.ts` | Edit | New env vars, remove old Anthropic vars |
| `lib/use-byok-model-picker.ts` | Rewrite | Single provider, registry-driven labels |
| `lib/bout-validation.ts` | Edit | Remove provider branching, simplify model resolution |
| `lib/bout-execution.ts` | Edit | Per-turn model from agent lineup |
| `lib/bout-lineup.ts` | Edit | Pass model field through ArenaAgent |
| `db/schema.ts` | Edit | Add model to ArenaAgent type |
| `app/api/byok-stash/route.ts` | Edit | Drop provider detection, new validation |
| `components/arena-builder.tsx` | Edit | Per-agent model override UI |
| `app/roadmap/page.tsx` | Edit | Mark AI Gateway + multi-model as shipped (end) |
| `tests/api/byok-stash.test.ts` | Rewrite | Single-provider tests |
| `tests/` (various) | Edit | Update model IDs from Anthropic to OpenRouter format |

## Gate Criteria

From the roadmap:

- BYOK user can select from multiple providers (via OpenRouter)
- Per-agent model selection works in custom arena builder
- Existing BYOK flows work (OpenRouter keys -- Anthropic keys deprecated with clear error)
- Tests cover provider routing
- Credit pricing reflects OpenRouter rates
- `pnpm run test:ci` green

## Out of Scope

- Vercel AI Gateway integration (not needed -- OpenRouter handles routing)
- Streaming protocol changes (OpenRouter is already SSE-compatible)
- UI redesign of arena builder beyond the per-agent model picker
- Model quality/evaluation comparison
- Double-elimination or round-robin (Epic 4)
