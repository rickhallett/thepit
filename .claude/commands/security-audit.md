# Security Audit

Systematic security review of THE PIT codebase. Verify authentication, authorization, input validation, rate limiting, credit safety, and prompt injection defenses across all API routes and shared libraries. Produce findings, fixes, and a severity-ranked report.

## Usage

```
/security-audit                          # Full audit across all surfaces
/security-audit "api routes"             # Focus on API route handlers
/security-audit "credits"                # Focus on credit/payment security
/security-audit "prompts"                # Focus on XML prompt injection defenses
/security-audit "middleware"             # Focus on middleware and headers
/security-audit "new"                    # Audit only files changed since last audit
```

The argument `$ARGUMENTS` filters the audit scope. If empty, run the full review.

<principles>
  <principle>Defense in depth. Never rely on a single layer. Database constraints back application logic. Rate limits back auth checks. XML escaping backs input validation.</principle>
  <principle>Verify, do not trust. Read the actual code path. Check that auth() is called, not just imported. Check that the rate limit window matches the documented value.</principle>
  <principle>Atomic operations for financial data. Credit preauthorization and settlement must use conditional SQL (WHERE balance >= amount), never SELECT-then-UPDATE.</principle>
  <principle>Timing-safe comparisons for secrets. Use crypto.timingSafeEqual() for token/key comparison, never === or ==.</principle>
  <principle>Escape at the boundary. User content entering LLM prompts must pass through xmlEscape() at the point of embedding, not before or after.</principle>
  <principle>Fail closed. When in doubt, deny. Missing auth check = vulnerability. Missing rate limit = vulnerability. Missing input validation = vulnerability.</principle>
</principles>

<process>
  <phase name="Establish Security Baseline" number="1">
    <description>Gather the current security posture before auditing.</description>
    <commands>
