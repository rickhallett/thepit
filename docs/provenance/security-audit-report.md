# Security Audit Report: The Pit

**Date:** 2026-03-12
**Scope:** Full codebase security review
**Auditor:** Polecat rictus (automated security audit)
**Commit:** polecat/rictus/PIT-19h@mmnyp85a

---

## Executive Summary

This comprehensive security audit examined The Pit codebase across eight security domains: authentication/authorization, input validation, API security, secrets management, data exposure, dependency security, business logic, and infrastructure.

**Overall Assessment:** The codebase demonstrates strong security fundamentals with mature patterns for authentication, payment processing, and input validation. No critical vulnerabilities were identified. The primary areas for improvement are dependency updates, rate limiting architecture, and minor hardening of the BYOK key handling.

| Severity | Count | Action Required |
|----------|-------|-----------------|
| CRITICAL | 0 | - |
| HIGH | 1 | Address within 2 weeks |
| MEDIUM | 4 | Address within 30 days |
| LOW | 4 | Address when convenient |
| INFO | 3 | Awareness only |

---

## Findings by Severity

### HIGH Severity

#### H1: In-Memory Rate Limiter Bypassed Across Serverless Instances

**Location:** `lib/rate-limit.ts:1-117`

**Description:**
The rate limiter uses in-memory storage per serverless instance. In a distributed serverless environment (Vercel), each function instance maintains independent state. A determined attacker can bypass rate limits by ensuring requests hit different instances.

**Impact:**
- Rate limits can be circumvented by distributing requests across instances
- Agent creation (10/hour), bout creation (2-15/hour depending on tier), and other rate-limited endpoints become effectively unlimited
- Could enable DoS through resource exhaustion or credit abuse

**Current Mitigation:**
The code acknowledges this limitation (lines 5-13) and relies on database-level constraints as authoritative enforcement. This is documented but remains a gap.

**Remediation:**
1. Migrate to a shared rate-limiting store (Upstash Redis recommended for Vercel)
2. Implement edge-based rate limiting via Vercel's Edge Middleware with KV storage
3. Add anomaly detection alerts for unusual request patterns per IP

**Evidence:**
```typescript
// lib/rate-limit.ts:5-13
// LIMITATION: In-memory only — each serverless instance has independent
// state. A determined attacker hitting different instances can bypass
// limits.
```

---

### MEDIUM Severity

#### M1: Dependency Vulnerabilities (Multiple CVEs)

**Location:** `package.json` transitive dependencies

**Description:**
The `pnpm audit` revealed multiple vulnerabilities in transitive dependencies:

| Package | Severity | CVE/Advisory | Path |
|---------|----------|--------------|------|
| esbuild <0.25.0 | Moderate | GHSA-67mh-4wv8-2f99 | drizzle-kit > @esbuild-kit |
| dompurify | Moderate | Advisory 1114017 | posthog-js |
| bn.js | Moderate | Advisory 1113441 | @ethereum-attestation-service/eas-sdk |
| ajv | Moderate | Advisory 1113715 | @sentry/nextjs > webpack |
| elliptic | Review | Advisory 1112030 | eas-sdk > hardhat |
| undici | Review | Advisory 1112496 | eas-sdk > hardhat |
| cookie | Review | Advisory 1103907 | eas-sdk > hardhat > @sentry/node |

**Impact:**
- esbuild vulnerability allows malicious websites to read development server responses (development only)
- Other vulnerabilities are in deeply nested dependencies with limited attack surface

**Remediation:**
1. Update direct dependencies where possible
2. Consider `pnpm overrides` for transitive dependency pinning
3. For EAS SDK: evaluate if hardhat dependency can be pruned (it appears to be unused in production)
4. Run `pnpm audit fix` and test thoroughly

---

#### M2: CSP Allows 'unsafe-inline' for Scripts

**Location:** `next.config.ts:29`

**Description:**
The Content-Security-Policy includes `'unsafe-inline'` in the `script-src` directive:

```typescript
`script-src 'self' 'unsafe-inline' ${clerkDomains} ...`
```

**Impact:**
- Weakens XSS protection - inline event handlers and `<script>` tags can execute
- Common for Next.js applications due to hydration requirements, but still a risk

**Remediation:**
1. Investigate using `'strict-dynamic'` with nonce-based CSP (Next.js 13+ supports this)
2. Configure `next.config.ts` experimental nonce support
3. If nonces are not feasible, document this as accepted risk and ensure XSS prevention at application layer (already in place via UNSAFE_PATTERN)

---

#### M3: BYOK Cookie Encoding is Reversible

**Location:** `lib/byok.ts:13-26`

**Description:**
BYOK API keys are encoded in cookies using a simple delimiter-based format:
```typescript
`${provider}${COOKIE_SEP}${modelId ?? ''}${COOKIE_SEP}${key}`
```

The cookie is httpOnly and short-lived (60s), but the encoding is trivially reversible.

**Impact:**
- If an attacker gains access to the cookie (e.g., via server-side code execution or cookie extraction), the API key is immediately usable
- The 60-second TTL and read-once-delete behavior mitigate but don't eliminate risk

