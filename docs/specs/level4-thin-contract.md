# Level 4 Thin Contract (tspit x darkfactorio)

## Intent

Integrate Level-4 evaluation without destabilizing release-critical runtime paths.

This is intentionally thin:
- emit deterministic run records from existing artifacts
- call external versioned gate CLI
- keep policy logic in `darkfactorio`

## Data inputs

### pitstorm metrics snapshot
- source: `pitstorm run --output <file.json>`
- consumed field: `retries`

### QA summary JSON
- source: `qa/runner.ts` via `toJSON(results)`
- consumed fields: `summary.total`, `summary.passed`

## Emit command

```bash
pnpm run level4:emit \
  --window w-2026-02-l4-01 \
  --run run-001 \
  --pipeline tspit-preview-e2e \
  --class medium_integration \
  --pitstorm pitstorm/results/phase1-baseline.json \
  --qa qa/results/latest.json
```

Output appends one line to `runs/<window>.ndjson`.

## Gate command (external)

```bash
pnpm run level4:gate:baseline --window w-2026-02-l4-01 --records runs/w-2026-02-l4-01.ndjson
pnpm run level4:gate:adversarial --window w-2026-02-l4-01 --records runs/w-2026-02-l4-01.ndjson
```

## Non-goals

- No changes to Next.js runtime or API route behavior.
- No forced blocking in existing CI pipelines yet.
- No in-repo duplication of dfgate implementation.
