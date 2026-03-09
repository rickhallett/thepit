## Section 1: Narrative Report

Branch reviewed: **phase4-economy-v2**

This branch adds the credits/subscriptions economy, but several of the important financial and webhook paths are not actually safe under realistic failures or concurrent delivery. The largest issues are around **non-atomic / partially applied business operations**, **idempotency being implemented as a pre-check instead of enforced at the operation boundary**, and **error handling that returns 200 to Stripe even when processing failed**.

### 1) Webhook processing acknowledges failed events, causing permanent lost grants / bad subscription state

`app/api/credits/webhook/route.ts` always returns `200` after `handleWebhookEvent(event)`, and `lib/stripe/webhook.ts` catches all handler errors and suppresses them. The comment claims this avoids infinite retries, but the implementation also prevents **any retry for transient DB failures**, which is exactly when Stripe retries are useful.

This means a temporary DB outage during:
- credit-pack purchase grant,
- subscription tier update,
- signup grant,
- monthly grant,

will still produce `200 ok` to Stripe and the event is lost forever. That is a production financial correctness issue.

This is also internally contradictory: the comment says “Transient errors (DB timeouts) are acceptable losses; Stripe will retry.” But the code swallows the exception, so Stripe will **not** retry. That is a straight semantic mismatch as well as a business logic bug.

### 2) Webhook idempotency is race-prone despite the new UNIQUE constraint

The schema now correctly adds `credit_transactions.reference_id UNIQUE`, but webhook handlers still implement idempotency with `hasProcessedReference(referenceId)` followed by `applyCreditDelta(...)`. That is a classic TOCTOU window.

Two concurrent deliveries of the same Stripe event can both:
1. check `hasProcessedReference` → false,
2. both mutate the balance,
3. then one transaction insert fails on unique reference.

Because `applyCreditDelta()` updates the balance first and inserts the transaction second inside a transaction, the loser will roll back *its own* transaction, so the double-credit does not persist. That part is good.

But the webhook layer then **swallows the exception and returns success**, so the event outcome depends on timing and hidden rollback behavior rather than being intentionally idempotent. More importantly, the same pre-check pattern appears in several handlers and is not the right primitive: the DB uniqueness constraint should be the source of truth, and conflict should be handled as “already processed”.

As written, this is a looks-right pattern masking wrong work: comments claim webhook grants “are idempotent via reference_id”, but the code still relies on a race-prone pre-check and exception swallowing.

### 3) `ensureCreditAccount` can mint free credits multiple times for the same user

`lib/credits/balance.ts` inserts the `credits` row with default balance and independently inserts a signup transaction with `onConflictDoNothing(reference_id)`.

If a user already has a credits row but its balance has been reduced/spent, a later call to `ensureCreditAccount(userId)` will:
- do nothing to the `credits` row because it already exists,
- do nothing to the signup transaction because `signup:${userId}` already exists.

That is fine.

But the dangerous case is the reverse partial state:
- the `credits` row exists,
- the signup transaction row does **not** exist (manual repair, partial migration, prior bug, data import, test cleanup drift).

In that case, `ensureCreditAccount` inserts only the signup transaction and does **not** increase balance, so the ledger now claims credits were granted that the balance never received.

The opposite inconsistency is also possible if the first insert succeeds and the second fails outside a transaction: balance is granted without the corresponding signup ledger.

The docstring claims “Creates a credit account for a user with the default starting balance” and “Also logs a signup transaction”; in reality those two effects are not atomic and can drift apart. This is a phantom-ledger / paper-guardrail problem in a financial initialization path.

### 4) `claimFromIntroPool` updates pool state and user credit balance in separate operations

`lib/credits/intro-pool.ts` says claim is atomic and race-safe, but only the `introPool` update is atomic. The second half — actually crediting the user via `applyCreditDelta()` — happens afterward, outside any shared transaction.

Failure sequence:
1. intro pool `claimedMicro` increases,
2. `applyCreditDelta()` fails,
3. user receives no credits,
4. pool capacity is still consumed.

This leaks the pool and creates a false ledger of availability. The function comment overstates guarantees: the claim is not atomic end-to-end.

There is also no idempotency key beyond `referenceId = intro:${userId}` for the credit transaction, which means a second claim for the same user cannot succeed even if the product intends multiple intro claims over time; or if only one claim is intended, the code does not guard the pool update with the same uniqueness boundary. Pool update can still occur before the duplicate credit write fails.

