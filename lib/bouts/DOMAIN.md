# lib/bouts

Bout engine: validation, turn loop, LLM orchestration, SSE streaming, transcript persistence.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `engine.ts` — core bout execution (validateBoutRequest, executeBout)
- `streaming.ts` — SSE event protocol (createUIMessageStream integration)
- `validation.ts` — request validation, unsafe content check, idempotency
- `presets.ts` — preset loading, resolution, agent lineup building
- `types.ts` — BoutId, TranscriptEntry, BoutStatus, stream event shapes

## Owns

- `app/api/run-bout/route.ts` (thin handler, delegates to engine)

## Depends on

- `lib/credits` (preauth, settlement)
- `lib/common` (api-utils, rate-limit, types)
- `lib/auth` (userId resolution)
- `db` (bout persistence)
