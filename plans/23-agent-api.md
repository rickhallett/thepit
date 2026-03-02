# 23-agent-api

## Context
depends_on: [05, 02]
produces: [lib/agents/create.ts, lib/agents/registry.ts, lib/agents/types.ts, app/api/agents/route.ts]
domain: lib/agents
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md — "API Contracts > Agents" section and "Data Model > agents" table
- lib/agents/DOMAIN.md — domain ownership and file plan
- lib/common/api-utils.ts — errorResponse, parseValidBody, rateLimitResponse patterns
- lib/common/rate-limit.ts — checkRateLimit usage
- lib/common/types.ts — branded types (AgentId, UserId)
- db/schema.ts — agents table definition
- db/index.ts — database instance

## Task
Create the agent creation API and registry.

### lib/agents/types.ts
- AgentCreateInput Zod schema: name (required, max 80), systemPrompt (optional), archetype, tone, quirks (string[]), speechPattern, openingMove, signatureMove, weakness, goal (all optional varchar-length constrained)
- AgentId branded type (if not already in common/types.ts)

### lib/agents/create.ts
- `createAgent(userId: UserId, input: AgentCreateInput): Promise<{ agentId: AgentId; promptHash: string }>`
- Generate agent ID (nanoid 21 or use crypto.randomUUID)
- Compute prompt hash: SHA-256 of the system prompt (or canonical JSON of all structured fields if no system prompt). Use Node.js crypto module, NOT a library
- INSERT into agents table
- Return agentId and promptHash (0x-prefixed hex)

### lib/agents/registry.ts
- `getAgentSnapshots(): Promise<AgentSnapshot[]>` — SELECT non-archived agents, return id/name/archetype/tone/color/presetId/tier/promptHash
- `getAgentDetail(agentId: AgentId): Promise<AgentDetail | null>` — SELECT full agent record by ID

### app/api/agents/route.ts
- POST handler
- Auth required (return 401 if no userId)
- Rate limited: 10/hr per userId
- Parse body with AgentCreateInput schema
- Call createAgent
- Return 201 with { agentId, promptHash }

### Unit tests (lib/agents/create.test.ts)
- Prompt hash is deterministic (same input → same hash)
- Prompt hash is 0x-prefixed 64-char hex string
- Name validation (empty → error, too long → error)

### Integration test (tests/integration/api/agents.test.ts)
- POST /api/agents with valid input → 201 + agentId + promptHash
- POST /api/agents without auth → 401
- POST /api/agents with empty name → 400
- Verify agent appears in getAgentSnapshots after creation

## Do NOT
- Do NOT implement agent cloning or lineage tracking
- Do NOT implement EAS attestations or DNA fingerprinting
- Do NOT implement agent archiving/restore (admin feature, out of scope)
- Do NOT add the agents API to any UI page (that's task 24)

## Verification
After implementing, verify:
- `pnpm run typecheck` passes
- `pnpm run test:unit` passes (agent creation tests)
- Manual: `curl -X POST http://localhost:3000/api/agents -H "Content-Type: application/json" -d '{"name":"Test Agent"}'` returns 401 (no auth)
