# L5: Change Impact Analysis

> Date: 2026-03-16
> Scope: Three future requirements traced through the codebase
> Decision: SD-328 [tech-debt-exposure]
> Depends on: L1 dependency map, L2 API surface audit, L3 error path review

---

## Summary

Three changes, three different shapes. Adding a new AI provider via
OpenRouter is a 1-file change (the designed extension point). Adding a new
preset format is a 5-file change with zero code in the engine (data-driven).
Fixing the preauth-settle gap is a 4-file change with zero schema migration.
The architecture flexes well for content and configuration changes. The
friction is in provider-level changes that cut across billing, access
control, and observability.

---

## L5-A: Add a New AI Provider

### Two scenarios with very different blast radii

**Scenario A: New model via OpenRouter (e.g. `openai/o3`)**

| Touch points | 1 file, 3 locations |
|---|---|
| Schema changes | 0 |
| Effort | 15 minutes, fully mechanical |

Changes:
1. `lib/models.ts` - add to `OPENROUTER_MODELS` const
2. `lib/models.ts` - add to `OPENROUTER_MODEL_LABELS`
3. `lib/ai.ts` - add to `MODEL_CONTEXT_LIMITS`

This is the designed extension point. The OpenRouter abstraction exists
specifically so new models are a config-level change. BYOK users already
use OpenRouter for non-Anthropic models.

**Scenario B: New direct provider (e.g. direct OpenAI SDK)**

| Touch points | 10-12 code files + 5 content pages |
|---|---|
| Schema changes | 0 |
| Effort | 2-4 hours, judgment required in 4 places |

| Category | Files | Change type |
|----------|-------|-------------|
| Model registry | `lib/models.ts` (type union, key prefix, model IDs, labels, env validation) | Modificative |
| AI SDK dispatch | `lib/ai.ts` (new provider import, new branch in `getModel()`, context limits) | Modificative |
| Pricing | `lib/credits.ts` (new entries in price table) | Additive |
| Bout engine | `lib/bout-engine.ts` (`isAnthropicModel()` assumption) | Modificative |
| Access control | `lib/tier.ts` (MODEL_FAMILY mapping) | Modificative |
| BYOK UI | `lib/use-byok-model-picker.ts` (new provider branch) | Modificative |
| BYOK validation | `app/api/byok-stash/route.ts` (new provider validation) | Modificative |
| Env config | `lib/env.ts` (new API key env var) | Additive |
| Content pages | privacy, security, terms, roadmap, developers (Anthropic refs) | Content update |

**Key architectural observations:**

- Platform-funded calls assume Anthropic (`getModel()` falls through to
  `defaultAnthropic`). Making platform calls route to a non-Anthropic
  provider requires changing this assumption in multiple places.
- Prompt caching is correctly gated by `isAnthropicModel()` - already
  handles the multi-provider case for BYOK.
- `MODEL_FAMILY` taxonomy is Anthropic-centric (`haiku` | `sonnet`).
  Adding a non-Anthropic platform model requires extending this.
- No database migration needed - `model` column is `varchar(128)`.

---

## L5-C: Fix the Preauth-Settle Gap

The highest-risk finding from L3. User money is permanently lost on
process crash between preauthorization and settlement.

| Touch points | 2 modified + 2 created = 4 files |
|---|---|
| Schema changes | 0 |
| Effort | 1-2 hours |

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `lib/credits.ts` | Edit | Add `reconcileStalePreauths()` function |
| 2 | `app/api/cron/reconcile-credits/route.ts` | Create | Cron endpoint, protected by secret header |
| 3 | `vercel.json` (or equivalent) | Edit | Add cron schedule (every 15 min) |
| 4 | `tests/` | Create | Test reconciliation logic |

**No schema migration.** The detection query uses existing fields:

```sql
SELECT * FROM credit_transactions
WHERE source = 'preauth'
AND created_at < NOW() - INTERVAL '30 minutes'
AND NOT EXISTS (
  SELECT 1 FROM credit_transactions ct2
  WHERE ct2.source IN ('settlement', 'settlement-error')
  AND ct2.metadata->>'boutId' = credit_transactions.metadata->>'boutId'
);
```

