# Ship Fix

End-to-end workflow: diagnose, fix, review-loop, merge, deploy, QA, and close Linear tickets. Accepts a natural-language task description that drives every phase.

## Usage

```
/ship-fix "React hydration error #418 on all production pages"
/ship-fix "PostHog events firing before cookie consent"
/ship-fix "OCE-350 — credit settlement race condition"
/ship-fix "arena page crashes when user has no credits"
```

The argument `$ARGUMENTS` is the task description. It is injected into every phase as the driving context. If it contains a Linear issue identifier (e.g. OCE-350), fetch details from Linear instead of creating a new ticket.

<principles>
  <principle>The task description is the single source of intent. Every branch name, commit message, PR title, test name, and Linear comment derives from it. Do not invent context that is not in $ARGUMENTS or discoverable from the codebase.</principle>
  <principle>Gate before push. Never push code that has not passed lint + typecheck + unit tests locally. CI minutes are not free. Broken PRs block review.</principle>
  <principle>Address every review comment. Automated reviewers (Cursor Bugbot, CodeRabbit, Greptile, Vercel Agent) are treated as real reviewers. Evaluate each comment for validity, fix if legitimate, reply with reasoning if not, and push a new commit (never amend unless the HEAD commit is yours and unpushed).</principle>
  <principle>QA against production, not preview. E2E tests target BASE_URL=https://www.thepit.cloud. Preview deployments differ from production (different env vars, different data). QA must prove the fix works where users see it.</principle>
  <principle>Linear tickets are not Done until production is verified. Do not mark tickets Done after merging — mark them Done after QA passes against production.</principle>
  <principle>Separate concerns in separate commits. The fix, each review-comment response, and the QA tests are distinct commits. Atomic commits make bisection, revert, and review straightforward.</principle>
  <principle>New bugs discovered during the fix are separate tickets. If you find an unrelated issue (e.g. a second hydration mismatch on arena pages), note it in the PR/QA report but do not scope-creep the current fix.</principle>
</principles>

<process>
  <phase name="Understand the Task" number="1">
    <description>
      Parse $ARGUMENTS to determine:
      - What is broken (symptom)
      - Where it manifests (pages, routes, components)
      - Whether a Linear issue already exists (look for OCE-NNN pattern)
      
      If the task is vague, investigate the codebase before proceeding. Run idempotent commands to confirm the bug exists and understand the root cause. Do not guess.
    </description>

    <steps>
      <step>If $ARGUMENTS contains a Linear identifier, fetch the issue: `pitlinear --json issues get OCE-NNN`</step>
      <step>Search the codebase for the affected code. Use Grep, Glob, and Read to build a mental model of the problem.</step>
      <step>Identify the root cause. State it explicitly before writing any fix.</step>
      <step>Check git status — ensure you are on master with a clean working tree.</step>
    </steps>

    <commands>
```bash
# Fetch Linear issue (if identifier provided)
export LINEAR_API_KEY=$(grep LINEAR_API_KEY .env.local | cut -d= -f2)
export LINEAR_TEAM_NAME=OCE
cd pitlinear && go run . --json issues get OCE-NNN

# Ensure clean state
git checkout master && git pull
git status
```
    </commands>
  </phase>

  <phase name="Create Linear Tickets" number="2">
    <description>
      Create two Linear tickets:
      1. Feature/fix ticket — describes the fix itself
      2. QA ticket — child of the feature ticket, describes verification
      
      Skip this phase if a Linear issue already exists from $ARGUMENTS.
    </description>

    <steps>
      <step>Create the feature ticket with priority based on severity (urgent for production bugs, high for user-facing issues, normal otherwise)</step>
      <step>Create the QA ticket as a child of the feature ticket</step>
      <step>Record both identifiers for later reference</step>
    </steps>

    <commands>
