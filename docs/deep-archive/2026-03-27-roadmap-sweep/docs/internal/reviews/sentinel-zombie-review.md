# Sentinel Review — Security Audit

Date: 2026-02-28
Reviewer: Sentinel
HEAD: 89f6a07

---

## Executive Summary

The security posture of THE PIT is **mature and well-designed for an agentic-built codebase**. Authentication boundaries are consistently enforced via Clerk, credit operations use atomic SQL to prevent race conditions, API keys are redacted from logs, and all user input touching LLM prompts passes through XML escaping. The codebase demonstrates defense-in-depth thinking across middleware, route handlers, and database constraints.

**No critical vulnerabilities were found.** Findings are concentrated in the MEDIUM and LOW severity tiers — primarily around dependency hygiene, edge-case hardening, and informational items that a sophisticated reviewer might flag.

---

## Findings by Severity

### CRITICAL — Must fix before public exposure

**None identified.**

All authentication boundaries are enforced. Stripe webhooks verify signatures. Credit operations use atomic SQL. BYOK keys are stored in httpOnly cookies with 60s TTL and delete-after-read. Admin endpoints use timing-safe token comparison.

---

### HIGH — Should fix before public exposure

#### H-1: Placeholder API keys in dev fallback path (`lib/env.ts:174-175`)

**File:** `lib/env.ts`, lines 174-175
**Issue:** When `NODE_ENV !== 'production'` and required env vars are missing, the validation function falls back to hardcoded placeholder values: `sk-ant-dev-placeholder` and `sk_test_placeholder`. While these are not real keys and the fallback only triggers in non-production, the pattern of embedding API key format strings in source code is a red flag for automated secret scanners (e.g., GitHub Secret Scanning, TruffleHog, GitLeaks). Any public repo scanner will flag these as potential leaked secrets.
**Attack vector:** None — these are not real credentials. The risk is reputational: automated security scanners in CI/CD pipelines and GitHub's secret scanning will generate false positive alerts, undermining credibility.
**Remediation:** Replace with clearly non-key-like strings (e.g., `'placeholder-not-a-key'`) that don't match the `sk-ant-*` or `sk_test_*` patterns. Alternatively, crash in dev too (already done for prod) and document the setup requirement.

#### H-2: Research anonymization salt has a fixed fallback (`lib/research-anonymize.ts:18`)

**File:** `lib/research-anonymize.ts`, line 18
**Issue:** When `RESEARCH_ANONYMIZE_SALT` is not set and `NODE_ENV !== 'production'`, the fallback salt is `'thepit-research-default-salt'`. This is documented with a comment but creates a risk: if research exports are ever generated from a staging environment without the salt set, the anonymization is trivially reversible by anyone who reads the source code.
**Attack vector:** An attacker who obtains a research export generated in a non-production environment can de-anonymize user IDs by brute-forcing the known salt.
**Remediation:** The production guard is correctly in place (throws on missing salt). Consider also warning in non-production environments to prevent accidental exports with the default salt.

#### H-3: `pnpm audit` reports 20 vulnerabilities (11 high)

**Issue:** Dependency audit shows 20 vulnerabilities: 3 low, 6 moderate, 11 high. The high-severity findings include:
- **minimatch ReDoS** (multiple versions via eslint, hardhat/mocha, vitest) — GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj
- **rollup path traversal** (via vite-tsconfig-paths) — GHSA-mw96-cpmx-2vgc
- **tmp insecure tmpdir creation** (via hardhat/solc) — GHSA-52f5-9888-hmc6
- **elliptic risky crypto** (via EAS SDK/hardhat) — GHSA-848j-6mx2-7j84

**Mitigating factors:** All vulnerable packages are in dev/build dependencies or deeply nested transitive dependencies (`@ethereum-attestation-service/eas-sdk` → `hardhat` → `mocha` → `minimatch`). None are in the production request path. The `rollup` vulnerability requires processing malicious npm packages during build. The `elliptic` vulnerability in `@ethersproject/signing-key` is concerning for EAS attestation signing but is in a deeply nested transitive dependency.
**Remediation:** Update eslint (minimatch <3.1.3). For EAS SDK transitive deps, evaluate whether `@ethereum-attestation-service/eas-sdk` can be updated or the dependency chain overridden. Document known-risk acceptance for remaining items.

---

### MEDIUM — Fix when convenient

