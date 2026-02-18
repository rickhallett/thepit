# Product Funnel Dashboards

## Acquisition Funnel
`$pageview` -> `signup_completed` -> `bout_started` -> `bout_completed` -> `subscription_started`

Breakdowns:
- `utm_source`
- `utm_campaign`
- `copy_variant`

## Engagement Funnel
`$pageview` -> `preset_selected` -> `bout_started` -> `bout_completed` -> `reaction_submitted`/`winner_voted` -> `bout_shared`

Breakdowns:
- `presetId`
- `model`
- `user_tier`

## Revenue Funnel
`paywall_hit` -> `checkout.initiated`/`subscription.initiated` -> `credit_purchase_completed`/`subscription_started`

Guardrails:
- `payment_failed` trend
- `subscription_churned` trend

## Viral Funnel
`bout_shared` -> `short_link_clicked` -> `bout_replayed` -> `signup_completed (is_referred=true)` -> `referral_completed`

Breakdowns:
- `platform`
- `referral_code`
