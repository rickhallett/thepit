# pitctl QA Battle Plan

<!-- Machine-readable user story tracker for pitctl CLI validation.
     Format: Each story is an H2 with YAML front-matter in a code fence.
     
     Python processing example:
     
     ```python
     import re, yaml
     
     with open("QA_BATTLE_PLAN.md") as f:
         content = f.read()
     
     STORY_PATTERN = re.compile(
         r"^## (?P<id>QA-\d+): (?P<title>.+)\n\n```yaml\n(?P<meta>.+?)```",
         re.MULTILINE | re.DOTALL,
     )
     
     stories = []
     for m in STORY_PATTERN.finditer(content):
         meta = yaml.safe_load(m.group("meta"))
         meta["id"] = m.group("id")
         meta["title"] = m.group("title")
         stories.append(meta)
     
     # Update a story status:
     def set_status(filepath, story_id, new_status, note=""):
         with open(filepath) as f:
             text = f.read()
         old = f"status: "  # find the line within the story block
         # ... replace within the matching block
     
     # Valid statuses:
     #   pending       - not yet tested
     #   in_progress   - currently being validated
     #   passed        - verified working as intended
     #   failed        - broken, needs fix
     #   blocked       - waiting on something else (see `blocked_by`)
     #   skipped       - intentionally deferred
     #   fixed         - was failed, now resolved
     ```
-->

<!-- ============================================================ -->
<!-- TIER 1: CRITICAL — Data integrity, financial ops, auth gates  -->
<!-- If broken: data loss, financial miscalculation, security hole -->
<!-- ============================================================ -->

## QA-001: Credits grant atomically updates balance and records transaction

```yaml
status: pending
priority: critical
impact: Data integrity — grant without audit trail breaks financial reconciliation
command: pitctl credits grant <userId> <amount> --yes
category: credits
preconditions:
  - DATABASE_URL set and reachable
  - Target user exists in users table
steps:
  - Run `pitctl credits grant user_test123 100 --yes`
  - Query `SELECT balance_micro FROM credits WHERE user_id = 'user_test123'`
  - Query `SELECT delta_micro, source, metadata FROM credit_transactions WHERE user_id = 'user_test123' ORDER BY created_at DESC LIMIT 1`
  - Verify balance increased by 10000 (100 credits * 100 micro)
  - Verify transaction record has source='admin_grant', metadata='{"tool":"pitctl"}'
  - Verify delta_micro = 10000
expected: Balance and transaction record are consistent
known_risk: "Three writes (upsert, update, insert) are NOT wrapped in a SQL transaction — crash between step 2 and 3 leaves orphaned balance increment"
blocked_by: null
```

## QA-002: Credits grant rejects non-positive amounts

```yaml
status: pending
priority: critical
impact: Negative grant could drain user accounts or corrupt ledger
command: pitctl credits grant <userId> <amount> --yes
category: credits
preconditions: []
steps:
  - Run `pitctl credits grant user_test123 0 --yes`
  - Verify error "amount must be positive"
  - Run `pitctl credits grant user_test123 -50 --yes`
  - Verify error "amount must be positive"
  - Verify no DB writes occurred
expected: Both zero and negative amounts are rejected before any DB interaction
blocked_by: null
```

## QA-003: Credits grant requires --yes confirmation gate

```yaml
status: pending
priority: critical
impact: Accidental credit grants without confirmation could cause financial damage
command: pitctl credits grant <userId> <amount>
category: credits
preconditions: []
steps:
  - Run `pitctl credits grant user_test123 100` (without --yes)
  - Verify error message includes "requires --yes flag"
  - Verify no DB writes occurred
expected: Operation refused without --yes flag
blocked_by: null
```

## QA-004: Credits grant to non-existent user creates account then grants

```yaml
status: pending
priority: critical
impact: Granting to a non-existent user must not silently fail or corrupt data
command: pitctl credits grant <nonExistentUserId> <amount> --yes
category: credits
preconditions:
  - DATABASE_URL set and reachable
  - User does NOT exist in credits table
steps:
  - Run `pitctl credits grant user_nonexistent 50 --yes`
  - Verify credits row was created via INSERT ON CONFLICT DO NOTHING
  - Verify balance_micro = 5000
  - Verify credit_transactions row exists with correct delta
expected: Account upserted, balance set, transaction logged
blocked_by: null
```

## QA-005: Users set-tier validates tier whitelist

