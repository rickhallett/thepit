# 24-agent-pages

## Context
depends_on: [23]
produces: [app/agents/page.tsx, app/agents/[id]/page.tsx, app/agents/new/page.tsx, components/agents/agents-catalog.tsx, components/agents/agent-builder.tsx, components/agents/agent-details.tsx]
domain: components/agents
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md — "UI Pages" section for /agents, /agents/[id], /agents/new
- components/DOMAIN.md — component grouping conventions
- lib/agents/registry.ts — getAgentSnapshots, getAgentDetail
- lib/agents/create.ts — createAgent
- lib/agents/types.ts — AgentCreateInput, AgentSnapshot, AgentDetail
- app/api/agents/route.ts — API contract for agent creation
- Any existing page files for layout/styling patterns (app/page.tsx, app/arena/page.tsx)

## Task
Create the agent catalog, detail, and creation pages.

### app/agents/page.tsx (server component)
- Fetch all agents via getAgentSnapshots()
- Pass to AgentsCatalog client component
- Page title: "Agents"

### components/agents/agents-catalog.tsx (client component — "use client")
- Props: agents: AgentSnapshot[]
- Search input (filters by name, archetype)
- Grid layout of agent cards
- Click agent → navigate to /agents/{id}
- Use data-testid="agent-card" on each card
- Use data-testid="agent-search" on search input

### app/agents/[id]/page.tsx (server component)
- Fetch agent via getAgentDetail(id)
- 404 if not found
- Display: name, archetype, tone, quirks, system prompt (collapsible), prompt hash
- Use data-testid="agent-name", data-testid="agent-prompt-hash"

### app/agents/new/page.tsx (server component)
- Auth check: if not signed in, show message with link to /sign-in
- Render AgentBuilder component

### components/agents/agent-builder.tsx (client component)
- Tabbed form: Basics (name, archetype, goal), Personality (tone, speechPattern, quirks), Tactics (openingMove, signatureMove, weakness), Advanced (customInstructions, responseLength, responseFormat)
- Live prompt preview in sidebar (show what the system prompt will look like)
- Submit: POST /api/agents, redirect to /agents/{id} on success
- Use data-testid="agent-builder-submit" on submit button
- Use data-testid="agent-builder-name" on name input

### E2e test (tests/e2e/agent-flow.spec.ts)
- Navigate to /agents → see agent grid
- Search for agent → results filter
- Navigate to /agents/new (authenticated) → fill form → submit → redirect to detail page
- Navigate to /agents/{id} → see agent name and prompt hash

## Do NOT
- Do NOT implement agent cloning (no /agents/clone page)
- Do NOT implement admin archive/restore controls
- Do NOT add modal popups for agent details (use dedicated page)
- Do NOT implement DnaFingerprint visual hash glyph (nice-to-have, not MVP)

## Verification
After implementing, verify:
- `pnpm run typecheck` passes
- E2e test passes: agent creation flow works end to end
- Manual: navigate to /agents → see grid, click agent → see detail