```bash
# Run existing security tests
pnpm run qa:security 2>&1 | tail -30

# Check dependency vulnerabilities
pnpm audit --audit-level=high 2>&1

# List all API routes (attack surface inventory)
find app/api -name 'route.ts' | sort

# Check security headers
cat next.config.ts | grep -A 20 'headers'

# Check middleware
wc -l middleware.ts
grep -c 'auth\|rate\|cookie\|request' middleware.ts

# Check rate limit configuration
grep -A 5 'checkRateLimit' lib/rate-limit.ts | head -20

# List security test files
find tests -path '*security*' -o -name '*auth*' | sort
find qa/tests -name 'SEC-*' 2>/dev/null | sort

# Check xmlEscape coverage
grep -rn 'xmlEscape' lib/ app/ --include='*.ts' | grep -v node_modules

# Check admin authorization
grep -rn 'isAdmin' lib/ app/ --include='*.ts'

# Previous audit results (if available)
cat .security-audit/summary.md 2>/dev/null
```
    </commands>
    <critical>Record all results. These form the baseline for comparison.</critical>
  </phase>

  <phase name="API Route Audit" number="2">
    <description>For every file matching app/api/*/route.ts, verify the security checklist.</description>

    <checklist>
      <item id="AUTH">Authentication: Does it call auth() from @clerk/nextjs/server? If public, is that intentional?</item>
      <item id="AUTHZ">Authorization: If admin-only, does it check isAdmin(userId)? Is the admin allowlist in lib/admin.ts?</item>
      <item id="RATE">Rate limiting: Does it call checkRateLimit() with an appropriate window? Does the window match documentation?</item>
      <item id="INPUT">Input validation: Are all user inputs length-checked and type-validated? Are Zod schemas used?</item>
      <item id="INJECT">Injection: Are text inputs checked against UNSAFE_PATTERN? Are SQL inputs parameterized?</item>
      <item id="XML">XML safety: Are user-supplied values passed through xmlEscape() before embedding in LLM prompts?</item>
      <item id="ERROR">Error responses: Do errors use standardized JSON format ({ error: message }) without leaking internal details?</item>
      <item id="STATUS">Status codes: 400 validation, 401 unauthed, 402 payment, 403 forbidden, 429 rate limited?</item>
      <item id="LOG">Logging: Does it use withLogging() wrapper for observability?</item>
      <item id="CREDIT">Credit operations: If touching credits, is the SQL atomic (conditional UPDATE, not SELECT+UPDATE)?</item>
    </checklist>

    <method>
      For each route, read the handler function end-to-end. Check imports at the top.
      Trace the data flow from request body/params through validation to response.
      Mark each checklist item as PASS, FAIL, or N/A.
    </method>
  </phase>

  <phase name="Middleware and Headers Audit" number="3">
    <description>Verify middleware.ts and next.config.ts security configuration.</description>

    <checks>
      <check name="Security Headers">
        Verify these headers are set in next.config.ts:
        - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
        - X-Content-Type-Options: nosniff
        - X-Frame-Options: DENY
        - Referrer-Policy: strict-origin-when-cross-origin
        - Permissions-Policy: camera=(), microphone=(), geolocation=()
      </check>
      <check name="Request ID">Verify middleware generates request IDs using nanoid(12).</check>
      <check name="Referral Cookie">Verify referral cookie validation uses regex /^[A-Za-z0-9_-]{1,32}$/ and only sets if none exists.</check>
      <check name="Auth Wrapping">Verify Clerk middleware wrapping is applied to protected routes.</check>
    </checks>
  </phase>

  <phase name="Credit and Payment Security" number="4">
    <description>Audit the financial safety of the credit system.</description>

    <checks>
      <check name="Preauthorization" file="lib/credits.ts">
        Verify preauthorizeCredits uses atomic SQL: UPDATE WHERE balance >= amount.
        No separate SELECT then UPDATE.
      </check>
      <check name="Settlement" file="lib/credits.ts">
        Verify settleCredits uses GREATEST(0, ...) floor to prevent negative balances.
      </check>
      <check name="Stripe Webhook" file="app/api/credits/webhook/route.ts">
        Verify stripe.webhooks.constructEvent() is used for signature verification.
        Verify raw body is passed (not parsed JSON).
      </check>
      <check name="BYOK Key Security" file="app/api/byok-stash/route.ts">
        Verify cookie flags: httpOnly, sameSite strict, 60s TTL, path-scoped to /api/run-bout.
        Verify delete-after-read pattern.
      </check>
      <check name="Admin Credit Grant" file="app/api/admin/seed-agents/route.ts">
        Verify crypto.timingSafeEqual() with length pre-check for token comparison.
      </check>
    </checks>
  </phase>

  <phase name="Prompt Injection Audit" number="5">
    <description>Verify XML prompt safety across the LLM integration.</description>

    <checks>
      <check name="xmlEscape Coverage" file="lib/xml-prompt.ts">
        Verify xmlEscape() covers all 5 XML-special characters: &amp; → &amp;amp;, &lt; → &amp;lt;, &gt; → &amp;gt;, " → &amp;quot;, ' → &amp;apos;
      </check>
      <check name="User Content Escaping">
        Trace every path where user content enters a prompt. Verify xmlEscape() is applied:
        - topic (from /api/run-bout request body)
        - agent fields (name, archetype, tone, quirks from database)
        - transcript history (previous turns)
      </check>
      <check name="Safety Preamble">
        Verify buildSystemMessage() includes the safety XML tag wrapping safety preamble.
      </check>
      <check name="Legacy Prompt Compatibility" file="lib/xml-prompt.ts">
        Verify wrapPersona() auto-detects legacy plain-text prompts and wraps them in persona/instructions tags.
      </check>
      <check name="Preset Prompts">
        Verify preset JSON files store pre-wrapped XML in system_prompt fields.
        Spot-check 2-3 presets for correct tag structure.
      </check>
    </checks>
  </phase>

  <phase name="Rate Limit Audit" number="6">
    <description>Verify rate limiting configuration matches documentation and threat model.</description>

    <expected-limits>
      <limit endpoint="/api/run-bout" auth="authenticated" value="5" window="1 hour" identifier="userId" />
      <limit endpoint="/api/run-bout" auth="anonymous" value="2" window="1 hour" identifier="IP" />
      <limit endpoint="/api/agents" auth="authenticated" value="10" window="1 hour" identifier="userId" />
      <limit endpoint="/api/reactions" auth="any" value="30" window="1 minute" identifier="IP" />
      <limit endpoint="/api/contact" auth="any" value="5" window="1 hour" identifier="IP" />
      <limit endpoint="/api/newsletter" auth="any" value="5" window="1 hour" identifier="IP" />
      <limit endpoint="/api/ask-the-pit" auth="any" value="5" window="1 minute" identifier="IP" />
    </expected-limits>

    <method>
      For each endpoint, read the checkRateLimit() call and verify the limit value, window duration,
      and identifier match the expected values above. Flag any discrepancies.
    </method>

    <known-limitation>
      In-memory rate limiter — each Vercel serverless instance has independent state.
      Database constraints (unique indexes, atomic updates) are the authoritative enforcement layer.
    </known-limitation>
  </phase>

  <phase name="Dependency Audit" number="7">
    <description>Check for known vulnerabilities in dependencies.</description>
    <commands>
```bash
# npm/pnpm audit
pnpm audit --audit-level=high

# Check for outdated security-critical packages
pnpm outdated @clerk/nextjs stripe @sentry/nextjs 2>/dev/null
```
    </commands>
  </phase>

  <phase name="Categorize and Fix" number="8">
    <description>Categorize all findings by severity and apply fixes.</description>

    <severity-levels>
      <level name="CRITICAL" action="Block release">Authentication bypass, credit theft, key exposure, SQL injection</level>
      <level name="HIGH" action="Fix before release">Missing auth on sensitive route, rate limit bypass, improper error disclosure</level>
      <level name="MEDIUM" action="Fix within sprint">Missing input validation on non-sensitive field, inconsistent error format, stale security header</level>
      <level name="LOW" action="Backlog">Missing rate limit on low-risk endpoint, cosmetic security header improvement</level>
    </severity-levels>

    <steps>
      <step>Fix all CRITICAL findings immediately — these are non-negotiable</step>
      <step>Fix HIGH findings next</step>
      <step>Fix MEDIUM findings if time permits</step>
      <step>Log LOW findings for future work</step>
      <step>For each fix, write or update a test in tests/api/security-*.test.ts or tests/integration/security/</step>
    </steps>
  </phase>

  <phase name="Verify" number="9">
    <commands>
```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run qa:security
```
    </commands>
    <rule>All must pass. Security fixes must not break existing functionality.</rule>
  </phase>

  <phase name="Output Report" number="10">
    <output-format>
```
═══════════════════════════════════════════════════════════════════
  SECURITY AUDIT REPORT
  Repository: tspit (THE PIT)
  Date: <today>
  Scope: <full / filtered>
═══════════════════════════════════════════════════════════════════

ATTACK SURFACE INVENTORY
─────────────────────────
  API routes:          <N>
  Authenticated:       <N>
  Admin-only:          <N>
  Public:              <N>
  Rate-limited:        <N>/<N>

SECURITY BASELINE
─────────────────
  Security tests:      <N> passing
  Dependency vulns:    <N> high / <N> critical
  Security headers:    <N>/<N> configured

FINDINGS BY SEVERITY
────────────────────

[CRITICAL] <file>:<line> — <description>
  Risk: <what an attacker could do>
  Fix:  <what was changed>
  Test: <test file added/updated>

[HIGH] <file>:<line> — <description>
  Risk: <what an attacker could do>
  Fix:  <what was changed>
  Test: <test file added/updated>

[MEDIUM] <file>:<line> — <description>
  Risk: <what an attacker could do>
  Fix:  <what was changed>

[LOW] <file>:<line> — <description>
  Risk: <what an attacker could do>
  Recommendation: <what should be done>

ROUTE AUDIT MATRIX
──────────────────
  Route | AUTH | AUTHZ | RATE | INPUT | INJECT | XML | ERROR | LOG | CREDIT
  ──────┼──────┼───────┼──────┼───────┼────────┼─────┼───────┼─────┼───────
  /api/run-bout  | PASS | N/A | PASS | ... | ... | ... | ... | ... | PASS
  /api/agents    | PASS | N/A | PASS | ... | ... | ... | ... | ... | N/A
  ...

STATISTICS
──────────
  Total findings:      <N>
  Critical:            <N>
  High:                <N>
  Medium:              <N>
  Low:                 <N>
  Fixed this audit:    <N>
  Tests added:         <N>
  Routes audited:      <N>/<N>

═══════════════════════════════════════════════════════════════════
```
    </output-format>
  </phase>
</process>

<scope>
  <in-scope>
    <item>All API route handlers (app/api/*/route.ts)</item>
    <item>Middleware (middleware.ts)</item>
    <item>Security headers (next.config.ts)</item>
    <item>Credit system (lib/credits.ts)</item>
    <item>Rate limiting (lib/rate-limit.ts)</item>
    <item>Admin authorization (lib/admin.ts)</item>
    <item>XML prompt safety (lib/xml-prompt.ts)</item>
    <item>Stripe integration (lib/stripe.ts, app/api/credits/webhook/route.ts)</item>
    <item>BYOK key handling (app/api/byok-stash/route.ts)</item>
    <item>Security tests (tests/api/security-*.test.ts, tests/integration/security/)</item>
    <item>QA security framework (qa/tests/SEC-*, qa/scripts/security-scan.ts)</item>
    <item>Environment variable security (.env.example — no secrets committed)</item>
  </in-scope>

  <out-of-scope>
    <item>Third-party service security (Clerk, Stripe, Neon, Vercel) — audit integration points only</item>
    <item>Frontend client-side code — not a security boundary</item>
    <item>Go CLI tools — separate audit scope</item>
    <item>Infrastructure/deployment security (Vercel settings, DNS, SSL) — not in codebase</item>
    <item>Social engineering or phishing vectors</item>
  </out-of-scope>
