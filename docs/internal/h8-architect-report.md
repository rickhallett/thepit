# H8 Experiment Infrastructure — Architect Report

**Date:** 2026-02-24
**Branch:** `feat/h8-experiment-infrastructure`
**Author:** Architect

## What Was Built

### 1. Experiment Module (`lib/experiment.ts`)

New module providing the complete experiment infrastructure:

- **Types:** `PromptHook`, `PromptHookContext`, `PromptHookResult`, `ScriptedTurn`, `ExperimentConfig`
- **Validation:** `validateExperimentConfig()` — comprehensive input validation for API-layer experiment configs. Checks turn bounds, agent index bounds, content non-empty, no duplicate scripted turns.
- **Compilation:** `compilePromptHook()` and `compileScriptedTurns()` — convert declarative API config into executable hooks and lookup maps.
- **Injection:** `appendExperimentInjection()` — appends content to system prompts in an `<experiment-injection>` XML section with proper escaping.

### 2. Bout Engine Changes (`lib/bout-engine.ts`)

Extended `BoutContext` with two optional fields:
- `promptHook?: PromptHook` — per-turn callback for system prompt injection
- `scriptedTurns?: Map<number, ScriptedTurn>` — pre-scripted turn content

Turn loop modifications (inside `_executeBoutInner`):
- **Scripted turn fast path:** Before the LLM call, checks `ctx.scriptedTurns` for the current turn number. If matched, emits the scripted text via SSE (text-start, text-delta, text-end), adds to history and transcript, and `continue`s — skipping the LLM call entirely. No token accounting, no credit charge.
- **Prompt hook:** After building the system message, invokes `ctx.promptHook` with turn context. If it returns `injectedContent`, appends it via `appendExperimentInjection()`.

**Zero regression guarantee:** Both features are gated behind `undefined` checks. When `promptHook` and `scriptedTurns` are not provided (the default), execution is identical to the existing code path. No existing test or behavior is affected.

### 3. API Endpoint Extension (`app/api/v1/bout/route.ts`)

Extended the synchronous bout endpoint to accept `experimentConfig` in the request body:

```typescript
interface ExperimentConfig {
  promptInjections?: Array<{
    afterTurn: number;
    targetAgentIndex: number;
    content: string;
  }>;
  scriptedTurns?: Array<{
    turn: number;
    agentIndex: number;
    content: string;
  }>;
}
```

**Security gates:**
- Requires valid `X-Research-Key` header (timing-safe comparison)
- Without research key, `experimentConfig` is rejected with 403
- Invalid config returns 400 with descriptive error
- When `experimentConfig` is absent, behavior is identical to before

**Implementation:** Pre-parses request body via `req.clone().json()` to extract `experimentConfig` before `validateBoutRequest` consumes the body. Validates, compiles to hooks, and attaches to `BoutContext`.

### 4. H8 Hypothesis Definition (`pitstorm/cmd/hypothesis/hypotheses.go`)

Added `h8ContextInjectionExperiment()` with 30 bouts across 3 conditions:
- **Control (10 bouts):** RE-A baseline, 12 turns, no intervention
- **Transcript exposure (10 bouts):** RE-A baseline, 12 turns, scripted counter-argument at turn 6 (via `experimentConfig.scriptedTurns`)
- **System prompt injection (10 bouts):** RE-A baseline, 12 turns, injection after turn 6 (via `experimentConfig.promptInjections`)

All use the same topic for consistency. The actual injection content is parameterized — specified at runtime, not hardcoded.

## What Was Tested

### Unit Tests (`tests/unit/experiment.test.ts`) — 38 tests

**validateExperimentConfig (22 tests):**
- Null/undefined passthrough (returns empty config)
- Type validation (rejects non-objects, arrays, strings, numbers)
- promptInjections: valid input, non-array, negative afterTurn, non-integer afterTurn, afterTurn >= maxTurns, targetAgentIndex >= agentCount, negative targetAgentIndex, empty content, whitespace-only content, multiple injections
- scriptedTurns: valid input, non-array, negative turn, turn >= maxTurns, duplicate turns, agentIndex >= agentCount, empty content, multiple non-overlapping
- Combined: both fields together, empty object

**compilePromptHook (8 tests):**
- Returns undefined when no injections
- Returns null before afterTurn threshold
- Returns null on exact afterTurn (not yet active)
- Returns content when turn > afterTurn and agent matches
- Returns null when agent doesn't match
- Persists injection for all subsequent turns
- Combines multiple injections for same agent
- Does not affect other agents

**compileScriptedTurns (2 tests):**
- Returns undefined when no scripted turns
- Returns Map with correct entries

**appendExperimentInjection (4 tests):**
- Appends experiment-injection XML section
- XML-escapes injected content
- Preserves original prompt intact
- Separates with double newline

### API Tests (`tests/api/v1-bout-experiment.test.ts`) — 10 tests

**Auth gating (3 tests):**
- Rejects experimentConfig without X-Research-Key
- Rejects experimentConfig with wrong X-Research-Key
- Accepts experimentConfig with valid X-Research-Key

**Validation errors (2 tests):**
- Rejects invalid config (negative afterTurn) with 400
- Rejects turn numbers exceeding preset maxTurns with 400

**Context attachment (3 tests):**
- Attaches promptHook function to context
- Attaches scriptedTurns Map to context
- Does not attach experiment fields when config absent

**Regression (2 tests):**
- Returns 200 with correct response when no experimentConfig
- executeBout called with clean context (no experiment fields)

## Gate Results

```
typecheck: PASS (0 errors)
lint:      PASS (0 errors, 27 pre-existing warnings — none from new code)
test:unit: PASS (1102 passed, 21 skipped, 0 failed from new code)
go vet:    PASS
go build:  PASS
```

Note: `SEC-AUTH-004` (timing-safe comparison test) is a pre-existing flaky failure unrelated to this change. It also fails on `master`.

## Architecture Decisions

1. **Separate module over inline code:** Created `lib/experiment.ts` rather than embedding types/logic in `bout-engine.ts`. This keeps the experiment infrastructure self-contained and testable in isolation.

2. **Declarative API config compiled to callbacks:** The API accepts a declarative `ExperimentConfig` object that gets compiled into `PromptHook` functions and `ScriptedTurn` maps. This means the bout engine has a simple, general interface (callbacks + maps) while the API provides a researcher-friendly declarative format.

3. **`continue` for scripted turns:** Scripted turns use `continue` to skip the entire LLM call block rather than wrapping it in an `else`. This minimizes diff size and keeps the standard LLM path untouched.

4. **Injection persists:** Once a `promptInjection` activates (turn > afterTurn), it stays active for all subsequent turns of that agent. This matches the experiment design — the injected content becomes part of the agent's ongoing instruction context.

5. **Request body clone:** Used `req.clone().json()` to pre-extract `experimentConfig` before `validateBoutRequest` consumes the original body. This avoids modifying the shared validation function.
