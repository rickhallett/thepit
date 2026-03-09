### Section 1: Narrative Report (human-readable)

Branch reviewed: `phase2-ui` (diff plus referenced implementation files in-branch).

Key risks I found after scanning the branch:

1) `/api/reactions` is vulnerable to rate-limit bypass because `getClientIp` trusts the client-supplied `x-forwarded-for`. Unless the platform overwrites this header, clients can rotate it to evade the limit and also alter anonymous fingerprints.

2) `toggleReaction` uses a read-then-write flow without conflict handling. Concurrent toggles on the same reaction can race: both see “no existing,” one insert succeeds and the other hits the unique constraint and throws, producing a 500 instead of a consistent toggle result.

3) `createShortLink` does not handle slug collisions. The insert only guards against `boutId` conflicts; a rare `slug` collision will throw and the function will not retry, so the API can 500 on legitimate inputs.

4) Winner voting accepts any `agentId` with no verification that it is part of the bout. That allows votes for arbitrary agent IDs, which can corrupt leaderboard data and invalidate “winner” stats.

5) Rate limiting is in-memory and instance-local. In serverless/multi-instance deployments, limits are per-instance and trivially bypassed with parallel requests; the comments note this for high-cardinality traffic, but the routes still present these as hard limits.

Files checked beyond the diff: `lib/engagement/reactions.ts`, `lib/engagement/votes.ts`, `lib/sharing/short-links.ts`, `lib/common/rate-limit.ts`.

### Section 2: Structured Findings (machine-readable)

```yaml
review:
  model: "codex52"
  date: "2026-03-09"
  branches:
    - "phase2-ui"
  base_commit: "unknown"

findings:
  - id: F-001
    branch: "phase2-ui"
    file: "app/api/reactions/route.ts"
    line: "n/a"
    severity: medium
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "Rate limit trusts spoofable x-forwarded-for"
    description: >
      The rate limiter keys solely on getClientIp(), which trusts the
      client-supplied x-forwarded-for header. Unless the platform is
      stripping or overwriting this header, clients can spoof IPs and
      bypass the 30/min limit and anonymous fingerprinting.
    recommendation: "Use a trusted platform IP source and ignore untrusted x-forwarded-for values."

  - id: F-002
    branch: "phase2-ui"
    file: "app/bout/[id]/page.tsx"
    line: "n/a"
    severity: medium
    watchdog: none
    slopodar: none
    title: "Auto-start query params forwarded without validation"
    description: >
      presetId, topic, and model are read directly from searchParams
      and passed into Arena auto-start. There is no schema validation
      or allowlist for model/presetId, so invalid inputs can leak into
      downstream execution instead of being rejected early.
    recommendation: "Validate searchParams with a Zod schema or allowlist before passing to Arena."

  - id: F-003
    branch: "phase2-ui"
    file: "lib/engagement/reactions.ts"
    line: "n/a"
    severity: medium
    watchdog: WD-CB
    slopodar: none
    title: "toggleReaction races and throws on unique conflict"
    description: >
      toggleReaction does a read-then-insert/delete flow without
      conflict handling. Concurrent requests for the same reaction can
      both observe no row and one insert will hit the unique constraint,
      leading to a 500 instead of a deterministic toggle result.
    recommendation: "Use an atomic upsert/transaction or handle unique-violation by retrying/returning 'added'."

  - id: F-004
    branch: "phase2-ui"
    file: "lib/sharing/short-links.ts"
    line: "n/a"
    severity: medium
    watchdog: WD-CB
    slopodar: none
    title: "Slug collision not handled; unique constraint can throw"
    description: >
      createShortLink only guards conflicts on boutId. If nanoid(8)
      collides with an existing slug, the insert will throw and the
      function does not retry or recover, causing a 500 for valid input.
    recommendation: "Catch slug-unique violations and retry slug generation; or use onConflictDoNothing on slug and loop." 

  - id: F-005
    branch: "phase2-ui"
    file: "lib/engagement/votes.ts"
    line: "n/a"
    severity: high
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "Winner vote accepts arbitrary agentId (not validated against bout)"
    description: >
      castWinnerVote inserts the provided agentId without verifying that
      it is part of the bout's agent lineup. Clients can submit any
      agentId, which corrupts winner tallies and leaderboard data.
    recommendation: "Validate agentId against the bout's lineup before insert; reject with 400 if not present."

  - id: F-006
    branch: "phase2-ui"
    file: "lib/common/rate-limit.ts"
    line: "n/a"
    severity: low
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "In-memory rate limiting is instance-local in serverless"
    description: >
      The limiter stores state in-process. In serverless/multi-instance
      deployments, the limit is per-instance and can be bypassed with
      parallel requests. The API routes present hard limits but they are
      only best-effort.
    recommendation: "Back rate limiting with shared storage (Redis/DB) or document it as best-effort and lower reliance on it for abuse control."
```