**Remediation:**
1. Encrypt BYOK cookie value with a server-side key (AES-GCM recommended)
2. Consider using signed JWTs with short expiry instead of raw encoding
3. At minimum, add HMAC signature to detect tampering

---

#### M4: EAS Signer Private Key in Environment Variable

**Location:** `lib/eas.ts:73-75`

**Description:**
The Ethereum Attestation Service signer private key is stored as a plaintext environment variable:
```typescript
if (!process.env.EAS_SIGNER_PRIVATE_KEY) {
  throw new Error('EAS_SIGNER_PRIVATE_KEY is required.');
}
```

**Impact:**
- Private key exposure in logs, error messages, or environment dumps would compromise on-chain identity
- Key rotation requires environment variable update and redeployment

**Remediation:**
1. Use a secrets manager (Vercel Secrets, AWS Secrets Manager, HashiCorp Vault)
2. Implement key rotation capability without redeployment
3. Consider hardware security module (HSM) for production signing operations
4. Add monitoring for unauthorized attestation attempts

---

### LOW Severity

#### L1: User Activation Race Condition

**Location:** `lib/bout-engine.ts:1063-1084`

**Description:**
The `user_activated` analytics event can fire multiple times for the same user if two bouts complete concurrently:

```typescript
// KNOWN RACE: Two concurrent bout completions can both see count(*) === 1
// and fire duplicate user_activated events.
```

**Impact:**
- Minor analytics data quality issue
- PostHog deduplicates, so impact is minimal

**Remediation:**
Add `activated_at` timestamp column to users table with atomic UPDATE ... WHERE activated_at IS NULL RETURNING pattern.

---

#### L2: No Explicit CSRF Token Mechanism

**Location:** Application-wide

**Description:**
The application relies on SameSite cookie attributes for CSRF protection rather than explicit tokens. State-changing endpoints use POST with JSON bodies.

**Impact:**
- SameSite=Lax/Strict cookies provide robust CSRF protection for modern browsers
- Legacy browsers without SameSite support could be vulnerable

**Remediation:**
1. Current approach is acceptable for modern browser requirements
2. Consider adding CSRF tokens for extra defense-in-depth on critical operations (subscription changes, agent deletion)
3. Document browser support requirements

---

#### L3: Error Messages May Leak Implementation Details

**Location:** Various API routes

**Description:**
Some error responses include specific error messages that could reveal implementation details:

```typescript
// lib/bout-engine.ts:794
const msg = `Prompt exceeds model context limit (${estimatedInputTokens} estimated tokens > ${tokenBudget} budget).`;
```

**Impact:**
- Information leakage about internal token budgets, model IDs, and system architecture
- Could assist targeted attacks

**Remediation:**
1. Use generic error messages for client responses
2. Log detailed errors server-side with request context
3. Audit API_ERRORS constants for information leakage

---

#### L4: Development Mode Allows Partial Config

**Location:** `lib/env.ts:164-177`

**Description:**
In development mode, environment validation failures result in a warning and fallback values rather than a hard failure:

```typescript
if (process.env.NODE_ENV === 'production') {
  throw new Error(`Environment validation failed:\n${formatted}`);
}
console.warn('Continuing with partial config (development mode)');
```

**Impact:**
- Development environments may run with invalid or missing configuration
- Could mask configuration issues that would fail in production

**Remediation:**
Consider failing in development mode as well, with explicit opt-out flag for local development.

---

### INFO Severity

#### I1: Log Level Could Expose Debug Information

**Location:** `lib/logger.ts:45-49`

**Description:**
The `LOG_LEVEL` environment variable controls log verbosity. If set to `debug` in production, sensitive request details could be logged.

**Observation:**
- Default is 'info' which is appropriate
- Logger already sanitizes API keys (sk-ant-*, sk-or-v1-*, sk_live/test patterns)
- AsyncLocalStorage context (requestId, clientIp) is included in logs

**Recommendation:**
Ensure LOG_LEVEL is explicitly set to 'info' or 'warn' in production environment variables.

---

#### I2: Intro Pool Consumption Without Authentication

**Location:** `lib/bout-engine.ts:437-452`

**Description:**
Anonymous users can consume from the intro pool without authentication. The pool has a half-life decay mechanism and credits are refunded on error.

**Observation:**
- This is intentional for user acquisition (try-before-signup)
- Pool exhaustion triggers auth requirement
- Error path properly refunds consumed credits

**Recommendation:**
Monitor pool drain rate for abuse patterns. Consider adding IP-based throttling for anonymous pool consumption.

---

#### I3: Sentry Source Maps Enable Stack Trace Readability

**Location:** `next.config.ts:104-119`

**Description:**
Source maps are uploaded to Sentry for debugging. While these are access-controlled by Sentry, they reveal source code structure.

**Observation:**
- Standard practice for production debugging
- Sentry access controls protect the maps
- No action needed, but worth documenting

---

## Security Strengths

The following security measures are well-implemented and should be maintained:

