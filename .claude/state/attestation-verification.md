# Attestation Verification — Integration Flight Plan

> **Last updated:** 2026-02-21 by Weaver
> **Status:** Active — 3 parallel workstreams, 1 PR awaiting review
> **Delete when:** All PRs below are merged and post-merge verified

## The Goal

Prove that THE PIT's on-chain attestation system works end-to-end: TS writes attestations to Base mainnet via EAS, Go reads them back and verifies them, community members can independently verify any agent's identity. This is the HN launch artifact.

## What We Know (verified, not assumed)

- **125 attestations** exist on-chain on Base mainnet under schema UID `0x026a50b7a0728afcedaa43113558312d894333f705028153eceafd8084e544d2`
- **Schema verified**: On-chain schema string matches both `lib/eas.ts:38-39` and `pitnet/internal/abi/abi.go:26` exactly
- **Live decode works**: `pitnet verify` successfully decodes attestation `0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724` from Base mainnet — all fields correct
- **Signer key**: `0xf951daD46F0A7d7402556DCaa70Ee4F8bC979824` — never committed to git. Balance: 0.0034 ETH on Base mainnet, 0 on Sepolia
- **ABI encoding bug found and fixed**: Go's `encodeString()` added a spurious 32-byte slot for empty strings. Fixed in PR #333

## PR Dependency Graph

```
PR #333 — ABI encoding fix + parity tests
  Status: Pushed, awaiting review
  Branch: feat/attestation-verification (from master)
  Files:  pitnet/internal/abi/abi.go
          pitnet/internal/abi/abi_parity_test.go
          scripts/eas-abi-golden.ts
  Gate:   Green (15 Go tests, 912 TS tests, typecheck, lint)

PR #??? — Verification proof script
  Status: Not started
  Branch: TBD (from master)
  Files:  scripts/verify-attestation.sh (or similar) — NEW
          possibly pitnet/cmd/verify.go adjustments
  Depends on #333: NO — uses abi.Decode which was correct before the fix
  Overlap with #333: NONE

PR #??? — Visual DNA fingerprints (identicons on agent cards)
  Status: Not started
  Branch: TBD (from master)
  Files:  components/ (new component), possibly app/ routes
  Depends on #333: NO — reads hash strings from existing data model
  Overlap with #333: NONE
  Overlap with verification script: NONE

PR #??? — Community pitnet distribution
  Status: Not started
  Branch: TBD (from master)
  Files:  Makefile or goreleaser config, possibly README
  Depends on #333: YES — merge #333 FIRST so distributed binary carries the encoding fix
  Overlap with #333: NONE (infrastructure, not code)
```

## Merge Sequence (ENFORCED)

```
1. PR #333 (ABI fix)           — merge first, post-merge verify
2. Verification script PR      — can merge in any order relative to (3)
3. Visual DNA fingerprints PR  — can merge in any order relative to (2)
4. Community distribution PR   — merge LAST (must include #333's fix in the binary)
```

**Why #333 before distribution:** You don't ship a binary with a known encoding bug to the community you're asking to verify your attestations. The decoder was correct, but if anyone uses `pitnet audit` (which re-encodes locally and compares), the bug would surface.

**Why (2) and (3) are order-independent:** Zero file overlap, zero functional dependency. Different domains (Go CLI script vs React components). Can be developed and merged in parallel.

## Branching Strategy

All new branches fork from **master**, not from each other. This avoids cascade rebases if any PR gets review changes. The work is genuinely independent — verified by checking `git diff` file lists for overlap.

## Strategic Context

- **The human is Captain.** The orchestration agent is Helm (renamed from Captain in PR #331).
- **Product thesis:** Agent authenticity and attestation will matter as agents become commercially significant. THE PIT sits at the intersection of entertainment (watch agents battle, share replays) and verification (provable lineage, on-chain identity).
- **HN moment:** Community-testable `pitnet verify` is the release artifact. "Weary-eyed blockchain-fatigued technicians will want to verify it themselves."
- **Visual layer matters:** DNA fingerprints (identicon-style hash visualisations) take the project from tinker's-interest to something visceral — referenced Pokémon, identity ownership.
- **Not a PhD:** Find what we have, prove it works, ship it.

## Operational Notes

- **pitkeel hook active**: Every commit gets operational signals appended. Binary at `pitkeel/pitkeel` (gitignored, rebuild with `go build .` in pitkeel/).
- **CI note**: `security` check fails on all PRs (pre-existing `minimatch` transitive dep, issue #330). Local gate is merge authority.
- **Test counts**: 912 TS unit tests + 22 pitkeel Go tests + ~50 pitnet/pitforge Go tests

## Decisions Made (with reasoning)

| Decision | Reasoning | Reversible? |
|----------|-----------|-------------|
| Branch all new work from master, not from feat/attestation-verification | Zero file overlap verified. Avoids cascade rebases if #333 gets review changes | Yes — can rebase onto any base |
| Merge #333 before distribution PR | Encoding bug would surface in `pitnet audit` if community runs it | Yes — but embarrassing to ship then fix |
| Allow (2) and (3) to merge in any order | Verified: different domains (Go CLI vs React), no shared files, no shared state | Yes |
| Don't block on remote CI for merges | Local gate is authority (BUILDING.md). CI `security` check is a known false positive (#330) | Yes — reintroduce when product stabilises |
