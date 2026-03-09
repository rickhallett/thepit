## Section 1: Narrative Report

### Branch: phase5-discovery

I reviewed the changed files shown for the agents domain, replay page, and engagement additions. The main issues are around **input validation gaps**, **public exposure of sensitive agent internals**, **ID generation correctness**, and a **nondeterministic “most reacted” selection path** that can make replay-page output unstable.

#### 1) `computePromptHash` comments/tests overclaim canonical determinism
In `lib/agents/create.ts`, the comment says the code uses “canonical JSON of structured fields (sorted keys for determinism)”. That is only partially true. The object literal’s top-level key order is fixed in this function, but `JSON.stringify` is not a robust canonicalization strategy for nested structures like `quirks`; equivalent semantic inputs can hash differently depending on array order or string normalization. More importantly, the tests in `lib/agents/create.test.ts` only prove same-object repeatability, not canonical equivalence across differently ordered but semantically similar input. This is a classic **training-data-frequency** pattern: `JSON.stringify` looks like determinism, but it is not full canonical hashing.

This is not necessarily catastrophic if prompt hash is only an informational fingerprint, but the code/comments currently present it more strongly than the implementation justifies.

#### 2) Agent creation schema allows whitespace-only names and unconstrained quirk entries
`AgentCreateInputSchema` validates `name` with `.min(1)` but does not trim first. The UI trims before submit, but the API must not rely on the client. A request with `{ "name": "   " }` passes the schema and reaches `createAgent`, persisting a visually blank name. Same issue for optional string fields: several accept empty/whitespace-only strings rather than either rejecting or normalizing them.

Similarly, `quirks` is only `z.array(z.string()).optional()`: there is no per-item `.min(1)`, `.max(...)`, trimming, or array-length bound. A caller can submit empty strings, giant lists, or pathological payloads while the UI implies structured, concise data. That is a server-side validation miss.

#### 3) Agent detail route exposes full `systemPrompt` for any agent ID
`app/agents/[id]/page.tsx` fetches an agent by ID and renders `AgentDetails`, which exposes the full `systemPrompt` in a collapsible section. `lib/agents/registry.ts:getAgentDetail` performs no authorization or ownership filtering, only `eq(agents.id, agentId)`. Since the catalog page lists all non-archived agents and routes directly to details, any visitor can enumerate public agents and retrieve their full prompt contents.

Whether this is intended is not stated, but the creation flow, prompt hash display, and “custom” tier strongly suggest custom user-authored prompts may exist. If the product intends custom agents to be browsable but not prompt-copyable, this is a direct data exposure bug. At minimum, there is no code-level guard matching any privacy expectation around user-created prompt IP.

#### 4) Agent ID generation is “21 chars” but not actually nanoid-like and collision handling is absent
`createAgent` claims “Generates nanoid-style ID (21 chars)” but actually uses `crypto.randomUUID().replace(/-/g, "").slice(0, 21)`. That is hex-only, not nanoid-like, and it truncates UUID entropy to 84 bits. That may still be enough in practice, but the comment is inaccurate, and more importantly there is **no retry or explicit duplicate-key handling** if an ID collision occurs. Since the API collapses all DB errors into a generic 500, even a rare collision becomes an opaque production failure.

This is more a correctness/documentation mismatch plus resilience issue than an immediate disaster, but it is still a real flaw.

#### 5) Replay page’s “most reacted turn” selection is nondeterministic on ties
`getMostReactedTurnIndex` groups by `turnIndex`, orders only by `count(*) DESC`, and `limit(1)`. If multiple turns have the same top reaction count, the chosen row is database-order dependent. That makes the replay hero quote unstable across executions and environments for the same underlying data. Since this drives visible page content and metadata-adjacent rendering, a deterministic secondary sort (e.g. earliest turn index, or latest) is needed.

This is a classic Looks-Right Trap: the query pattern appears correct, but it omits the tie-breaker required for stable behavior.