#### M-1: `UNSAFE_PATTERN` does not cover all XSS vectors

**File:** `lib/validation.ts`
**Issue:** The pattern `UNSAFE_PATTERN = /https?:\/\/|www\.|<script|javascript:|on\w+\s*=|data:text\/html/i` catches common XSS vectors but does not cover:
- `vbscript:` protocol
- `data:application/xhtml+xml`
- HTML entity-encoded payloads (e.g., `&#x3c;script&#x3e;`)

**Mitigating factors:** The primary defense against injection is `xmlEscape()` in `lib/xml-prompt.ts`, which escapes all 5 XML-special characters (`& < > " '`). `UNSAFE_PATTERN` is a secondary defense layer that blocks agent name/quirk content before it reaches the prompt builder. The combination provides defense-in-depth.
**Remediation:** Consider expanding the pattern or documenting that `xmlEscape()` is the primary defense and `UNSAFE_PATTERN` is a belt-and-suspenders filter.

#### M-2: `ask-the-pit` route does not require authentication

**File:** `app/api/ask-the-pit/route.ts`
**Issue:** The Ask The Pit endpoint is rate-limited by IP (5/minute) but does not require Clerk authentication. This means any anonymous user can consume Anthropic API tokens.
**Mitigating factors:** The rate limit is tight (5 requests/minute/IP), the feature is gated behind `ASK_THE_PIT_ENABLED`, and the model used is configurable (defaults to the cheapest model). The feature is intentionally public to serve as a documentation chatbot for site visitors.
**Attack vector:** An attacker with many IP addresses (botnet, rotating proxies) could amplify API costs. At 5 req/min/IP, a botnet with 1000 IPs could generate 5000 requests/minute.
**Remediation:** Acceptable if the model is Haiku (cheap). If enabling, consider adding a global request rate cap or total daily token budget.

#### M-3: No CSRF token on server actions (`app/actions.ts`)

**File:** `app/actions.ts`
**Issue:** Server actions (e.g., `createBout`, `createCreditCheckout`, `grantTestCredits`) rely on Next.js's built-in CSRF protection for server actions (which validates the `Origin` header). This is generally sufficient for Next.js App Router, but the protection is implicit — it relies on the framework's internal behavior rather than an explicit token.
**Mitigating factors:** Next.js 14+ automatically validates the `Origin` header for server actions and rejects cross-origin POST requests. The `frame-ancestors 'none'` CSP directive and `X-Frame-Options: DENY` prevent clickjacking. Admin actions (`grantTestCredits`, `archiveAgent`) additionally check `isAdmin()`.
**Remediation:** No immediate action needed — Next.js's built-in protection is adequate. Document the reliance on framework CSRF protection.

#### M-4: `short-links` and `reactions` routes allow anonymous access

**Files:** `app/api/short-links/route.ts`, `app/api/reactions/route.ts`
**Issue:** Both endpoints are public (no auth required). Short links allow creating vanity URLs for any bout ID. Reactions allow anonymous users to react to bout turns.
**Mitigating factors:** Both are rate-limited by IP. Short links use `onConflictDoNothing` for idempotency. Reactions use a unique composite index for deduplication (`boutId, turnIndex, reactionType, clientFingerprint`). Anonymous reaction fingerprints use SHA-256 hashed IPs.
**Remediation:** Acceptable design — these are intentionally public features. Ensure the DB unique constraints are the authoritative enforcement layer (they are).

#### M-5: Feature request GET endpoint exposes `userId` in row data

**File:** `app/api/feature-requests/route.ts`, line 26
**Issue:** The feature requests GET handler selects `featureRequests.userId` from the database. While the response maps this to `displayName`, the raw `userId` is still fetched from the DB. If a future code change inadvertently passes `userId` to the JSON response, it would leak Clerk user IDs.
**Mitigating factors:** The current response transformation on line 51-61 explicitly maps fields and does NOT include `userId` in the output — only `displayName`. The `leftJoin` with `users` table ensures display names are resolved.
**Remediation:** Consider selecting only the fields needed for the response, rather than selecting `userId` and filtering it out in the mapper.

#### M-6: `pitstorm` accounts.json contains plaintext credentials