</scope>

<constraints>
  <constraint>Never log, print, or expose API keys, tokens, or user credentials during the audit</constraint>
  <constraint>Never weaken existing security controls to fix a different issue</constraint>
  <constraint>Never use === or == for secret/token comparison — always crypto.timingSafeEqual()</constraint>
  <constraint>Never skip writing a regression test for a security fix</constraint>
  <constraint>Never rely on client-side validation as a security boundary</constraint>
  <constraint>Never use application-level locks for financial operations — use atomic SQL</constraint>
  <constraint>Do not run security scans against production endpoints without explicit approval</constraint>
</constraints>

<edge-cases>
  <case trigger="Route has no auth check but appears intentionally public">Check if the route serves static/public data (health, openapi). If yes, mark as N/A with justification. If it returns user data, flag as CRITICAL.</case>
  <case trigger="Rate limit exists but uses in-memory store">Flag as known limitation (not a finding). Verify database constraints provide the authoritative enforcement layer.</case>
  <case trigger="XML escaping is applied but in the wrong layer">Flag as HIGH. Escaping must happen at the boundary where user content enters the prompt, not earlier (data corruption risk) or later (injection risk).</case>
  <case trigger="Legacy agent prompt in database lacks XML wrapping">Verify wrapPersona() handles it. If the function auto-wraps, this is safe. If not, flag as MEDIUM.</case>
  <case trigger="New dependency introduces a vulnerability">Check if the vulnerability is reachable from the application's code paths. If not reachable, flag as LOW. If reachable, flag based on actual impact.</case>
  <case trigger="Security scan requires running server">Use pnpm run qa:security for tests that can run without a server. Use pnpm run security:scan with --target flag only against local or staging URLs.</case>
</edge-cases>
