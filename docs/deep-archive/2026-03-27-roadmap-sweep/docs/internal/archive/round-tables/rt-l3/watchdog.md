# RT L3 — Watchdog Report
Date: 2026-02-24
Agent: Watchdog
Statement presentation order: A, C, B

## Pre-Launch Recommendations

### Context: What I'm Working With

The test inventory has grown significantly beyond my agent definition's documented numbers. Current state: ~71 unit test files, ~32 API test files, 2 integration test files (plus 2 security integration tests), 7 E2E specs, and 4 eval test files. The `vitest.config.ts` coverage thresholds (85% lines/functions/branches/statements) are enforced on 11 modules. This is a mature, well-structured test suite by any standard — especially for a solo dev project.

My L2 assessment was 9/10. This L3 assessment is a fresh, unbiased read. I am not trying to confirm or deny either the L1 pessimism or the L2 optimism. I am stating what I see from the QA chair.

### Recommendation 1: The Bout Engine Coverage Gap Is Real and Should Be Acknowledged, Not Fixed Pre-Launch

`lib/bout-engine.ts` is 1,164 lines — the largest single module in the critical path. It has **no dedicated unit test file**. The API route tests (`run-bout*.test.ts`) mock it entirely, meaning the engine's internal logic (turn orchestration, streaming, settlement, error recovery) is tested only through production usage and E2E coverage.

**My recommendation is NOT to delay launch to fix this.** Writing a proper bout-engine test suite is a multi-day effort that would require mocking the AI provider, streaming infrastructure, and database settlement pipeline. The operational evidence (it works in production) is genuinely meaningful for launch. But this should be the #1 post-launch test engineering task, documented as a known gap. If a recruiter or HN commenter asks "where are your bout engine tests?", having a clear, honest answer ("that's our next coverage target — here's the tracking issue") is far better than hand-waving.

### Recommendation 2: The Coverage Threshold List Should Include `xml-prompt.ts`

The agent definition lists `lib/xml-prompt.ts` as security-critical with 85% coverage enforcement. The actual `vitest.config.ts` coverage include list does NOT include `xml-prompt.ts`. There IS a comprehensive test file (`tests/unit/xml-prompt.test.ts`), so coverage is likely high — but the enforcement threshold is absent. This is a 1-line config fix. It should have been caught earlier, and it's trivially fixable pre-launch.

**Action:** Add `'lib/xml-prompt.ts'` to the `coverage.include` array in `vitest.config.ts`. Run `pnpm run test:unit` to confirm it passes. 5-minute task.

### Recommendation 3: Verify the Gate Passes Right Now

The local gate is the authority: `pnpm run typecheck && pnpm run lint && pnpm run test:unit`. I have not seen evidence that anyone ran the full gate in this assessment cycle. The L2 reports reference "1,054 tests" which was the prior count — the actual count may have drifted. The gate should be run once before launch as a final verification. Not because I expect it to fail, but because the Watchdog's job is to verify, not to assume.

**Action:** Run the gate. If it passes, you're clear. If it doesn't, you know before HN does.

### Recommendation 4: The Skipped Integration Security Tests Should Be Documented

`tests/integration/security/race-conditions.test.ts` has one `it.skip` (SEC-RACE-006: concurrent reactions). The other security integration tests (`auth-bypass.test.ts`, `race-conditions.test.ts`) are conditionally skipped when no server is reachable, which is correct design. But the permanently skipped test should either be un-skipped, deleted, or have its skip reason documented in a tracking issue. Stale skipped tests are debt that compounds.

**Action:** Either fix SEC-RACE-006 or create a post-launch issue tracking it. 10-minute task.

### Recommendation 5: E2E Coverage Is Broader Than Documented But Not Gate-Blocking

My agent definition lists 1 E2E file with ~3 tests. The actual repo has 7 E2E specs: bout, citations, mobile-responsive, hydration, OG images, pagination, and unleashed. This is significantly more coverage than my definition reflects. However, E2E tests are correctly excluded from the CI gate during high-iteration phases (per AGENTS.md). This is the right call for launch. Re-enable E2E in the gate post-launch when the deployment target stabilizes.

### Recommendation 6: The Test Suite Is a Legitimate Competitive Differentiator — Use It

71 unit tests + 32 API tests + security integration tests + eval tests + E2E specs = this is genuinely in the top 1% of Show HN projects for test coverage. The L2 assessment was right about this. My recommendation is to make this visible: mention test count in launch materials, link to the test directory, or show a coverage badge. When the narrative is "solo dev + working code + honest caveats," the test suite is receipts.

### Recommendation 7: No Other Launch-Blocking QA Issues

I have reviewed the test structure, coverage configuration, skip patterns, mock patterns, and test file organization. The test architecture is sound. The patterns are consistent. The coverage thresholds are enforced on the modules that matter (credits, auth, rate limiting, tier access, agent DNA, referrals, validation). The eval tests cover debate quality, format, persona adherence, and refusal behavior. There is nothing here that should prevent launch.

## Strategic Framing — Rank Order

1st: **B** — "First and foremost, this project is a unique contribution to a difficult field in difficult times. I would recommend shipping over polishing." From QA perspective, this is the correct framing. The test suite already exceeds the quality bar for the target audience. Additional polishing yields diminishing returns — the marginal coverage improvement from spending another week on tests does not change the launch outcome. The existing 1,000+ tests demonstrate engineering rigor. The honest gaps (bout engine, xml-prompt threshold, SEC-RACE-006) demonstrate maturity — acknowledging what you haven't tested is itself a quality signal. Ship.

2nd: **A** — "First and foremost, this project is a portfolio piece. Polish it, as if your most important audience are the recruiters who will use it to judge whether you are worth hiring as an agentic engineer." The test suite IS portfolio-grade. The patterns are documented, the coverage thresholds are enforced, the mock hierarchy is consistent, and the test naming follows behavioral conventions. A recruiter reviewing this repo would see a professional QA practice. But optimizing for recruiter approval introduces perverse incentives — you start writing tests to impress rather than to catch regressions. The suite is already impressive. Don't corrupt it.

3rd: **C** — "First and foremost, this project is an example of applied engineering; its primary value was in the practice. Take the process, and use it to create your next vision." The process IS valuable and transferable. But this framing undervalues the artifact itself. From QA perspective: you don't build a 1,000+ test suite for "practice." You build it because the product matters and you intend it to survive contact with real users. The test infrastructure says "this is meant to run in production, indefinitely." Treating it as a training exercise contradicts what the engineering evidence shows.
