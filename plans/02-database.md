# 02-database

## Context
depends_on: [01]
produces: [db/schema.ts, db/index.ts, drizzle.config.ts]
domain: db/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Data Model section — all 12 tables and 4 enums)
- db/DOMAIN.md

## Task

### 1. Install dependencies

```
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

### 2. Drizzle configuration

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 3. Database connection

Create `db/index.ts`:
- Import `Pool` from `@neondatabase/serverless`
- Import `drizzle` from `drizzle-orm/neon-serverless`
- Create pool using `DATABASE_URL` from env
- Export `db` as the drizzle instance wrapping the pool
- Use `Pool` (NOT `neonConfig` or the HTTP driver) — we need transaction support

```typescript
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### 4. Schema — all 12 tables and 4 enums

Create `db/schema.ts` with EXACTLY the tables from SPEC.md Data Model. Use Drizzle's `pgTable`, `pgEnum`, column helpers.

**4 enums:**
```typescript
export const boutStatusEnum = pgEnum("bout_status", ["running", "completed", "error"]);
export const agentTierEnum = pgEnum("agent_tier", ["free", "premium", "custom"]);
export const userTierEnum = pgEnum("user_tier", ["free", "pass", "lab"]);
export const reactionTypeEnum = pgEnum("reaction_type", ["heart", "fire"]);
```

**12 tables** (match SPEC.md column names exactly, using snake_case):

1. `users` — id (varchar 128 PK), email, display_name, image_url, referral_code (unique), subscription_tier (default 'free'), subscription_id, subscription_status, stripe_customer_id, free_bouts_used (default 0), created_at, updated_at
2. `bouts` — id (varchar 21 PK), owner_id (FK users, nullable for anon), preset_id, topic (varchar 500), agent_lineup (jsonb), transcript (jsonb), share_line (text), status (bout_status), model (varchar 64), response_length, response_format, created_at, updated_at
3. `agents` — id (varchar 128 PK), owner_id (FK users), name (varchar 80), system_prompt (text), preset_id, archetype, tone, quirks (text array), speech_pattern, opening_move, signature_move, weakness, goal, prompt_hash (varchar 66), tier (agent_tier), archived (default false), created_at
4. `credits` — user_id (varchar 128 PK, FK users), balance_micro (bigint default 10000), updated_at
5. `credit_transactions` — id (serial PK), user_id (FK users), delta_micro (bigint), source (varchar 32), reference_id (varchar 256), metadata (jsonb), created_at
6. `reactions` — id (serial PK), bout_id (FK bouts), turn_index (integer), reaction_type (enum), user_id (FK users nullable), client_fingerprint (varchar 128), created_at. UNIQUE(bout_id, turn_index, reaction_type, client_fingerprint)
7. `winner_votes` — id (serial PK), bout_id (FK bouts), user_id (FK users), agent_id (varchar 128), created_at. UNIQUE(bout_id, user_id)
8. `short_links` — id (serial PK), bout_id (FK bouts, unique), slug (varchar 16 unique), created_at
9. `referrals` — id (serial PK), referrer_id (FK users), referred_id (FK users), code (varchar 16), credited (default false), created_at
10. `intro_pool` — id (serial PK), initial_micro (bigint default 1000000), claimed_micro (bigint default 0), half_life_days (numeric default 3), created_at
11. `page_views` — id (serial PK), path (varchar 512), session_id (varchar 64), user_id (nullable), ip_hash (varchar 64), referrer (text), user_agent (text), country (varchar 8), created_at

Note: "subscriptions" is stored as fields on the `users` table per SPEC.md — no separate table needed.

Use `timestamp` with `defaultNow()` for all `created_at` fields. Use `.$onUpdate(() => new Date())` for `updated_at` fields.

Add `drizzle-kit` scripts to `package.json`:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

### Do NOT
- Run migrations (no database connection available during build)
- Add seed data
- Add any business logic to db/
- Create a separate table for subscriptions — those fields live on the users table

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0 (schema types are valid)
- `pnpm run lint` exits 0
- `db/schema.ts` exports exactly 4 enums and 11 table definitions (page_views is the 11th; subscriptions data is on users)
- `db/index.ts` exports `db` using Pool from @neondatabase/serverless
- All column names match SPEC.md exactly (snake_case)
- The unique constraints on reactions and winner_votes are present
