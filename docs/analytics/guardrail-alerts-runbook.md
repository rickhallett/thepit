# Guardrail Alerts Runbook

## Critical Alerts
- Error spike: 5xx >5% for 15m
- Bout failure spike: `request.failed`/`bout` paths >10% for 1h
- Webhook failure: `webhook.processed` with `status=failed`
- Payment failure spike: `payment_failed` >3 in 1h
- Latency regression: p99 >2x 24h baseline

## Positive Alerts
- Upgrade conversion (`subscription_started` from free)
- Referral completion milestone (`referral_completed`)

## First Response
1. Confirm scope (single deploy vs cross-region).
2. Inspect recent `request.failed` and `signal=audit` logs.
3. Roll back or disable risky flags when customer-impacting.
4. Post incident note with event query links.
