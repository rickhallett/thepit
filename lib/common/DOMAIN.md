# lib/common

Shared utilities used across all domains. No business logic.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `api-utils.ts` — errorResponse, parseValidBody, rateLimitResponse, API_ERRORS
- `rate-limit.ts` — in-memory sliding window rate limiter
- `env.ts` — Zod-validated environment variables
- `types.ts` — shared branded types (BoutId, AgentId, MicroCredits, UserId)

## Rule

If it's used by 2+ domains, it lives here.
If it's used by 1 domain, it lives in that domain.
