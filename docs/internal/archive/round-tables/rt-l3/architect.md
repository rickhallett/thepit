# RT L3 — Architect Report
Date: 2026-02-24
Agent: Architect
Statement presentation order: B, C, A

## Pre-Launch Recommendations

These are fresh, unbiased recommendations from the Architect's domain — backend/feature engineering, system design, data model integrity, and the bout lifecycle — without anchoring to the L1 or L2 conclusions.

### 1. Verify the bout engine's idempotency guard under concurrent requests

The bout engine checks for existing transcripts to prevent double-execution. Under concurrent SSE connections to the same bout ID (e.g., user double-clicks, browser retry, mobile reconnect), there is a race window between the check and the first write. This is not a launch blocker — the probability is low and the consequence is a duplicate transcript, not data corruption — but it should be on the post-launch hardening list. A `SELECT ... FOR UPDATE` or an atomic status transition (`UPDATE bouts SET status = 'streaming' WHERE id = ? AND status = 'running'`) would close the window.

**Priority:** P2 (post-launch, pre-scale)

### 2. Confirm credit settlement runs in a `finally` block with no silent swallowing

The preauthorization/settlement cycle is the financial contract with users. If the streaming loop throws mid-bout (API timeout, model error, network drop), the settlement path must execute unconditionally and refund the unused preauthorization. I would verify that the `finally` block in the bout engine does not catch-and-swallow settlement errors — a failed settlement should log at ERROR level via Sentry, not silently succeed. This is a correctness audit, not a code change.

**Priority:** P1 (verify before launch, 15 minutes)

### 3. Ship with the current data-coupling architecture — do not retrofit code-coupling for provenance

My L1 error was measuring integration by code imports. The provenance layer composes through the data layer: agent DNA hash → EAS attestation → lineage graph → verification CLI. This is a pipeline architecture, not a monolith. The bout engine does not need to `import` the attestation system any more than a web server needs to import its TLS certificate authority. The architecture is correct as-is. Do not add artificial coupling to satisfy a naive integration metric.

**Priority:** Standing order (do not change)

### 4. Document the SSE event contract as a versioned protocol

The streaming protocol (start → data-turn → text-delta → text-end → data-share-line) is an implicit contract between the backend route and the client `useBout()` hook. It is tested but not versioned. If this product grows, clients will be built against this contract by third parties or future team members. A one-page protocol document (event names, payload schemas, ordering invariants) costs 30 minutes and prevents a class of breaking changes.

**Priority:** P2 (post-launch, pre-API-consumers)

### 5. The XML prompt builder is a genuine architectural asset — protect it

`lib/xml-prompt.ts` (301 lines) with `xmlEscape()`, `buildSystemMessage()`, and `buildUserMessage()` is a well-designed prompt construction layer that prevents injection by construction rather than by convention. This is the correct architecture. The anti-patterns in my role definition exist because this was a deliberate design choice. Ensure no future contributor bypasses it with string concatenation. A lint rule or a test that greps for raw template-literal prompt construction outside `xml-prompt.ts` would be a cheap enforcement mechanism.

**Priority:** P3 (post-launch quality gate)

### 6. The micro-credit economy is correctly designed — do not simplify it

The three-phase credit cycle (estimate → preauthorize → settle) with atomic SQL guards and bigint micro-credits is production-grade financial engineering. It handles overcharge refunds, undercharge caps, and BYOK pricing differentials. The temptation in a "polish pass" would be to simplify this to a post-hoc charge. Do not. The preauthorization model is correct because it guarantees the user always has a committed balance before the API call starts. This is the right architecture for a product that consumes metered third-party API resources.

**Priority:** Standing order (do not change)

### 7. Rate limiting configuration should be verified against launch traffic expectations

The current rate limits (5/hr authenticated, 2/hr anonymous) are reasonable for organic growth. If the HN post drives a traffic spike, these limits will do their job — which is protecting the API budget, not maximizing conversion. Verify that rate-limit responses return a clear, user-friendly message (not a raw 429) so that a new user hitting the limit understands what happened and what their options are. This is a UX concern at the API boundary.

**Priority:** P1 (verify before launch, 10 minutes)

### 8. Lineage graph traversal should be tested for depth > 3

`lib/agent-detail.ts` performs lineage traversal for agent ancestry. If agent creation chains get deep (agent A forks to B, B forks to C, C forks to D...), verify the traversal terminates correctly and doesn't produce N+1 queries. This is unlikely to matter at launch (most agents will be generation 0 or 1), but it's a scaling landmine.

**Priority:** P3 (post-launch, pre-scale)

### 9. The preset system's dual-format normalization is debt, not a feature

Supporting both `RawPreset` (snake_case) and `AlternatePreset` (camelCase) via `normalizePreset()` is a historical artifact. It works, it's tested, and it should not be touched before launch. But post-launch, converge on one format. Dual-format normalization is a maintenance surface that will confuse future contributors.

**Priority:** P3 (post-launch cleanup)

### 10. The attestation layer's value proposition is architecturally sound

From a system design perspective: the EAS attestation on Base L2 provides a permissionless, tamper-evident identity registry. It proves who created an agent, what its DNA hash was at creation time, and when. It does not prove runtime behaviour — and it shouldn't. Conflating identity with behaviour would be an architectural error. The current separation of concerns (identity layer ≠ execution layer) is the correct design. The honest caveat ("proves identity, not behaviour") is not a limitation disclosure — it is an accurate description of a well-scoped system boundary.

**Priority:** Standing order (do not change the scope)

---

## Strategic Framing — Rank Order

1st: **B** — "Ship over polish." From the Architect's perspective, the system is architecturally complete. The bout lifecycle works end-to-end, the credit economy is production-grade, the streaming protocol is tested, and the provenance layer composes correctly through the data layer. There is nothing in the backend that requires further construction before launch. The remaining items are hardening, documentation, and debt — all of which are better prioritised with real traffic data than with speculation. Ship.

2nd: **C** — "Applied engineering; use the process for your next vision." The engineering process demonstrated here — 93 session decisions, cross-language crypto parity, atomic financial operations, XML-injection-proof prompt construction, 1,054 tests — is genuinely transferable. The Architect in me recognises that the *patterns* (preauthorization/settlement cycles, data-layer composition, SSE protocol contracts) are more durable than any single product. But this framing undervalues the product itself: The Pit is not merely a practice exercise. It is a working system with a defensible architecture and a real market gap (agent provenance). Calling it "practice" would be accurate about the process and inaccurate about the product.

3rd: **A** — "Polish for recruiters." The architecture does not need polish — it needs users. A recruiter evaluating this codebase would find production-grade financial engineering, a well-designed streaming protocol, and zero type suppressions. Further polish optimises for an audience that will spend 5 minutes scanning the repo, not the audience that will spend 5 hours using the product. The most compelling portfolio evidence is a system that people actually use, not a system that looks unused but immaculate.
