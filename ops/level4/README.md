# Level 4 Thin Contract Integration

This folder integrates `tspit` with the external `darkfactorio` Level-4 gate using a thin data contract.

## Why this exists

- Keep `tspit` release runtime stable.
- Avoid embedding darkfactory policy logic directly in `tspit`.
- Emit one deterministic NDJSON record per real run.
- Evaluate runs with external, versioned `dfgatev01` criteria.

## What this changes

- Adds a contract emitter (`scripts/emit-level4-record.ts`).
- Adds profile files for baseline/adversarial gate replay.
- Adds a gate wrapper (`scripts/run-level4-gate.sh`) that calls external `darkfactorio` CLI.
- Adds an optional manual workflow (`.github/workflows/level4-gate.yml`).

## What this does NOT change

- No changes to production request handling/runtime paths.
- No changes to core bout engine behavior.
- No automatic blocking of existing CI jobs.

## Contract file

- NDJSON stream path: `runs/<window_id>.ndjson`
- Record schema reference: `schemas/level4-eval-record-v0.1.json` in `darkfactorio`

## External dependency (pinned by path)

Default expected local path: `../darkfactorio`

Override with:

- `DFGATE_REPO=/path/to/darkfactorio`

