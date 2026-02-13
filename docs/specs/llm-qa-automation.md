# LLM QA Automation System

## Specification Document

```yaml
---
version: "1.0.0"
created: "2026-02-13"
status: "draft"
author: "claude"
branch: "feature/llm-qa-automation"
---
```

## 1. Overview

### 1.1 Problem Statement

THE PIT has 182 user stories requiring QA validation. Manual testing is time-consuming and error-prone. Analysis shows 82% of stories are automatable by an LLM with appropriate tooling.

### 1.2 Solution

Build a QA automation framework that enables an LLM (Claude) to run test scenarios using:
- **Playwright MCP** for browser-based UI testing
- **CLI tools** (curl, database queries) for API testing
- **Structured test definitions** parsed from qa-report.md

### 1.3 Goals

1. Automate 149/182 test cases (82%)
2. Generate machine-readable test results
3. Update qa-report.md with test outcomes
4. Integrate with CI/CD pipeline (optional)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    QA Automation System                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  QA Report   │───▶│ Test Runner  │───▶│   Results    │  │
│  │   Parser     │    │   (LLM)      │    │   Writer     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ qa-report.md │    │  Tool Layer  │    │ qa-report.md │  │
│  │   (input)    │    │              │    │  (updated)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                             │                               │
│              ┌──────────────┼──────────────┐               │
│              ▼              ▼              ▼               │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│       │Playwright│   │   CLI    │   │ Database │          │
│       │   MCP    │   │  (curl)  │   │  Client  │          │
│       └──────────┘   └──────────┘   └──────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
qa/
├── README.md                 # QA automation documentation
├── config.ts                 # Configuration (base URLs, credentials)
├── runner.ts                 # Main test runner orchestration
├── parser.ts                 # QA report markdown parser
├── writer.ts                 # Results writer (updates qa-report.md)
├── fixtures/
│   ├── accounts.ts           # Test account definitions
│   └── seeds.ts              # Database seed data
├── tests/
│   ├── navigation.ts         # NAV-* test implementations
│   ├── auth.ts               # AUTH-* test implementations
│   ├── home.ts               # HOME-* test implementations
│   ├── arena.ts              # ARENA-* test implementations
│   ├── bout.ts               # BOUT-* test implementations
│   ├── custom.ts             # CUSTOM-* test implementations
│   ├── agents.ts             # AGENT-* test implementations
│   ├── leaderboard.ts        # LEADER-* test implementations
│   ├── research.ts           # RESEARCH-* test implementations
│   ├── feedback.ts           # FEEDBACK-* test implementations
│   ├── contact.ts            # CONTACT-* test implementations
│   ├── credits.ts            # CREDIT-* test implementations
│   └── api.ts                # API-* test implementations
├── utils/
│   ├── browser.ts            # Playwright helper functions
│   ├── api.ts                # HTTP request helpers
│   ├── db.ts                 # Database query helpers
│   └── assertions.ts         # Custom assertion helpers
└── results/
    └── .gitkeep              # Test result artifacts
```

---

## 3. Test Definition Format

### 3.1 Parsed Test Structure

```typescript
interface QATest {
  id: string;                    // e.g., "NAV-001"
  category: string;              // e.g., "1. Navigation & Layout"
  description: string;           // User story text
  expected: string;              // Expected behavior
  status: {
    qa: 'tested' | 'untested';
    func: 'working' | 'unverified';
    broken: 'broken' | 'ok';
  };
  automationTier: 'api' | 'browser' | 'partial' | 'human';
}
```

### 3.2 Test Implementation Interface

```typescript
interface TestImplementation {
  id: string;
  tier: 'api' | 'browser' | 'partial' | 'human';
  setup?: () => Promise<void>;
  run: (ctx: TestContext) => Promise<TestResult>;
  teardown?: () => Promise<void>;
}

interface TestContext {
  browser: PlaywrightPage;       // Playwright MCP page
  api: HttpClient;               // fetch wrapper
  db: DatabaseClient;            // Drizzle client
  config: QAConfig;              // URLs, credentials
}

