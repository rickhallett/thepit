### Narrative Report

This review covers the `phase4-economy-v2` branch, which implements the credit economy system including balances, preauthorization, settlement, Stripe integration, and UI for subscriptions/credits. The diff introduces new files for credit logic and Stripe handling, modifies bout execution to include persistence and credits, and updates the schema for idempotency. I focused on adversarial checks for integrity, patterns, and accuracy as per guidelines.

**Overall Assessment**: The changes are extensive but exhibit several non-atomic multi-step operations, leading to potential inconsistencies between database state and credit audits (e.g., bout status updated without corresponding credit settlement). Watchdog stains are prevalent in WD-PL (phantom ledgers from non-atomic updates/inserts) and WD-PG (rules like idempotency stated in comments but not fully enforced). Slopodar patterns like phantom-ledger and paper-guardrail appear in credit operations and webhook handlers. Transactional integrity is partial—individual delta applications are atomic, but higher-level flows (e.g., bout completion with settlement) are not, risking data corruption. Input validation is absent in some areas (e.g., no Zod for webhook payloads). Error handling follows `api-utils` patterns in some routes but is inconsistent in libraries. Operational concerns include floating-point precision in decay calculations and lack of env var checks in some functions. Documentation has inaccuracies, such as placeholder API versions and comments claiming atomicity without enforcement.

**By Theme**:
- **Transactional Integrity**: Credit deltas in `balance.ts` use transactions, but broader flows do not. In `streaming.ts`, bout UPDATE and credit settlement/refund are separate queries; failure after UPDATE leaves bout as 'completed' without settlement (WD-PL). Webhook handlers in `webhook.ts` update user tier then apply grants without transactions—partial failures create mismatches. Intro pool claims in `intro-pool.ts` use atomic UPDATE but recompute in JS, introducing timing races due to floating-point decay.
- **Input Validation**: No Zod schemas for Stripe payloads in `webhook.ts` or `checkout.ts`—assumes metadata presence without checks. In `actions.ts`, formData.get() assumes strings without validation.
- **Error Handling**: Routes like `run-bout/route.ts` use `errorResponse` consistently. Libraries (e.g., `settlement.ts`) throw minimally but lack structured errors. Webhook catches errors but logs without specifics, potentially masking issues.
- **Operational Deployment**: Functions assume env vars (e.g., `STRIPE_SECRET_KEY`) without checks, risking serverless failures. Floating-point in `intro-pool.ts` decay may cause off-by-one claims. No proxy handling in webhooks.
- **Documentation Accuracy**: Comments in `webhook/route.ts` claim "verifies signature and dispatches" but apiVersion is a placeholder ("2026-02-25.clover"). In `balance.ts`, docstring claims "applies delta" but proceeds with transaction log even if no credit row exists (WD-SH). Preset comments in `page.tsx` describe features not implemented (e.g., "BYOK support" without code).
- **Slopodar Patterns**: Phantom-ledger in non-atomic flows; paper-guardrail in idempotency claims without full enforcement (e.g., webhooks check reference but not for all ops).
- **Other**: Tests cover new logic but some assert passes via estimation (right-answer-wrong-work). No UNIQUE on some refs despite claims.

Findings are atomic and prioritized by severity. False negatives avoided by flagging uncertainties as low.

