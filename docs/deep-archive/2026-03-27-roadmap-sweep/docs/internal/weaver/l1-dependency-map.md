# L1: Dependency and Boundary Map

> Date: 2026-03-16
> Tool: madge 8.0.0 with tsconfig path resolution
> Scope: app/, lib/, components/, db/ (178 TS/TSX files)
> Decision: SD-328 [tech-debt-exposure]

---

## Summary

The codebase has clean macro-level architecture with a small number of
structural concerns that should be addressed before they compound. One
circular dependency, one god module, a flat lib/ directory that would
benefit from domain clustering, and a missing data access abstraction
layer. The infrastructure modules (logger, api-utils, rate-limit) are
correctly high fan-in. The copy system demonstrates good boundary design.

---

## Findings

### F1: Circular Dependency - agent-registry <-> agent-mapper

```
lib/agent-registry.ts -> lib/agent-mapper.ts (imports rowToSnapshot)
lib/agent-mapper.ts   -> lib/agent-registry.ts (imports AgentSnapshot type)
```

**Severity:** Low (type-only cycle, no runtime issue)
**Mechanism:** agent-mapper needs the AgentSnapshot type to define its return
type. agent-registry needs rowToSnapshot to convert DB rows. Classic extract-
type-to-shared-file pattern.
**Fix:** Extract AgentSnapshot type to `lib/agent-types.ts` or collocate with
agent-mapper since that is where the transformation lives.

---

### F2: God Module - lib/bout-engine.ts (24 deps, 1274 lines)

The bout engine imports from 24 modules across db/, lib/, and external
packages. It is the highest fan-out file in the codebase by a significant
margin (next highest: app/actions.ts at 16, which is expected for a server
actions file).

**Dependencies (24):**
- db: db/index.ts, db/schema.ts
- Core: ai.ts, models.ts, xml-prompt.ts, response-formats.ts, response-lengths.ts
- Business: credits.ts, tier.ts, presets.ts, bout-lineup.ts, byok.ts, intro-pool.ts
- Infrastructure: logger.ts, api-utils.ts, rate-limit.ts, request-context.ts,
  async-context.ts, langsmith.ts, posthog-server.ts, errors.ts
- Specialised: refusal-detection.ts, experiment.ts, validation.ts

**Risk:** Any change to any of these 24 modules has the potential to break
bout execution. The module coordinates validation, auth, credit checking,
turn execution, transcript building, DB persistence, and analytics in a
single 1274-line file.

**Observation:** The file header documents three phases (validate, execute,
caller wraps). This is already decomposed conceptually. The question for L2
is whether the phase boundaries are enforced in the code or just documented.

---

### F3: No Data Access Layer - db/ accessed from everywhere

72 direct imports of db/index.ts or db/schema.ts from across the codebase:

| Layer | Files importing db/ | Expected? |
|-------|-------------------|-----------|
| lib/ | 20 files | Partially - lib IS the service layer |
| app/api/ | 13 API routes | Questionable - should go through lib/ |
| app/ (pages) | 4 page components | Questionable - server components can, but coupling |
| components/ | 2 components | No - components should not know about schemas |

**Boundary violations (components importing db/):**
- `components/arena.tsx` imports `db/schema.ts`
- `components/bout-hero.tsx` imports `db/schema.ts`

These are type imports for TypeScript inference (using schema types in
component props). The runtime code does not query the database from
components. But the import coupling means a schema change forces component
recompilation and creates a dependency path that should not exist.

**Pattern:** No abstraction between "database row shape" and "component prop
shape." The schema types propagate directly to the UI layer.

---

### F4: Flat lib/ Directory (76 files, no domain structure)

lib/ contains 76 files at a single level (plus lib/eval/ as the only
subdirectory). Natural domain clusters exist but are not expressed in
the directory structure:

