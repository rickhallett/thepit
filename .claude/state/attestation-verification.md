# Attestation Verification — Integration Flight Plan

> **Last updated:** 2026-02-21 08:05 UTC by Weaver
> **Status:** Active — 3 branches ready, awaiting review + push
> **Delete when:** All PRs below are merged and post-merge verified

## The Goal

Prove that THE PIT's on-chain attestation system works end-to-end: TS writes attestations to Base mainnet via EAS, Go reads them back and verifies them, community members can independently verify any agent's identity. This is the HN launch artifact.

## What We Know (verified, not assumed)

- **125 attestations** exist on-chain on Base mainnet under schema UID `0x026a50b7a0728afcedaa43113558312d894333f705028153eceafd8084e544d2`
- **Schema verified**: On-chain schema string matches both `lib/eas.ts:38-39` and `pitnet/internal/abi/abi.go:26` exactly
- **Live decode works**: `pitnet verify` successfully decodes attestation `0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724` from Base mainnet — all fields correct
- **Signer key**: `0xf951daD46F0A7d7402556DCaa70Ee4F8bC979824` — never committed to git. Check live balance: `cast balance 0xf951daD46F0A7d7402556DCaa70Ee4F8bC979824 --rpc-url https://mainnet.base.org`
- **ABI encoding bug found and fixed**: Go's `encodeString()` added a spurious 32-byte slot for empty strings. Fixed in PR #333

## PR Dependency Graph

```text
PR #333 — ABI encoding fix + parity tests
  Status: Pushed, awaiting review
  Branch: feat/attestation-verification (from master)
  Files:  pitnet/internal/abi/abi.go
          pitnet/internal/abi/abi_parity_test.go
          scripts/eas-abi-golden.ts
  Gate:   Green (15 Go tests, 912 TS tests, typecheck, lint)

PR #??? — Verification proof command + shell script
  Status: Built, gate green, NOT pushed
  Branch: feat/verification-proof (from master @ b074612)
  Commit: 9f762b4
  Files:  pitnet/cmd/proof.go (NEW)
          pitnet/internal/abi/abi.go (adds SchemaUID constant — line 28)
          pitnet/main.go (wires proof command)
          scripts/verify-attestation.sh (NEW)
  Depends on #333: NO — uses abi.Decode which was correct before the fix
  Overlap with #333: pitnet/internal/abi/abi.go — BUT different hunks
    #333 modifies lines 230-236 (encodeString fix)
    This PR adds lines 28-30 (SchemaUID constant)
    Git will auto-merge. If conflict: trivial rebase.
  Gate: Go vet + test clean. Tested live against Base mainnet attestation.
  Key design: `pitnet proof` is license-free (dispatched before requireLicense).
             Plain text output (no ANSI) — pasteable into issues/blogs.

PR #??? — Visual DNA fingerprints (identicons on agent cards)
  Status: Built, gate green, NOT pushed
  Branch: feat/dna-fingerprints (from master @ b074612)
  Commit: 178c65c
  Files:  components/dna-fingerprint.tsx (NEW)
          tests/unit/dna-fingerprint.test.ts (NEW — 19 tests)
  Depends on #333: NO — reads hash strings, no Go dependency
  Overlap with #333: NONE
  Overlap with verification proof: NONE
  Gate: 931 TS tests pass (912 existing + 19 new), typecheck clean, lint clean.
  Key design: 5x5 symmetric SVG grid, 16-color Tokyo Night palette,
             zero new dependencies, SSR-compatible, graceful invalid hash handling.

PR #??? — Community pitnet distribution
  Status: Not started
  Branch: TBD (from master)
  Files:  Makefile or goreleaser config, possibly README
  Depends on #333: YES — merge #333 FIRST so distributed binary carries the encoding fix
  Overlap with #333: NONE (infrastructure, not code)
```

## Merge Sequence (ENFORCED)

```text
1. PR #333 (ABI fix)           — merge first, post-merge verify
2. Verification script PR      — can merge in any order relative to (3)
3. Visual DNA fingerprints PR  — can merge in any order relative to (2)
4. Community distribution PR   — merge LAST (must include #333's fix in the binary)
```

**Why #333 before distribution:** You don't ship a binary with a known encoding bug to the community you're asking to verify your attestations. The decoder was correct, but if anyone uses `pitnet audit` (which re-encodes locally and compares), the bug would surface.

**Why (2) and (3) are order-independent:** Zero file overlap, zero functional dependency. They are in different domains (Go CLI script vs React components) and can be developed and merged in parallel.

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
- **Test counts**: 931 TS unit tests (912 base + 19 DNA fingerprint) + 22 pitkeel Go tests + ~50 pitnet/pitforge Go tests

## Decisions Made (with reasoning)

| Decision | Reasoning | Reversible? |
|----------|-----------|-------------|
| Branch all new work from master, not from feat/attestation-verification | Zero file overlap verified. Avoids cascade rebases if #333 gets review changes | Yes — can rebase onto any base |
| Merge #333 before distribution PR | Encoding bug would surface in `pitnet audit` if community runs it | Yes — but embarrassing to ship then fix |
| Merge #333 before verification-proof PR | Not strictly required (different hunks in abi.go), but cleaner to merge the fix first then rebase proof if needed | Yes |
| Allow DNA fingerprints to merge in any order relative to others | Zero Go code, zero file overlap, completely different domain | Yes |
| Don't block on remote CI for merges | Local gate is authority (BUILDING.md). CI `security` check is a known false positive (#330) | Yes — reintroduce when product stabilises |
| `pitnet proof` is license-free | The whole point is community verification without permission gates | No — this is a product principle |
| `pitnet proof` output is plain text, not styled | ANSI escapes corrupt in GitHub issues, blog posts, HN comments. The existing `verify` command keeps styled output for terminal use. | Yes |
| DNA fingerprints use SVG, not Canvas | SSR-compatible, scales without pixelation, testable without DOM mocks, no useEffect needed | Yes — but would require rewrite |
| Zero new npm dependencies for DNA fingerprints | Only uses clsx (already in package.json). Avoids supply chain surface for a visual component. | Yes |