### 5) `claimFromIntroPool` computes claimed amount incorrectly and can overreport granted credits

The logic after the SQL update tries to reconstruct `actualClaim` from post-update values using a complex formula:

```ts
const availableBefore = effectiveRemaining + Math.min(requestedMicro, Math.max(0, decayedTotal - (newClaimedMicro - requestedMicro)));
const actualClaim = Math.min(requestedMicro, Math.max(0, availableBefore - effectiveRemaining));
```

This is not a reliable derivation of the amount the SQL `LEAST(...)` actually added, especially when the pool had less than `requestedMicro` available. The code is reverse-engineering a delta from decayed floating-point state instead of returning the delta directly from SQL.

Because `applyCreditDelta()` uses `actualClaim`, a wrong reconstruction can over-credit or under-credit the user relative to what the pool consumed. Given this is financial logic, “probably close” is not acceptable.

The tests only assert `claimed <= requested` in the clamped case; they do not verify equality with the DB-applied delta, which leaves this bug path unprotected.

### 6) Subscription downgrade on payment failure destroys the information needed to restore the paid tier on later successful payment

`lib/stripe/webhook.ts` handles `invoice.payment_failed` by setting:
- `subscriptionTier = free`
- `subscriptionStatus = past_due`

Then `invoice.payment_succeeded` looks up the user and computes the monthly grant based on the **current DB tier**. If the user was downgraded to free on failure, then on recovery:
- `tier` resolves to `free`,
- `grantMicro` becomes 0,
- no monthly grant is applied,
- only `subscriptionStatus` is set back to active.

The comment says “Restores tier if was downgraded due to payment failure,” but the code does not restore tier at all. It cannot, because the prior paid tier was overwritten. This means recovered subscribers can remain on free tier indefinitely while their Stripe subscription is active.

This is both a semantic hallucination in the comment and a concrete billing-state bug.

### 7) `subscribeAction` accepts any non-"pass" tier as lab

In `app/arena/actions.ts`:

```ts
const priceId =
  tier === "pass" ? env.STRIPE_PASS_PRICE_ID : env.STRIPE_LAB_PRICE_ID;
```

There is no validation that `tier` is actually `"pass"` or `"lab"`. Any malformed or attacker-supplied value silently routes to the Lab price. Because this is a server action fed by form data, the hidden input is not a trust boundary.

At minimum this can create wrong checkout sessions for bad input; depending on pricing setup, it can route a user to the wrong plan. This is a missing validation issue on a payment entrypoint.

### 8) Credit-pack purchases are gated by `SUBSCRIPTIONS_ENABLED`, not a credits-specific flag

`buyCreditPackAction()` rejects purchases when `SUBSCRIPTIONS_ENABLED` is false. But the branch also has `CREDITS_ENABLED` elsewhere (`run-bout` preauth path). These are separate concerns:
- subscriptions,
- one-time credit purchases,
- consumption of credits.

Using the subscription feature flag to disable pack checkout is a stale/wrong-handle configuration bug. It will unexpectedly disable credit top-ups in any deployment wanting packs without subscriptions.

### 9) `run-bout` leaves orphaned `running` rows if SSE setup/persistence initialization fails after insert/preauth

`app/api/run-bout/route.ts`:
1. inserts a `bouts` row with `status = running`,
2. possibly preauthorizes credits,
3. constructs the stream.

Any exception between those steps and the stream body actually running leaves:
- a bout stuck in `running`,
- possibly a preauth held with no settlement/refund.

Because persistence/refund cleanup lives inside `createBoutSSEStreamWithPersistence.start()`, failures before `start()` executes are not covered. The code does handle insufficient credits specially, but not general creation-time failures after the insert.

### 10) Aborted client connections are recorded as `error` and fully refunded even though the model continues running

`lib/bouts/streaming.ts` already states cancellation does not abort the in-flight LLM call. In `createBoutSSEStreamWithPersistence`, if `aborted` is set after `executeTurnLoop` returns, the code:
- marks bout `status: "error"`,
- stores transcript,
- refunds full preauth.

But by the file’s own comment, the LLM work may continue to completion server-side despite client disconnect. That means the platform can incur cost while deliberately refunding the user as if the run failed. The stored `error` status also misrepresents what happened.