```yaml
status: pending
priority: critical
impact: Invalid tier value could corrupt subscription state, breaking access control
command: pitctl users set-tier <userId> <invalidTier> --yes
category: users
preconditions: []
steps:
  - Run `pitctl users set-tier user_test123 gold --yes`
  - Verify error "invalid tier \"gold\" -- must be one of: free, pass, lab"
  - Run `pitctl users set-tier user_test123 FREE --yes`
  - Verify error (case-sensitive validation)
expected: Only exact values "free", "pass", "lab" accepted
blocked_by: null
```

## QA-006: Users set-tier requires --yes confirmation gate

```yaml
status: pending
priority: critical
impact: Accidental tier change without confirmation could grant/revoke paid features
command: pitctl users set-tier <userId> <tier>
category: users
preconditions:
  - DATABASE_URL set and reachable
  - User exists
steps:
  - Run `pitctl users set-tier user_test123 lab` (without --yes)
  - Verify error "requires --yes flag"
  - Verify DB was not modified
expected: Operation refused without --yes flag
blocked_by: null
```

## QA-007: Bouts purge-errors requires --yes and only deletes errored bouts

```yaml
status: pending
priority: critical
impact: Unguarded purge could delete production bout data; wrong WHERE clause deletes non-errored bouts
command: pitctl bouts purge-errors --yes
category: bouts
preconditions:
  - DATABASE_URL set and reachable
  - At least 1 errored bout and 1 completed bout in DB
steps:
  - Count errored bouts before purge
  - Count completed bouts before purge
  - Run `pitctl bouts purge-errors` (without --yes) — verify refusal
  - Run `pitctl bouts purge-errors --yes`
  - Verify success message shows correct count
  - Verify all errored bouts are deleted
  - Verify completed bout count is unchanged
expected: Only status='error' bouts deleted, confirmation required
blocked_by: null
```

## QA-008: Agents archive/restore require --yes confirmation gate

```yaml
status: pending
priority: critical
impact: Accidental archive hides agent from public view; restore exposes flagged/banned agent
command: pitctl agents archive|restore <agentId> --yes
category: agents
preconditions:
  - DATABASE_URL set and reachable
  - Agent exists
steps:
  - Run `pitctl agents archive agent_test123` (without --yes)
  - Verify error "requires --yes flag"
  - Run `pitctl agents archive agent_test123 --yes`
  - Verify agent.archived = true in DB
  - Run `pitctl agents restore agent_test123 --yes`
  - Verify agent.archived = false in DB
expected: Both operations require --yes; state toggles correctly
blocked_by: null
```

## QA-009: License issue validates user is lab tier before signing

```yaml
status: pending
priority: critical
impact: Issuing license to non-lab user bypasses subscription paywall
command: pitctl license issue <userId> --yes
category: license
preconditions:
  - DATABASE_URL set and reachable
  - LICENSE_SIGNING_KEY set
  - User exists with tier != 'lab'
steps:
  - Run `pitctl license issue user_free_tier --yes`
  - Verify error indicates user is not lab tier
  - Verify no license token was output
expected: License only issued to lab-tier users
blocked_by: null
```

## QA-010: License generate-keys writes files with correct permissions

```yaml
status: pending
priority: critical
impact: World-readable private key is a security vulnerability
command: pitctl license generate-keys
category: license
preconditions: []
steps:
  - Run `pitctl license generate-keys` in a temp directory
  - Verify keys/license-key.pub exists
  - Verify keys/license-key.priv exists
  - Verify keys/ directory permissions are 0700
  - Verify license-key.priv permissions are 0600
  - Hex-decode both files; verify public key is 32 bytes, private key is 64 bytes
expected: Ed25519 key pair with restrictive file permissions
blocked_by: null
```

<!-- ============================================================ -->
<!-- TIER 2: HIGH — Core read operations, health monitoring       -->
<!-- If broken: ops blindness, inability to diagnose production   -->
<!-- ============================================================ -->

## QA-011: Database ping measures connectivity and latency

```yaml
status: pending
priority: high
impact: DB connectivity check is the foundation of all ops tooling
command: pitctl db ping
category: db
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl db ping`
  - Verify output shows "connected" with a latency value
  - Set DATABASE_URL to invalid value
  - Run `pitctl db ping`
  - Verify non-zero exit code and error message
expected: Reports connectivity status and latency; fails cleanly on bad connection
blocked_by: null
```

## QA-012: Database stats returns all application tables with row counts

```yaml
status: pending
priority: high
impact: Missing table in stats output means schema drift between DB and CLI
command: pitctl db stats
category: db
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl db stats`
  - Verify output is a styled table with columns Table, Rows, Size
  - Verify all 20 schema tables appear (bouts, agents, users, credits, credit_transactions, etc.)
  - Verify total database size footer is present
expected: All tables listed with accurate row counts and sizes
blocked_by: null
```

## QA-013: Status dashboard aggregates all system metrics

