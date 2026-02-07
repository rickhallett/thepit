# Agent DNA Attestations (Onchain From Day One)

## Overview
Each agent is a first-class, immutable artifact with a public, verifiable “DNA” fingerprint. When a new agent is registered, we:
1. Canonicalize the agent manifest.
2. Compute deterministic hashes in the client.
3. Recompute and verify on the server.
4. Store the immutable record.
5. Write an onchain attestation (EAS) for public verification.

This provides both:
- **Integrity at creation time** (client-side hash preview + server verification).
- **Tamper-resistant timestamping** (onchain attestation).

## Goals
- Immutable agent records with stable IDs and lineage.
- Client-side hash preview that users can verify.
- Onchain attestations from day one (Base L2).
- Public “View attestation” links for auditability.

## Non-goals (for now)
- Onchain storage of full prompts (we store hashes only).
- User-managed wallets or signing with user keys.
- Custom agent creation UI (will follow after plumbing).

## Canonical Agent Manifest
**Manifest (JSON, canonicalized):**
```json
{
  "agentId": "...",
  "name": "...",
  "systemPrompt": "...",
  "presetId": "...",
  "tier": "free|premium|custom",
  "model": "...",
  "responseLength": "short|standard|long",
  "responseFormat": "plain|spaced|markdown|json",
  "createdAt": "2026-02-07T12:34:56.789Z",
  "parentId": "... | null",
  "ownerId": "... | null"
}
```

### Canonicalization
- Use **RFC 8785 JSON canonicalization**.
- Hashes are **SHA-256**, hex-encoded with `0x` prefix.
- Two hashes:
  - `promptHash`: canonical hash of `{ systemPrompt }`.
  - `manifestHash`: canonical hash of the full manifest.

## Data Model (DB)
Table: `agents`
- `id` (varchar, pk) — immutable agent ID
- `name` (varchar)
- `systemPrompt` (text)
- `presetId` (varchar, nullable)
- `tier` (enum: free, premium, custom)
- `model` (varchar, nullable)
- `responseLength` (varchar)
- `responseFormat` (varchar)
- `createdAt` (timestamp)
- `ownerId` (varchar, nullable)
- `parentId` (varchar, nullable)
- `promptHash` (varchar)
- `manifestHash` (varchar)
- `attestationUid` (varchar, nullable)
- `attestationTxHash` (varchar, nullable)
- `attestedAt` (timestamp, nullable)

Records are **append-only**. No updates after creation.

## EAS Onchain Attestations
**Chain:** Base mainnet (chain id 8453).  
**Contracts (Base):**
- Schema Registry: `0x4200000000000000000000000000000000000020`
- EAS: `0x4200000000000000000000000000000000000021`

### Schema
Schema string (EAS):
```
string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt
```

### Attestation flow
- Use `@ethereum-attestation-service/eas-sdk`.
- Encode with `SchemaEncoder` and submit **onchain** attestation.
- Store returned `uid` + tx hash.

## Client Flow (future custom agent creation)
1. User fills out agent form.
2. Client computes `promptHash` + `manifestHash`.
3. Display fingerprint before submit.
4. Submit payload to server with `clientManifestHash`.

## Server Flow
1. Recompute hashes from payload (canonicalized).
2. Reject if hashes mismatch.
3. Insert immutable row in `agents`.
4. Submit onchain attestation.
5. Store `attestationUid`, `attestationTxHash`, `attestedAt`.

## UI Requirements
- Agent detail modal shows:
  - Prompt (read-only)
  - Hashes + timestamps
  - Lineage (parentId)
  - “View attestation” link (EASScan)
- “Clone agent” action creates a new agent with `parentId` set.

## Env Vars
- `EAS_ENABLED=true`
- `EAS_CHAIN_ID=8453`
- `EAS_SCHEMA_UID=...`
- `EAS_RPC_URL=...`
- `EAS_SIGNER_PRIVATE_KEY=...`

## Observability
- Log attestation tx hash + uid.
- Persist errors and surface in admin diagnostics.

## Open Questions
- Where to surface attestation failures (retry queue vs manual re-run)?
- Will we allow anonymous agent creation at launch?