```bash
export LINEAR_API_KEY=$(grep LINEAR_API_KEY .env.local | cut -d= -f2)
export LINEAR_TEAM_NAME=OCE
cd pitlinear

# Feature ticket
go run . issues create \
  --title "fix: <derived from $ARGUMENTS>" \
  --priority <urgent|high|normal> \
  --label Bug \
  --state "In Progress"

# QA ticket (child)
go run . issues create \
  --title "QA: <derived from $ARGUMENTS>" \
  --priority high \
  --label QA \
  --state Todo

# Link parent-child
go run . issues set-parent <QA-ID> <FEATURE-ID>
```
    </commands>
  </phase>

  <phase name="Create Branch and Implement Fix" number="3">
    <description>
      Create a hotfix branch from master, implement the fix, and verify it passes the gate.
    </description>

    <steps>
      <step>Create branch: `hotfix/<slug-from-task>` or `fix/<slug-from-task>`</step>
      <step>Implement the fix. Follow existing code patterns. Read surrounding code before writing.</step>
      <step>Run the gate: `pnpm run lint && pnpm run typecheck && pnpm run test:unit`</step>
      <step>If the gate fails, fix lint/type/test errors before proceeding.</step>
      <step>Commit with a conventional commit message that references the root cause.</step>
    </steps>

    <commands>
```bash
git checkout -b hotfix/<slug>

# ... implement fix ...

# Gate
pnpm run lint && pnpm run typecheck && pnpm run test:unit

# Commit
git add <files>
git commit -m "fix: <what was fixed>

<root cause explanation>
<what the fix does>"
```
    </commands>

    <rules>
      <rule>Branch names: lowercase, hyphen-separated, under 50 chars</rule>
      <rule>Commit messages: conventional commits (fix:, feat:, etc.)</rule>
      <rule>No LLM attribution in commit messages</rule>
      <rule>Do not commit .env files or secrets</rule>
    </rules>
  </phase>

  <phase name="Push and Create PR" number="4">
    <steps>
      <step>Push with -u flag: `git push -u origin <branch>`</step>
      <step>Create PR with gh CLI. Include: summary, root cause, what changed, and Linear ticket references.</step>
    </steps>

    <commands>
```bash
git push -u origin <branch>

gh pr create --title "fix: <title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>

## Root Cause
<what was wrong and why>

## Changes
<what files were modified and what each change does>

## Testing
- [ ] Gate passes (lint + typecheck + unit tests)
- [ ] Verified locally
- [ ] E2E tests planned (QA ticket: OCE-NNN)

## Linear
- Feature: OCE-NNN
- QA: OCE-NNN
EOF
)"
```
    </commands>
  </phase>

  <phase name="Automated Review Loop" number="5">
    <description>
      Wait for automated reviewers to complete, then address every comment. This phase loops until all review comments are resolved and CI is green (excluding known pre-existing failures).
    </description>

    <known-preexisting-failures>
      <failure job="integration">Level4 emit script arg parsing (--window unexpected)</failure>
      <failure job="security">minimatch ReDoS advisory in devDeps (eslint, vitest, hardhat)</failure>
      <failure job="playwright">E2E tests expect production URLs but CI runs against preview</failure>
    </known-preexisting-failures>

    <steps>
      <step>Wait for CI checks: `gh pr checks <number>` — poll every 60-120s until all complete.</step>
      <step>Identify new failures vs pre-existing ones. Only act on new failures.</step>
      <step>Read all review comments: `gh api repos/rickhallett/thepit/pulls/<number>/comments`</step>
      <step>For each comment, evaluate validity:
        - If valid: implement the fix, run gate, commit (new commit, not amend), push, reply with what was fixed and the commit hash.
        - If invalid: reply with technical reasoning for why the comment does not apply.
        - If partially valid: implement the valid part, explain why the rest does not apply.
      </step>
      <step>After pushing fixes, wait for CI to re-run and check for new review comments.</step>
      <step>Repeat until no new actionable comments and CI is green (modulo pre-existing failures).</step>
    </steps>

    <commands>