```yaml
status: pending
priority: high
impact: Status dashboard is the primary ops overview — blind if broken
command: pitctl status
category: status
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl status`
  - Verify "connected" with latency in system info
  - Verify Users table shows Total, Free, Pass, Lab, Today
  - Verify Bouts table shows Total, Running, Completed, Errored, Today
  - Verify Agents table shows Total, Free, Premium, Custom, Archived, Flagged
  - Verify feature flags (Subscriptions, Credits, BYOK) reflect .env settings
  - Verify Free Bout Pool shows remaining/max
expected: Complete dashboard with all sections populated
known_risk: "All 17+ QueryVal calls silently swallow errors — any failed query shows as 0 without warning"
blocked_by: null
```

## QA-014: Alerts check runs all 5 health checks and reports results

```yaml
status: pending
priority: high
impact: Alerting system is the automated canary — silent failure means undetected outages
command: pitctl alerts
category: alerts
preconditions:
  - DATABASE_URL set and reachable
  - NEXT_PUBLIC_APP_URL set (for health endpoint check)
steps:
  - Run `pitctl alerts`
  - Verify 5 checks appear: Database, Health, Error Rate, Stuck Bouts, Free Bout Pool
  - Verify each has OK/WARN/CRIT status
  - Verify non-zero exit code when any check is WARN or CRIT
expected: All checks execute and produce meaningful status
blocked_by: null
```

## QA-015: Alerts --json outputs structured JSON

```yaml
status: pending
priority: high
impact: JSON output enables CI/CD integration and automated monitoring
command: pitctl alerts --json
category: alerts
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl alerts --json`
  - Pipe output through `jq .`
  - Verify valid JSON structure with checks array
  - Verify each check has name, level, message fields
expected: Well-formed JSON suitable for programmatic consumption
blocked_by: null
```

## QA-016: Alerts --webhook sends Slack notification on failures

```yaml
status: pending
priority: high
impact: Slack alerting is the primary on-call notification path
command: pitctl alerts --webhook <slackWebhookURL>
category: alerts
preconditions:
  - Slack webhook URL available (or mock server)
  - At least one check produces WARN or CRIT
steps:
  - Set up an HTTP mock server to receive POST
  - Run `pitctl alerts --webhook http://mock-server/webhook`
  - Verify POST received with Slack-formatted payload
  - Verify payload contains check names and statuses
expected: Slack message sent with formatted alert details
blocked_by: null
```

## QA-017: Watch loop runs continuously and exits on SIGINT

```yaml
status: pending
priority: high
impact: Watch mode is the long-running monitoring daemon — hang or crash leaves ops blind
command: pitctl watch --interval 10s
category: watch
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl watch --interval 10s` in background
  - Verify output appears every ~10 seconds
  - Send SIGINT
  - Verify clean exit (exit code 0)
  - Verify no zombie processes
expected: Periodic health checks with clean signal handling
blocked_by: null
```

## QA-018: Watch rejects intervals under 10 seconds

```yaml
status: pending
priority: high
impact: Sub-10s polling could overwhelm the database
command: pitctl watch --interval 5s
category: watch
preconditions: []
steps:
  - Run `pitctl watch --interval 5s`
  - Verify error about minimum interval
  - Run `pitctl watch --interval 1s`
  - Verify same error
expected: Intervals < 10s rejected with descriptive error
blocked_by: null
```

## QA-019: Env validates all required variables and reports missing

```yaml
status: pending
priority: high
impact: Misconfigured deployment goes undetected without env validation
command: pitctl env
category: env
preconditions:
  - .env file exists with some variables set, some missing
steps:
  - Run `pitctl env`
  - Verify each variable shows "set" (green) or "MISSING" (red) for required
  - Verify optional unset vars show "(optional)"
  - Verify summary line shows X/Y required vars set
  - Verify feature flags section shows enabled/disabled
expected: Complete variable audit with clear visual status
blocked_by: null
```

## QA-020: Env --check-connections tests live DB and Stripe connectivity

```yaml
status: pending
priority: high
impact: Deployment with bad credentials goes undetected
command: pitctl env --check-connections
category: env
preconditions:
  - DATABASE_URL set
  - STRIPE_SECRET_KEY set
steps:
  - Run `pitctl env --check-connections`
  - Verify DATABASE_URL shows latency in ms
  - Verify STRIPE_SECRET_KEY shows "valid" (or error if invalid)
  - Set DATABASE_URL to invalid value
  - Run again — verify inline error for DB
expected: Live connectivity verified for both services
blocked_by: null
```

## QA-021: Smoke test hits all 9 routes and reports status

