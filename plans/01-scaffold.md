# 01-scaffold

## Context
depends_on: []
produces: [package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, vitest.config.ts, playwright.config.ts, app/layout.tsx, app/page.tsx, app/api/health/route.ts, lib/common/env.ts, lib/common/env.test.ts]
domain: root
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Stack section, Environment Variables section)
- lib/common/DOMAIN.md

## Task

### 1. Initialize the Next.js project

Run `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"` in the project root. If a `package.json` already exists, remove it first and let create-next-app generate a clean one.

After scaffolding, install additional dev dependencies:
```
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom playwright @playwright/test
```

### 2. TypeScript strict mode

Ensure `tsconfig.json` has `"strict": true`. Do NOT loosen any strict checks.

### 3. Vitest configuration

Create `vitest.config.ts`:
- Use `@vitejs/plugin-react`
- Environment: `jsdom`
- Include: `["lib/**/*.test.ts", "tests/**/*.test.ts"]`
- Path alias: `@/` → project root

### 4. Playwright configuration

Create `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Test dir: `tests/e2e`
- Web server: `pnpm dev` on port 3000
- One project: chromium only

### 5. Root layout

Create `app/layout.tsx`: html + body with Tailwind classes. Placeholder `<header>The Pit</header>` and `<footer>` inside body. Metadata: title "The Pit", description from SPEC.md one-sentence summary.

Create `app/page.tsx`: simple landing page with an h1 "The Pit" and a paragraph. This is a placeholder.

### 6. Health endpoint

Create `app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({ status: "ok" });
}
```

### 7. Environment validation

Create `lib/common/env.ts`:
- Use Zod to validate `process.env`
- Required strings: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Feature flags (boolean, default false): `SUBSCRIPTIONS_ENABLED`, `CREDITS_ENABLED`, `BYOK_ENABLED`, `PREMIUM_ENABLED`
- Conditional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PASS_PRICE_ID`, `STRIPE_LAB_PRICE_ID` (required only when `SUBSCRIPTIONS_ENABLED` is true)
- Export a typed `env` object
- Use a lazy initialization pattern so importing the module doesn't throw at build time — export a `getEnv()` function that validates on first call and caches

Write `lib/common/env.test.ts`: test that feature flags default to false, test that missing required vars throw, test that conditional vars are required when SUBSCRIPTIONS_ENABLED is true.

### 8. Gate script

Add to `package.json` scripts:
```json
"typecheck": "tsc --noEmit",
"lint": "next lint",
"test:unit": "vitest run",
"test:e2e": "playwright test",
"gate": "pnpm run typecheck && pnpm run lint && pnpm run test:unit"
```

### Do NOT
- Install any database, auth, or payment dependencies — those come in later tasks
- Add PostHog, Sentry, or any analytics
- Create more than the minimal pages listed above
- Add a CI/CD workflow

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 (env.test.ts passes)
- `curl http://localhost:3000/api/health` returns `{"status":"ok"}` (start dev server briefly if needed)
- `tsconfig.json` has `"strict": true`
