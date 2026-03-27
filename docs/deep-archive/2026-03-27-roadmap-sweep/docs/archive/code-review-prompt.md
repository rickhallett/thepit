# Exhaustive Codebase Review Prompt

> For an agent viewing The Pit codebase for the first time.

---

## Prompt

You are conducting an exhaustive review of **The Pit** — a real-time multi-agent AI debate arena. This is a production codebase preparing for public launch. Your review must cover all dimensions of engineering quality and product viability.

### Context

The Pit is a Next.js 16 monolith where:
- Users select AI agent lineups (preset or custom)
- Agents debate in real-time via streaming SSE
- Audience reacts, votes on winners, and shares replays
- All bout data feeds research on multi-agent persona dynamics
- Blockchain attestations (EAS on Base L2) provide provenance

**Stack:** Next.js 16, TypeScript (strict), Neon Postgres + Drizzle ORM, Anthropic Claude, Clerk auth, Stripe payments, Vercel hosting.

**CLI Toolchain:** Go binaries — pitctl (admin), pitforge (agent engineering), pitbench (cost analysis), pitlab (research), pitnet (blockchain).

### Entry Points

Read these files first to orient yourself:

```
README.md              # Project overview, quick start, stack
ARCHITECTURE.md        # System design, streaming protocol, data model
AGENTS.md              # Coding guidelines for AI contributors
ROADMAP.md             # Product roadmap (Platform, Community, Research tracks)
```

Each directory has its own README documenting local architecture:
- `app/README.md` — Routes, server actions, auth patterns
- `app/api/README.md` — 20 API endpoints, streaming engine
- `components/README.md` — 27 React components, composition hierarchy
- `lib/README.md` — 53 utility modules across 11 domains
- `db/README.md` — Schema (20 tables, 3 enums), data patterns
- `presets/README.md` — 22 debate presets, format spec
- `tests/README.md` — 88 test files, 668 passing tests, 85% coverage thresholds

---

## Review Dimensions

### A. Engineering Quality

#### A1. Architecture & System Design
- [ ] Is the monolith well-structured or becoming a big ball of mud?
- [ ] Are boundaries between domains clear (AI, credits, engagement, blockchain)?
- [ ] Is the streaming protocol robust? Edge cases handled?
- [ ] How does the system handle partial failures mid-bout?
- [ ] Is there clear separation between read and write paths?
- [ ] Are there any circular dependencies?

#### A2. Code Quality & Patterns
- [ ] Consistent coding style across the codebase?
- [ ] Appropriate use of TypeScript (strict mode, no `any` leaks)?
- [ ] Are abstractions at the right level (not over/under-engineered)?
- [ ] Code duplication — any candidates for extraction?
- [ ] Naming conventions clear and consistent?
- [ ] Dead code or unused exports?

#### A3. Type Safety
- [ ] Full TypeScript strict mode compliance?
- [ ] Zod schemas for runtime validation at boundaries?
- [ ] Database types properly inferred from Drizzle schema?
- [ ] API request/response types properly defined?
- [ ] Any `as` casts or type assertions that hide bugs?

#### A4. Testing
- [ ] Test coverage adequate? (Target: 85%)
- [ ] Unit tests for business logic?
- [ ] Integration tests for API routes?
- [ ] E2E tests for critical user journeys?
- [ ] Are tests testing behavior or implementation details?
- [ ] Mocking strategy appropriate?
- [ ] Edge cases covered (empty states, errors, timeouts)?

#### A5. Error Handling
- [ ] Errors caught and handled appropriately?
- [ ] User-facing error messages helpful without leaking internals?
- [ ] Streaming errors handled gracefully (client-side recovery)?
- [ ] Database errors (connection, constraint violations) handled?
- [ ] External service failures (Anthropic, Stripe, Clerk) handled?
- [ ] Consistent error response format across API?

#### A6. Security
- [ ] Auth checks on all protected routes?
- [ ] Input validation/sanitization at API boundaries?
- [ ] SQL injection prevention (parameterized queries)?
- [ ] XSS prevention in user-generated content?
- [ ] CSRF protection?
- [ ] Rate limiting on expensive operations?
- [ ] Secrets management (no hardcoded keys)?
- [ ] Admin endpoints properly protected?
- [ ] Credit system race conditions prevented?

#### A7. Performance
- [ ] Database queries optimized (indexes, N+1 prevention)?
- [ ] Streaming latency acceptable?
- [ ] Bundle size reasonable?
- [ ] Caching strategy for presets/agents?
- [ ] Connection pooling configured correctly for serverless?
- [ ] Any blocking operations in hot paths?

#### A8. Observability
- [ ] Logging adequate for debugging production issues?
- [ ] Structured logging or ad-hoc console.log?
- [ ] Error tracking integration (Sentry, etc.)?
- [ ] Analytics events for key user actions?
- [ ] Health check endpoints?
- [ ] Metrics for business KPIs (bouts, credits, engagement)?

#### A9. Database Design
- [ ] Schema normalized appropriately?
- [ ] Indexes on query patterns?
- [ ] Migrations reversible?
- [ ] Soft deletes vs hard deletes consistent?
- [ ] Timestamps (createdAt, updatedAt) present?
- [ ] Foreign key constraints enforced?
- [ ] Enum usage appropriate?

