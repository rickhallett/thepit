# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately via email:

**kai@oceanheart.ai**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment

We aim to acknowledge reports within 48 hours and provide a fix or mitigation plan within 7 days for confirmed issues.

Do **not** open public GitHub issues for security vulnerabilities.

## Security Architecture

THE PIT uses defense-in-depth across multiple layers:

**Authentication & Authorization.** All API routes require authentication via [Clerk](https://clerk.com). Admin endpoints use an allowlist of user IDs checked via `isAdmin()`. The admin seed endpoint uses `crypto.timingSafeEqual()` for token comparison to prevent timing attacks. Rate limiting is applied per-endpoint with sliding windows (in-memory per instance, with database constraints as the authoritative enforcement layer).

**Data Integrity & Financial Safety.** Credit operations (preauthorization, settlement, grants) use atomic SQL with conditional `UPDATE ... WHERE balance >= amount` to prevent race conditions and double-spend. Settlement uses `GREATEST(0, ...)` to enforce a zero floor. Bout deduplication prevents double-runs via idempotency checks on existing transcripts. All Stripe webhook events are verified via `stripe.webhooks.constructEvent()` signature verification.

**Prompt Injection & XSS Prevention.** All user-supplied content embedded in LLM prompts passes through `xmlEscape()`, which encodes the five XML-special characters (`&`, `<`, `>`, `"`, `'`). System prompts use structured XML tags (`<safety>`, `<persona>`, `<format>`) to separate trusted instructions from user content. Agent creation validates all fields against an `UNSAFE_PATTERN` regex to block injection attempts.

**BYOK Key Lifecycle.** Bring-Your-Own-Key API keys are stored in httpOnly, sameSite=strict cookies with a 60-second TTL, scoped to the `/api/run-bout` path, and deleted after first read.

## Accepted Transitive Dependency Risks

The following vulnerabilities exist in deep transitive dependencies and cannot be resolved without replacing upstream packages. They are dev-time or build-time only and do not affect the production runtime attack surface.

| Package | Severity | Via | Notes |
|---------|----------|-----|-------|
| `serialize-javascript` <=7.0.2 | high | `eas-sdk > hardhat > mocha` | Build-time only. EAS SDK bundles hardhat which pins old mocha. |
| `esbuild` <=0.24.2 | moderate | `drizzle-kit > @esbuild-kit` | Dev-time CLI tool only. Dev server vulnerability not exploitable in production. |
| `undici` <6.23.0 | moderate | `eas-sdk > hardhat` | Build-time only. Not used in application HTTP stack. |
| `ajv` <6.14.0 | moderate | `eslint` | Dev-time linter only. ReDoS requires `$data` option which is not used. |
| `ajv` <8.18.0 | moderate | `@sentry/nextjs > webpack > schema-utils` | Build-time only. ReDoS requires `$data` option. |
| `bn.js` <4.12.3, <5.2.3 | moderate | `eas-sdk > hardhat > @ethersproject` | Build-time only. Infinite loop requires crafted input. |
| `cookie` <0.7.0 | low | `eas-sdk > hardhat > @sentry/node` | Build-time transitive. Application uses Next.js cookie APIs directly. |
| `tmp` <=0.2.3 | low | `eas-sdk > hardhat > solc` | Build-time only. Symlink attack requires local filesystem access. |
| `elliptic` <=6.6.1 | low | `eas-sdk > hardhat > @ethersproject` | Build-time only. No patch available (`<0.0.0`). Application uses `ethers` v6 directly. |

**Mitigation strategy:** The `@ethereum-attestation-service/eas-sdk` dependency tree is the source of 7/10 remaining advisories. The EAS feature is gated behind `EAS_ENABLED` (default: false) and the SDK is only imported when the feature is active. These transitive deps do not execute in the critical request path.

Last reviewed: 2026-02-28