| Cluster | Files | Purpose |
|---------|-------|---------|
| Agent domain | agent-detail, agent-display-name, agent-dna, agent-lineage, agent-links, agent-mapper, agent-prompts, agent-registry, seed-agents | Agent identity, resolution, persistence |
| Bout domain | bout-engine, bout-lineup | Bout execution |
| API infrastructure | api-logging, api-schemas, api-utils, rate-limit, request-context, async-context | Request handling |
| Content/copy | copy.ts, copy-client.tsx, copy-edge.ts | Multi-runtime content delivery |
| Research/eval | eval/*, research-anonymize, research-exports | Evaluation pipeline |
| Credits/billing | credits, credit-catalog, stripe, tier | Payment and access control |
| User engagement | reactions, winner-votes, engagement, analytics, use-bout-*.ts | Client-side hooks and tracking |

**Risk:** Flat structure makes it difficult to reason about boundaries. When
everything is at the same level, there is no structural signal about what
should depend on what. A developer (or agent) adding a new file has no
guidance on where it belongs or what it should be allowed to import.

---

### F5: lib/eval/ Orphaned from Application

The four evaluation modules have zero fan-in from the application:
- lib/eval/debate-quality-judge.ts
- lib/eval/format.ts
- lib/eval/persona.ts
- lib/eval/refusal.ts

They are imported only by their corresponding test files in tests/unit/eval/.

**Assessment:** This is structurally correct - these are offline evaluation
judges, not runtime application code. But it means there is no automated
evaluation running during bout execution. The evaluation pipeline exists
as a test harness only. Whether this is tech debt or intentional design
depends on whether runtime evaluation is a planned feature.

---

### F6: Clean Patterns Worth Preserving

Not all findings are problems. These patterns are sound:

**Copy system boundary design:** copy.ts (server), copy-client.tsx (client),
copy-edge.ts (edge runtime). Three files, each targeted at a different
Next.js runtime. Clean separation that prevents "cannot use server module
in client component" errors.

**Infrastructure fan-in is appropriate:** logger (27), api-utils (20),
api-logging (20), cn (15), analytics (16). These are utility modules
designed to be widely imported. High fan-in here is correct.

**API routes follow consistent structure:** Nearly all API routes import
api-logging, api-utils, api-schemas, and rate-limit. This consistency
suggests a well-established pattern (likely from api-utils.ts) that new
routes follow.

**Preset data is cleanly isolated:** presets.ts imports 14 JSON preset
files. No other module imports preset JSON directly. Single point of
access for preset data.

---

## Metrics

| Metric | Value |
|--------|-------|
| Total files analysed | 178 (TS/TSX) + 17 (JSON/CSS) |
| Circular dependencies | 1 (type-only, low severity) |
| Highest fan-in | db/schema.ts (39), db/index.ts (34), lib/logger.ts (27) |
| Highest fan-out | lib/bout-engine.ts (24), app/actions.ts (16) |
| Cross-boundary imports (app -> lib) | 89 |
| Cross-boundary imports (app/api -> lib) | 125 |
| Cross-boundary imports (app/api -> db) | 25 |
| Cross-boundary imports (components -> db) | 2 (boundary violation) |
| Potentially dead lib modules | 4 (lib/eval/*, test-only) |
| lib/ files with no subdirectory structure | 71 of 76 |

---

## Boundary Crossing Matrix

Direction of dependency. Read as "source imports from target."

```
Source               -> Target               Count
-------------------------------------------------------
app/api              -> lib                  125
app (pages)          -> lib                   89
components           -> lib                   85
lib                  -> db                    37
app (pages)          -> components            34
app/api              -> db                    25
lib                  -> presets               14
app (pages)          -> db                     8
lib                  -> copy                   5
components           -> components/ui          4
lib/eval             -> lib                    2
components           -> db                     2  *violation*
components/ui        -> lib                    2
```

---

## Recommended Priorities for L2

Based on this map, the L2 API surface audit should focus on:

1. **lib/bout-engine.ts** - highest fan-out, highest risk. What is its
   public API? Can the three documented phases become enforced boundaries?
2. **Agent cluster** - 9 files with the only circular. What is the public
   API of the agent domain vs its internal implementation?
3. **db/ access patterns** - which lib/ modules are acting as data access
   layer, and which are reaching through?
4. **components/arena.tsx** - 15 deps, imports db/schema.ts. What does it
   actually need from the schema, and can that be a prop type instead?

---

## Raw Data

Full dependency graph JSON preserved at the end of this file for
machine-readable reuse.

<details>
<summary>Full madge JSON output (click to expand)</summary>

```json
{
  "circular_dependencies": [
    ["lib/agent-registry.ts", "lib/agent-mapper.ts"]
  ],
  "highest_fan_in": {
    "db/schema.ts": 39,
    "db/index.ts": 34,
    "lib/logger.ts": 27,
    "lib/copy.ts": 23,
    "lib/presets.ts": 20,
    "lib/api-logging.ts": 20,
    "lib/api-utils.ts": 20,
    "lib/copy-client.tsx": 20,
    "lib/analytics.ts": 16,
    "lib/rate-limit.ts": 15,
    "lib/cn.ts": 15,
    "lib/credits.ts": 14,
    "lib/api-schemas.ts": 13,
    "lib/response-lengths.ts": 12,
    "lib/response-formats.ts": 11,
    "lib/agent-registry.ts": 9,
    "lib/tier.ts": 9,
    "lib/models.ts": 9,
    "lib/ai.ts": 8,
    "lib/users.ts": 7
  },
  "highest_fan_out": {
    "lib/bout-engine.ts": 24,
    "app/actions.ts": 16,
    "app/api/agents/route.ts": 16,
    "components/arena.tsx": 15,
    "app/arena/page.tsx": 14,
    "lib/presets.ts": 14
  },
  "boundary_violations": [
    "components/arena.tsx -> db/schema.ts",
    "components/bout-hero.tsx -> db/schema.ts"
  ],
  "orphaned_lib_modules": [
    "lib/eval/debate-quality-judge.ts",
    "lib/eval/format.ts",
    "lib/eval/persona.ts",
    "lib/eval/refusal.ts"
  ]
}
```

</details>
