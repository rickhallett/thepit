# Implementation Plan: Per-Agent Model Selection

**Spec:** `docs/superpowers/specs/2026-04-02-per-agent-model-selection-design.md`

## Step 1: Data model types (no dependencies)

**Files:** `db/schema.ts`, `lib/presets.ts`

- Add `model?: string` to `ArenaAgent` type in `db/schema.ts`
- Add `model?: string` to `Agent` type in `lib/presets.ts`

**Verify:** `pnpm tsc --noEmit` passes (type-only change, no runtime effect)

## Step 2: Lineup reconstruction (depends on Step 1)

**Files:** `lib/bout-lineup.ts`

- Pass `model: agent.model` through in `buildArenaPresetFromLineup()`
- Add unit test: `buildArenaPresetFromLineup` preserves `model` field when present, omits when absent

**Verify:** `pnpm vitest run tests/unit/bout-lineup` (or relevant test file)

## Step 3: Server action (depends on Step 1)

**Files:** `app/actions.ts`

- In `createArenaBout()`, read `agentModel_{id}` from form data for each agent
- Attach `model` to lineup entries (empty string becomes `undefined`)

**Verify:** `pnpm tsc --noEmit`

## Step 4: Bout validation (depends on Steps 1-2)

**Files:** `lib/bout-validation.ts`

- Add `agentModelOverrides?: Record<string, string>` to `BoutContext` type
- After global model resolution, iterate `preset.agents` and validate per-agent models
- Valid overrides stored in map; invalid overrides silently dropped
- Credit pre-auth uses worst-case model pricing

**Verify:** `pnpm tsc --noEmit`, add unit test for override validation

## Step 5: Bout execution (depends on Step 4)

**Files:** `lib/bout-execution.ts`

- Remove single `boutModel` creation before the loop
- Resolve `turnModelId` per turn from `ctx.agentModelOverrides?.[agent.id] ?? modelId`
- Call `getModel(turnModelId, ...)` per turn
- Pass `turnModelId` to `getInputTokenBudget()`, `computeCostGbp()`, `computeCostUsd()`, PostHog events

**Verify:** `pnpm tsc --noEmit`

## Step 6: Arena builder UI (depends on Step 1)

**Files:** `components/arena-builder.tsx`

- Add `agentModels` state: `Record<string, string>`
- Add per-agent model `<select>` in lineup section, visible when `showModelSelector` is true
- Default option "Use bout model" (empty string)
- Emit hidden inputs `agentModel_{id}` for each agent with override
- Clean up `agentModels` when agent is deselected

**Verify:** `pnpm tsc --noEmit`, manual visual check

## Step 7: Gate

**Command:** `pnpm run test:ci`

All existing tests must pass. New unit tests for lineup reconstruction and validation must pass.

## Parallelism

Steps 1 is the foundation. After Step 1:
- Steps 2, 3, 6 are independent (lineup, action, UI) - can run in parallel
- Step 4 depends on 1 and 2
- Step 5 depends on 4
- Step 7 runs last