### Authentication & Authorization
- **Clerk Integration:** Proper middleware-level authentication via `clerkMiddleware()`
- **Timing-Safe Token Comparison:** Admin auth (`lib/admin-auth.ts`) and research API (`app/api/v1/bout/route.ts:26-32`) use `crypto.timingSafeEqual`
- **Ownership Checks:** Bout ownership validated before operations (`bout-engine.ts:304-307`)
- **Tier-Based Access Control:** Robust tier resolution with consistent enforcement

### Input Validation
- **UNSAFE_PATTERN:** Regex blocks URLs, scripts, event handlers, data URIs (`lib/validation.ts`)
- **Zod Schema Validation:** All API routes use `parseValidBody()` for type-safe input parsing
- **Length Limits:** Comprehensive per-field limits (archetype: 200, customInstructions: 5000, topic: 500, etc.)
- **Quirks Validation:** Max 10 items, 100 chars each, UNSAFE_PATTERN checked

### Payment Security (Stripe)
- **Webhook Signature Verification:** `stripe.webhooks.constructEvent()` validates all webhooks
- **Idempotent Grants:** All credit grants use unique `referenceId` with deduplication
- **Atomic Transactions:** Credit operations wrapped in database transactions
- **Preauthorization Pattern:** Credits pre-deducted before bout execution, settled or refunded after

### Security Headers
```
Content-Security-Policy: [comprehensive policy]
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Secrets Handling
- **Logger Sanitization:** API keys redacted from all log output
- **BYOK Cookie Security:** httpOnly, secure (production), sameSite=strict, path-scoped to /api/run-bout
- **Short TTL:** BYOK cookie expires in 60 seconds
- **Read-Once-Delete:** BYOK key cleared immediately after use

### Data Protection
- **IP Hashing:** Raw IPs hashed before storage in page_views (`ipHash` column)
- **User ID Hashing:** User IDs hashed in LangSmith traces for privacy
- **Consent-Gated Analytics:** Session/visit tracking requires `pit_consent` cookie
- **Research Export Anonymization:** Salt-based anonymization available

### Database Security
- **Unique Indexes:** One vote per user per bout enforced at DB level
- **Foreign Key Constraints:** Cascade deletes prevent orphaned records
- **Atomic Operations:** `GREATEST(0, balance - amount)` prevents negative balances

---

## Prioritized Remediation Roadmap

### Phase 1: Immediate (1-2 weeks)
1. **H1:** Implement shared rate limiting (Upstash Redis or Vercel KV)
2. **M1:** Run `pnpm audit fix` and update vulnerable dependencies

### Phase 2: Short-term (30 days)
3. **M3:** Encrypt BYOK cookie payload
4. **M4:** Migrate EAS signer key to secrets manager
5. **L3:** Audit and standardize error messages

### Phase 3: Medium-term (60 days)
6. **M2:** Investigate nonce-based CSP for Next.js
7. **L1:** Add atomic user activation tracking
8. **L2:** Document CSRF protection approach

### Phase 4: Ongoing
- Regular dependency audits (monthly)
- Monitor rate limit bypass attempts
- Review new endpoint additions for security patterns

---

## Appendix: Files Reviewed

**Core Security:**
- `middleware.ts` - Clerk auth, forensic headers, cookie management
- `lib/admin-auth.ts` - Timing-safe admin token validation
- `lib/rate-limit.ts` - In-memory rate limiting
- `lib/validation.ts` - UNSAFE_PATTERN input sanitization
- `lib/api-utils.ts` - Standardized error responses

**Payment & Credits:**
- `app/api/credits/webhook/route.ts` - Stripe webhook handling
- `lib/credits.ts` - Credit economy, preauthorization, settlement
- `lib/stripe.ts` - Stripe client initialization
- `lib/tier.ts` - Subscription tier management

**Authentication:**
- `lib/byok.ts` - BYOK cookie encoding/decoding
- `lib/ip.ts` - Client IP resolution
- `lib/eas.ts` - Ethereum attestation signing

**API Routes:**
- `app/api/run-bout/route.ts` - Streaming bout execution
- `app/api/v1/bout/route.ts` - Synchronous bout API
- `app/api/agents/route.ts` - Agent creation
- `app/api/byok-stash/route.ts` - BYOK key stashing
- `app/api/admin/research-export/route.ts` - Research data export

**Infrastructure:**
- `lib/bout-engine.ts` - Bout validation and execution
- `lib/logger.ts` - Structured logging with sanitization
- `lib/env.ts` - Environment validation
- `db/schema.ts` - Database schema with constraints
- `next.config.ts` - Security headers, CSP

---

## Methodology

This audit was conducted through:
1. Static code analysis of all TypeScript source files
2. Dependency vulnerability scanning via `pnpm audit`
3. Configuration review (next.config.ts, middleware, env validation)
4. Database schema analysis for constraint enforcement
5. API route tracing for authentication and authorization flows
6. Secrets handling pattern analysis

The audit focused on the eight domains specified in the issue:
1. Authentication & Authorization
2. Input Validation & Injection
3. API Security
4. Secrets & Credentials
5. Data Exposure
6. Dependency Security
7. Business Logic
8. Infrastructure

---

*Report generated: 2026-03-12*
*Bead: PIT-19h*
