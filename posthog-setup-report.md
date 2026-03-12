<wizard-report>
# PostHog post-wizard report

The wizard confirmed the existing PostHog integration was already production-grade (SDK installed, provider configured with consent gating, reverse proxy via `/ingest`, server-side client with serverless-compatible `captureImmediate`, Clerk identity sync, UTM super properties). Three gaps were identified and filled in session 1. Four additional server-side tracking gaps were found and filled in session 3. Environment variables are present in `.env.local`. A dashboard with five insights was created covering the core acquisition funnel, subscription health, bout activity, revenue upgrade funnel, and engagement signals.

## Events added in session 1

| Event | Description | File |
|-------|-------------|------|
| `newsletter_signup` | User subscribes to the newsletter | `app/api/newsletter/route.ts` |
| `contact_submitted` | User submits the contact form | `app/api/contact/route.ts` |
| `checkout_cancelled` | User returns from a cancelled Stripe checkout | `components/checkout-banner.tsx` |

## Events added in session 3

| Event | Description | File |
|-------|-------------|------|
| `winner_voted` | Authenticated user votes for a winner in a bout | `app/api/winner-vote/route.ts` |
| `reaction_submitted` | User adds a reaction to a bout turn (fires on add only, not remove) | `app/api/reactions/route.ts` |
| `feature_request_voted` | Authenticated user votes or unvotes a feature request | `app/api/feature-requests/vote/route.ts` |
| `bout_shared` | User creates a new short link for a bout (fires on first creation only) | `app/api/short-links/route.ts` |

## Pre-existing event coverage (not modified)

| Event | File |
|-------|------|
| `bout_started` / `bout_completed` / `bout_error` | `lib/use-bout.ts`, `lib/bout-engine.ts` |
| `agent_created` / `agent_cloned` | `components/agent-builder.tsx` |
| `credit_purchase_initiated` | `components/buy-credits-button.tsx` |
| `preset_selected` | `components/preset-card.tsx` |
| `byok_key_stashed` | `components/arena-builder.tsx` |
| `feature_request_submitted` | `components/feature-request-form.tsx` |
| `paper_submitted` | `components/paper-submission-form.tsx` |
| `paywall_hit` / `upgrade_cta_clicked` | `components/rate-limit-upgrade-prompt.tsx` |
| `arena_viewed` | `components/track-page-event.tsx` |
| `consent_granted` | `components/posthog-provider.tsx` |
| `credit_purchase_completed` | `app/api/credits/webhook/route.ts` |
| `subscription_started` / `subscription_upgraded` / `subscription_downgraded` / `subscription_churned` | `app/api/credits/webhook/route.ts` |
| `payment_failed` | `app/api/credits/webhook/route.ts` |
| `session_started` / `signup_completed` / `user_activated` | `lib/onboarding.ts` |
| `$ai_generation` | `lib/bout-engine.ts` via `lib/posthog-server.ts` |

## LLM analytics (session 2)

The project already captured `$ai_generation` events manually via `serverCaptureAIGeneration` in `lib/posthog-server.ts`, called from `lib/bout-engine.ts` after every debate turn and the share-line generation. The existing implementation covered model, provider, token counts, cost, and latency.

Three gaps were identified against the PostHog `$ai_generation` schema and filled in `lib/posthog-server.ts`:

| Field added | Value | Purpose |
|-------------|-------|---------|
| `$ai_trace_id` | `boutId` | Groups all turns of a single bout into one trace in the LLM Analytics trace view |
| `$ai_span_name` | `debate_turn_N` or `share_line` | Labels each generation within the trace |
| `$ai_stream` | `true` | Marks all generations as streaming responses |
| `$ai_time_to_first_token` | TTFT in seconds | Streaming latency metric |
| `$ai_cache_read_input_tokens` | Anthropic cache read tokens | Standard PostHog cache field |
| `$ai_cache_creation_input_tokens` | Anthropic cache write tokens | Standard PostHog cache field |

LLM analytics are visible at: https://us.posthog.com/project/311762/llm-analytics/generations

## Dashboard and insights (session 3)

- Dashboard: [Analytics basics](https://us.posthog.com/project/311762/dashboard/1355307)
- [Acquisition funnel: signup to first vote](https://us.posthog.com/project/311762/insights/Mnk4RMTy)
- [Subscription health: new vs churned (weekly)](https://us.posthog.com/project/311762/insights/tLRYjAFc)
- [Bout activity: started, completed, shared (daily)](https://us.posthog.com/project/311762/insights/dabbHshL)
- [Revenue upgrade funnel: arena to subscription](https://us.posthog.com/project/311762/insights/uf1BbPtJ)
- [Engagement signals: signups, reactions, winner votes (daily)](https://us.posthog.com/project/311762/insights/x8dZnMf6)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