This is not just UX labeling; it is a phantom-ledger / operational-loss issue. “Client disconnected” is not equivalent to “execution failed”.

### 11) `refundPreauth` / settlement paths are not idempotent on their own

`refundPreauth()` and `settleCredits()` both call `applyCreditDelta()` with deterministic reference IDs, which is good, but they do not handle the duplicate-reference case as “already processed”. A retry or duplicate call will raise from the insert inside `applyCreditDelta()`.

In the SSE path this can happen if the server retries part of the cleanup logic or if upstream code re-enters on ambiguous failure. Since these are reconciliation operations, idempotent replay should be explicit and safe.

Currently correctness depends on callers never retrying, which is weak for payment/accounting code.

### 12) Webhook route uses non-validated env access and can crash at module load

`app/api/credits/webhook/route.ts` constructs `new Stripe(process.env.STRIPE_SECRET_KEY!, ...)` at module scope and later uses `process.env.STRIPE_WEBHOOK_SECRET!`. Unlike other new code paths, it does not go through `getEnv()`.

If the secret key is absent in a deployment, the module can fail during import rather than producing a structured API error. This is inconsistent with the project’s own env handling pattern and brittle in serverless cold starts / misconfigured environments.

### 13) Documentation/comments overclaim atomicity and behavior in several files

There are multiple comment-to-code mismatches:

- `lib/credits/intro-pool.ts`: “Atomic” claim, but only pool update is atomic; user crediting is separate.
- `lib/stripe/webhook.ts`: comment says transient errors will retry, but code suppresses retries by swallowing exceptions.
- `lib/stripe/webhook.ts`: `invoice.payment_succeeded` comment says restores tier, but it only restores status.
- `app/api/run-bout/route.ts`: comments imply credits/persistence are now handled, but creation-time failures before stream startup leave gaps.
- `lib/credits/balance.ts`: `ensureCreditAccount` implies account creation + signup logging are one coherent operation, but they are separate non-transactional writes.

These are not mere doc nits; they conceal real integrity gaps.

---

## Section 2: Structured Findings