### Structured Findings
```yaml
review:
  model: "grok-4-latest"
  date: "2026-03-15"
  branches:
    - "phase4-economy-v2"
  base_commit: "unknown"

findings:
  - id: F-001
    branch: "phase4-economy-v2"
    file: "lib/bouts/streaming.ts"
    line: "109-148"
    severity: critical
    watchdog: WD-PL
    slopodar: phantom-ledger
    title: "Bout UPDATE to 'completed' and credit settlement not atomic"
    description: >
      In createBoutSSEStreamWithPersistence, db.update(bouts) to 'completed' and settleCredits are separate.
      If settlement fails after UPDATE, bout is marked completed without credit adjustment, creating phantom audit.
    recommendation: "Wrap UPDATE and settleCredits in db.transaction"

  - id: F-002
    branch: "phase4-economy-v2"
    file: "lib/stripe/webhook.ts"
    line: "88-119"
    severity: high
    watchdog: WD-PL
    slopodar: phantom-ledger
    title: "User tier UPDATE and grant application not atomic in subscription created"
    description: >
      db.update(users) sets tier, then applyCreditDelta grants credits. If grant fails, user has tier without credits.
      Similar in updated handler (lines 126-169).
    recommendation: "Wrap in db.transaction(async (tx) => { update; grant })"

  - id: F-003
    branch: "phase4-economy-v2"
    file: "lib/credits/balance.ts"
    line: "65-96"
    severity: critical
    watchdog: WD-PL
    slopodar: phantom-ledger
    title: "applyCreditDelta logs transaction even if no credit row exists"
    description: >
      If UPDATE affects 0 rows (no account), result=[], newBalance=0, but then INSERTs transaction as if delta applied.
      Audit trail claims change without actual balance update.
    recommendation: "Check result.length > 0 before INSERT; or ensure account exists first"

  - id: F-004
    branch: "phase4-economy-v2"
    file: "lib/credits/intro-pool.ts"
    line: "85-149"
    severity: medium
    watchdog: none
    slopodar: none
    title: "Floating-point decay recompute in JS may mismatch SQL due to timing"
    description: >
      Atomic UPDATE uses SQL power(0.5, ...), then JS recomputes actualClaim with Math.pow.
      Millisecond delays or FP precision could cause discrepancies in claimed amount.
    recommendation: "Return actual claimed from UPDATE RETURNING clause instead of recompute"

  - id: F-005
    branch: "phase4-economy-v2"
    file: "lib/stripe/webhook.ts"
    line: "n/a"
    severity: high
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "Idempotency checked for grants but not for all DB updates"
    description: >
      hasProcessedReference protects grants, but user UPDATEs (e.g., tier changes) occur without checks.
      Duplicate events could overwrite tiers without grant reapplication.
    recommendation: "Wrap all handler ops in transaction with reference_id check"

  - id: F-006
    branch: "phase4-economy-v2"
    file: "lib/stripe/checkout.ts"
    line: "n/a"
    severity: medium
    watchdog: none
    slopodar: none
    title: "No input validation for checkout params"
    description: >
      createSubscriptionCheckout and createCreditPackCheckout assume params like userId, priceId are valid without checks.
      Could create invalid sessions if bad data passed.
    recommendation: "Add Zod schemas for params"

  - id: F-007
    branch: "phase4-economy-v2"
    file: "app/api/credits/webhook/route.ts"
    line: "11"
    severity: low
    watchdog: WD-SH
    slopodar: none
    title: "Documentation claims apiVersion that may not exist"
    description: >
      Stripe init uses apiVersion: '2026-02-25.clover' — appears as placeholder or error, does not match actual Stripe versions.
    recommendation: "Update to valid apiVersion or remove if intentional"

  - id: F-008
    branch: "phase4-economy-v2"
    file: "lib/credits/settlement.ts"
    line: "14-59"
    severity: medium
    watchdog: none
    slopodar: shadow-validation
    title: "TOCTOU race in underestimate path despite comment"
    description: >
      Reads currentBalance, then applies capped delta. Comment notes GREATEST prevents negatives, but race could charge wrong amount if concurrent delta.
    recommendation: "Use atomic SQL for cap: UPDATE with SET balance = GREATEST(0, balance + delta)"

  - id: F-009
    branch: "phase4-economy-v2"
    file: "app/arena/actions.ts"
    line: "n/a"
    severity: low
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "SUBSCRIPTIONS_ENABLED checked but not for all paths"
    description: >
      Throws if !env.SUBSCRIPTIONS_ENABLED, but assumes priceId exists without check (e.g., if not configured).
      Rule stated in env but not enforced.
    recommendation: "Add checks for required env vars like STRIPE_PASS_PRICE_ID"

  - id: F-010
    branch: "phase4-economy-v2"
    file: "lib/bouts/engine.test.ts"
    line: "426-473"
    severity: low
    watchdog: none
    slopodar: right-answer-wrong-work
    title: "generateShareLine test truncates to 100 chars but asserts without verifying ellipsis"
    description: >
      Test expects 'A'.repeat(100) + '...' but does not assert the truncation logic directly—passes via prompt content.
    recommendation: "Add explicit assertion for truncated string in prompt"

  - id: F-011
    branch: "phase4-economy-v2"
    file: "lib/credits/balance.ts"
    line: "69"
    severity: medium
    watchdog: WD-DC
    slopodar: none
    title: "Dead code in UPDATE: GREATEST(0, ...) allows negative delta to floor but positive unbounded"
    description: >
      GREATEST floors at 0 for negatives, but positives can overflow without cap—unreachable in context but copied pattern.
    recommendation: "Add upper bound if needed or remove if intentional"

  - id: F-012
    branch: "phase4-economy-v2"
    file: "lib/stripe/webhook.ts"
    line: "286-293"
    severity: low
    watchdog: WD-TDF
    slopodar: none
    title: "Error handling uses console.error without structured logging"
    description: >
      Catches errors and logs with console.error—reflects common practice but not best (e.g., no Sentry integration).
    recommendation: "Use a logging library for production"

  - id: F-013
    branch: "phase4-economy-v2"
    file: "app/api/run-bout/route.ts"
    line: "30-33"
    severity: low
    watchdog: WD-LRT
    slopodar: none
    title: "MODEL_MAP uses similar-but-wrong keys (claude-haiku-4-5)"
    description: >
      Maps to 'claude-haiku-4-5' but comment mentions deprecated 3.5—potential for wrong API if not updated.
    recommendation: "Validate against actual Anthropic models"

  - id: F-014
    branch: "phase4-economy-v2"
    file: "lib/credits/intro-pool.ts"
    line: "41-59"
    severity: low
    watchdog: WD-CB
    slopodar: none
    title: "Decay formula duplicated in getIntroPoolStatus and claimFromIntroPool"
    description: >
      power(0.5, ...) logic repeated—correct in isolation but not extracted for consistency.
    recommendation: "Extract to shared function"
```