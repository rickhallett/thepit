# HN Launch — Integration Flight Plan

> **Last updated:** 2026-02-21 11:40 UTC by Weaver
> **Status:** Active — 4 items to ship before HN submission
> **Delete when:** HN post is submitted and first-hour monitoring is complete

## The Goal

Ship THE PIT to Hacker News. The pitch: a multi-agent AI debate arena with on-chain agent identity. The artifact: a downloadable binary (`pitnet proof`) that lets anyone verify attestations independently. The demo: anonymous visitors can run bouts without signing up.

## What's Shipped (verified, deployed, on master)

| PR | What | Tests added | Deployed |
|----|------|-------------|----------|
| #333 | ABI encoding fix + cross-implementation parity tests | 15 Go parity tests | Yes |
| #334 | Share modal timing fix (empty bout → modal race) | — | Yes |
| #335 | "What is this?" video explainer button + modal | — | Yes |
| #336 | Demo mode (`DEMO_MODE_ENABLED`) + replay scroll fix | 3 TS tests | Yes (env var set in Vercel) |
| #337 | `pitnet proof <UID>` verification command + shell script | — | Yes (in repo) |
| #338 | `<DnaFingerprint>` SVG component (5x5, Tokyo Night) | 19 TS tests | Yes (in repo, not wired into UI) |

**Current test counts:** 934 TS tests, ~50 pitnet Go tests, 22 pitkeel Go tests.
**Production health:** OK (EAS on, subs on, credits on, DB 85ms latency).

## What's Verified (not assumed)