```yaml
status: pending
priority: high
impact: Smoke test validates the entire public surface — broken smoke means silent downtime
command: pitctl smoke --url <appUrl>
category: smoke
preconditions:
  - Target application is running (local or prod)
steps:
  - Run `pitctl smoke --url http://localhost:3000`
  - Verify table with 9 routes appears
  - Verify each route shows status code and latency
  - Verify summary line shows X/9 routes OK
  - Verify TLS certificate info for HTTPS URLs
expected: All 9 routes checked with status codes and latency
blocked_by: null
```

## QA-022: Smoke test always returns exit 0 (non-fatal design)

```yaml
status: pending
priority: high
impact: Understanding that smoke never fails at the exit code level is critical for CI integration
command: pitctl smoke --url <url-with-failing-routes>
category: smoke
preconditions:
  - Target URL returns 500 for some routes
steps:
  - Run `pitctl smoke --url <broken-url>`
  - Verify failed routes show red status codes
  - Verify exit code is 0 (not 1)
  - Verify summary shows less than 9/9 OK
expected: Visual failure report but exit 0 — smoke is advisory, not gating
known_risk: "This means CI pipelines cannot gate on smoke test exit code — may want to add --strict flag"
blocked_by: null
```

<!-- ============================================================ -->
<!-- TIER 3: MEDIUM — List/inspect/export operations              -->
<!-- If broken: reduced visibility, export pipeline failures      -->
<!-- ============================================================ -->

## QA-023: Users list with default options returns styled table

```yaml
status: pending
priority: medium
impact: User listing is the primary admin discovery tool
command: pitctl users
category: users
preconditions:
  - DATABASE_URL set and reachable
  - At least 1 user in DB
steps:
  - Run `pitctl users`
  - Verify styled table with columns ID, Name/Email, Tier, Credits, Bouts, Joined
  - Verify default limit is 25 rows
  - Verify results ordered by created_at DESC (newest first)
expected: Paginated user table with correct columns and ordering
blocked_by: null
```

## QA-024: Users list with --tier filter returns only matching tier

```yaml
status: pending
priority: medium
impact: Tier filtering is essential for subscription administration
command: pitctl users --tier pass
category: users
preconditions:
  - DATABASE_URL set and reachable
  - Users with different tiers exist
steps:
  - Run `pitctl users --tier pass`
  - Verify all returned users have tier = 'pass'
  - Run `pitctl users --tier lab`
  - Verify all returned users have tier = 'lab'
expected: Only users matching the specified tier are shown
blocked_by: null
```

## QA-025: Users list with --search performs ILIKE on email and display_name

```yaml
status: pending
priority: medium
impact: Search is the primary user lookup mechanism
command: pitctl users --search <query>
category: users
preconditions:
  - DATABASE_URL set and reachable
  - Users with known email/display_name values exist
steps:
  - Run `pitctl users --search test@example`
  - Verify results include users with matching email
  - Run `pitctl users --search "John"`
  - Verify results include users with matching display_name
  - Verify search is case-insensitive (ILIKE)
expected: Partial, case-insensitive search across email and display_name
blocked_by: null
```

## QA-026: Users inspect shows complete user profile with related data

```yaml
status: pending
priority: medium
impact: Inspect is the deep-dive tool for user support cases
command: pitctl users inspect <userId>
category: users
preconditions:
  - DATABASE_URL set and reachable
  - User exists with credits and bouts
steps:
  - Run `pitctl users inspect <userId>`
  - Verify all fields displayed: ID, Email, Name, Tier, Status, Stripe ID, Referral Code, Credits, Bouts, Free Bouts Used, Created, Updated
  - Verify recent transactions table shows up to 10 entries
  - Run with non-existent user ID
  - Verify error "user \"xyz\" not found"
expected: Full user profile with credit history and bout count
blocked_by: null
```

## QA-027: Users set-tier detects no-op and skips UPDATE

```yaml
status: pending
priority: medium
impact: Avoid unnecessary DB writes and misleading success messages
command: pitctl users set-tier <userId> <currentTier> --yes
category: users
preconditions:
  - DATABASE_URL set and reachable
  - User exists with tier = 'free'
steps:
  - Run `pitctl users set-tier <userId> free --yes`
  - Verify muted message indicating tier is already 'free'
  - Verify no UPDATE was issued (check updated_at unchanged)
expected: No-op detected and reported; no DB write
blocked_by: null
```

## QA-028: Credits balance shows formatted balance for existing user

```yaml
status: pending
priority: medium
impact: Balance lookup is the most common credits operation
command: pitctl credits balance <userId>
category: credits
preconditions:
  - DATABASE_URL set and reachable
  - User has credit account
