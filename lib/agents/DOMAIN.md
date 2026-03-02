# lib/agents

Agent creation, registry, prompt hashing.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `create.ts` — createAgent, validateAgentInput, computePromptHash
- `registry.ts` — getAgentSnapshots, getAgentDetail
- `types.ts` — AgentId, AgentTier, AgentCreateInput

## Owns

- `app/api/agents/route.ts` (thin handler)
- agents table

## Depends on

- `db` (direct table access)
- `lib/common` (api-utils, rate-limit)
- `lib/auth` (userId, ensureUserRecord)