```yaml
review:
  model: "gpt-5"
  date: "2026-03-09"
  branches:
    - "phase4-economy-v2"
  base_commit: "unknown"

findings:
  - id: F-001
    branch: "phase4-economy-v2"
    file: "lib/stripe/webhook.ts"
    line: "245-304"
    severity: critical
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "Webhook handler swallows processing errors, causing Stripe events to be permanently acknowledged"
    description: >
      handleWebhookEvent catches all exceptions and does not rethrow, while the route
      always returns HTTP 200 after calling it. Any transient DB or crediting failure
      during purchase/subscription/monthly-grant handling is therefore acknowledged to
      Stripe and never retried, permanently losing credits or subscription updates.
    recommendation: "Let transient processing failures propagate so the webhook route returns non-2xx and Stripe retries."

  - id: F-002
    branch: "phase4-economy-v2"
    file: "lib/stripe/webhook.ts"
    line: "16-22, 41-53, 87-95, 140-148, 228-236"
    severity: high
    watchdog: WD-LRT
    slopodar: right-answer-wrong-work
    title: "Webhook idempotency uses SELECT-then-apply instead of treating unique reference conflicts as success"
    description: >
      The handlers call hasProcessedReference(referenceId) before applyCreditDelta().
      Concurrent duplicate deliveries can both pass the SELECT and race into the write.
      The new UNIQUE constraint prevents double-persist, but idempotency is still being
      implemented as a pre-check rather than at the mutation boundary, making behavior
      depend on rollback/exception timing instead of an intentional no-op path.
    recommendation: >
      Remove pre-check idempotency for credit grants and handle duplicate reference_id
      conflicts from the write path as "already processed" success.

  - id: F-003
    branch: "phase4-economy-v2"
    file: "lib/credits/balance.ts"
    line: "15-35"
    severity: high
    watchdog: WD-PL
    slopodar: phantom-ledger
    title: "ensureCreditAccount balance creation and signup ledger insertion are not atomic"
    description: >
      ensureCreditAccount performs the credits row insert and the signup transaction insert
      as two separate statements outside a transaction. If one succeeds and the other does
      not (manual repair drift, partial historical failure, import mismatch), the stored
      balance and ledger diverge: either free credits exist without a signup transaction,
      or a signup transaction exists without the matching balance grant.
    recommendation: >
      Wrap credit-account creation and signup transaction insertion in a single transaction,
      or derive one strictly from the other with conflict-aware reconciliation.

  - id: F-004
    branch: "phase4-economy-v2"
    file: "lib/credits/intro-pool.ts"
    line: "86-149"
    severity: critical
    watchdog: WD-PL
    slopodar: phantom-ledger
    title: "Intro pool claim updates pool and user balance in separate operations"
    description: >
      claimFromIntroPool first increments introPool.claimedMicro, then credits the user
      via applyCreditDelta() afterward. If the second step fails, pool capacity is consumed
      without the user receiving credits. The function comment says the claim is atomic,
      but only the pool-side update is atomic; the end-to-end financial transfer is not.
    recommendation: >
      Execute pool consumption and user credit grant inside one database transaction, or
      record a durable claim row and make both sides derive from that single source of truth.

  - id: F-005
    branch: "phase4-economy-v2"
    file: "lib/credits/intro-pool.ts"
    line: "120-149"
    severity: high
    watchdog: WD-LRT
    slopodar: right-answer-wrong-work
    title: "claimFromIntroPool reconstructs actualClaim from post-update state with unreliable math"
    description: >
      After the SQL UPDATE clamps the claim with LEAST(...), the code tries to infer the
      actual claimed amount using recomputed decay math and the new claimedMicro value.
      This reconstruction is not equivalent to returning the SQL delta directly and can
      overstate or understate what the update actually consumed, causing the user credit
      grant to diverge from pool depletion.
    recommendation: >
      Return the actual increment from SQL directly (for example via old/new values or a CTE)
      and use that exact value when crediting the user.

  - id: F-006
    branch: "phase4-economy-v2"
    file: "lib/stripe/webhook.ts"
    line: "173-243"
    severity: critical
    watchdog: WD-SH
    slopodar: stale-reference-propagation
    title: "Payment failure downgrades tier to free and payment recovery never restores paid tier"
    description: >
      invoice.payment_failed overwrites subscriptionTier to free. Later,
      invoice.payment_succeeded computes the monthly grant from the current DB tier and only
      sets subscriptionStatus to active. Because the paid tier was erased, recovered
      subscribers can remain on free and receive no monthly grant even though billing resumed.
      The comment claiming tier restoration is not implemented.
    recommendation: >
      Preserve the subscribed tier separately from billing status, or restore tier from Stripe
      subscription data on payment recovery before computing grants.

  - id: F-007
    branch: "phase4-economy-v2"
    file: "app/arena/actions.ts"
    line: "42-55"
    severity: medium
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "subscribeAction does not validate tier and treats any non-pass value as lab"
    description: >
      The server action reads formData.get('tier') as an arbitrary string and maps
      tier === 'pass' ? PASS : LAB. Any malformed or attacker-supplied value silently
      creates a Lab checkout session instead of being rejected. Hidden form inputs are
      not a trust boundary for payment entrypoints.
    recommendation: "Validate tier against an explicit enum ('pass' | 'lab') and reject unknown values with 400-style action errors."

  - id: F-008
    branch: "phase4-economy-v2"
    file: "app/arena/actions.ts"
    line: "71-78"
    severity: medium
    watchdog: WD-LRT
    slopodar: stale-reference-propagation
    title: "Credit pack purchases are incorrectly gated on SUBSCRIPTIONS_ENABLED"
    description: >
      buyCreditPackAction checks env.SUBSCRIPTIONS_ENABLED rather than a credits- or
      checkout-specific flag. Deployments that want one-time top-ups without subscriptions
      will have credit pack checkout disabled by unrelated configuration, which is a wrong
      feature gate for this path.
    recommendation: "Gate credit-pack checkout on CREDITS_ENABLED or a dedicated purchase flag instead of SUBSCRIPTIONS_ENABLED."

  - id: F-009
    branch: "phase4-economy-v2"
    file: "app/api/run-bout/route.ts"
    line: "44-84"
    severity: high
    watchdog: WD-PL
    slopodar: phantom-ledger
    title: "Bout row and preauth can be left orphaned if route fails before stream start executes"
    description: >
      The route inserts a running bout row, may preauthorize credits, and only then creates
      the persistence-aware stream whose start() handler performs settlement/refund cleanup.
      Any exception after the insert/preauth but before start() runs leaves a bout stuck in
      running and can leave reserved credits unreconciled.
    recommendation: >
      Wrap route setup in try/catch and explicitly mark the bout errored / refund preauth on
      pre-stream failures, or defer durable state changes until stream startup is guaranteed.

  - id: F-010
    branch: "phase4-economy-v2"
    file: "lib/bouts/streaming.ts"
    line: "131-145"
    severity: high
    watchdog: WD-PL
    slopodar: phantom-ledger
    title: "Client disconnect is recorded as error and fully refunded even though execution is not abortable"
    description: >
      The file header states cancel() does not abort the in-flight LLM call, yet when aborted
      is observed after executeTurnLoop returns the code marks the bout as status='error' and
      refunds the full preauth. This can mislabel successful server-side execution as failure
      and refund the user while the platform still incurred model cost.
    recommendation: >
      Distinguish client disconnect from execution failure, and do not auto-refund solely
      because the SSE consumer disconnected when backend execution was not actually aborted.

  - id: F-011
    branch: "phase4-economy-v2"
    file: "lib/credits/settlement.ts"
    line: "18-77"
    severity: medium
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "Settlement and refund functions are not explicitly idempotent on retry"
    description: >
      settleCredits() and refundPreauth() use deterministic reference IDs, but they do not
      catch duplicate reference_id insertion as an already-processed success. A retried
      settlement/refund call will raise from applyCreditDelta() instead of returning the
      prior outcome, which is brittle for accounting paths that may be retried after
      ambiguous failures.
    recommendation: >
      Make settlement/refund operations idempotent by treating duplicate reference_id as
      success and returning the current balance or previously recorded result.

  - id: F-012
    branch: "phase4-economy-v2"
    file: "app/api/credits/webhook/route.ts"
    line: "10-29"
    severity: medium
    watchdog: WD-TDF
    slopodar: none
    title: "Webhook route bypasses central env validation and uses non-null assertions at module scope"
    description: >
      The route constructs Stripe with process.env.STRIPE_SECRET_KEY! at import time and
      later uses process.env.STRIPE_WEBHOOK_SECRET! directly instead of getEnv(). In a
      misconfigured deployment this can fail during module initialization rather than
      returning a controlled webhook error, and it is inconsistent with the rest of the branch.
    recommendation: "Use getEnv() inside the request path or a validated lazy singleton instead of process.env! at module scope."

  - id: F-013
    branch: "phase4-economy-v2"
    file: "lib/stripe/webhook.ts"
    line: "279-286"
    severity: low
    watchdog: WD-SH
    slopodar: none
    title: "Webhook error-handling comment claims Stripe will retry transient errors, but code prevents retries"
    description: >
      The catch block comment says transient errors are acceptable because Stripe will retry,
      but the function logs and suppresses the exception, so the route returns 200 and Stripe
      will not retry. The documentation describes behavior the code does not implement.
    recommendation: "Correct the comment and, more importantly, align behavior by rethrowing retryable failures."

  - id: F-014
    branch: "phase4-economy-v2"
    file: "lib/credits/intro-pool.ts"
    line: "79-85"
    severity: low
    watchdog: WD-SH
    slopodar: paper-guardrail
    title: "Intro pool docstring claims atomic claim semantics that the implementation does not provide"
    description: >
      The comment says claimFromIntroPool is atomic and race-safe, but only the introPool
      UPDATE is atomic. The subsequent user credit mutation is outside that transaction and
      can fail independently, so the stated end-to-end guarantee is not enforced.
    recommendation: "Update the documentation to match reality or implement the full claim as one transaction."

  - id: F-015
    branch: "phase4-economy-v2"
    file: "lib/credits/balance.ts"
    line: "10-14, 15-35"
    severity: low
    watchdog: WD-SH
    slopodar: phantom-ledger
    title: "ensureCreditAccount documentation overstates coherent account creation semantics"
    description: >
      The function is documented as creating a credit account with default starting balance
      and logging the signup transaction, but these are separate non-transactional writes.
      The comments imply a single coherent operation that the implementation does not enforce.
    recommendation: "Document the split behavior explicitly or make the two writes transactional."
```