steps:
  - Run `pitctl credits balance <userId>`
  - Verify output shows truncated ID and formatted balance (X.XX credits)
  - Run with user who has no credit account
  - Verify error "no credit account for user"
expected: Formatted balance display or clear error for missing account
blocked_by: null
```

## QA-029: Credits ledger shows transaction history with correct formatting

```yaml
status: pending
priority: medium
impact: Ledger is the audit trail for all financial operations
command: pitctl credits ledger <userId>
category: credits
preconditions:
  - DATABASE_URL set and reachable
  - User has credit transactions
steps:
  - Run `pitctl credits ledger <userId>`
  - Verify table with columns Delta, Source, Reference, Time
  - Verify default limit is 50
  - Run with `--limit 5` and verify only 5 rows
  - Verify transactions ordered by created_at DESC (newest first)
  - Run for user with no transactions
  - Verify "No transactions." message
expected: Paginated transaction history with proper formatting
blocked_by: null
```

## QA-030: Credits summary shows economy-wide aggregates

```yaml
status: pending
priority: medium
impact: Economy summary is the financial health dashboard
command: pitctl credits summary
category: credits
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl credits summary`
  - Verify table shows: Total accounts, Total balance, Total granted, Total spent, Avg balance, Zero-balance
  - Verify Total granted >= Total balance (granted - spent should approximate balance)
  - Run on empty DB
  - Verify all values show as 0 without errors
expected: Accurate economy-wide metrics with safe division
blocked_by: null
```

## QA-031: Bouts list with default options returns styled table

```yaml
status: pending
priority: medium
impact: Bout listing is the primary bout discovery tool
command: pitctl bouts
category: bouts
preconditions:
  - DATABASE_URL set and reachable
  - At least 1 bout in DB
steps:
  - Run `pitctl bouts`
  - Verify styled table with columns ID, Preset, Status, Owner, Created
  - Verify default limit is 25 rows
  - Verify results ordered by created_at DESC
  - Run with `--status completed` and verify filter works
  - Run with `--owner <userId>` and verify filter works
expected: Paginated bout table with working filters
blocked_by: null
```

## QA-032: Bouts inspect shows complete bout detail with reaction/vote counts

```yaml
status: pending
priority: medium
impact: Bout inspect is needed for debugging individual bout issues
command: pitctl bouts inspect <boutId>
category: bouts
preconditions:
  - DATABASE_URL set and reachable
  - Bout exists with reactions and votes
steps:
  - Run `pitctl bouts inspect <boutId>`
  - Verify all fields: ID, Preset, Status, Owner, Topic, Response Length, Response Format, Share Line, Reactions, Winner Votes, Created
  - Verify reaction and vote counts are accurate
  - Run with non-existent bout ID
  - Verify error 'bout "xyz" not found'
expected: Full bout detail with related entity counts
blocked_by: null
```

## QA-033: Bouts stats shows aggregated statistics

```yaml
status: pending
priority: medium
impact: Bout stats drive product decisions and monitoring
command: pitctl bouts stats
category: bouts
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl bouts stats`
  - Verify table shows: Total bouts, Completion rate, Errored, Bouts today, Bouts this week, Unique players, Top preset
  - Verify completion rate is a valid percentage
  - Verify top preset shows name and count
expected: Accurate aggregate statistics with proper formatting
blocked_by: null
```

## QA-034: Agents list with default options returns active agents

```yaml
status: pending
priority: medium
impact: Agent listing is the primary agent management tool
command: pitctl agents
category: agents
preconditions:
  - DATABASE_URL set and reachable
  - At least 1 active and 1 archived agent
steps:
  - Run `pitctl agents`
  - Verify default view shows only non-archived agents (archived=false)
  - Verify default limit is 50 rows
  - Run with `--archived` and verify only archived agents shown
  - Run with `--flagged` and verify only agents with flags shown
expected: Filtered agent listing with correct default behavior
blocked_by: null
```

## QA-035: Agents inspect shows complete agent profile with bout appearances

```yaml
status: pending
priority: medium
impact: Agent inspect is needed for content moderation and debugging
command: pitctl agents inspect <agentId>
category: agents
preconditions:
  - DATABASE_URL set and reachable
  - Agent exists with bouts and flags
steps:
  - Run `pitctl agents inspect <agentId>`
  - Verify all fields: ID, Name, Tier, Preset, Owner, Parent, Prompt Hash, Manifest Hash, Attestation UID, Archived, Created, Flags, Bout Appearances
  - Verify system prompt is truncated at 200 chars with "..."
  - Verify non-existent agent ID returns error
