# Convergence Matrix

| Finding | Severity | claude-3-7 | gpt-5 | claude-3-5 | Converge | Confidence |
|---------|----------|:---:|:---:|:---:|----------|------------|
| Intro pool calculation mints infinite credits when | CRITICAL | YES | YES | — | R1+R2 | 0.62 |
| Client disconnect abort triggers full refund after | HIGH | YES | YES | — | R1+R2 | 0.62 |
| Anonymous requests bypass credit preauthorization  | CRITICAL | YES | — | — | R1 only | — |
| Swallowed errors in webhook handler prevent Stripe | CRITICAL | YES | — | — | R1 only | — |
| applyCreditDelta records raw delta instead of appl | CRITICAL | YES | — | — | R1 only | — |
| Webhook handler swallows processing errors, causin | CRITICAL | — | YES | — | R2 only | — |
| Payment failure downgrades tier to free and paymen | CRITICAL | — | YES | — | R2 only | — |
| Bout UPDATE to 'completed' and credit settlement n | CRITICAL | — | — | YES | R3 only | — |
| applyCreditDelta logs transaction even if no credi | CRITICAL | — | — | YES | R3 only | — |
| Secondary share-line failure triggers full refund  | HIGH | YES | — | — | R1 only | — |
| Missing idempotency check on intro pool claim caus | HIGH | YES | — | — | R1 only | — |
| Webhook idempotency uses SELECT-then-apply instead | HIGH | — | YES | — | R2 only | — |
| ensureCreditAccount balance creation and signup le | HIGH | — | YES | — | R2 only | — |
| claimFromIntroPool reconstructs actualClaim from p | HIGH | — | YES | — | R2 only | — |
| Bout row and preauth can be left orphaned if route | HIGH | — | YES | — | R2 only | — |
| User tier UPDATE and grant application not atomic  | HIGH | — | — | YES | R3 only | — |
| Idempotency checked for grants but not for all DB  | HIGH | — | — | YES | R3 only | — |
| Top-level Stripe instantiation crashes Next.js bui | MEDIUM | YES | — | — | R1 only | — |
| subscribeAction does not validate tier and treats  | MEDIUM | — | YES | — | R2 only | — |
| Credit pack purchases are incorrectly gated on SUB | MEDIUM | — | YES | — | R2 only | — |
| Settlement and refund functions are not explicitly | MEDIUM | — | YES | — | R2 only | — |
| Webhook route bypasses central env validation and  | MEDIUM | — | YES | — | R2 only | — |
| Floating-point decay recompute in JS may mismatch  | MEDIUM | — | — | YES | R3 only | — |
| No input validation for checkout params | MEDIUM | — | — | YES | R3 only | — |
| TOCTOU race in underestimate path despite comment | MEDIUM | — | — | YES | R3 only | — |
| Dead code in UPDATE: GREATEST(0, ...) allows negat | MEDIUM | — | — | YES | R3 only | — |
| Webhook error-handling comment claims Stripe will  | LOW | — | YES | — | R2 only | — |
| Intro pool docstring claims atomic claim semantics | LOW | — | YES | — | R2 only | — |
| ensureCreditAccount documentation overstates coher | LOW | — | YES | — | R2 only | — |
| Documentation claims apiVersion that may not exist | LOW | — | — | YES | R3 only | — |
| SUBSCRIPTIONS_ENABLED checked but not for all path | LOW | — | — | YES | R3 only | — |
| generateShareLine test truncates to 100 chars but  | LOW | — | — | YES | R3 only | — |
| Error handling uses console.error without structur | LOW | — | — | YES | R3 only | — |
| MODEL_MAP uses similar-but-wrong keys (claude-haik | LOW | — | — | YES | R3 only | — |
| Decay formula duplicated in getIntroPoolStatus and | LOW | — | — | YES | R3 only | — |