```bash
# Poll CI
gh pr checks <number>

# Read review comments
gh api repos/rickhallett/thepit/pulls/<number>/comments \
  --jq '.[] | {id: .id, user: .user.login, body: .body[:300], path: .path, line: .line}'

# Read full review bodies
gh api repos/rickhallett/thepit/pulls/<number>/reviews \
  --jq '.[] | {user: .user.login, state: .state, body: .body[:1500]}'

# Reply to a comment
gh api repos/rickhallett/thepit/pulls/<number>/comments/<comment-id>/replies \
  -X POST -f body="<response>"

# After fixing
git add <files> && git commit -m "fix: <what was addressed>" && git push
```
    </commands>

    <critical>
      Never amend a commit you did not create. Never amend a commit that has been pushed. Always create a new commit for review comment fixes. Check `git log -1 --format='%an %ae'` before considering amend.
    </critical>
  </phase>

  <phase name="Merge and Deploy" number="6">
    <steps>
      <step>Merge the PR: `gh pr merge <number> --squash --delete-branch --admin`</step>
      <step>Switch to master and pull: `git checkout master && git pull`</step>
      <step>Deploy to production: `vercel --prod`</step>
      <step>Verify the site is up: `curl -sf -o /dev/null -w "%{http_code}" https://www.thepit.cloud`</step>
    </steps>

    <commands>
```bash
gh pr merge <number> --squash --delete-branch --admin
git checkout master && git pull
vercel --prod
curl -sf -o /dev/null -w "%{http_code}" https://www.thepit.cloud
```
    </commands>
  </phase>

  <phase name="Write QA Tests" number="7">
    <description>
      Write Playwright E2E tests that verify the fix works in production. Tests should cover:
      1. The specific bug is fixed (negative test — the error no longer occurs)
      2. Related functionality still works (regression tests)
      3. Edge cases discovered during the fix
    </description>

    <steps>
      <step>Create a new branch: `qa/<slug>`</step>
      <step>Write tests in `tests/e2e/qa-<slug>.spec.ts`</step>
      <step>Follow the pattern established in `tests/e2e/qa-unleashed.spec.ts`:
        - Use `const BASE = process.env.BASE_URL ?? 'https://www.thepit.cloud'`
        - Group tests by ticket number: `test.describe('OCE-NNN: <title>', ...)`
        - Use descriptive test names that explain what is being verified
      </step>
      <step>Run tests against production: `BASE_URL=https://www.thepit.cloud npx playwright test tests/e2e/qa-<slug>.spec.ts --reporter=list`</step>
      <step>If tests fail, investigate whether the failure is:
        - A real regression → fix the code (go back to Phase 3)
        - A test issue → fix the test
        - A pre-existing issue unrelated to this fix → document it, adjust the test to account for it
      </step>
      <step>Run the gate: `pnpm run lint && pnpm run typecheck`</step>
      <step>Commit, push, create QA PR</step>
    </steps>

    <commands>
```bash
git checkout master && git pull
git checkout -b qa/<slug>

# ... write tests ...

# Run against production
BASE_URL=https://www.thepit.cloud npx playwright test tests/e2e/qa-<slug>.spec.ts --reporter=list

# Gate
pnpm run lint && pnpm run typecheck

# Commit and PR
git add tests/e2e/qa-<slug>.spec.ts
git commit -m "test: add E2E QA suite for <fix description> (N tests, OCE-NNN)"
git push -u origin qa/<slug>

gh pr create --title "test: QA suite for <fix> (OCE-NNN)" --body "$(cat <<'EOF'
## Summary
- Adds N Playwright E2E tests verifying the fix from PR #NNN
- All N/N passing against production (www.thepit.cloud)

## Test Coverage
| Category | Tests | Status |
|----------|-------|--------|
| ... | N | Pass |

## Linear
- Feature: OCE-NNN
- QA: OCE-NNN
EOF
)"
```
    </commands>
  </phase>

  <phase name="QA Review Loop" number="8">
    <description>
      Same as Phase 5 but for the QA PR. Wait for automated reviews, address comments, push fixes.
    </description>

    <steps>
      <step>Poll CI: `gh pr checks <qa-pr-number>`</step>
      <step>Read and address review comments (same process as Phase 5)</step>
      <step>When green, merge: `gh pr merge <qa-pr-number> --squash --delete-branch --admin`</step>
    </steps>
  </phase>

  <phase name="Close Linear Tickets" number="9">
    <description>
      Only after production is verified and QA passes, update both Linear tickets to Done with closing comments.
    </description>

    <steps>
      <step>Update feature ticket to Done</step>
      <step>Update QA ticket to Done</step>
      <step>Add closing comments with:
        - PR number and merge commit
        - Root cause summary
        - What was fixed
        - Review comments addressed
        - QA results (pass count, what was verified)
      </step>
    </steps>

    <commands>