**File pattern:** `pitstorm/internal/account/account.go`, `accounts.json` (gitignored)
**Issue:** The pitstorm test harness stores Clerk test account credentials (email, password, session tokens) in `accounts.json`. While this file is correctly gitignored, the struct definition shows plaintext password storage.
**Mitigating factors:** The file is gitignored (line 56 of `.gitignore`). These are test accounts for load testing only — they use Clerk's development/test instance. The pitstorm auth package validates that `CLERK_SECRET_KEY` starts with `sk_test_` before allowing destructive account operations.
**Remediation:** Acceptable for dev/test tooling. Ensure `accounts.json` never enters the git history. Consider encrypting at-rest if the tool is used in CI.

---

### LOW — Informational

#### L-1: CSP includes `'unsafe-inline'` for scripts

**File:** `next.config.ts`, line 29
**Issue:** The Content-Security-Policy `script-src` directive includes `'unsafe-inline'`. This weakens XSS protection by allowing inline scripts.
**Mitigating factors:** This is a common requirement for Next.js applications due to framework-generated inline scripts and Clerk's authentication widgets. Clerk's Turnstile integration also requires it. The alternative (nonce-based CSP) requires significant framework-level changes.
**Remediation:** Document this as a known limitation. Consider adding nonce-based CSP when Next.js improves native support.

#### L-2: Health endpoint exposes feature flag state

**File:** `app/api/health/route.ts`
**Issue:** The `/api/health` endpoint returns which features are enabled (`subscriptions`, `credits`, `byok`, `eas`, `askThePit`). This leaks application configuration to anyone who hits the endpoint.
**Mitigating factors:** Feature flag names are not sensitive — they're visible in the UI behavior anyway. The endpoint doesn't expose env var values, just boolean states. No rate limiting is needed since it's read-only and cheap.
**Remediation:** Consider removing feature flags from the public health response if this information should not be externally visible.

#### L-3: `pitstorm` dispatch.go contains a non-functional test API key

**File:** `pitstorm/internal/engine/dispatch.go`, line 412
**Issue:** Contains `"sk-ant-storm-test-key-not-real"` as a hardcoded test value in the BYOK probe. While clearly marked as fake, automated scanners may flag it.
**Mitigating factors:** The value is explicitly non-functional and appears in a test/simulation context. It would fail validation at the Anthropic API level.
**Remediation:** Consider using a clearly non-key-like placeholder (e.g., `"test-key-not-real"`) to avoid scanner noise.

#### L-4: In-memory rate limiter has known per-instance limitation

**File:** `lib/rate-limit.ts`
**Issue:** The rate limiter uses in-memory storage. Each Vercel serverless instance has independent state, so determined attackers hitting different instances can bypass limits.
**Mitigating factors:** This is documented in the code comments and the threat model. Database constraints (unique indexes, atomic updates, preauthorization) are the authoritative enforcement layer. Migration to Upstash Redis is recommended.
**Remediation:** Already documented. When traffic justifies it, migrate to a shared rate limit store.

#### L-5: `lib/brand.ts` reads `NEXT_PUBLIC_*` vars at module scope in server code

**File:** `lib/brand.ts`
**Issue:** Server-side `lib/brand.ts` reads `NEXT_PUBLIC_SOCIAL_*` environment variables. While `NEXT_PUBLIC_*` vars are designed to be safe for client bundles, mixing their usage in server-side library code can cause confusion about the trust boundary.
**Mitigating factors:** These are boolean feature flags (`"true"`/`"false"`) controlling social link visibility. They contain no secrets.
**Remediation:** Informational only. No action needed.

#### L-6: IP resolution uses rightmost `x-forwarded-for` entry

**File:** `lib/ip.ts`
**Issue:** `resolveClientIp()` uses `x-vercel-forwarded-for` (preferred) then the rightmost `x-forwarded-for` entry. On Vercel, this is correct (Vercel appends the client IP). On non-Vercel deployments, this behavior depends on the proxy configuration.
**Mitigating factors:** The platform is deployed on Vercel, where `x-vercel-forwarded-for` is the primary trusted header. The rightmost XFF is a standard secure pattern for single-proxy deployments.
**Remediation:** No action needed for Vercel deployment. If deploying elsewhere, verify the proxy configuration matches the IP resolution logic.

---

## Auth Boundary Map

### Protected Routes (require Clerk `auth()` + userId check)