#### A10. API Design
- [ ] RESTful conventions followed?
- [ ] Consistent response shapes?
- [ ] Appropriate HTTP status codes?
- [ ] Pagination for list endpoints?
- [ ] Versioning strategy (if needed)?
- [ ] OpenAPI/Swagger documentation?

#### A11. DevOps & CI/CD
- [ ] CI pipeline runs lint, typecheck, tests?
- [ ] E2E tests in CI?
- [ ] Preview deployments for PRs?
- [ ] Environment variable management?
- [ ] Database migration strategy for deploys?
- [ ] Rollback capability?

#### A12. Documentation
- [ ] README accurate and complete?
- [ ] Architecture docs up to date?
- [ ] API documentation?
- [ ] Inline code comments where logic is complex?
- [ ] Contribution guidelines?
- [ ] Environment setup instructions work?

---

### B. Product Quality

#### B1. User Experience
- [ ] Onboarding flow clear for new users?
- [ ] Core loop (select -> watch -> react -> share) frictionless?
- [ ] Loading states and feedback appropriate?
- [ ] Error states helpful (not just "Something went wrong")?
- [ ] Mobile experience acceptable?
- [ ] Accessibility (a11y) basics covered?

#### B2. Feature Completeness
- [ ] Core features working end-to-end?
- [ ] Edge cases handled (empty states, first-time user)?
- [ ] Feature flags properly gating unreleased features?
- [ ] Any half-implemented features that should be hidden?

#### B3. Business Model
- [ ] Credit economy mechanics sound?
- [ ] Pricing aligned with costs (margin > 15%)?
- [ ] Subscription tiers properly differentiated?
- [ ] Payment flows working (Stripe integration)?
- [ ] Refund/dispute handling?

#### B4. Growth Mechanics
- [ ] Share flow optimized for virality?
- [ ] Referral system implemented?
- [ ] SEO basics (meta tags, OG images)?
- [ ] Social proof elements (reaction counts, winner votes)?

#### B5. Community Features
- [ ] Agent creation/cloning working?
- [ ] Moderation tools for flagging agents?
- [ ] User profiles?
- [ ] Leaderboards or discovery?

#### B6. Research Value
- [ ] Data collection for research goals working?
- [ ] Anonymization appropriate?
- [ ] Blockchain attestation flow working?
- [ ] Export capabilities for datasets?

---

### C. Go CLI Toolchain

Review each tool for:
- [ ] Consistent command structure across tools
- [ ] Error handling and user feedback
- [ ] Configuration management (shared/config)
- [ ] Database access patterns
- [ ] Test coverage

#### Tools:
- `pitctl` — Admin operations (status, users, credits, bouts, alerts, metrics)
- `pitforge` — Agent engineering (validate, lint, hash, spar, evolve)
- `pitbench` — Cost analysis (estimates, margin checks)
- `pitlab` — Research analysis (survival, position bias, engagement)
- `pitnet` — Blockchain (EAS attestation, verification)

---

## Deliverables

Produce a structured report with:

### 1. Executive Summary
- Overall assessment (Ready for launch? Critical blockers?)
- Top 3 strengths
- Top 3 risks

### 2. Critical Issues (P0)
Issues that must be fixed before launch:
- Security vulnerabilities
- Data loss risks
- Broken core functionality

### 3. High Priority Issues (P1)
Issues that should be fixed soon after launch:
- Performance problems
- UX friction
- Missing error handling

### 4. Medium Priority Issues (P2)
Technical debt to address:
- Code quality improvements
- Missing tests
- Documentation gaps

### 5. Low Priority Issues (P3)
Nice-to-haves:
- Refactoring opportunities
- Future-proofing suggestions

### 6. Dimension Scores
Rate each dimension (A1-A12, B1-B6, C) on a scale:
- **Strong** — Production ready, well-implemented
- **Adequate** — Works but has gaps
- **Weak** — Needs significant work

### 7. Recommendations
Prioritized action items with estimated effort.

---

## Approach

1. **Orientation (30 min)** — Read entry point docs, understand architecture
2. **Breadth pass (2 hr)** — Skim all directories, identify patterns and red flags
3. **Depth pass (4 hr)** — Deep dive into critical paths:
   - Bout streaming (`app/api/run-bout/`)
   - Credit system (`lib/credits.ts`)
   - Auth flow (`middleware.ts`, Clerk integration)
   - Database schema (`db/schema.ts`)
4. **Tool review (1 hr)** — Review Go CLI tools
5. **Synthesis (1 hr)** — Write report

---

## Notes for the Reviewer

- This is a **pre-launch review** — prioritize blockers over polish
- The codebase has been through prior reviews — check `docs/` for history
- 668 tests exist — trust but verify coverage claims
- The streaming protocol is custom — scrutinize `lib/use-bout.ts` and the bout engine
- Credit race conditions are a known risk area — verify atomic operations
- BYOK (bring your own key) flow stores keys in HTTP-only cookies — verify security
