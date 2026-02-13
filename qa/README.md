# QA Automation Framework

Automated QA testing for THE PIT, enabling LLM-driven test execution.

## Overview

This framework parses user stories from `docs/qa-report.md` and provides infrastructure for automated testing using:

- **Playwright MCP** for browser-based UI testing
- **API calls** (fetch/curl) for endpoint testing
- **Database queries** for state verification

## Quick Start

```bash
# Install dependencies (includes tsx)
pnpm install

# Dry run - see what tests would execute
pnpm run qa:dry

# Run all implemented tests
pnpm run qa

# Run specific categories
pnpm run qa:nav      # Navigation tests
pnpm run qa:auth     # Authentication tests
pnpm run qa:arena    # Arena page tests

# Run by automation tier
pnpm run qa:api      # API-only tests
pnpm run qa:browser  # Browser-based tests

# Run specific test(s)
pnpm run qa:single NAV-001
pnpm run qa:single NAV-001 NAV-002 NAV-003
```

## Configuration

Create a `.env.test` file with test credentials:

```bash
# Base URL for testing
QA_BASE_URL=http://localhost:3000

# Database connection
QA_DATABASE_URL=postgresql://...

# Test accounts
QA_TEST_USER_EMAIL=test@example.com
QA_TEST_USER_PASSWORD=...

QA_PREMIUM_USER_EMAIL=premium@example.com
QA_PREMIUM_USER_PASSWORD=...

QA_EXHAUSTED_USER_EMAIL=exhausted@example.com
QA_EXHAUSTED_USER_PASSWORD=...
```

## Directory Structure

```
qa/
├── README.md           # This file
├── runner.ts           # Main test runner CLI
├── parser.ts           # QA report markdown parser
├── writer.ts           # Results writer (updates qa-report.md)
├── config.ts           # Configuration loader
├── tiers.ts            # Automation tier mappings
├── fixtures/
│   ├── accounts.ts     # Test account definitions
│   └── seeds.ts        # Database seed helpers
├── tests/              # Test implementations (to be added)
├── utils/              # Shared utilities (to be added)
└── results/            # Test run artifacts
```

## Test Report Format

Tests are defined in `docs/qa-report.md` using this format:

```markdown
- [ ] `[qa:_][func:_][broken:_]` **NAV-001**: As a user, I can see the logo
  - Expected: Logo visible in header, clicking navigates to `/`
```

Status flags:
- `qa:x` = tested, `qa:_` = not tested
- `func:x` = working, `func:_` = not verified
- `broken:x` = broken, `broken:_` = not broken

## Automation Tiers

Each test is classified by automation feasibility:

| Tier | Description | Count |
|------|-------------|-------|
| `api` | HTTP/curl/database tests | 30 |
| `browser` | Playwright UI tests | 125 |
| `partial` | Needs specific setup | 21 |
| `human` | Cannot automate | 6 |

Human-required tests (payment flows, OAuth) are skipped automatically.

## Adding Tests

1. Create test implementation in `qa/tests/{category}.ts`
2. Register with the test runner

```typescript
// qa/tests/navigation.ts
import { registerTest, type TestImplementation } from '../runner.js'

const NAV_001: TestImplementation = {
  id: 'NAV-001',
  tier: 'browser',
  async run(ctx) {
    // Navigate and verify
    await ctx.browser.navigate('/')
    const snapshot = await ctx.browser.snapshot()

    const logo = snapshot.findByRole('link', { name: /the pit/i })
    if (!logo) {
      return { passed: false, error: 'Logo not found' }
    }

    return { passed: true, evidence: 'Logo visible and links to home' }
  }
}

// Register the test
registerTest(NAV_001)
```

## Results

After running tests:
- `docs/qa-report.md` is updated with test results
- Console shows pass/fail summary
- `qa/results/` contains run artifacts

## Human Testing Checklist

These tests require manual verification:

- [ ] AUTH-004: Google OAuth flow
- [ ] CREDIT-006: Purchase Starter pack (real Stripe)
- [ ] CREDIT-007: Purchase Plus pack (real Stripe)
- [ ] CREDIT-013: Subscribe to Pit Pass
- [ ] CREDIT-014: Subscribe to Pit Lab
- [ ] CREDIT-016: Failed payment downgrade
- [ ] CREDIT-017: Subscription cancellation

Use Stripe test mode with card `4242 4242 4242 4242`.

## CI Integration

Add to GitHub Actions:

```yaml
- name: Run QA tests
  run: pnpm run qa:api
  env:
    QA_BASE_URL: ${{ secrets.STAGING_URL }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```
