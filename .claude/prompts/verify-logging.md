# Logging Dry-Run Validation Protocol

Use this protocol after deploying any logging ticket.

## 1) Schema Presence
1. Run `logs-list-attributes` and verify required fields exist.
2. Run `logs-list-attribute-values` for `event` and confirm the new event names appear.
3. Run `logs-list-attribute-values` for `service.name` and confirm `tspit` (and CLI names where applicable).

## 2) Content Correctness
1. Query the new event in the last 1 hour.
2. Verify required fields are present and correctly typed (`durationMs` numeric, status enum valid).
3. Verify replay-linking fields are present (`posthog_distinct_id` and `$session_id` when applicable).

## 3) Security / PII Scan
Search the last 24h for:
- `sk-ant`, `sk-or`, `sk_live`, `sk_test`, `Bearer`
- raw email patterns
- request/response payload fragments

Fail the ticket if any secret/PII leak is found.

## 4) Level Correctness
1. Query `severity=ERROR` and confirm only actionable failures.
2. Query `severity=WARN` and confirm non-fatal anomalies.
3. Query `signal=audit` and confirm financial/admin operations are present.

## 5) Go CLI Verification (when applicable)
1. Query `event=pitstorm.metrics_snapshot` or command lifecycle events.
2. Verify expected metrics/properties exist.

## Exit Criteria
- PASS only if schema, content, and security checks all pass.