- **125 attestations** on Base mainnet under schema `0x026a50...d2`
- **Signer key** `0xf951da...824` — not in git. Check balance: `cast balance 0xf951daD46F0A7d7402556DCaa70Ee4F8bC979824 --rpc-url https://mainnet.base.org`
- **TS ↔ Go ABI parity** — golden-value tests prove cross-implementation encoding consistency (#333)
- **`pitnet proof` works live** — tested against mainnet attestation `0x13da22...0724`, full verification report produced
- **Demo mode works** — anonymous visitors can run bouts, rate limited to 2/hour/IP via intro pool
- **Auto-deploy active** — master merges deploy to production automatically via Vercel

## Shipping Queue (STRICT ORDER)

```text
P0  1. Community pitnet distribution
       Cross-compile → GitHub Release → README walkthrough
       THE artifact. Without this, on-chain is "trust us."

P1  2. Wire DNA fingerprints into UI
       Agent cards, bout headers, attestation sections
       Makes identity visceral, not abstract.

P1  3. Fix error event handling in use-bout.ts
       SSE error events silently dropped by schema validation.
       HN traffic will hit rate limits. Users need error messages, not empty bouts.

P1  4. Review/update HN post copy
       Update test counts, mention pitnet proof + demo mode + 125 attestations.
       Final pass before submission.
```

### Item 1: Community pitnet distribution

**Branch:** `feat/pitnet-distribution` (from master)

**What to build:**
- Cross-compile matrix in pitnet/Makefile: `linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`, `windows/amd64`
- Produce tarballs/zips with binary + `scripts/verify-attestation.sh`
- Create GitHub Release with `gh release create` and attach all archives
- Write a short verification README section (5 lines: download, chmod, run proof, see output)

**Files:** `pitnet/Makefile`, possibly `pitnet/README.md` or root `README.md`
**Depends on:** Nothing (all prerequisite PRs merged)
**Key constraint:** Binary must include the ABI fix from #333 and the proof command from #337. Both are on master. Verified.
**Overlap with other items:** None.

### Item 2: Wire DNA fingerprints into UI

**Branch:** `feat/wire-dna-fingerprints` (from master)

**What to build:**
- Render `<DnaFingerprint hash={agent.promptHash} />` on:
  - Agent detail page (`app/agents/[id]/page.tsx` or equivalent)
  - Bout transcript header (agent name row in `components/arena.tsx`)
  - Attestation link sections (wherever easscan.org links appear)
- Import the existing component from `components/dna-fingerprint.tsx`
- Pass `size` prop appropriate to each context (16px inline, 32px on cards, 48px on detail)

**Files to investigate:**
- `components/arena.tsx` — agent name/avatar in message cards
- `app/agents/[id]/page.tsx` or equivalent agent detail page
- Any attestation link UI (grep for `easscan`)

**Depends on:** #338 (merged)
**Overlap with other items:** None — pure frontend, no Go, no API changes.

### Item 3: Fix error event handling in use-bout.ts

**Branch:** `fix/sse-error-handling` (from master)

**The bug:** `lib/use-bout.ts` line 281-293. The SSE stream is parsed through `uiMessageChunkSchema` (Vercel AI SDK). Error events `{"type":"error","errorText":"..."}` don't conform to this schema, so `value.success` is `false` at line 290 and the event is silently dropped via `continue`. The `handleEvent` function at line 226-232 correctly handles error events — they just never reach it.

**The fix:** Before the schema validation loop, intercept raw events and check for `type: "error"`. Or: parse error events separately before passing through the schema. Or: add error events to the schema union. Need to investigate the Vercel AI SDK's `parseJsonEventStream` to find the cleanest approach.

**Files:** `lib/use-bout.ts`
**Depends on:** Nothing
**Overlap with other items:** None

### Item 4: Review/update HN post copy

**File:** `docs/press-release-strategy.md`

**What needs updating:**
- Test count: was "425 tests" in some docs → now 934 TS + ~50 Go + 22 pitkeel
- Mention `pitnet proof` as downloadable verification binary
- Mention demo mode (no sign-up required to try it)
- Mention 125 on-chain attestations on Base mainnet
- Link to GitHub Release (once Item 1 ships)
- Review first comment for accuracy against current product state
- Reference the video explainer ("What is this?" button on landing page)

**Depends on:** Items 1-3 being shipped (so copy reflects final state)
**This ships last.**

## What's NOT in scope for HN launch

Parked deliberately. These are real but not blocking:

| Item | Why parked |
|------|-----------|
| Demo mode UX polish (hide credit/sub UI for anon) | Functional but slightly confusing. Cosmetic. |
| Live chain integration test (Base Sepolia) | 125 mainnet attestations ARE the live proof. Test would be belt-and-suspenders. |
| pitnet CLI test coverage | `proof.go` works manually. Tests are good practice but not launch-blocking. |
| E2E Playwright attestation flow | Playwright tests paused during iteration per AGENTS.md. |
| `pitnet submit` completion | TS write path handles attestation creation. CLI submit is future work. Documented. |
| Error event schema in `use-bout.ts` — full Vercel AI SDK investigation | The fix in Item 3 is targeted. A deeper SDK integration audit is future work. |
| Video-to-chain hashing | Interesting attestation extension. Research item, not launch item. |

## Branching Strategy

All branches fork from **master**. No stacking. Each item is independent — verified by file overlap analysis. Merge in queue order. Post-merge verify each.

## Operational Notes

- **pitkeel hook active**: Every commit gets operational signals. Binary at `pitkeel/pitkeel` (gitignored).
- **CI note**: `security` check fails on all PRs (pre-existing `minimatch` dep, issue #330). Local gate is merge authority.
- **Auto-deploy**: Vercel deploys master → production automatically. Each merge is a deploy.
- **DEMO_MODE_ENABLED=true** is set in Vercel production. To disable: `printf 'false' | vercel env add DEMO_MODE_ENABLED production`.
- **Rate limiting for HN traffic**: Anonymous tier is 2 bouts/hour/IP. Intro pool is 15,000 credits. If HN traffic exceeds this, disable demo mode — auth wall returns instantly.

## Decisions Made (with reasoning)

| Decision | Reasoning | Reversible? |
|----------|-----------|-------------|
| Ship pitnet distribution first | Without the binary, the on-chain thesis is unverifiable claims. The binary IS the pitch. | Yes — but launch impact is degraded |
| Wire DNA fingerprints before HN | Visceral identity > abstract identity. A 5x5 grid next to an agent name is worth 1000 words about "cryptographic identity." | Yes |
| Fix SSE error handling before HN | HN traffic will hit rate limits. Empty bouts with share modals is a terrible first impression. | Yes — but embarrassing |
| Update HN copy last | Copy must reflect shipped state. Updating it before the other items land means updating it twice. | Yes |
| Skip demo mode UX polish | Functional > polished. Credit/sub UI visible to anon users is confusing but not blocking. Fix post-launch. | Yes |
| Skip Sepolia integration test | 125 mainnet attestations are stronger proof than a testnet round-trip. Ship the proof command, not the test. | Yes |
| Anonymous rate limit at 2/hour/IP | Conservative. Can increase if demo mode works well. Can disable entirely if abuse detected. | Yes — env var flip |
