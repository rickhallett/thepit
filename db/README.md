[← Root](../README.md)

# db/

Database layer: Drizzle ORM schema and Neon serverless client. Two files total — the schema definition and the client/re-export module.

## Files

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle ORM table definitions (20 tables, 3 enums), exported TypeScript types |
| `index.ts` | Neon HTTP client instantiation, `requireDb()` guard, schema re-exports |

## Client Setup

`index.ts` uses the `neon()` HTTP driver from `@neondatabase/serverless` (not the WebSocket pooling driver). The `db` export is conditionally created — `null` when `DATABASE_URL` is unset. A `requireDb()` helper throws explicitly if no connection exists, providing a clear error message rather than a null dereference.

All modules that touch the database import `requireDb` from `@/db` and table/enum symbols from `@/db/schema`.

## Schema Overview

### Enums

| Enum | Values | Used By |
|------|--------|---------|
| `bout_status` | `running`, `completed`, `error` | `bouts.status` |
| `agent_tier` | `free`, `premium`, `custom` | `agents.tier` |
| `user_tier` | `free`, `pass`, `lab` | `users.subscriptionTier` |

### Tables

| Table | PK Type | Purpose |
|-------|---------|---------|
| `bouts` | `varchar(21)` (nanoid) | Debate sessions: status, JSONB transcript, agent lineup, share line |
| `users` | `varchar(128)` (Clerk ID) | User accounts: subscription tier/status, Stripe customer ID, referral code |
| `credits` | `varchar(128)` (userId) | Per-user credit balance in micro-credits (bigint) |
| `credit_transactions` | `serial` | Credit ledger: delta, source, reference ID, metadata (JSONB) |
| `intro_pool` | `serial` | Community credit pool with time-based drain rate |
| `referrals` | `serial` | Referrer/referred pairs with `credited` flag for idempotent bonus |
| `reactions` | `serial` | Per-turn emoji reactions (heart/fire) on bouts |
| `winner_votes` | `serial` | Per-bout winner votes (unique per user per bout) |
| `newsletter_signups` | `serial` | Email collection with unique email index |
| `agents` | `varchar(128)` | Agent definitions: personality fields, dual hashes, EAS attestation, lineage |
| `free_bout_pool` | `serial` | Global daily free bout limit (unique per date) |
| `agent_flags` | `serial` | User-submitted moderation flags (unique per agent per user) |
| `paper_submissions` | `serial` | ArXiv paper submissions with moderation status |
| `feature_requests` | `serial` | User feature request submissions with admin review |
| `feature_request_votes` | `serial` | Votes on feature requests (unique per user per request) |
| `page_views` | `serial` | Server-side page view analytics (path, session, UTM, geo) |
| `short_links` | `serial` | Shareable short-link slugs that resolve to bouts |
| `short_link_clicks` | `serial` | Click analytics for short links (UTM, referrer, IP hash) |
| `remix_events` | `serial` | Agent remix/clone lineage tracking with reward payouts |
| `research_exports` | `serial` | Snapshot payloads for anonymized research dataset downloads |

### Custom TypeScript Types

```typescript
TranscriptEntry = { turn: number; agentId: string; agentName: string; text: string }
ArenaAgent = { id: string; name: string; systemPrompt: string; color?: string; avatar?: string }
```

### Key Indexes

| Table | Index | Type |
|-------|-------|------|
| `bouts` | `created_at` | btree |
| `users` | `referral_code` | unique |
| `credit_transactions` | `(user_id, created_at)` | composite |
| `credit_transactions` | `reference_id` | btree (Stripe idempotency) |
| `reactions` | `bout_id` | btree |
| `reactions` | `(bout_id, turn_index, reaction_type, user_id)` | unique |
| `winner_votes` | `(bout_id, user_id)` | unique |
| `winner_votes` | `created_at` | btree |
| `newsletter_signups` | `email` | unique |
| `agents` | `(archived, created_at)` | composite |
| `free_bout_pool` | `date` | unique |
| `agent_flags` | `(agent_id, user_id)` | unique |
| `paper_submissions` | `user_id` | btree |
| `paper_submissions` | `(user_id, arxiv_id)` | unique |
| `feature_requests` | `created_at` | btree |
| `feature_request_votes` | `(feature_request_id, user_id)` | unique |
| `page_views` | `(path, created_at)` | composite |
| `page_views` | `session_id` | btree |
| `page_views` | `created_at` | btree |
| `short_links` | `bout_id` | unique |
| `short_links` | `slug` | unique |

## Data Design Patterns

### JSONB for Ephemeral/Complex Data

- **`bouts.transcript`** — `TranscriptEntry[]`. The transcript is always read alongside the bout and never queried independently. JSONB avoids a join table.
- **`bouts.agentLineup`** — `ArenaAgent[]`. Arena-mode lineups are ephemeral, user-composed, and only meaningful in the bout context.
- **`agents.quirks`** — `string[]`. Small array of personality quirks, not queried independently.
- **`credit_transactions.metadata`** — `Record<string, unknown>`. Flexible metadata for different transaction types.
- **`remix_events.metadata`** — `Record<string, unknown>`. Flexible context for remix/clone events.
- **`research_exports.payload`** — `Record<string, unknown>`. Full anonymized dataset snapshot.

### Micro-Credit Accounting

`credits.balanceMicro` is a `bigint` where 1 credit = 100 micro-credits. This avoids floating-point rounding errors in financial operations. All credit arithmetic happens in micro-credit space; conversion to display units happens at the presentation layer.

### Dual Hashing for Agent Identity

`agents` has both `promptHash` (SHA-256 of system prompt only) and `manifestHash` (SHA-256 of RFC 8785 canonicalized full identity). `promptHash` identifies behavior; `manifestHash` identifies the complete agent. Both are used in on-chain EAS attestations.

### Lineage via `parentId`

`agents.parentId` creates a linked-list lineage chain for cloned agents. `lib/agent-detail.ts` walks this chain up to 4 generations. No FK constraint enforces this — it's application-level.

## Design Decisions & Trade-offs

- **Minimal foreign key constraints** — The schema defines one FK constraint: `short_link_clicks.shortLinkId` references `short_links.id`. All other referential integrity is enforced at the application layer. This simplifies migrations and avoids cascade-deletion surprises, but means orphaned rows are possible if application code has bugs.
- **No Drizzle relations** — Queries use raw `select().from().where()` patterns rather than Drizzle's relational query API. This keeps queries explicit but means join logic is scattered across `lib/` modules.
- **Nanoid for bout IDs** — 21-character IDs are URL-safe and avoid sequential ID enumeration. The tradeoff is slightly larger index sizes vs. integer PKs.
- **Clerk IDs as user PK** — `users.id` uses the Clerk-issued ID (`varchar(128)`) directly. This avoids a mapping table but couples the schema to Clerk. A migration to a different auth provider would require a PK migration.

## Migrations

Migrations live in [`../drizzle/`](../drizzle/README.md). See that README for migration history and workflow.

---

[← Root](../README.md) · [Drizzle](../drizzle/README.md) · [Lib](../lib/README.md) · [App](../app/README.md)