interface TestResult {
  passed: boolean;
  error?: string;
  screenshots?: string[];
  duration: number;
  evidence: string;              // What was verified
}
```

---

## 4. Implementation Plan

### Phase 1: Foundation (8 tasks)

**Goal:** Build core infrastructure

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Create QA directory structure | `qa/**` |
| 1.2 | Implement QA report parser | `qa/parser.ts` |
| 1.3 | Implement results writer | `qa/writer.ts` |
| 1.4 | Create configuration module | `qa/config.ts` |
| 1.5 | Build test runner skeleton | `qa/runner.ts` |
| 1.6 | Add npm scripts | `package.json` |
| 1.7 | Create test fixtures | `qa/fixtures/*.ts` |
| 1.8 | Write documentation | `qa/README.md` |

### Phase 2: Browser Testing (118 tests)

**Goal:** Implement Playwright-based UI tests

| Task | Description | Tests |
|------|-------------|-------|
| 2.1 | Navigation tests | NAV-001 to NAV-008 (8) |
| 2.2 | Home page tests | HOME-001 to HOME-011 (11) |
| 2.3 | Arena page tests | ARENA-001 to ARENA-024 (24) |
| 2.4 | Bout streaming tests | BOUT-001 to BOUT-023 (23) |
| 2.5 | Custom arena tests | CUSTOM-001 to CUSTOM-010 (10) |
| 2.6 | Agent tests | AGENT-001 to AGENT-025 (25) |
| 2.7 | Leaderboard tests | LEADER-001 to LEADER-009 (9) |
| 2.8 | Research tests | RESEARCH-001 to RESEARCH-005 (5) |
| 2.9 | Feedback tests | FEEDBACK-001 to FEEDBACK-009 (9) |
| 2.10 | Contact tests | CONTACT-001 to CONTACT-005 (5) |

### Phase 3: API Testing (23 tests)

**Goal:** Implement HTTP-based API tests

| Task | Description | Tests |
|------|-------------|-------|
| 3.1 | Bout API tests | API-001 to API-003 (3) |
| 3.2 | Agent API tests | API-004 to API-006 (3) |
| 3.3 | Reactions API tests | API-007 to API-008 (2) |
| 3.4 | Winner vote API tests | API-009 to API-010 (2) |
| 3.5 | Feature requests API tests | API-011 to API-013 (3) |
| 3.6 | Contact/newsletter API tests | API-014 to API-015 (2) |
| 3.7 | Short links API tests | API-016 to API-017 (2) |
| 3.8 | Research API tests | API-018 to API-019 (2) |
| 3.9 | Health/docs API tests | API-020 to API-021 (2) |
| 3.10 | Webhook tests | API-022 to API-023 (2) |

### Phase 4: Auth & Credits (24 tests)

**Goal:** Implement tests requiring account state

| Task | Description | Tests |
|------|-------------|-------|
| 4.1 | Auth flow tests | AUTH-001 to AUTH-013 (13) |
| 4.2 | Credit display tests | CREDIT-001 to CREDIT-005 (5) |
| 4.3 | Credit consumption tests | CREDIT-010 to CREDIT-012 (3) |
| 4.4 | Document human-required tests | CREDIT-006/007, AUTH-004, etc. |

### Phase 5: CI Integration (Optional)

**Goal:** Run tests in GitHub Actions

| Task | Description |
|------|-------------|
| 5.1 | Create GitHub Action workflow |
| 5.2 | Set up test database seeding |
| 5.3 | Configure Playwright in CI |
| 5.4 | Add result artifact upload |

---

## 5. Test Implementation Examples

### 5.1 Navigation Test (NAV-001)

```typescript
// qa/tests/navigation.ts

const NAV_001: TestImplementation = {
  id: 'NAV-001',
  tier: 'browser',
  async run(ctx) {
    // Navigate to home
    await ctx.browser.navigate('/')

    // Take snapshot
    const snapshot = await ctx.browser.snapshot()

    // Verify logo present and links to home
    const logo = snapshot.findByRole('link', { name: /the pit/i })
    assert(logo, 'Logo not found')
    assert(logo.href === '/', 'Logo does not link to home')

    // Click logo from another page
    await ctx.browser.navigate('/arena')
    await ctx.browser.click({ ref: logo.ref })

    // Verify navigation
    const url = await ctx.browser.url()
    assert(url === '/', 'Did not navigate to home')

    return { passed: true, evidence: 'Logo visible and navigates to /' }
  }
}
```

### 5.2 API Test (API-001)

```typescript
// qa/tests/api.ts

const API_001: TestImplementation = {
  id: 'API-001',
  tier: 'api',
  async run(ctx) {
    // Create a bout first
    const bout = await ctx.db.query.bouts.findFirst({
      where: eq(bouts.status, 'running')
    })

    // Stream the bout via fetch
    const response = await fetch(`${ctx.config.baseUrl}/api/run-bout`, {
      method: 'POST',
      body: JSON.stringify({ boutId: bout.id })
    })

    assert(response.status === 200, 'Expected 200 status')
    assert(
      response.headers.get('content-type')?.includes('text/event-stream'),
      'Expected event stream content type'
    )

    return { passed: true, evidence: 'SSE stream contains expected events' }
  }
}
```

### 5.3 Human-Required Test (AUTH-004)

```typescript
// qa/tests/auth.ts

const AUTH_004: TestImplementation = {
  id: 'AUTH-004',
  tier: 'human', // Cannot automate real OAuth
  async run() {
    return {
      passed: false,
      error: 'HUMAN_REQUIRED',
      evidence: 'Google OAuth requires manual testing with real browser session'
    }
  }
}
```

---

## 6. Configuration

### 6.1 Environment Variables

```bash
# qa/.env.test
QA_BASE_URL=http://localhost:3000
QA_DATABASE_URL=postgresql://...
QA_TEST_USER_EMAIL=test@example.com
QA_TEST_USER_PASSWORD=...
QA_PREMIUM_USER_EMAIL=premium@example.com
QA_PREMIUM_USER_PASSWORD=...
```

### 6.2 Test Accounts Required

| Account Type | Purpose | Required For |
|--------------|---------|--------------|
| Anonymous | No auth state | NAV-*, HOME-*, ARENA-023/024 |
| Standard | Free tier user | Most authenticated tests |
| Premium | Pit Pass subscriber | ARENA-012, model selection |
| Exhausted | 0 credits | CREDIT-012 |

---

## 7. QA Report Parser

```typescript
// qa/parser.ts

interface ParsedTest {
  id: string
  category: string
  subcategory: string
  description: string
  expected: string
  qa: boolean
  func: boolean
  broken: boolean
  lineNumber: number
}

const STORY_PATTERN = /- \[.\] `\[qa:(.)\]\[func:(.)\]\[broken:(.)\]` \*\*([A-Z]+-\d+)\*\*: (.+)/
const EXPECTED_PATTERN = /^\s+- Expected: (.+)$/

function parseQAReport(content: string): ParsedTest[] {
  const lines = content.split('\n')
  const tests: ParsedTest[] = []
  let currentCategory = ''
  let currentSubcategory = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      currentCategory = line.replace(/^## /, '').trim()
    }
    if (line.startsWith('### ')) {
      currentSubcategory = line.replace(/^### /, '').trim()
    }

    const match = STORY_PATTERN.exec(line)
    if (match) {
      const [, qa, func, broken, id, description] = match
      let expected = ''
      if (i + 1 < lines.length) {
        const expMatch = EXPECTED_PATTERN.exec(lines[i + 1])
        if (expMatch) expected = expMatch[1]
      }

      tests.push({
        id, category: currentCategory, subcategory: currentSubcategory,
        description, expected,
        qa: qa === 'x', func: func === 'x', broken: broken === 'x',
        lineNumber: i + 1
      })
    }
  }
  return tests
}
```

---

## 8. Results Writer

```typescript
// qa/writer.ts

interface TestResult {
  id: string
  passed: boolean
  functional: boolean
  error?: string
  timestamp: string
}

function updateQAReport(content: string, results: TestResult[]): string {
  const lines = content.split('\n')

  for (const result of results) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`**${result.id}**`)) {
        const qa = 'x'  // We tested it
        const func = result.functional ? 'x' : '_'
        const broken = result.passed ? '_' : 'x'

        lines[i] = lines[i].replace(
          /`\[qa:.\]\[func:.\]\[broken:.\]`/,
          `\`[qa:${qa}][func:${func}][broken:${broken}]\``
        )
        break
      }
    }
  }

  return lines.join('\n')
}
```

---

## 9. NPM Scripts

```json
{
  "scripts": {
    "qa": "tsx qa/runner.ts",
    "qa:dry": "tsx qa/runner.ts --dry-run",
    "qa:api": "tsx qa/runner.ts --tier=api",
    "qa:browser": "tsx qa/runner.ts --tier=browser",
    "qa:nav": "tsx qa/runner.ts --category=Navigation",
    "qa:auth": "tsx qa/runner.ts --category=Authentication",
    "qa:arena": "tsx qa/runner.ts --category=Arena",
    "qa:single": "tsx qa/runner.ts --filter"
  }
}
```

---

## 10. Human Testing Checklist

The following 7 tests **cannot** be automated and require manual verification:

| ID | Story | Reason |
|----|-------|--------|
| AUTH-004 | Google OAuth | Real OAuth consent flow |
| CREDIT-006 | Purchase Starter pack | Real Stripe payment |
| CREDIT-007 | Purchase Plus pack | Real Stripe payment |
| CREDIT-013 | Subscribe Pit Pass | Real Stripe subscription |
| CREDIT-014 | Subscribe Pit Lab | Real Stripe subscription |
| CREDIT-016 | Failed payment downgrade | Stripe webhook lifecycle |
| CREDIT-017 | Cancellation flow | Stripe subscription lifecycle |

### Manual Test Protocol

1. **Before testing:** Create Stripe test mode account
2. **Test card:** Use `4242 4242 4242 4242`
3. **Document:** Record screenshots and timestamps
4. **Update:** Mark tests in qa-report.md manually

---

## 11. Success Criteria

| Metric | Target |
|--------|--------|
| Automated tests implemented | ≥ 149 |
| Tests passing on clean state | ≥ 95% |
| Test run time | < 30 minutes |
| Documentation coverage | 100% |

---

## 12. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Flaky browser tests | Add retries, increase timeouts |
| Rate limiting during tests | Use separate test API key |
| Database state pollution | Run in isolated test DB |
| Clerk test mode limitations | Document and mark as partial |
| Streaming timeout | Increase timeout to 120s |

---

## 13. Timeline Estimate

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1: Foundation | 8 tasks | 2-3 hours |
| Phase 2: Browser Tests | 118 tests | 6-8 hours |
| Phase 3: API Tests | 23 tests | 2-3 hours |
| Phase 4: Auth & Credits | 24 tests | 3-4 hours |
| Phase 5: CI (optional) | 4 tasks | 2 hours |
| **Total** | **177 items** | **15-20 hours** |

---

## 14. Automation Tier Reference

### Full Mapping

| Category | API | Browser | Partial | Human | Total |
|----------|-----|---------|---------|-------|-------|
| Navigation | 0 | 8 | 0 | 0 | 8 |
| Authentication | 2 | 8 | 2 | 1 | 13 |
| Home Page | 0 | 11 | 0 | 0 | 11 |
| Arena | 0 | 20 | 4 | 0 | 24 |
| Bout Streaming | 1 | 16 | 6 | 0 | 23 |
| Custom Arena | 0 | 10 | 0 | 0 | 10 |
| Agents | 1 | 23 | 1 | 0 | 25 |
| Leaderboard | 0 | 9 | 0 | 0 | 9 |
| Research | 0 | 5 | 0 | 0 | 5 |
| Feedback | 0 | 9 | 0 | 0 | 9 |
| Contact | 0 | 4 | 1 | 0 | 5 |
| Credits & Billing | 5 | 2 | 5 | 5 | 17 |
| API Endpoints | 21 | 0 | 2 | 0 | 23 |
| **Total** | **30** | **125** | **21** | **6** | **182** |

### Summary

- **Full Auto (API + Browser):** 154 tests (85%)
- **Partial Auto:** 21 tests (11%)
- **Human Required:** 7 tests (4%)