**The reconciliation function:**
1. Find orphaned preauths (query above)
2. For each: `applyCreditDelta(userId, preauthMicro, 'reconciliation', { boutId, ... })`
3. Log each reconciliation with full context
4. Return count for monitoring

**The cron endpoint:**
- Protected by `timingSafeEqual` on a `CRON_SECRET` header (same pattern
  as the research API bypass, already proven in the codebase)
- Returns `{ reconciled: number, errors: number }`
- Alert if `errors > 0`

**Why this is a good interview answer:**
- Found through systematic review (L3), not by encountering it in production
- The individual operations are sound (transactions work correctly)
- The gap is between operations, not within them
- The fix uses existing patterns (secret header, credit delta function)
- Zero schema migration - the data model already supports detection
- The reconciliation query is the kind of thing a senior/lead engineer writes

---

## L5-E: Add a New Arena Preset Format

| Touch points | 1 created + 4 edited = 5 files |
|---|---|
| Schema changes | 0 |
| Effort | 30 minutes, fully mechanical |

| # | File | Action | Lines changed |
|---|------|--------|---------------|
| 1 | `presets/panel-debate.json` | Create | New JSON file (~50 lines) |
| 2 | `lib/presets.ts` | Edit | 2 lines (import + array entry) |
| 3 | `presets/index.json` | Edit | 4 lines (index entry) |
| 4 | `tests/unit/presets-validation.test.ts` | Edit | 1 line (add to file list) |
| 5 | `tests/unit/presets.test.ts` | Edit | 1 line (update count assertion) |

**Zero changes in 19 other files that reference presets.** The bout engine
does not care about the preset format - it consumes `preset.agents` and
`preset.maxTurns` via round-robin (`i % preset.agents.length`). The UI
auto-discovers presets via `ALL_PRESETS.map()`. No hard-coded preset IDs
anywhere (except the `ARENA_PRESET_ID` sentinel for custom lineups).

**This is the proof that the architecture works.** A new content format
requires zero code changes in the engine, zero changes in the UI, and zero
schema changes. The 5-file touch count is entirely registration (import,
array entry, test update).

**Design constraint noted:** The turn model is pure round-robin. A moderator
in a 3-agent panel debate gets the same turn frequency as debaters (every
3rd turn). The `turn_order` field exists in the JSON schema but the bout
engine ignores it - dead schema. Implementing asymmetric turn ordering
would require changes to `bout-engine.ts:658-659`, but that is a feature
request, not a preset format limitation.

---

## Comparative Summary

| Change | Files touched | Schema changes | Mechanical? | Interview value |
|--------|-------------|----------------|-------------|-----------------|
| New OpenRouter model | 1 | 0 | Fully | "1-file change. Designed extension point." |
| New direct provider | 15-17 | 0 | Partially | "Cross-cutting but no schema migration." |
| Preauth reconciliation | 4 | 0 | Mostly | "Found through systematic review. Fix uses existing patterns." |
| New preset format | 5 | 0 | Fully | "Zero engine changes. Data-driven." |

**The pattern:** Configuration and content changes are cheap (1-5 files).
Infrastructure changes are moderate (4-17 files). No change requires a
schema migration. The architecture absorbs new models and new formats
without structural change. The friction is in provider-level assumptions
(Anthropic-centricity) that were correct design decisions at launch but
would need refactoring for true multi-provider platform support.

---

## Interview-Ready Observations

**"How easy is it to extend your system?"**
It depends on the axis of extension. New AI models via OpenRouter: 1 file.
New debate formats: 5 files, zero engine code. New direct provider: 15+
files because the platform-funded path assumes Anthropic. The architecture
was designed to extend along the content axis (presets, models) with minimal
friction, and that design has held. The provider axis is harder because it
was a correct-at-launch assumption that hardcoded Anthropic as the platform
provider.

**"How would you add a new feature to your system?"**
I trace the change impact before writing code. For each future requirement,
I categorise every affected file as additive (new code), modificative
(change existing), or schema (migration). I count touch points and identify
which changes are mechanical (can be done by an agent) vs judgment-required
(need human decision). This tells me the blast radius before I start.

**"What is the best thing about your architecture?"**
The preset system. A new debate format - which is the core content of the
product - requires zero changes to the execution engine, zero changes to
the UI, and zero schema migrations. Five files, all mechanical. That means
the product can evolve without the engineering being a bottleneck.
