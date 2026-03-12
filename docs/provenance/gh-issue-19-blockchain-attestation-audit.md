# GH Issue #19: Blockchain Attestation Verification Gaps Audit

**Dispatched:** 2026-03-12T20:59 UTC
**Type:** Exploration / Security Audit
**Author:** rickhallett
**Labels:** platform, needs-audit

## Current State

The attestation implementation is functional, not a stub:

| Component | Status | Tests |
|-----------|--------|-------|
| Agent DNA hashing (TS + Go) | Production - runs on every agent creation | 10 TS + 3 Go parity tests |
| EAS attestation write (TS) | Complete, behind EAS_ENABLED flag | 12 unit tests (mocked SDK) |
| EAS attestation read/verify (Go/pitnet) | Operational against live Base L2 | 23 Go tests (mock RPC) |
| DB columns (hashes, attestation UIDs) | Real, populated | Covered in agent creation tests |
| UI attestation links | Real, renders easscan.org links | Not directly tested |
| Cross-language parity | Golden-value tests ensure TS <-> Go consistency | 6 parity tests |

## Gaps

### Gap 1: No Live Chain Integration Test (HIGH)

All tests mock the EAS SDK and RPC endpoints. No test creates an attestation on a real chain (Base Sepolia testnet), reads it back with pitnet verify, and confirms the round-trip.

### Gap 2: TS <-> Go ABI Encoding Parity (MEDIUM)

Parity tests verify hashing alignment but NOT that `SchemaEncoder.encodeData()` in TS produces identical bytes to `abi.Encode()` in Go. If these diverge, a TS-created attestation would decode incorrectly in Go.

### Gap 3: pitnet CLI Commands Untested (MEDIUM)

`pitnet verify`, `pitnet audit`, `pitnet submit`, `pitnet status` have zero automated tests. They work manually but have no regression safety net.

### Gap 4: Signer Key Exposure (HIGH - Security)

The `.env` files may contain a real signer private key. If this key controls a funded wallet, it is compromised. Needs immediate verification regardless of other gaps.

### Gap 5: E2E Attestation Flow (LOW)

No Playwright test covers: create agent -> see attestation link -> click link -> verify on easscan.

### Gap 6: pitnet submit Incomplete (LOW)

`pitnet submit` encodes attestation data but does not sign/broadcast. TS write path handles this, but CLI cannot attest independently.

## Priority Order

| Priority | Gap | Complexity |
|----------|-----|------------|
| P0 | Signer key exposure check | Low |
| P0 | Live chain integration test | Medium |
| P1 | TS <-> Go ABI encoding parity | Medium |
| P1 | pitnet CLI test coverage | Medium |
| P2 | E2E attestation flow | High |
| P2 | pitnet submit completion | High |

## Provenance

- GitHub: https://github.com/rickhallett/thepit/issues/19
- Migrated from: thepit-pilot#329
- Created: 2026-03-12T12:37:26Z
- Dispatched by: Mayor (Gas Town)