expected: Full agent profile with system prompt preview
known_risk: "Bout appearances use LIKE on agent_lineup::text — could produce false positives if one agent ID is a substring of another"
blocked_by: null
```

## QA-036: Export bouts writes valid JSONL file

```yaml
status: pending
priority: medium
impact: Research exports are the data pipeline for academic analysis
command: pitctl export bouts
category: export
preconditions:
  - DATABASE_URL set and reachable
  - Completed bouts exist
steps:
  - Run `pitctl export bouts`
  - Verify export/ directory created
  - Verify file named YYYY-MM-DD_bouts.jsonl exists
  - Verify each line is valid JSON
  - Verify fields: id, preset_id, status, transcript, agent_lineup, owner_id, topic, share_line, created_at
  - Verify only status='completed' bouts are exported
  - Verify nullable fields serialize as null (not empty string)
expected: Valid JSONL file with complete bout records
blocked_by: null
```

## QA-037: Export bouts with --since filters by date

```yaml
status: pending
priority: medium
impact: Date filtering prevents re-exporting old data
command: pitctl export bouts --since 2026-01-01
category: export
preconditions:
  - DATABASE_URL set and reachable
  - Bouts exist before and after the cutoff date
steps:
  - Run `pitctl export bouts --since 2026-01-01`
  - Verify all exported bouts have created_at >= 2026-01-01
  - Verify bouts before the cutoff are excluded
expected: Only bouts after the specified date are exported
blocked_by: null
```

## QA-038: Export agents writes valid JSON file

```yaml
status: pending
priority: medium
impact: Agent export is part of the research data pipeline
command: pitctl export agents
category: export
preconditions:
  - DATABASE_URL set and reachable
  - Agents exist
steps:
  - Run `pitctl export agents`
  - Verify export/ directory created
  - Verify file named YYYY-MM-DD_agents.json exists
  - Verify file contains valid JSON array
  - Verify each object has all 12 fields
  - Verify nullable fields serialize as null
  - Run `jq length` to verify count matches DB
expected: Valid JSON array with complete agent records
blocked_by: null
```

## QA-039: Metrics aggregates data for configurable time periods

```yaml
status: pending
priority: medium
impact: Metrics drive product and business decisions
command: pitctl metrics [24h|7d|30d]
category: metrics
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl metrics 24h`
  - Verify 6 categories: Bouts, Users, Credits, Errors, Pages, Referrals
  - Run `pitctl metrics 7d`
  - Verify counts are >= the 24h counts (superset period)
  - Run `pitctl metrics 30d`
  - Verify counts are >= the 7d counts
  - Verify default (no period arg) uses 24h
expected: Metrics increase monotonically with wider time windows
known_risk: "Queries reference credit_ledger table — verify this table exists (schema uses credit_transactions)"
blocked_by: null
```

## QA-040: Metrics --json outputs structured JSON

```yaml
status: pending
priority: medium
impact: JSON metrics enable dashboard integration
command: pitctl metrics --json
category: metrics
preconditions:
  - DATABASE_URL set and reachable
steps:
  - Run `pitctl metrics --json`
  - Pipe through `jq .`
  - Verify top-level fields: period, generated, bouts, users, credits, errors, pages, referrals
  - Verify nested objects have expected fields
expected: Well-structured JSON matching MetricsData type definition
blocked_by: null
```

## QA-041: Report generates daily/weekly summaries

```yaml
status: pending
priority: medium
impact: Reports are the executive visibility layer
command: pitctl report [daily|weekly]
category: report
preconditions:
  - DATABASE_URL set and reachable
  - NEXT_PUBLIC_APP_URL set (for health checks)
steps:
  - Run `pitctl report daily`
  - Verify output shows bouts, users, credits, error rate, and health status
  - Run `pitctl report weekly`
  - Verify weekly counts are >= daily counts
expected: Formatted summary with all metrics and health status
known_risk: "Report queries reference credit_ledger — same potential table name mismatch as metrics"
blocked_by: null
```

## QA-042: Report --webhook sends formatted Slack summary

```yaml
status: pending
priority: medium
impact: Automated reporting is the ops communication backbone
command: pitctl report daily --webhook <url>
category: report
preconditions:
  - Slack webhook URL (or mock server)
steps:
  - Set up HTTP mock server
  - Run `pitctl report daily --webhook http://mock-server/webhook`
  - Verify POST received with Slack blocks/text format
  - Verify metrics and health status in payload
expected: Slack message contains all report sections
blocked_by: null
```

<!-- ============================================================ -->
<!-- TIER 4: LOW — Edge cases, cosmetics, defensive behavior      -->
<!-- If broken: minor UX issues, misleading output                -->
<!-- ============================================================ -->

## QA-043: All commands fail gracefully with no DATABASE_URL

```yaml
status: pending
priority: low
impact: Uninformative error messages waste operator time
command: All DB-requiring commands
category: infra
preconditions:
  - DATABASE_URL unset or empty
