# Per-Agent Model Selection for Custom Arena Bouts

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Custom arena builder only (not preset bouts)
**Follow-up:** Per-agent BYOK keys (deferred to separate PR)

## Problem

Arena bouts use a single global model for all agents. Users cannot pit different models against each other (e.g. Haiku vs Sonnet vs GPT-4o in one bout). Per-agent model selection is listed as Epic 3, Story #134 on the roadmap.

## Design

### Data Model

Add an optional `model` field to both `ArenaAgent` (db/schema.ts) and `Agent` (lib/presets.ts):

```typescript
// db/schema.ts
export type ArenaAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  color?: string;
  avatar?: string;
  model?: string;  // per-agent model override
};

// lib/presets.ts
export type Agent = {
  id: string;
  name: string;
  systemPrompt: string;
  color: string;
  avatar?: string;
  model?: string;  // per-agent model override, falls back to bout-level model
};
```

No database migration required. `agentLineup` is JSONB, so adding an optional field is backward-compatible. Existing bouts without `model` on lineup entries fall back to the global bout model.

### UI - Arena Builder

In `components/arena-builder.tsx`:

- Add `agentModels` state: `Record<string, string>` mapping agentId to selected model
- Each selected agent in the lineup section gets a per-agent model `<select>` dropdown
- Dropdown options match the global model selector (FREE_MODEL_ID, premium models if enabled, no BYOK)
- Default option: "Use bout model" (empty string) - inherits the global `selectedModel`
- Per-agent selector only visible when `showModelSelector` is true (premium/BYOK access)
- When an agent is toggled off, its entry is removed from `agentModels`
- Form submission emits hidden inputs: `<input name="agentModel_{agentId}" value="{modelId}" />`
- Global model selector stays as the default fallback

### Server Action - createArenaBout()

In `app/actions.ts`:

- Read `agentModel_{id}` form fields for each agent in the lineup
- Attach `model` to each lineup entry (empty string becomes `undefined`, omitted from JSONB)
- Global `model` continues to pass as URL query param to bout page (unchanged)
- No validation of per-agent model here; validation happens at execution time in `validateBoutRequest()`
- Invalid per-agent models fail safe by falling back to the global bout model

### Bout Validation

In `lib/bout-validation.ts`:

- Add `agentModelOverrides?: Record<string, string>` to `BoutContext`
- After resolving the global `modelId`, iterate `preset.agents`:
  - For each agent with a `model` field, validate against tier/access rules via `canAccessModel(tier, agentModel)`
  - Valid overrides stored in `agentModelOverrides`
  - Invalid overrides silently fall back to global `modelId` (degradation, not error)
- Credit pre-authorization: estimate cost using the most expensive model across all agents, multiplied by expected turns (safe overestimate; actual settlement uses real per-turn token counts)

### Bout Execution

In `lib/bout-execution.ts`:

- Remove the single `boutModel` creation before the loop
- Per-turn model resolution inside the loop:
  ```
  turnModelId = ctx.agentModelOverrides?.[agent.id] ?? modelId
  turnModel = getModel(turnModelId, ...)
  ```
- `getModel()` is cheap (creates provider wrapper, no network call) - per-turn is fine
- `getInputTokenBudget(turnModelId)` called per-turn (different models have different context windows)
- Cost settlement passes `turnModelId` per turn (accurate per-model cost)
- PostHog `$ai_generation` events use `turnModelId` (correct analytics attribution)

### Lineup Reconstruction

In `lib/bout-lineup.ts`:

- `buildArenaPresetFromLineup()` passes `model` through from `ArenaAgent` to `Agent`:
  ```
  model: agent.model,
  ```

### Backward Compatibility

- Existing bouts: no `model` field on lineup entries, `agentModelOverrides` is empty, global model used for all turns (identical to current behavior)
- Preset bouts: `Agent` type gains optional `model` but no presets set it, so behavior is unchanged
- BYOK: per-agent BYOK deferred; if global model is `byok`, all agents use the same BYOK key (current behavior preserved)

## Files Changed

1. `db/schema.ts` - Add `model?: string` to `ArenaAgent` type
2. `lib/presets.ts` - Add `model?: string` to `Agent` type
3. `components/arena-builder.tsx` - Per-agent model dropdowns, `agentModels` state, hidden form inputs
4. `app/actions.ts` - Read per-agent model fields, attach to lineup
5. `lib/bout-validation.ts` - Add `agentModelOverrides` to `BoutContext`, validate per-agent models
6. `lib/bout-execution.ts` - Per-turn model resolution, per-turn cost settlement
7. `lib/bout-lineup.ts` - Pass `model` through in lineup reconstruction
8. `lib/credits.ts` - No changes needed (already accepts modelId per call)

## Testing

- Unit test: `buildArenaPresetFromLineup` preserves `model` field
- Unit test: `agentModelOverrides` populated correctly for valid overrides, empty for invalid
- Integration test: mixed-model arena bout creates, persists lineup with model fields, executes with different models per turn
- Backward compat test: bout without per-agent models behaves identically to current

## Out of Scope

- Per-agent BYOK keys (follow-up PR)
- Per-agent model selection for preset bouts
- UI for comparing model performance across agents post-bout