| Route | Auth Type | Rate Limit |
|-------|-----------|------------|
| `POST /api/agents` | Clerk userId | 10/hr per userId |
| `POST /api/byok-stash` | Clerk userId + tier check | 10/min per userId |
| `POST /api/v1/bout` | Clerk userId + Lab tier | Via validateBoutRequest |
| `POST /api/winner-vote` | Clerk userId | 30/min per userId |
| `POST /api/paper-submissions` | Clerk userId | 5/hr per userId |
| `POST /api/feature-requests` | Clerk userId | 10/hr per userId |
| `POST /api/feature-requests/vote` | Clerk userId | 30/min per userId |
| Server action: `grantTestCredits` | Clerk userId + isAdmin() | None |
| Server action: `archiveAgent` | Clerk userId + isAdmin() | None |
| Server action: `createCreditCheckout` | Clerk userId | None |
| Server action: `createSubscriptionCheckout` | Clerk userId | None |
| Server action: `createBillingPortal` | Clerk userId | None |

### Admin Routes (require `x-admin-token` header with timing-safe comparison)

| Route | Auth Type | Rate Limit |
|-------|-----------|------------|
| `POST /api/admin/seed-agents` | `requireAdmin()` — timing-safe token | None |
| `POST /api/admin/research-export` | `requireAdmin()` — timing-safe token | None |

### Public Routes (no auth required)

| Route | Rate Limit | Notes |
|-------|------------|-------|
| `POST /api/run-bout` | 2/hr IP (anon), 5/hr userId | Auth-optional; anonymous uses intro pool |
| `POST /api/contact` | 5/hr per IP | Public form |
| `POST /api/newsletter` | 5/hr per IP | Public form |
| `POST /api/ask-the-pit` | 5/min per IP | Feature-flagged; costs API tokens |
| `POST /api/reactions` | 30/min per IP | Anonymous allowed; fingerprint dedup |
| `POST /api/short-links` | 30/min per IP | Public sharing feature |
| `POST /api/pv` | Internal secret (`x-pv-secret`) | Timing-safe comparison |
| `POST /api/credits/webhook` | Stripe signature verification | No rate limit needed |
| `GET /api/health` | None | Read-only status |
| `GET /api/openapi` | 10/min per IP | Spec serving |
| `GET /api/feature-requests` | None | Public read |
| `GET /api/research/export` | 5/hr per IP | Public dataset download |
| Server action: `createBout` | Via run-bout validation | Auth-optional with demo mode |
| Server action: `createArenaBout` | Via run-bout validation | Auth-optional with demo mode |

### Auth Boundary Gaps

**None identified.** All routes that modify data or incur costs require either Clerk authentication, admin token authentication, internal shared secrets, or Stripe webhook signature verification. Anonymous routes are appropriately rate-limited and backed by DB constraints for deduplication.

---

## Secrets Handling Assessment

### Environment Variables
- **Storage:** `.env` file, correctly gitignored via `.env*` pattern in `.gitignore`
- **Validation:** Centralized Zod validation in `lib/env.ts` with fail-fast in production
- **Documentation:** Comprehensive `.env.example` with all variables documented
- **No `NEXT_PUBLIC_` leakage:** Server-only secrets (API keys, DB URL, webhook secrets) are NOT prefixed with `NEXT_PUBLIC_`. Only safe public config values (PostHog key, Sentry DSN, site URL, social flags) use the prefix.

### Log Sanitization
- **Logger:** `lib/logger.ts` sanitizes `sk-ant-*`, `sk-or-v1-*`, and `sk_(live|test)_*` patterns from all log output
- **Coverage:** Sanitization is applied recursively to all context objects, error objects, and string values

### BYOK Key Security
- **Transport:** Keys are POST'd to `/api/byok-stash`, stored in httpOnly cookie with `sameSite: 'strict'`, 60-second TTL, path-scoped to `/api/run-bout`
- **Lifecycle:** Delete-after-read pattern — `readAndClearByokKey()` immediately deletes the cookie after reading
- **Logging:** BYOK bouts use `untracedStreamText()` to prevent user API keys from being sent to LangSmith
- **Sentry:** `sendDefaultPii: false` prevents user data from being sent to Sentry