steps:
  - Unset DATABASE_URL
  - Run each command: status, db ping, db stats, users, bouts, agents, credits summary, alerts
  - Verify each produces a clear error mentioning DATABASE_URL
  - Verify non-zero exit code for each
expected: Consistent, descriptive error message across all commands
blocked_by: null
```

## QA-044: Unknown command produces helpful usage text

```yaml
status: pending
priority: low
impact: Poor CLI UX, operator confusion
command: pitctl invalidcommand
category: cli
preconditions: []
steps:
  - Run `pitctl invalidcommand`
  - Verify error 'unknown command "invalidcommand"'
  - Verify usage text is printed to stderr
  - Verify non-zero exit code
expected: Error message with full usage guide
blocked_by: null
```

## QA-045: Version command displays build version

```yaml
status: pending
priority: low
impact: Version mismatch causes confusing debugging sessions
command: pitctl version
category: cli
preconditions: []
steps:
  - Run `pitctl version`
  - Verify output matches pattern "pitctl <version>"
  - Build with `-ldflags "-X main.version=1.2.3"`
  - Verify output shows "pitctl 1.2.3"
  - Default build shows "pitctl dev"
expected: Correct version string from build-time injection
blocked_by: null
```

## QA-046: Empty result sets produce "No X found" messages, not empty tables

```yaml
status: pending
priority: low
impact: Empty tables are confusing; "No X found" is clear
command: pitctl users/bouts/agents/credits ledger (on empty DB)
category: cli
preconditions:
  - DATABASE_URL set and reachable
  - Empty or filtered-to-zero result set
steps:
  - Run `pitctl users --tier lab` (when no lab users exist)
  - Verify "No users found." message (not an empty table)
  - Run `pitctl bouts --status running` (when none running)
  - Verify "No bouts found."
  - Run `pitctl credits ledger <userId>` for user with no transactions
  - Verify "No transactions."
  - Run `pitctl agents --flagged` (when no flagged agents)
  - Verify "No agents found."
expected: Styled muted message instead of empty table chrome
blocked_by: null
```

## QA-047: --limit flag works consistently across list commands

```yaml
status: pending
priority: low
impact: Inconsistent limit behavior across commands
command: Various list commands with --limit
category: cli
preconditions:
  - DATABASE_URL set and reachable
  - Enough rows for limit testing
steps:
  - Run `pitctl users --limit 3` — verify exactly 3 rows
  - Run `pitctl bouts --limit 5` — verify exactly 5 rows
  - Run `pitctl agents --limit 2` — verify exactly 2 rows
  - Run `pitctl credits ledger <userId> --limit 3` — verify 3 rows
  - Run with --limit 0 — verify default applies (25 for users/bouts, 50 for agents/ledger)
  - Run with --limit -1 — verify default applies
expected: Limit clamped to positive default when <= 0; otherwise respected exactly
blocked_by: null
```

## QA-048: Users list --sort option orders results correctly

```yaml
status: pending
priority: low
impact: Wrong sort order makes admin discovery harder
command: pitctl users --sort <option>
category: users
preconditions:
  - DATABASE_URL set and reachable
  - Users with different credit balances and bout counts
steps:
  - Run `pitctl users --sort newest` — verify ORDER BY created_at DESC
  - Run `pitctl users --sort credits` — verify ORDER BY balance DESC
  - Run `pitctl users --sort bouts` — verify ORDER BY free_bouts_used DESC
  - Run with invalid sort value — verify default (newest) is used
expected: Each sort option produces correct ordering
blocked_by: null
```

## QA-049: Bouts purge-errors reports zero errored bouts gracefully

```yaml
status: pending
priority: low
impact: Minor UX — should not show confusing output when nothing to purge
command: pitctl bouts purge-errors --yes
category: bouts
preconditions:
  - DATABASE_URL set and reachable
  - Zero errored bouts in DB
steps:
  - Run `pitctl bouts purge-errors --yes`
  - Verify muted message "No errored bouts to purge."
  - Verify exit code 0
expected: Graceful no-op with informative message
blocked_by: null
```

## QA-050: License verify validates token against signing key

```yaml
status: pending
priority: low
impact: License verification is needed for offline CLI feature gating
command: pitctl license verify
category: license
preconditions:
  - LICENSE_SIGNING_KEY set
  - Valid license file at ~/.pit/license.jwt or PITLAB_LICENSE env var
steps:
  - Generate keys, issue license, place at expected path
  - Run `pitctl license verify`
  - Verify output shows user ID, tier, issued date, expiry date
  - Tamper with the license file
  - Run again — verify verification failure error