#### 6) Replay page documentation overstates “statically” / SEO-friendly rendering
The header comment for `app/b/[id]/page.tsx` says the page “renders completed bout transcripts statically” and is a “Server component for SEO-friendly OG metadata.” But the implementation performs per-request DB access, auth lookup, short-link resolution, and engagement queries. There is no static generation configuration shown here. “Server component” does not mean static. The comments overclaim behavior the code does not implement.

That matters because these comments can mislead future changes or operational assumptions about cacheability and query cost.

#### 7) Placeholder E2E files are effectively dead test code and may create false confidence
The new e2e specs are non-tests that define local fake `describe/skip/expect` shims and then execute placeholder code. These files can make the repo appear to have coverage for agent and sharing flows when none actually runs. The comments admit this, but the file presence still creates paper coverage. This is lower severity, but it is still a review finding because it affects test signal quality and cross-team expectations.

---

## Section 2: Structured Findings

```yaml
review:
  model: "gpt-5"
  date: "2026-03-09"
  branches:
    - "phase5-discovery"
  base_commit: "unknown"

findings:
  - id: F-001
    branch: "phase5-discovery"
    file: "lib/agents/types.ts"
    line: "10-21"
    severity: medium
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "AgentCreateInputSchema accepts whitespace-only names because name is not trimmed"
    description: >
      The API schema requires name.min(1) but does not trim input first, so a payload
      like { "name": "   " } passes validation and can be stored as a visually blank
      agent name. The client trims before submit, but server-side validation must not
      depend on the browser path.
    recommendation: "Use z.string().trim().min(1)... for name, and consider trimming optional text fields too."

  - id: F-002
    branch: "phase5-discovery"
    file: "lib/agents/types.ts"
    line: "15"
    severity: medium
    watchdog: WD-PG
    slopodar: shadow-validation
    title: "quirks array has no per-item or array-size validation"
    description: >
      quirks is validated only as z.array(z.string()).optional(), which allows empty
      strings, whitespace-only items, and arbitrarily large arrays/items if the DB
      accepts them. The UI suggests concise comma-separated quirks, but the API does
      not enforce that structure.
    recommendation: >
      Validate quirks with item trimming and bounds, e.g. z.array(z.string().trim().min(1).max(...)).max(...),
      or normalize/filter on the server before insert.

  - id: F-003
    branch: "phase5-discovery"
    file: "app/agents/[id]/page.tsx"
    line: "13-24"
    severity: high
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "Agent detail page exposes full systemPrompt for any readable agent ID"
    description: >
      The detail route fetches any agent by ID and renders AgentDetails, which includes
      the full systemPrompt when present. getAgentDetail performs no ownership or
      visibility check. Because the catalog lists non-archived agents publicly, this
      allows visitors to read complete prompt contents for custom agents unless privacy
      is intentionally meant to be fully public.
    recommendation: >
      Enforce an explicit visibility policy in the query layer: either hide systemPrompt
      from public detail responses, or restrict full detail access to owner/admin.

  - id: F-004
    branch: "phase5-discovery"
    file: "lib/agents/registry.ts"
    line: "39-74"
    severity: high
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "getAgentDetail returns archived and private fields without visibility filtering"
    description: >
      getAgentSnapshots excludes archived agents, but getAgentDetail does not filter on
      archived at all and returns all columns including ownerId and systemPrompt. A user
      can request /agents/{id} for an archived agent if they know the ID, and the data
      layer has no concept of public vs owner-safe fields.
    recommendation: >
      Add visibility filtering to detail reads (at least archived=false for public pages)
      and separate public-detail projection from owner-detail projection.

  - id: F-005
    branch: "phase5-discovery"
    file: "lib/agents/create.ts"
    line: "45-67"
    severity: medium
    watchdog: WD-SH
    slopodar: none
    title: "ID generation comment claims nanoid-style IDs but implementation truncates UUID hex"
    description: >
      The function comment says it generates a nanoid-style 21-character ID, but the
      actual implementation strips dashes from a UUID and slices the first 21 hex
      characters. That is not nanoid-like alphabet/format behavior and overstates what
      the code guarantees.
    recommendation: "Either use a real nanoid generator or correct the comment to match the actual ID format."

  - id: F-006
    branch: "phase5-discovery"
    file: "lib/agents/create.ts"
    line: "50-67"
    severity: medium
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "createAgent has no collision retry or duplicate-key handling for generated IDs"
    description: >
      Agent IDs are generated client-side in application code and inserted once with no
      retry path. If the insert fails due to a duplicate primary key, the API returns a
      generic 500. The implementation assumes uniqueness but does not enforce recovery
      from the only realistic failure mode of generated identifiers.
    recommendation: >
      Use a collision-resistant ID library with retry-on-conflict, or catch unique
      violations and regenerate/retry a bounded number of times.

  - id: F-007
    branch: "phase5-discovery"
    file: "lib/agents/create.ts"
    line: "16-38"
    severity: medium
    watchdog: WD-TDF
    slopodar: right-answer-wrong-work
    title: "computePromptHash uses JSON.stringify while comments/tests imply canonical hashing"
    description: >
      The function comment says structured-field hashing uses canonical JSON with sorted
      keys for determinism, but the implementation is plain JSON.stringify on an object
      literal. That is only a shallow fixed-order serialization, not robust canonical
      hashing, and equivalent prompt content can hash differently depending on representation.
    recommendation: >
      Either downgrade the claim in comments/tests to simple serialization stability for
      this exact object shape, or implement true canonicalization before hashing.

  - id: F-008
    branch: "phase5-discovery"
    file: "lib/engagement/reactions.ts"
    line: "182-198"
    severity: medium
    watchdog: WD-LRT
    slopodar: none
    title: "getMostReactedTurnIndex is nondeterministic when multiple turns tie on reaction count"
    description: >
      The query orders only by count(*) DESC and limits to one row. If two or more turn
      indexes have the same maximum reaction count, the chosen turn depends on database
      row ordering and can vary across executions. This makes the replay hero quote unstable.
    recommendation: "Add a deterministic secondary order, e.g. count DESC then turnIndex ASC."

  - id: F-009
    branch: "phase5-discovery"
    file: "app/b/[id]/page.tsx"
    line: "2-6"
    severity: low
    watchdog: WD-SH
    slopodar: stale-reference-propagation
    title: "Replay page docstring claims static rendering that the implementation does not provide"
    description: >
      The file comment says the page renders completed bout transcripts statically and is
      SEO-friendly via server component rendering, but the implementation performs live DB
      queries, auth lookup, short-link resolution, and engagement reads on request. No
      static generation behavior is shown in this diff.
    recommendation: "Update the docstring to describe request-time server rendering unless static generation is actually configured."

  - id: F-010
    branch: "phase5-discovery"
    file: "tests/e2e/agent-flow.spec.ts"
    line: "1-124"
    severity: low
    watchdog: WD-DC
    slopodar: right-answer-wrong-work
    title: "Agent e2e spec is placeholder shim code that provides no real test coverage"
    description: >
      The file defines local fake describe/skip/expect shims instead of using a test
      runner. While comments say Playwright is not installed, the file still looks like
      an e2e suite in the tree and can create false confidence that the user flow is covered.
    recommendation: >
      Move placeholders out of the active test tree, or name them clearly as plans/docs
      so coverage dashboards and reviewers do not mistake them for executable tests.

  - id: F-011
    branch: "phase5-discovery"
    file: "tests/e2e/sharing-flow.spec.ts"
    line: "1-101"
    severity: low
    watchdog: WD-DC
    slopodar: right-answer-wrong-work
    title: "Sharing e2e spec is non-executable placeholder code presented as a test file"
    description: >
      Like the other stub specs, this file contains local shim functions and skipped
      placeholders rather than executable Playwright tests. It documents intent but does
      not validate replay/short-link behavior in CI.
    recommendation: >
      Keep these as test plans outside the test suite or convert them only once the real
      runner is installed, so repository test signals remain truthful.
```