### Stripe Webhook Security
- **Signature verification:** `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
- **Idempotency:** All webhook handlers check for existing transactions before applying grants

### Admin Token Security
- **Comparison:** `crypto.timingSafeEqual()` with length pre-check in `lib/admin-auth.ts`
- **PV Secret:** Timing-safe SHA-256 digest comparison in `app/api/pv/route.ts`
- **Research Key:** Timing-safe comparison with length pre-check in `lib/bout-engine.ts`

### Git History
- No real API keys found in git history (searched for `sk-ant-api`, `AKIA`, `private_key` patterns)
- `.env` files have never been committed (verified via `git log --diff-filter=D`)

---

## Dependency Vulnerability Report

**`pnpm audit` results (2026-02-28):**

| Severity | Count | Notable Packages |
|----------|-------|-------------------|
| High | 11 | minimatch (ReDoS), rollup (path traversal), tmp (insecure tmpdir) |
| Moderate | 6 | Various transitive deps |
| Low | 3 | elliptic (risky crypto implementation) |
| **Total** | **20** | |

**Key observations:**
1. **All vulnerabilities are in dev/build dependencies or deeply nested transitive deps** — none are in the production request path
2. The majority trace through `@ethereum-attestation-service/eas-sdk` → `hardhat` → various vulnerable packages
3. `minimatch` vulnerabilities in `eslint` are the easiest to resolve (update eslint)
4. The `rollup` vulnerability (GHSA-mw96-cpmx-2vgc) requires processing malicious npm packages during build — not exploitable in production
5. The `elliptic` vulnerability is in a transitive dependency used for EAS attestation signing — low practical risk since the signer key is server-side only

---

## Security-Relevant Dead Code

**No security-relevant dead code was identified.** The codebase shows clean separation between active auth patterns:

1. **No leftover auth middleware patterns** — all auth goes through Clerk's `clerkMiddleware()` wrapper
2. **No deprecated session management** — Clerk handles all session state
3. **No commented-out security checks** — route protection is consistently applied
4. **`lib/free-bout-pool.ts` exists but is functionally deprecated** — the intro pool system replaced it. The `sql` template literals in this file use parameterized queries (safe), and the module is not imported by any active route. Consider removing to reduce confusion.

---

## Recommendations

### Priority 1 — Before public exposure

1. **Replace placeholder API keys in `lib/env.ts`** with non-key-like strings to avoid secret scanner false positives (H-1)
2. **Run `pnpm update` on `eslint`** to resolve the minimatch ReDoS vulnerabilities in direct dependencies (H-3, partial)
3. **Document known `pnpm audit` findings** in a `SECURITY.md` or similar file, explaining which are accepted risks in transitive dev dependencies (H-3)

### Priority 2 — Post-launch hardening

4. **Evaluate EAS SDK transitive dependency updates** — the bulk of audit findings trace through this dependency chain (H-3)
5. **Add global token budget for Ask The Pit** if the feature is enabled publicly — even with per-IP rate limiting, a distributed attack could amplify costs (M-2)
6. **Consider migrating rate limiting to Upstash Redis** for cross-instance enforcement (L-4)

### Priority 3 — Nice to have

7. **Expand `UNSAFE_PATTERN`** to cover `vbscript:` and `data:application/xhtml+xml` (M-1)
8. **Remove `lib/free-bout-pool.ts`** if it's truly deprecated — reduces surface area for confusion
9. **Remove feature flags from `/api/health` response** to limit information disclosure (L-2)
10. **Replace fake API key strings in pitstorm** with clearly non-key-like values (L-3)

---

## Security Model Strengths (Credit Where Due)

The following patterns demonstrate strong security engineering:

- **Atomic credit operations**: `preauthorizeCredits()` uses `WHERE balance >= amount` in a single UPDATE — textbook race condition prevention
- **XML prompt security**: All user content passes through `xmlEscape()` before LLM injection — clean, auditable, and correct
- **BYOK key lifecycle**: httpOnly + sameSite strict + 60s TTL + delete-after-read is an exemplary defense against XSS key theft
- **Timing-safe comparisons**: Consistently used for all secret comparisons (admin tokens, PV secrets, research keys)
- **Error message discipline**: All routes use `errorResponse()` from `lib/api-utils.ts` with standardized messages — no stack traces or DB errors leak to clients
- **Sentry PII protection**: `sendDefaultPii: false` + Session Replay with `maskAllText: true` / `maskAllInputs: true` / `blockAllMedia: true`
- **Comprehensive CSP**: `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, HSTS with preload — well beyond minimum
- **Log sanitization**: Recursive sanitization of all known API key patterns in all log output
- **Webhook idempotency**: All Stripe webhook handlers use `referenceId`-based deduplication to prevent replay attacks