expected: Valid license shows claims; tampered license fails verification
blocked_by: null
```

## QA-051: Config loading precedence — env vars override .env file

```yaml
status: pending
priority: low
impact: Operators expect env vars to override file — wrong precedence causes subtle deployment bugs
command: pitctl env
category: env
preconditions:
  - .env file sets DATABASE_URL=value_a
  - OS environment sets DATABASE_URL=value_b
steps:
  - Run `pitctl env`
  - Verify DATABASE_URL shows as "set"
  - Run `pitctl db ping` — verify it connects to value_b (env override)
expected: OS environment variables always win over .env file values
blocked_by: null
```

## QA-052: Makefile gate runs vet, build, and test in correct order

```yaml
status: pending
priority: low
impact: Broken gate means uncaught regressions in CI
command: make gate
category: infra
preconditions:
  - Go toolchain installed
steps:
  - Run `make gate` in pitctl/
  - Verify go vet runs first (static analysis)
  - Verify go build produces pitctl binary
  - Verify go test runs all tests with -count=1 (no cache)
  - Verify exit code 0 when all pass
  - Introduce a vet warning — verify gate fails
expected: Sequential vet -> build -> test; any failure stops the chain
blocked_by: null
```

<!-- ============================================================ -->
<!-- KNOWN ISSUES — Documented risks from code review              -->
<!-- These are not bugs per se but architectural risks to monitor  -->
<!-- ============================================================ -->

## QA-053: Credits grant is not transactional (known risk)

```yaml
status: pending
priority: critical
impact: "Crash between balance update and transaction insert leaves orphaned balance increment with no audit trail"
command: pitctl credits grant
category: credits
type: known_risk
description: |
  The three writes in RunCreditsGrant (upsert account, increment balance,
  insert transaction) are NOT wrapped in a SQL transaction. A crash or
  timeout between the UPDATE and the INSERT INTO credit_transactions
  leaves the balance incremented but no audit record.
recommendation: "Wrap all three writes in BEGIN/COMMIT or use db.DB.BeginTx"
blocked_by: null
```

## QA-054: Metrics/report reference credit_ledger table (potential schema mismatch)

```yaml
status: pending
priority: high
impact: "Queries will silently return 0 if table name is wrong — credit metrics invisible"
command: pitctl metrics, pitctl report
category: metrics
type: known_risk
description: |
  metrics.go and report.go query a table called `credit_ledger` with
  columns `amount` and `created_at`. The actual schema in db/schema.ts
  defines `credit_transactions` with `delta_micro` and `created_at`.
  If `credit_ledger` does not exist as a view or alias, these queries
  silently fail via QueryVal and show 0.
recommendation: "Verify credit_ledger exists as a view, or update queries to use credit_transactions with delta_micro"
blocked_by: null
```

## QA-055: Smoke test exit code is always 0 (design limitation)

```yaml
status: pending
priority: medium
impact: "CI/CD pipelines cannot gate deployments on smoke test results"
command: pitctl smoke
category: smoke
type: known_risk
description: |
  RunSmoke always returns nil regardless of how many routes fail.
  The function is advisory-only — it renders failures visually but
  the calling process always exits 0.
recommendation: "Add --strict flag that returns error when any route is non-2xx/3xx"
blocked_by: null
```

## QA-056: Status/stats silently swallow QueryVal errors (design limitation)

```yaml
status: pending
priority: medium
impact: "Failed queries show as 0 instead of errors — misleading dashboard during partial outages"
command: pitctl status, pitctl bouts stats, pitctl credits summary
category: infra
type: known_risk
description: |
  RunStatus, RunBoutsStats, RunCreditsSummary, RunMetrics, and RunReport
  all call conn.QueryVal without checking the returned error. If a table
  is missing, a query times out, or there's a permission error, the
  metric silently defaults to 0.
recommendation: "Check QueryVal errors and display a warning indicator (e.g., '?' or 'ERR') instead of 0"
blocked_by: null
```

## QA-057: Agents inspect bout-appearance count uses LIKE (false positive risk)

```yaml
status: pending
priority: low
impact: "Bout count for an agent could be inflated if agent IDs are substrings of other IDs"
command: pitctl agents inspect
category: agents
type: known_risk
description: |
  The bout appearances query casts agent_lineup to text and uses:
    WHERE agent_lineup::text LIKE '%' || $1 || '%'
  If agent ID "abc" exists and agent "xyzabc123" also exists, searching
  for "abc" would match bouts containing either agent.
recommendation: "Use JSON containment operator (@>) or JSONB array functions instead of text LIKE"
blocked_by: null
```
