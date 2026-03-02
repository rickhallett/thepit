# The Pit v2 — Product Specification

## One sentence

AI agents argue in structured debates; users watch in real-time, react, vote, share, and the whole thing runs on a credit economy with Stripe subscriptions.

## Stack

| Layer | Choice | Non-negotiable |
|-------|--------|----------------|
| Framework | Next.js App Router | Yes |
| Language | TypeScript (strict) | Yes |
| Database | Neon Serverless Postgres | Yes |
| ORM | Drizzle | Yes |
| Auth | Clerk | Yes |
| Payments | Stripe | Yes |
| AI | Vercel AI SDK + Anthropic | Yes |
| Styling | Tailwind CSS (brutalist) | Yes |
| Deploy | Vercel | Yes |
| Testing | Vitest + Playwright | Yes |
| Package manager | pnpm | Yes |

---

## Data Model (12 tables)

```
users
  id              varchar(128) PK    -- Clerk user ID
  email           varchar(256)
  display_name    varchar(256)
  image_url       text
  referral_code   varchar(16) UNIQUE
  subscription_tier   user_tier DEFAULT 'free'
  subscription_id     varchar(256)
  subscription_status varchar(32)
  stripe_customer_id  varchar(256)
  free_bouts_used     integer DEFAULT 0
  created_at      timestamp
  updated_at      timestamp

bouts
  id              varchar(21) PK     -- nanoid
  owner_id        varchar(128) FK users
  preset_id       varchar(64)
  topic           varchar(500)
  agent_lineup    jsonb               -- ephemeral agent config
  transcript      jsonb               -- array of turn objects
  share_line      text
  status          bout_status         -- running | completed | error
  model           varchar(64)
  response_length varchar(16)
  response_format varchar(16)
  created_at      timestamp
  updated_at      timestamp

agents
  id              varchar(128) PK
  owner_id        varchar(128) FK users
  name            varchar(80)
  system_prompt   text
  preset_id       varchar(64)
  archetype       varchar(200)
  tone            varchar(200)
  quirks          text[]
  speech_pattern  varchar(200)
  opening_move    varchar(500)
  signature_move  varchar(500)
  weakness        varchar(500)
  goal            varchar(500)
  prompt_hash     varchar(66)        -- SHA-256
  tier            agent_tier          -- free | premium | custom
  archived        boolean DEFAULT false
  created_at      timestamp

credits
  user_id         varchar(128) PK FK users
  balance_micro   bigint DEFAULT 10000  -- 100 credits = 10000 micro
  updated_at      timestamp

credit_transactions
  id              serial PK
  user_id         varchar(128) FK users
  delta_micro     bigint
  source          varchar(32)         -- signup | purchase | preauth | settlement | refund | subscription_grant | monthly_grant
  reference_id    varchar(256)        -- idempotency key
  metadata        jsonb
  created_at      timestamp

reactions
  id              serial PK
  bout_id         varchar(21) FK bouts
  turn_index      integer
  reaction_type   reaction_type       -- heart | fire
  user_id         varchar(128) FK users NULLABLE
  client_fingerprint varchar(128)     -- anon:{sha256(ip)} for anonymous
  created_at      timestamp
  UNIQUE(bout_id, turn_index, reaction_type, client_fingerprint)

winner_votes
  id              serial PK
  bout_id         varchar(21) FK bouts
  user_id         varchar(128) FK users
  agent_id        varchar(128)
  created_at      timestamp
  UNIQUE(bout_id, user_id)

short_links
  id              serial PK
  bout_id         varchar(21) FK bouts UNIQUE
  slug            varchar(16) UNIQUE  -- nanoid(8)
  created_at      timestamp

referrals
  id              serial PK
  referrer_id     varchar(128) FK users
  referred_id     varchar(128) FK users
  code            varchar(16)
  credited        boolean DEFAULT false
  created_at      timestamp

subscriptions (mirror — managed by Stripe webhooks)
  -- Stored on users table directly: subscription_tier, subscription_id,
  -- subscription_status, stripe_customer_id

intro_pool
  id              serial PK           -- singleton row
  initial_micro   bigint DEFAULT 1000000
  claimed_micro   bigint DEFAULT 0
  half_life_days  numeric DEFAULT 3
  created_at      timestamp

page_views
  id              serial PK
  path            varchar(512)
  session_id      varchar(64)
  user_id         varchar(128) NULLABLE
  ip_hash         varchar(64)         -- SHA-256, never raw IP
  referrer        text
  user_agent      text
  country         varchar(8)
  created_at      timestamp
```

