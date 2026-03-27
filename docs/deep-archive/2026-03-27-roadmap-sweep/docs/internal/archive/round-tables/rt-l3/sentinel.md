# RT L3 — Sentinel Report
Date: 2026-02-24
Agent: Sentinel
Statement presentation order: A, B, C

## Pre-Launch Recommendations

These recommendations are grounded in what I can verify in the codebase, not in inherited assessments from L1 or L2. I am looking with both eyes open, but through a security lens.

### 1. Attestation Messaging Discipline — CRITICAL (pre-launch)

The single highest-risk security failure at launch is not technical — it is linguistic. If any public-facing copy uses the words "trusted," "secure," or "verified" without qualification, the project creates a liability that no amount of code quality can offset. The attestation layer proves identity and configuration integrity. It does not prove behaviour, safety, or trustworthiness. The emergency briefing I previously authored (2026-02-22) provides the exact word list: use "accountable," "verifiable," "tamper-evident," "on-chain provenance." Avoid "trustworthy," "secure," "verified" without qualifier. This is the difference between a defensible claim and a target. Verify all launch copy against this list before posting.

### 2. Security Headers Are Properly Configured — No Action Required

The `next.config.ts` implements a complete and well-constructed security header suite: CSP with restrictive default-src, X-Frame-Options DENY, HSTS with preload, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy disabling camera/mic/geo, and frame-ancestors 'none'. This is above-average for any web application, let alone a solo-dev Show HN. No changes needed.

### 3. Rate Limiting: Honest Limitations Are Already Documented — Low Risk

The in-memory rate limiter (`lib/rate-limit.ts`) openly documents its limitation: per-instance state in serverless means a determined attacker can bypass by hitting different instances. However, the code also documents the correct mitigation: DB-level constraints serve as the authoritative enforcement layer. Rate limiting is best-effort load reduction. This is honest, correct architecture. The rate limiter covers reactions, contact, newsletter, short-links, winner-vote, bout runs, agent creation, and the Ask The Pit endpoint. Coverage is comprehensive. For launch, this is adequate. For scale, migrate to Upstash Redis — but that is a post-traction concern, not a launch blocker.

### 4. Input Validation and Prompt Injection Mitigation — Adequate

The `lib/xml-prompt.ts` module implements structural XML escaping for user-supplied content in prompts, with clear documentation that structural instructions use unescaped tags while user content is escaped. The `lib/validation.ts` provides sanitization for free-text input. The `lib/agent-prompts.ts` references prompt injection resistance. The QA suite includes dedicated security tests for injection (`qa/tests/security/injection.ts`), auth bypass (`auth-bypass.ts`), and IDOR (`idor.ts`). This is a meaningful security testing posture — most projects at this stage have none.

### 5. Environment Variable Handling — Well-Architected

`lib/env.ts` uses Zod schema validation with fail-fast in production (process crashes on missing required vars) and graceful degradation in dev/test. Sensitive keys (EAS_SIGNER_PRIVATE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) are optional fields — they are not loaded unless their respective features are enabled. The logger (`lib/logger.ts`) includes a sanitize function that strips sensitive data from log output. No `.env` files are committed. This is correct.

### 6. EAS Signer Key Management — Post-Launch Concern

The EAS signer private key loads from an environment variable. This is adequate for current scale. For production at scale, HSM-backed signing (AWS KMS, GCP Cloud KMS) would be the appropriate upgrade path. This is not a launch blocker — it is a maturity milestone. The key should be rotated if there is any suspicion of exposure, and the attester address should be monitored for unexpected transactions. Document the rotation procedure before it is needed.

### 7. Revocation Status Visibility — Verify Before Launch

EAS attestations are marked `Revocable: true`. Verify that `pitnet verify` and `pitnet proof` clearly surface revocation status in their output. A revoked attestation presented as valid is a credibility-destroying failure mode. This is a 15-minute verification task.

### 8. RPC Endpoint Single Point of Trust — Acceptable for Launch

`pitnet` defaults to `https://mainnet.base.org` for on-chain queries. A compromised or stale RPC endpoint would produce unreliable verification results. Multi-RPC fallback is the correct long-term solution. For launch: acceptable. The RPC endpoint risk is shared by every dApp on Base — it is not a novel risk unique to this project.

### 9. CORS Is Not Configured — This Is Correct

No CORS headers are present in the codebase. For a Next.js application with same-origin API routes, this is the correct default. The API routes are consumed by the application's own frontend. If a public API is exposed later, CORS should be deliberately configured at that point.

### 10. Consent Gating for Analytics — Privacy-Correct

The middleware (`middleware.ts`) gates analytics cookies (session, UTM, page views) on explicit consent (`pit_consent === 'accepted'`). Essential cookies (referral attribution, auth) are always set. This is GDPR-aware implementation that most solo-dev projects skip entirely.

### 11. Cryptographic Parity Testing — Differentiator

The `pitnet` Go codebase includes ABI parity tests against the official EAS SDK, crypto integrity tests, and integration tests against live Base mainnet. Cross-language cryptographic correctness (TypeScript attestation creation + Go verification) with test coverage is genuinely rare. This is the most defensible technical claim in the project's security story.

### Summary Assessment

The security posture is sound for launch. The codebase demonstrates consistent security thinking — not bolted-on security theatre, but architectural security decisions (CSP, env validation, input escaping, rate limiting with honest limitations, consent gating, log sanitization). The only CRITICAL pre-launch action is messaging discipline on attestation claims. Everything else is either already adequate or is a documented post-launch maturity milestone.

**Launch readiness from Sentinel: GREEN.**

## Strategic Framing — Rank Order

1st: B — "Ship over polish." From a security perspective, the window of relevance matters. The agentic internet's identity vacuum is being discussed right now. A working, honestly-caveated provenance implementation deployed into that conversation is a security contribution to the field. Delay does not improve the security posture — the code is sound. Delay only narrows the window where the contribution matters.

2nd: C — "The practice is the value." The security engineering demonstrated in this project — CSP configuration, Zod env validation, XML prompt escaping, consent-gated analytics, cross-language crypto parity testing, QA security suite — represents real, transferable security engineering skill. The process of building this produced genuine security competence that applies to any future system. If the project itself doesn't achieve market traction, the security methodology is still an asset.

3rd: A — "Polish for recruiters." Security engineering is not evaluated by polish. It is evaluated by threat models, test coverage, and architectural decisions — all of which are already present. Additional surface-level polish would not change a security-literate evaluator's assessment. And a recruiter who cannot read the existing security posture would not be improved by cosmetic changes.
