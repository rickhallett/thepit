[← App](../README.md) · [Root](../../README.md)

# app/api/

REST and streaming API endpoints. All routes use the Node.js runtime (not Edge). The streaming bout engine is the most architecturally significant endpoint — it orchestrates multi-turn AI debates with real-time token delivery.

## Endpoint Inventory

| Method | Path | Auth | Rate Limit | Purpose |
|--------|------|------|-----------|---------|
| POST | `/api/run-bout` | Optional (required for credits) | 5/hr auth, 2/hr anon | Stream a multi-turn AI debate bout |
| POST | `/api/agents` | Required | — | Create agent with DNA hashing + optional EAS attestation |
| POST | `/api/reactions` | Optional | 30/min | Heart/fire reactions per turn |
| POST | `/api/winner-vote` | Required | — | One winner vote per user per bout |
| POST | `/api/ask-the-pit` | Optional | 5/min | RAG-lite AI Q&A from platform docs |
| POST | `/api/byok-stash` | Optional | — | Stash BYOK key in HTTP-only cookie (60s TTL) |
| POST | `/api/newsletter` | Optional | 5/hr | Email signup with dedup |
| POST | `/api/contact` | Optional | 5/hr | Contact form via Resend email API |
| POST | `/api/credits/webhook` | Stripe signature | — | Stripe webhook (6 event types) |
| POST | `/api/admin/seed-agents` | `x-admin-token` header | — | Seed preset agents + optional EAS attestation |
| GET | `/api/health` | None | — | Health check endpoint |

## Streaming Protocol

The bout engine (`/api/run-bout`) uses Vercel AI SDK's `createUIMessageStream` to deliver a custom SSE format:

```
Event types (in order of a typical bout):
  start           → Declares a new message ID
  data-turn       → Agent metadata (turn index, agentId, agentName, color)
  text-start      → Begin streaming text for this turn
  text-delta      → Token chunk (repeated N times per turn)
  text-end        → End of turn text
  data-share-line → Generated tweet-length summary (after all turns)
```

The client consumes this stream via the `useBout` hook in `lib/use-bout.ts`, which implements a "pending message" pattern with randomized 2-4s thinking delays.

## Bout Lifecycle

```
createBout()          POST /api/run-bout             Client (SSE)
─────────────         ──────────────────             ────────────
 Insert bout    →     Validate + idempotency    →    data-turn
 status:running       Rate limit check               text-delta ×N
                      Tier access control             text-delta ×N
                      Preauthorize credits            ...
                      Round-robin loop:               (per turn)
                        Agent A → streamText          text-delta ×N
                        Agent B → streamText          text-delta ×N
                        ...N turns...
                      Generate share line    →        data-share-line
                      Settle credits                  bout-complete
                      status:completed               Voting panel
```

### Credit Preauthorization Flow

When `CREDITS_ENABLED=true`:

1. **Estimate** cost using `estimateBoutCostGbp(turns, model, outputTokens)`
2. **Preauthorize** atomically via `preauthorizeCredits()` — conditional SQL `UPDATE WHERE balance >= amount` prevents overdraw under concurrency
3. **Stream** the bout (turns accumulate actual token counts)
4. **Settle** — compute actual cost, delta = actual - preauth:
   - Delta < 0: refund the difference
   - Delta > 0: charge the difference (capped at available balance)
   - Delta = 0: no-op
5. **On error**: refund full unused preauth via `applyCreditDelta()`

### BYOK Security Model

API keys never touch browser storage:

```
Browser input → HTTP-only cookie (60s TTL, scoped to /api/run-bout)
             → Read once + deleted → Passed to Anthropic SDK → GC'd
```

This eliminates XSS exposure entirely. The `/api/byok-stash` endpoint sets the cookie with `sameSite: strict`, `httpOnly: true`, `maxAge: 60`.

## Stripe Webhook (`/api/credits/webhook`)

Processes 6 Stripe event types covering the full subscription lifecycle:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Credit pack purchase (with idempotency via `referenceId`) |
| `customer.subscription.created` | Set user tier from plan metadata |
| `customer.subscription.updated` | Update tier on plan change |
| `customer.subscription.deleted` | Downgrade to free tier |
| `invoice.payment_failed` | Immediate downgrade to free |
| `invoice.payment_succeeded` | Restore tier after retry |

All webhook processing uses uniform code paths to prevent timing-based oracle attacks.

## Observability

API routes use structured logging via `lib/logger.ts` and `lib/api-logging.ts`:
- Every bout logs `start`, per-turn metrics (model, tokens, duration), and `completion`
- Request IDs are extracted from `x-request-id` headers via `lib/request-context.ts`
- Error paths log structured context (boutId, turns completed, tokens used)

## Design Decisions & Trade-offs

- **Node.js runtime (not Edge)** — All routes use `runtime = 'nodejs'`. Edge has a 30s execution limit which is insufficient for multi-turn bouts (up to 120s). This means cold starts are slower but execution limits are adequate.
- **In-memory rate limiting** — `lib/rate-limit.ts` uses a sliding window stored in process memory. Sufficient for single-instance Vercel deployments but would not survive horizontal scaling. A distributed rate limiter (Redis, Upstash) would be needed for multi-instance deployments.
- **`maxDuration = 120`** — The bout streaming endpoint allows up to 2 minutes. This accommodates 12-turn bouts with premium models but means a single request can hold a serverless function for that duration.
- **No GET endpoints for data** — All data fetching happens in server components, not via API routes. The API surface is purely for mutations and streaming.

---

[← App](../README.md) · [Root](../../README.md) · [Components](../../components/README.md) · [Lib](../../lib/README.md) · [DB](../../db/README.md)