Enums: `bout_status` (running, completed, error), `agent_tier` (free, premium, custom), `user_tier` (free, pass, lab), `reaction_type` (heart, fire).

---

## API Contracts (MVP subset)

### Infrastructure

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | /api/health | None | DB connectivity + feature flags |

### Bouts (core product)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/run-bout | Optional | Stream SSE bout (main product) |

**POST /api/run-bout**
- Request: `{ boutId, presetId, topic?, model?, length?, format? }`
- Response: SSE stream (`data-turn`, `text-start`, `text-delta`, `text-end`, `data-share-line`)
- Rate limits: anon 2/hr, free 5/hr, pass 15/hr, lab unlimited
- Side effects: DB insert/update bout, credit preauth → settle, LLM calls
- Error codes: 400 (validation), 401 (auth required), 402 (credits), 409 (idempotency), 429 (rate limit)

### Agents

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/agents | Clerk | Create agent (no EAS) |

**POST /api/agents**
- Request: `{ name, systemPrompt?, archetype?, tone?, quirks?[], ... }`
- Response: `{ agentId, promptHash }`
- Rate limit: 10/hr
- Side effects: DB insert, SHA-256 prompt hash

### Engagement

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/reactions | Optional | Toggle heart/fire on turn |
| POST | /api/winner-vote | Clerk | Cast winner vote |

**POST /api/reactions**
- Request: `{ boutId, turnIndex, reactionType }`
- Response: `{ ok, action: 'added'|'removed', counts: {heart, fire} }`
- Toggle: same request = remove. Anonymous uses IP hash fingerprint.

**POST /api/winner-vote**
- Request: `{ boutId, agentId }`
- Response: `{ ok }`
- Constraint: one vote per user per bout (DB unique index)

### Economy

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/credits/webhook | Stripe sig | Stripe webhook (6 events) |

**Webhook events:**
1. `checkout.session.completed` — credit pack purchase
2. `customer.subscription.created` — new sub + one-time grant
3. `customer.subscription.updated` — upgrade/downgrade + incremental grant
4. `customer.subscription.deleted` — cancel → free
5. `invoice.payment_failed` — immediate downgrade to free
6. `invoice.payment_succeeded` — tier restore + monthly grant (skip first invoice)

All grants are idempotent via `reference_id` in `credit_transactions`.

### Sharing

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/short-links | Optional | Create short link for bout |

---

## UI Pages (MVP subset)

| Route | Purpose | Auth | Key Components |
|-------|---------|------|----------------|
| `/` | Landing page (hero, presets, pricing) | Public | Static |
| `/arena` | Preset grid, credit display, subscribe | Public + auth features | PresetCard, checkout |
| `/arena/custom` | Custom agent lineup builder | Public + auth features | ArenaBuilder |
| `/bout/[id]` | Live bout viewer (SSE streaming) | Public + auth features | Arena, useBout hook |
| `/b/[id]` | Short link replay (read-only) | Public | BoutHero, Arena |
| `/agents` | Agent catalog (search, filter) | Public | AgentsCatalog |
| `/agents/[id]` | Agent detail (DNA, hashes) | Public | DnaFingerprint |
| `/agents/new` | Create agent form | Required | AgentBuilder |
| `/leaderboard` | Agent + player rankings | Public | LeaderboardTable |
| `/recent` | Paginated recent bouts | Public | BoutCard |
| `/sign-in` | Clerk sign-in | Public | Clerk component |
| `/sign-up` | Clerk sign-up | Public | Clerk component |

### Explicitly out of scope pages
- `/research`, `/research/citations`
- `/developers`
- `/feedback`, `/roadmap`
- `/contact`
- `/privacy`, `/terms`, `/disclaimer`, `/security`
- `/docs/api` (Scalar)

---

## Core Workflows

### 1. Bout Flow (the product)

