# GH Issue #19: Blockchain Attestation Verification Gaps - Design Document

**Created:** 2026-03-12
**Author:** polecat/capable
**Status:** Audit Complete
**Bead:** PIT-02n

## 1. Signer Key Exposure Assessment (IMMEDIATE)

### Finding: LOW RISK - Properly Mitigated

The EAS signer key configuration follows security best practices:

| Check | Status | Evidence |
|-------|--------|----------|
| `.env` in .gitignore | PASS | Line 37: `.env*` pattern ignores all .env variants |
| No production .env in repo | PASS | `git ls-files` shows only `.env.example` and `.env.test.example` |
| Template uses empty placeholders | PASS | `.env.example:60`: `EAS_SIGNER_PRIVATE_KEY=` (empty) |
| No hardcoded keys in source | PASS | `lib/eas.ts` reads from `process.env.EAS_SIGNER_PRIVATE_KEY` only |

**Recommendation:** No immediate action required. Current configuration is secure. Production deployment should use environment variables from hosting platform (Vercel, Railway, etc.) rather than committed files.

**Remaining Risk:** If a developer accidentally commits a real `.env` file, the `.gitignore` would prevent it. However, consider adding a pre-commit hook to explicitly reject files matching `^\.env$` (without `.example` suffix) as defense in depth.

## 2. Gap Severity Validation

Reviewed each gap from the audit against codebase exploration:

### Gap 1: No Live Chain Integration Test - CONFIRMED HIGH

- **Evidence:** All tests in `tests/unit/eas.test.ts` and `tests/unit/eas-errors.test.ts` mock the EAS SDK
- **Impact:** A breaking change in EAS SDK or Base L2 RPC behavior would not be caught until production
- **Severity:** HIGH - Correct. This is the primary verification gap.

### Gap 2: TS <-> Go ABI Encoding Parity - DOWNGRADED to LOW

- **Evidence:** `pitnet/internal/abi/abi_parity_test.go` contains golden-value tests that verify:
  - `TestEncodeGolden` - TS-generated attestation decodes correctly in Go
  - `TestDecodeGolden` - Known-good payloads decode to expected values
- **Impact:** Parity is actually tested via golden values, just not round-trip
- **Severity:** LOW - The parity concern is addressed by golden tests. Only gap is no automated cross-compilation verification.

### Gap 3: pitnet CLI Commands Untested - CONFIRMED MEDIUM

- **Evidence:** Test files exist: `cmd/proof_test.go`, `cmd/submit_test.go`, but coverage is partial
- `verify`, `audit`, `status` commands have minimal test coverage
- **Impact:** CLI regressions would be caught manually, not by CI
- **Severity:** MEDIUM - Correct. Functional but fragile.

### Gap 4: Signer Key Exposure - RESOLVED (see Section 1)

- **Status:** No exposure found. Risk is mitigated.
- **Severity:** N/A - Was HIGH concern, now resolved.

### Gap 5: E2E Attestation Flow - CONFIRMED LOW

- **Evidence:** No Playwright test covers agent creation to attestation link verification
- **Impact:** UI integration issues would require manual testing
- **Severity:** LOW - Correct. Nice-to-have, not critical.

### Gap 6: pitnet submit Incomplete - CONFIRMED LOW

- **Evidence:** `pitnet/cmd/submit.go:194` - Outputs ABI-encoded hex, does not sign/broadcast
- **Impact:** CLI users cannot attest independently (TS required)
- **Severity:** LOW - Correct. By design, TS path is primary.

## 3. Recommended Remediation Sequence

### Phase 1: Critical Path (P0)

**Target:** Verify production attestation flow works end-to-end

1. **Create Base Sepolia Integration Test** (Est: 2 agent-hours)
   - Test file: `tests/integration/eas-live.test.ts`
   - Steps: Create test agent -> Submit attestation -> Read back via RPC -> Verify data
   - Requires: Funded test wallet on Base Sepolia, test schema deployment
   - CI: Run on demand (not every push) due to gas costs

### Phase 2: Coverage Hardening (P1)

**Target:** Prevent regressions in verification tooling

2. **Add pitnet CLI Test Coverage** (Est: 3 agent-hours)
   - Priority commands: `verify`, `status`
   - Mock RPC responses for deterministic testing
   - Test files: `cmd/verify_test.go`, `cmd/status_test.go`

3. **Pre-commit Hook for .env Files** (Est: 30 agent-minutes)
   - Script: `scripts/pre-commit-env-check.sh`
   - Reject any staged file matching `^\.env$` without `.example`
   - Add to existing pre-commit hook chain

### Phase 3: Polish (P2)

**Target:** Complete coverage for production confidence

4. **Playwright E2E Attestation Test** (Est: 2 agent-hours)
   - Test: Create agent, verify attestation link renders, click through to easscan
   - Requires: EAS_ENABLED=true in test environment

5. **pitnet submit Completion** (Est: 4 agent-hours)
   - Add `--sign` flag for local signing with private key
   - Add `--broadcast` flag to submit transaction
   - Security: Warn loudly about key handling

## 4. Test Infrastructure Requirements

### For Phase 1 (Base Sepolia Integration)

| Requirement | Purpose | Source |
|-------------|---------|--------|
| Base Sepolia RPC URL | Testnet access | `https://sepolia.base.org` (public) |
| Funded test wallet | Gas for attestations | Faucet or funded dev key (NEVER production key) |
| EAS test schema | Isolated test attestations | Deploy via EAS UI or script |
| GitHub Secret: `EAS_TEST_PRIVATE_KEY` | CI access to test wallet | Stored in repo secrets |
| GitHub Secret: `EAS_TEST_SCHEMA_UID` | Test schema identifier | Stored in repo secrets |

**CI Configuration:**
```yaml
# .github/workflows/eas-integration.yml
name: EAS Integration Tests
on:
  workflow_dispatch:  # Manual trigger only (avoid gas waste)
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am UTC

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      EAS_ENABLED: true
      EAS_RPC_URL: https://sepolia.base.org
      EAS_SIGNER_PRIVATE_KEY: ${{ secrets.EAS_TEST_PRIVATE_KEY }}
      EAS_SCHEMA_UID: ${{ secrets.EAS_TEST_SCHEMA_UID }}
      EAS_CHAIN_ID: 84532  # Base Sepolia
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:integration:eas
```

### For Phase 2 (CLI Testing)

- No additional infrastructure required
- Mock RPC responses using test fixtures
- Existing Go test tooling sufficient

### For Phase 3 (Playwright)

- Existing Playwright setup in `tests/e2e/`
- May need mock EAS response for offline testing
- Optional: Real attestation on Sepolia for full E2E

## Summary

| Original Gap | Validated Severity | Status |
|--------------|-------------------|--------|
| Gap 1: No live chain test | HIGH | Open - P0 |
| Gap 2: ABI parity | LOW (downgraded) | Addressed by golden tests |
| Gap 3: pitnet CLI untested | MEDIUM | Open - P1 |
| Gap 4: Signer key exposure | N/A (resolved) | CLOSED |
| Gap 5: E2E attestation | LOW | Open - P2 |
| Gap 6: pitnet submit | LOW | Open - P2 |

**Next Action:** Phase 1 implementation - create Base Sepolia integration test infrastructure and test file.