```bash
export LINEAR_API_KEY=$(grep LINEAR_API_KEY .env.local | cut -d= -f2)
export LINEAR_TEAM_NAME=OCE
cd pitlinear

# Update states
go run . issues update OCE-NNN --state Done
go run . issues update OCE-NNN --state Done

# Add closing comments
go run . comments add OCE-NNN --body "<feature closing summary>"
go run . comments add OCE-NNN --body "<QA closing summary>"
```
    </commands>
  </phase>

  <phase name="Summary Report" number="10">
    <description>Output a summary of everything that was done.</description>
    <output-format>
```
═══════════════════════════════════════════════════════════════════
  SHIP-FIX COMPLETE
  Task: $ARGUMENTS
  Date: <today>
═══════════════════════════════════════════════════════════════════

LINEAR TICKETS
──────────────
  Feature: OCE-NNN — <title> — Done
  QA:      OCE-NNN — <title> — Done

PULL REQUESTS
─────────────
  Fix PR:  #NNN — <title> — Merged
    Commits: N
    Review comments addressed: N (Cursor: N, CodeRabbit: N, Greptile: N, Vercel: N)
  QA PR:   #NNN — <title> — Merged
    Tests: N/N passing

PRODUCTION
──────────
  Deployed: <vercel deployment URL>
  Verified: <HTTP status code>

ROOT CAUSE
──────────
  <1-2 sentence summary of what was wrong>

FIX SUMMARY
───────────
  <1-2 sentence summary of what was changed>

FILES MODIFIED
──────────────
  <list of files changed in the fix PR>

DISCOVERIES
───────────
  <any new issues found during the fix, with recommendations>

═══════════════════════════════════════════════════════════════════
```
    </output-format>
  </phase>
</process>

<constraints>
  <constraint>Never push without passing the gate (lint + typecheck + unit tests)</constraint>
  <constraint>Never amend commits you did not create or that have been pushed</constraint>
  <constraint>Never mark Linear tickets Done before QA passes against production</constraint>
  <constraint>Never skip automated review comments — evaluate and respond to every one</constraint>
  <constraint>Never commit .env files or secrets</constraint>
  <constraint>Never force-push without --force-with-lease</constraint>
  <constraint>Never scope-creep — new bugs are separate tickets</constraint>
  <constraint>Never use git rebase -i (interactive rebase requires terminal input)</constraint>
  <constraint>Never use echo to pipe values to CLI tools — use printf</constraint>
  <constraint>Never deploy without verifying the site responds with HTTP 200</constraint>
</constraints>

<edge-cases>
  <case trigger="Gate fails on pre-existing lint warnings">Warnings are acceptable if there are 0 errors. Do not fix pre-existing warnings unless they are in files you modified.</case>
  <case trigger="Automated reviewer flags something that is intentional">Reply with technical reasoning. Reference the existing pattern, the design decision, or the constraint that makes the current approach correct.</case>
  <case trigger="QA tests reveal the fix did not work">Do NOT close tickets. Go back to Phase 3 on the same branch. Investigate further, apply a new fix, re-run the full cycle.</case>
  <case trigger="QA tests reveal a second, unrelated bug">Document the unrelated bug in the QA PR description and the Linear closing comment. Create a new Linear ticket for it if it is user-facing. Adjust the test to account for it (e.g., test functionality instead of error-free-ness).</case>
  <case trigger="CI checks never complete (stuck pending)">Wait up to 10 minutes. If still stuck, check GitHub Actions for the run. If the runner is down, proceed with local gate results and note the CI gap in the PR.</case>
  <case trigger="Merge conflicts on master">Rebase the branch: `git fetch origin && git rebase origin/master`. Resolve conflicts, re-run gate, force-push with --force-with-lease.</case>
  <case trigger="vercel --prod fails">Check vercel logs. If it is a build error, fix locally, push, and re-deploy. If it is a platform issue, retry after 1 minute.</case>
  <case trigger="Linear API is unreachable">Use the Linear web UI as fallback. Note the ticket URLs manually. Do not block the fix on Linear availability.</case>
  <case trigger="Multiple review bots disagree with each other">Evaluate each comment independently against the actual code. Both can be right about different aspects. Both can be wrong. The code is the source of truth.</case>
</edge-cases>