```
User picks preset → client generates boutId (nanoid 21)
  → POST /api/run-bout (SSE)
  → Server: validate → rate limit → resolve preset → preauth credits
  → Turn loop: for each turn, select agent, build prompt, call LLM, stream tokens
  → After all turns: generate share line (Haiku, 80 tokens max)
  → Persist: update bout status=completed, transcript, shareLine
  → Settle credits (refund overestimate or charge underestimate)
  → Client: auto-scroll, show share panel, enable reactions/voting
```

### 2. Credit Flow (the economy)

```
Signup → ensureCreditAccount (100 credits = 10000 micro)
Start bout → estimateCost → preauthorizeCredits (atomic WHERE balance >= amount)
Bout completes → computeActualCost → settleCredits (delta reconciliation)
  If overestimated: refund difference
  If underestimated: charge additional (capped at available balance)
  If error: full refund of preauth
```

### 3. Auth Flow (signup to first bout)

```
Anonymous visitor → middleware assigns session
  → Can run anonymous bouts (intro pool, Haiku only)
Sign up via Clerk → first authenticated page load triggers:
  → ensureUserRecord (Clerk → DB mirror)
  → ensureReferralCode (nanoid 8)
  → ensureCreditAccount (starting balance)
  → applySignupBonus (from intro pool, idempotent)
```

### 4. Subscription Flow (Stripe)

```
Subscribe → Stripe Checkout → webhook: subscription.created
  → updateUserSubscription(tier) + one-time credit grant
Monthly renewal → webhook: invoice.payment_succeeded
  → monthly credit grant (skip first invoice to prevent double-grant)
Upgrade → webhook: subscription.updated
  → new tier + incremental grant (delta between tier grants)
Cancel → webhook: subscription.deleted
  → immediate downgrade to free (no credit clawback)
Payment fail → webhook: invoice.payment_failed
  → immediate downgrade to free
```

### 5. Social Flow

```
React: tap heart/fire → toggle (insert or delete) → return absolute counts
Vote: pick winner → one vote per user per bout → updates leaderboard
Share: bout completes → create short link (nanoid 8) → share panel
Leaderboard: aggregate bouts × votes → rank agents by wins, votes
```

---

## Tier Configuration

| | Anonymous | Free | Pass (£3/mo) | Lab (£10/mo) |
|---|-----------|------|-------------|-------------|
| Rate limit | 2/hr | 5/hr | 15/hr | Unlimited |
| Models | Haiku | Haiku, Sonnet | Haiku, Sonnet | Haiku, Sonnet |
| Max agents | 0 | 1 | 5 | Unlimited |
| BYOK | No | No | Yes | Yes |
| API access | No | No | No | Yes |
| Sub grant | — | — | 300 credits | 600 credits |
| Monthly grant | — | — | 300 credits | 600 credits |

---

## Environment Variables (required)

```
DATABASE_URL=                    # Neon connection string
ANTHROPIC_API_KEY=               # Claude API key
CLERK_SECRET_KEY=                # Clerk server secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # Clerk client key
```

### Feature flags (all default false)

```
SUBSCRIPTIONS_ENABLED=false
CREDITS_ENABLED=false
BYOK_ENABLED=false
PREMIUM_ENABLED=false
```

### Conditional (when feature flags enabled)

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PASS_PRICE_ID=
STRIPE_LAB_PRICE_ID=
```

---

## Out of Scope

Taped to the monitor. If you catch yourself reaching for any of these, stop.

- EAS attestations / on-chain verification
- Agent DNA fingerprinting / lineage tracking (prompt hash is in, DNA is not)
- Ask The Pit chatbot
- OpenAPI docs / Scalar
- Paper submissions / citations
- Feature requests / voting
- Newsletter signup
- Contact form
- Cookie consent / GDPR banner
- PostHog analytics
- Sentry error tracking
- LangSmith tracing
- A/B copy testing system
- Research export pipeline
- E2e browser testing against Vercel previews
- CI/CD workflows (GitHub Actions)
- Go CLI toolchain (pitctl, pitkeel, etc.)
- Admin endpoints
- Full security hardening (Turnstile, CSP headers)
- Agent cloning / remix flow (agent creation is in, clone lineage is not)


